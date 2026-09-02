import io
import os
import pickle
import sys
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.preprocessing import StandardScaler

# Ensure backend directory is in path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from updated_symbolic_layer import apply_symbolic_safety_layer

# -----------------------------------------------------------------------------
# 1. ARCHITECTURES
# -----------------------------------------------------------------------------

class NeuroSymbolicLSTM(nn.Module):
    def __init__(self, input_size=33, hidden_size=128, num_layers=2, dropout=0.2, num_classes=2, bidirectional=False):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout if num_layers > 1 else 0.0,
            batch_first=True,
            bidirectional=bidirectional,
        )
        self.classifier = nn.Sequential(
            nn.LayerNorm(hidden_size),
            nn.Linear(hidden_size, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, num_classes),
        )

    def forward(self, x, return_all_timesteps=False):
        out, _ = self.lstm(x)  # [B, T, H]
        if return_all_timesteps:
            return self.classifier(out)  # [B, T, 2]
        h = out[:, -1, :]
        return self.classifier(h)  # [B, 2]


class PhysicsRegularizedGRU(nn.Module):
    def __init__(self, input_size=33, hidden_size=128, num_layers=2, dropout=0.3, num_classes=2):
        super().__init__()
        self.gru = nn.GRU(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout if num_layers > 1 else 0.0,
            batch_first=True,
        )
        self.classifier = nn.Sequential(
            nn.LayerNorm(hidden_size),
            nn.Linear(hidden_size, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, num_classes),
        )

    def forward(self, x, return_all_timesteps=False):
        out, _ = self.gru(x)  # [B, T, H]
        if return_all_timesteps:
            return self.classifier(out)  # [B, T, 2]
        h = out[:, -1, :]
        return self.classifier(h)  # [B, 2]


class PositionalEncoding(nn.Module):
    def __init__(self, d_model, max_len=20):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float32).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-np.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        self.register_buffer("pe", pe.unsqueeze(0))

    def forward(self, x):
        return x + self.pe[:, :x.size(1)]


class CausalTransformer(nn.Module):
    def __init__(self, input_size=33, d_model=128, n_heads=4, num_layers=2, ff_dim=256, dropout=0.3, num_classes=2):
        super().__init__()
        self.input_projection = nn.Linear(input_size, d_model)
        self.positional_encoding = PositionalEncoding(d_model, max_len=20)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=n_heads,
            dim_feedforward=ff_dim,
            dropout=dropout,
            batch_first=True,
        )
        self.transformer_encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.classifier = nn.Sequential(
            nn.LayerNorm(d_model),
            nn.Linear(d_model, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, num_classes),
        )

    def forward(self, x, return_all_timesteps=False):
        x = self.input_projection(x)
        x = self.positional_encoding(x)
        T = x.size(1)
        mask = torch.triu(torch.ones(T, T, device=x.device), diagonal=1).bool()
        x = self.transformer_encoder(x, mask=mask)
        if return_all_timesteps:
            return self.classifier(x)
        x = x[:, -1, :]
        return self.classifier(x)


class ConvWrapper(nn.Module):
    def __init__(self, in_channels, out_channels, kernel_size, dilation=1):
        super().__init__()
        self.conv = nn.Conv1d(
            in_channels,
            out_channels,
            kernel_size=kernel_size,
            dilation=dilation,
            padding=(kernel_size - 1) * dilation,
        )

    def forward(self, x):
        return self.conv(x)


class TCNBlock(nn.Module):
    def __init__(self, in_channels, out_channels, kernel_size=3, dilation=1, dropout=0.2):
        super().__init__()
        self.c1 = ConvWrapper(in_channels, out_channels, kernel_size, dilation)
        self.n1 = nn.BatchNorm1d(out_channels)
        self.c2 = ConvWrapper(out_channels, out_channels, kernel_size, dilation)
        self.n2 = nn.BatchNorm1d(out_channels)
        if in_channels != out_channels:
            self.skip = nn.Conv1d(in_channels, out_channels, kernel_size=1)
        else:
            self.skip = nn.Identity()
        self.dropout = nn.Dropout(dropout)
        self.dilation = dilation
        self.kernel_size = kernel_size

    def chomp(self, x):
        chomp_size = (self.kernel_size - 1) * self.dilation
        if chomp_size == 0:
            return x
        return x[:, :, :-chomp_size]

    def forward(self, x):
        residual = self.skip(x)
        out = self.c1(x)
        out = self.chomp(out)
        out = self.n1(out)
        out = F.relu(out)
        out = self.dropout(out)
        out = self.c2(out)
        out = self.chomp(out)
        out = self.n2(out)
        out = F.relu(out)
        out = self.dropout(out)
        return F.relu(out + residual)


class SatelliteTCN(nn.Module):
    def __init__(self, input_channels=33, num_classes=2, dropout=0.2):
        super().__init__()
        channels = [33, 32, 64, 64, 32]
        dilations = [1, 2, 4, 8]
        self.tcn = nn.ModuleList()
        for i in range(4):
            self.tcn.append(
                TCNBlock(
                    in_channels=channels[i],
                    out_channels=channels[i + 1],
                    kernel_size=3,
                    dilation=dilations[i],
                    dropout=dropout,
                )
            )
        self.head = nn.Conv1d(32, num_classes, kernel_size=1)

    def forward(self, x, return_all_timesteps=False):
        x = x.transpose(1, 2)
        for block in self.tcn:
            x = block(x)
        x = self.head(x)  # [B, 2, T]
        if return_all_timesteps:
            return x.transpose(1, 2)  # [B, T, 2]
        return x[:, :, -1]  # [B, 2]


class PatchTST(nn.Module):
    def __init__(self, num_features=44, seq_len=20, patch_len=5, stride=2, d_model=128, n_heads=4, n_layers=3, dropout=0.2):
        super().__init__()
        self.patch_len = patch_len
        self.stride = stride
        self.num_patches = ((seq_len - patch_len) // stride) + 1
        self.patch_projection = nn.Linear(patch_len, d_model)
        self.channel_embedding = nn.Parameter(torch.randn(1, num_features, 1, d_model))
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=n_heads,
            dropout=dropout,
            batch_first=True,
            norm_first=True,
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=n_layers)
        self.norm = nn.LayerNorm(d_model)
        self.classifier = nn.Linear(num_features * d_model, 2)

    def forward(self, x):
        # x = [B, T, F] -> transpose to [B, F, T]
        x = x.transpose(1, 2)
        patches = x.unfold(dimension=-1, size=self.patch_len, step=self.stride)  # [B, F, num_patches, patch_len]
        patches = self.patch_projection(patches)  # [B, F, num_patches, d_model]
        patches = patches + self.channel_embedding[:, :, :self.num_patches, :]
        batch_size = patches.size(0)
        num_feat = self.channel_embedding.size(1)
        patches = patches.reshape(batch_size * num_feat, self.num_patches, -1)
        encoded = self.encoder(patches)
        encoded = self.norm(encoded)
        encoded = encoded[:, -1, :]  # [B * F, d_model]
        encoded = encoded.reshape(batch_size, -1)  # [B, F * d_model]
        return self.classifier(encoded)  # [B, 2]


def run_pipeline():
    print("Loading updated_4_scenarios_dataset.csv...")
    csv_path = BASE_DIR / "updated_4_scenarios_dataset.csv"
    df = pd.read_csv(csv_path)
    print(f"Loaded dataset: {df.shape}, {df['event_id'].nunique()} events")

    # One-hot orbit types
    df["orbit_type_GEO"] = (df["orbit_type"].astype(str).str.upper() == "GEO").astype(np.float32)
    df["orbit_type_LEO"] = (df["orbit_type"].astype(str).str.upper() == "LEO").astype(np.float32)
    df["orbit_type_MEO"] = (df["orbit_type"].astype(str).str.upper() == "MEO").astype(np.float32)

    # 33 features
    FEATURES_33 = [
        "last_observation_age", "max_delta_v", "satellite_mass", "hard_body_radius", "measurement_noise",
        "rel_pos_x", "rel_pos_y", "rel_pos_z", "rel_vel_x", "rel_vel_y", "rel_vel_z",
        "sigma_r", "sigma_t", "sigma_n", "obj_sigma_r", "obj_sigma_t", "obj_sigma_n",
        "solar_activity", "drag_level", "max_thrust", "eccentricity", "inclination",
        "semi_major_axis", "perigee", "apogee", "relative_distance", "relative_speed",
        "relative_closing_rate", "satellite_covariance_magnitude", "object_covariance_magnitude",
        "combined_covariance_magnitude", "tracking_reliability_index", "fuel_margin"
    ]

    # Load Scalers
    with zipfile.ZipFile(BASE_DIR / "neurosymbolic_reconstructed_preprocessing.zip") as z:
        gru_scaler = pickle.loads(z.read("GRU_reconstructed_scaler.pkl"))
        tcn_scaler = pickle.loads(z.read("TCN_reconstructed_scaler.pkl"))
        causal_scaler = pickle.loads(z.read("CausalTransformer_reconstructed_scaler.pkl"))

    # Prepare raw sequences (400, 20, 33)
    df_sorted = df.sort_values(["event_id", "time_index"]).reset_index(drop=True)
    events_33, event_labels, event_ids = [], [], []
    for eid, grp in df_sorted.groupby("event_id", sort=False):
        events_33.append(grp[FEATURES_33].values.astype(np.float32))
        event_labels.append(int(grp["commit_decision"].iloc[-1]))
        event_ids.append(eid)
    X_seq_raw = np.stack(events_33)
    y_true = np.array(event_labels)

    def scale_seq(X, scaler):
        n, t, f = X.shape
        X2 = X.reshape(-1, f)
        X2_s = scaler.transform(X2)
        return X2_s.reshape(n, t, f).astype(np.float32)

    X_lstm = scale_seq(X_seq_raw, gru_scaler)
    X_gru = scale_seq(X_seq_raw, gru_scaler)
    X_tcn = scale_seq(X_seq_raw, tcn_scaler)
    X_causal = scale_seq(X_seq_raw, causal_scaler)

    # Models dir
    MODEL_DIR = BASE_DIR / "model_files"

    # Load LSTM
    lstm_ckpt = torch.load(MODEL_DIR / "NeuroSymbolic_LSTM_final.pt.zip", map_location="cpu", weights_only=False)
    lstm_model = NeuroSymbolicLSTM(
        input_size=lstm_ckpt["input_size"],
        hidden_size=lstm_ckpt["hidden_size"],
        num_layers=lstm_ckpt["num_layers"],
        dropout=lstm_ckpt["dropout"],
        num_classes=lstm_ckpt["num_classes"],
    )
    lstm_model.load_state_dict(lstm_ckpt["model_state_dict"], strict=True)
    lstm_model.eval()

    # Load GRU
    gru_sd = torch.load(MODEL_DIR / "final_physics_regularized_gru.pth", map_location="cpu", weights_only=False)
    gru_model = PhysicsRegularizedGRU(input_size=33, hidden_size=128, num_layers=2, dropout=0.3)
    gru_model.load_state_dict(gru_sd, strict=True)
    gru_model.eval()

    # Load TCN
    tcn_sd = torch.load(MODEL_DIR / "satellite_tcn_modelt4.pt.zip", map_location="cpu", weights_only=False)
    tcn_model = SatelliteTCN(input_channels=33, num_classes=2, dropout=0.2)
    tcn_model.load_state_dict(tcn_sd, strict=True)
    tcn_model.eval()

    # Load CausalTransformer
    causal_ckpt = torch.load(MODEL_DIR / "causal_transformer_physics.pt.zip", map_location="cpu", weights_only=False)
    causal_model = CausalTransformer(input_size=33, d_model=128, n_heads=4, num_layers=2, ff_dim=256, dropout=0.3)
    causal_model.load_state_dict(causal_ckpt["model_state_dict"], strict=True)
    causal_model.eval()

    # Load PatchTST
    patch_ckpt = torch.load(MODEL_DIR / "patchtst_model.pt.zip", map_location="cpu", weights_only=False)
    PATCH_FEATURES = patch_ckpt["feature_cols"]
    patch_scaler = patch_ckpt["scaler"]
    patch_model = PatchTST(
        num_features=len(PATCH_FEATURES),
        seq_len=patch_ckpt["sequence_length"],
        patch_len=5,
        stride=2,
        d_model=128,
        n_heads=4,
        n_layers=3,
        dropout=0.2,
    )
    patch_model.load_state_dict(patch_ckpt["model_state_dict"], strict=True)
    patch_model.eval()

    # Prepare PatchTST data
    patch_events = []
    for eid, grp in df_sorted.groupby("event_id", sort=False):
        patch_events.append(grp[PATCH_FEATURES].values.astype(np.float32))
    X_patch_raw = np.stack(patch_events)
    X_patch = scale_seq(X_patch_raw, patch_scaler)

    # Load XGBoost
    xgb_ckpt = torch.load(MODEL_DIR / "xgboost_model.pt.zip", map_location="cpu", weights_only=False)
    xgb_model = xgb_ckpt["xgboost_model"]
    XGB_FEATURES = xgb_ckpt["feature_columns"]

    final_rows = df_sorted.groupby("event_id", sort=False).tail(1).copy()
    X_xgb = final_rows[XGB_FEATURES].copy()

    # Run PyTorch Predictions
    @torch.no_grad()
    def predict_torch(model, X):
        X_t = torch.tensor(X, dtype=torch.float32)
        logits = model(X_t)
        probs = torch.softmax(logits, dim=1)
        preds = torch.argmax(logits, dim=1)
        return preds.cpu().numpy(), probs[:, 1].cpu().numpy()

    lstm_pred, lstm_prob = predict_torch(lstm_model, X_lstm)
    gru_pred, gru_prob = predict_torch(gru_model, X_gru)
    tcn_pred, tcn_prob = predict_torch(tcn_model, X_tcn)
    causal_pred, causal_prob = predict_torch(causal_model, X_causal)
    patch_pred, patch_prob = predict_torch(patch_model, X_patch)

    xgb_prob = xgb_model.predict_proba(X_xgb)[:, 1]
    xgb_pred = (xgb_prob >= 0.5).astype(int)

    all_preds = {
        "LSTM": (lstm_pred, lstm_prob),
        "GRU": (gru_pred, gru_prob),
        "TCN": (tcn_pred, tcn_prob),
        "Causal Transformer": (causal_pred, causal_prob),
        "PatchTST": (patch_pred, patch_prob),
        "XGBoost": (xgb_pred, xgb_prob),
    }

    print("\n" + "=" * 90)
    print("MODEL EVALUATION ON UPDATED 4 SCENARIOS DATASET (400 EVENTS)")
    print("=" * 90)

    # Apply symbolic layer on final observation of each event
    SYMBOLIC_COLS = ["feasibility_flag", "time_to_TCA", "maneuver_window_remaining", "fuel_remaining", "deltav_required", "cost_of_acting", "cost_of_waiting", "poc"]
    sym_final_df = final_rows[SYMBOLIC_COLS].copy()

    results = []
    for name, (pred, prob) in all_preds.items():
        sym_res = apply_symbolic_safety_layer(pred, symbolic_data=sym_final_df)
        final_p = sym_res.final_prediction
        corr_count = int(np.sum(sym_res.symbolic_correction))

        acc = accuracy_score(y_true, final_p)
        prec = precision_score(y_true, final_p, zero_division=0)
        rec = recall_score(y_true, final_p, zero_division=0)
        f1 = f1_score(y_true, final_p, zero_division=0)
        macro_f1 = f1_score(y_true, final_p, average="macro", zero_division=0)
        auc = roc_auc_score(y_true, prob)

        cm = confusion_matrix(y_true, final_p, labels=[0, 1])
        tn, fp, fn, tp = cm.ravel()

        results.append({
            "Model": name,
            "Accuracy": acc,
            "Precision": prec,
            "Recall": rec,
            "F1": f1,
            "Macro-F1": macro_f1,
            "ROC-AUC": auc,
            "Shield_Overrides": corr_count,
            "TN": tn, "FP": fp, "FN": fn, "TP": tp,
            "Pred_COMMIT": int(final_p.sum()),
        })

    res_df = pd.DataFrame(results).sort_values("Macro-F1", ascending=False)
    for _, r in res_df.iterrows():
        print(f"{r['Model']:20s} | Acc: {r['Accuracy']:.4f} | F1: {r['F1']:.4f} | Macro-F1: {r['Macro-F1']:.4f} | Prec: {r['Precision']:.4f} | Rec: {r['Recall']:.4f} | ROC-AUC: {r['ROC-AUC']:.4f} | Overrides: {r['Shield_Overrides']}")

if __name__ == "__main__":
    run_pipeline()
