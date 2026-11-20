import os
import joblib
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional
from pathlib import Path
ROOT_DIR = Path(__file__).resolve().parents[2]

def resolve_resource_path(p: Any) -> str:
    if not p:
        return ""
    p_str = str(p)
    if os.path.exists(p_str):
        return p_str
    alt = ROOT_DIR / p_str
    if alt.exists():
        return str(alt)
    return p_str

from .base_adapter import ResearchModelAdapter
from .architectures import (
    SatelliteGRU,
    SatelliteLSTM,
    SatelliteTCN,
    SatelliteCausalTransformer,
    PatchTST
)

# ============================================================
# 1. GRU ADAPTER
# ============================================================
class GRUAdapter(ResearchModelAdapter):
    def __init__(self, config: dict):
        super().__init__("GRU", config)
        self.feature_names = config["features"]["neural_33"]
        self.threshold = config["models"]["gru"].get("decision_threshold", 0.50)
        self.scaler = None
        self.scaler_path = config["models"]["gru"].get("scaler", "resources/NeuroSymbolic_LSTM_scaler.pkl")

    def load(self, checkpoint_path: Optional[str] = None) -> None:
        ckpt_path = resolve_resource_path(checkpoint_path or self.config["models"]["gru"]["checkpoint"])
        self.model = SatelliteGRU(input_size=len(self.feature_names), hidden_size=128, num_layers=2, dropout=0.3)
        state_dict = torch.load(ckpt_path, map_location="cpu", weights_only=False)
        self.model.load_state_dict(state_dict)

        scaler_file = resolve_resource_path(self.config["models"]["gru"].get("scaler", self.scaler_path))
        if os.path.exists(scaler_file):
            self.scaler = joblib.load(scaler_file)
            if hasattr(self.scaler, "feature_names_in_") and self.scaler.feature_names_in_ is not None:
                assert list(self.scaler.feature_names_in_) == list(self.feature_names)
            assert self.scaler.n_features_in_ == len(self.feature_names)

        self.model.to(self.device)
        self.model.eval()
        self.is_loaded = True

    def validate(self) -> bool:
        assert self.is_loaded, "Model not loaded"
        assert self.scaler is not None, "Scaler not loaded"
        test_tensor = torch.randn(2, 20, len(self.feature_names)).to(self.device)
        with torch.no_grad():
            out = self.model(test_tensor)
        assert out.shape == (2, 20, 2), f"Expected shape (2, 20, 2), got {out.shape}"
        return True

    def preprocess(self, data: Any) -> torch.Tensor:
        if isinstance(data, pd.DataFrame):
            if "event_id" in data.columns:
                grouped = data.groupby("event_id")
                tensors = []
                for eid, group in grouped:
                    grp = group.sort_values("normalized_step" if "normalized_step" in group.columns else "time_index")
                    x_df = grp[self.feature_names]
                    if self.scaler is not None and hasattr(self.scaler, "feature_names_in_") and self.scaler.feature_names_in_ is not None:
                        assert list(x_df.columns) == list(self.scaler.feature_names_in_)
                        assert x_df.shape[1] == self.scaler.n_features_in_
                    x_scaled = self.scaler.transform(x_df) if self.scaler is not None else x_df.values
                    tensors.append(torch.tensor(x_scaled, dtype=torch.float32))
                return torch.stack(tensors).to(self.device)
            else:
                x_df = data[self.feature_names]
                if self.scaler is not None and hasattr(self.scaler, "feature_names_in_") and self.scaler.feature_names_in_ is not None:
                    assert list(x_df.columns) == list(self.scaler.feature_names_in_)
                    assert x_df.shape[1] == self.scaler.n_features_in_
                x_scaled = self.scaler.transform(x_df) if self.scaler is not None else x_df.values
                return torch.tensor(x_scaled, dtype=torch.float32).unsqueeze(0).to(self.device)
        elif isinstance(data, torch.Tensor):
            if data.dim() == 2:
                data = data.unsqueeze(0)
            return data.to(self.device)
        elif isinstance(data, np.ndarray):
            if data.ndim == 2:
                if data.shape[1] == len(self.feature_names) and data.shape[0] != 20 and self.scaler is not None:
                    x_df = pd.DataFrame(data, columns=self.feature_names)
                    x_scaled = self.scaler.transform(x_df)
                    return torch.tensor(x_scaled, dtype=torch.float32).unsqueeze(0).to(self.device)
            t = torch.tensor(data, dtype=torch.float32)
            if t.dim() == 2:
                t = t.unsqueeze(0)
            return t.to(self.device)
        return data

    def predict_proba(self, x: Any) -> np.ndarray:
        tensor_in = self.preprocess(x)
        self.model.eval()
        with torch.no_grad():
            logits = self.model(tensor_in)
            probs = F.softmax(logits, dim=-1).cpu().numpy()
        return probs

    def predict(self, x: Any, threshold: Optional[float] = None) -> np.ndarray:
        thresh = threshold if threshold is not None else self.threshold
        probs = self.predict_proba(x)
        p_commit = probs[..., 1]
        return (p_commit >= thresh).astype(int)


# ============================================================
# 2. LSTM ADAPTER
# ============================================================
class LSTMAdapter(ResearchModelAdapter):
    def __init__(self, config: dict):
        super().__init__("LSTM", config)
        self.feature_names = config["features"]["neural_33"]
        self.threshold = config["models"]["lstm"].get("decision_threshold", 0.50)
        self.scaler = None
        self.scaler_path = config["models"]["lstm"].get("scaler", "resources/NeuroSymbolic_LSTM_scaler.pkl")

    def load(self, checkpoint_path: Optional[str] = None) -> None:
        ckpt_path = resolve_resource_path(checkpoint_path or self.config["models"]["lstm"]["checkpoint"])
        ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
        self.feature_names = ckpt.get("feature_columns", self.feature_names)
        
        # Load the original training fitted scaler
        scaler_file = resolve_resource_path(self.config["models"]["lstm"].get("scaler", self.scaler_path))
        if not os.path.exists(scaler_file):
            raise FileNotFoundError(f"Original LSTM scaler not found at: {scaler_file}")
        self.scaler = joblib.load(scaler_file)

        # Validate scaler compatibility
        if hasattr(self.scaler, "feature_names_in_") and self.scaler.feature_names_in_ is not None:
            assert list(self.scaler.feature_names_in_) == list(self.feature_names), (
                f"Scaler feature columns do not match checkpoint feature columns! "
                f"Scaler: {list(self.scaler.feature_names_in_)} vs Ckpt: {list(self.feature_names)}"
            )
        assert self.scaler.n_features_in_ == len(self.feature_names), (
            f"Scaler feature dimension ({self.scaler.n_features_in_}) != feature count ({len(self.feature_names)})"
        )

        self.model = SatelliteLSTM(input_size=len(self.feature_names), hidden_size=128, num_layers=2, dropout=0.3, bidirectional=False)
        self.model.load_state_dict(ckpt["model_state_dict"])
        self.model.to(self.device)
        self.model.eval()
        self.is_loaded = True

    def validate(self) -> bool:
        assert self.is_loaded, "Model not loaded"
        assert self.scaler is not None, "Scaler not loaded"
        test_tensor = torch.randn(2, 20, len(self.feature_names)).to(self.device)
        with torch.no_grad():
            out = self.model(test_tensor)
        assert out.shape == (2, 20, 2), f"Expected shape (2, 20, 2), got {out.shape}"
        return True

    def preprocess(self, data: Any) -> torch.Tensor:
        if isinstance(data, pd.DataFrame):
            if "event_id" in data.columns:
                grouped = data.groupby("event_id")
                tensors = []
                for eid, group in grouped:
                    grp = group.sort_values("normalized_step" if "normalized_step" in group.columns else "time_index")
                    x_df = grp[self.feature_names]
                    if hasattr(self.scaler, "feature_names_in_") and self.scaler.feature_names_in_ is not None:
                        assert list(x_df.columns) == list(self.scaler.feature_names_in_)
                        assert x_df.shape[1] == self.scaler.n_features_in_
                    x_scaled = self.scaler.transform(x_df)
                    tensors.append(torch.tensor(x_scaled, dtype=torch.float32))
                return torch.stack(tensors).to(self.device)
            else:
                x_df = data[self.feature_names]
                if hasattr(self.scaler, "feature_names_in_") and self.scaler.feature_names_in_ is not None:
                    assert list(x_df.columns) == list(self.scaler.feature_names_in_)
                    assert x_df.shape[1] == self.scaler.n_features_in_
                x_scaled = self.scaler.transform(x_df)
                return torch.tensor(x_scaled, dtype=torch.float32).unsqueeze(0).to(self.device)
        elif isinstance(data, torch.Tensor):
            if data.dim() == 2:
                data = data.unsqueeze(0)
            return data.to(self.device)
        elif isinstance(data, np.ndarray):
            if data.ndim == 2:
                if data.shape[1] == len(self.feature_names) and data.shape[0] != 20:
                    x_df = pd.DataFrame(data, columns=self.feature_names)
                    x_scaled = self.scaler.transform(x_df)
                    return torch.tensor(x_scaled, dtype=torch.float32).unsqueeze(0).to(self.device)
            t = torch.tensor(data, dtype=torch.float32)
            if t.dim() == 2:
                t = t.unsqueeze(0)
            return t.to(self.device)
        return data

    def predict_proba(self, x: Any) -> np.ndarray:
        tensor_in = self.preprocess(x)
        self.model.eval()
        with torch.no_grad():
            logits = self.model(tensor_in)
            probs = F.softmax(logits, dim=-1).cpu().numpy()
        return probs

    def predict(self, x: Any, threshold: Optional[float] = None) -> np.ndarray:
        thresh = threshold if threshold is not None else self.threshold
        probs = self.predict_proba(x)
        p_commit = probs[..., 1]
        return (p_commit >= thresh).astype(int)


# ============================================================
# 3. TCN ADAPTER
# ============================================================
class TCNAdapter(ResearchModelAdapter):
    def __init__(self, config: dict):
        super().__init__("TCN", config)
        self.feature_names = config["features"]["neural_33"]
        self.threshold = config["models"]["tcn"].get("decision_threshold", 0.44)
        self.scaler = None
        self.scaler_path = config["models"]["tcn"].get("scaler", "resources/NeuroSymbolic_LSTM_scaler.pkl")

    def load(self, checkpoint_path: Optional[str] = None) -> None:
        ckpt_path = resolve_resource_path(checkpoint_path or self.config["models"]["tcn"]["checkpoint"])
        ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
        self.model = SatelliteTCN(n_features=len(self.feature_names))
        sd = ckpt["model_state_dict"] if "model_state_dict" in ckpt else ckpt
        self.model.load_state_dict(sd)

        scaler_file = resolve_resource_path(self.config["models"]["tcn"].get("scaler", self.scaler_path))
        if os.path.exists(scaler_file):
            self.scaler = joblib.load(scaler_file)
            if hasattr(self.scaler, "feature_names_in_") and self.scaler.feature_names_in_ is not None:
                assert list(self.scaler.feature_names_in_) == list(self.feature_names)
            assert self.scaler.n_features_in_ == len(self.feature_names)

        self.model.to(self.device)
        self.model.eval()
        self.is_loaded = True

    def validate(self) -> bool:
        assert self.is_loaded, "Model not loaded"
        assert self.scaler is not None, "Scaler not loaded"
        test_tensor = torch.randn(2, 20, len(self.feature_names)).to(self.device)
        with torch.no_grad():
            out = self.model(test_tensor)
        assert out.shape == (2, 20, 2), f"Expected shape (2, 20, 2), got {out.shape}"
        return True

    def preprocess(self, data: Any) -> torch.Tensor:
        if isinstance(data, pd.DataFrame):
            if "event_id" in data.columns:
                grouped = data.groupby("event_id")
                tensors = []
                for eid, group in grouped:
                    grp = group.sort_values("normalized_step" if "normalized_step" in group.columns else "time_index")
                    x_df = grp[self.feature_names]
                    if self.scaler is not None and hasattr(self.scaler, "feature_names_in_") and self.scaler.feature_names_in_ is not None:
                        assert list(x_df.columns) == list(self.scaler.feature_names_in_)
                        assert x_df.shape[1] == self.scaler.n_features_in_
                    x_scaled = self.scaler.transform(x_df) if self.scaler is not None else x_df.values
                    tensors.append(torch.tensor(x_scaled, dtype=torch.float32))
                return torch.stack(tensors).to(self.device)
            else:
                x_df = data[self.feature_names]
                if self.scaler is not None and hasattr(self.scaler, "feature_names_in_") and self.scaler.feature_names_in_ is not None:
                    assert list(x_df.columns) == list(self.scaler.feature_names_in_)
                    assert x_df.shape[1] == self.scaler.n_features_in_
                x_scaled = self.scaler.transform(x_df) if self.scaler is not None else x_df.values
                return torch.tensor(x_scaled, dtype=torch.float32).unsqueeze(0).to(self.device)
        elif isinstance(data, torch.Tensor):
            if data.dim() == 2:
                data = data.unsqueeze(0)
            return data.to(self.device)
        elif isinstance(data, np.ndarray):
            if data.ndim == 2:
                if data.shape[1] == len(self.feature_names) and data.shape[0] != 20 and self.scaler is not None:
                    x_df = pd.DataFrame(data, columns=self.feature_names)
                    x_scaled = self.scaler.transform(x_df)
                    return torch.tensor(x_scaled, dtype=torch.float32).unsqueeze(0).to(self.device)
            t = torch.tensor(data, dtype=torch.float32)
            if t.dim() == 2:
                t = t.unsqueeze(0)
            return t.to(self.device)
        return data

    def predict_proba(self, x: Any) -> np.ndarray:
        tensor_in = self.preprocess(x)
        self.model.eval()
        with torch.no_grad():
            logits = self.model(tensor_in)
            probs = F.softmax(logits, dim=-1).cpu().numpy()
        return probs

    def predict(self, x: Any, threshold: Optional[float] = None) -> np.ndarray:
        thresh = threshold if threshold is not None else self.threshold
        probs = self.predict_proba(x)
        p_commit = probs[..., 1]
        return (p_commit >= thresh).astype(int)


# ============================================================
# 4. TRANSFORMER ADAPTER
# ============================================================
class TransformerAdapter(ResearchModelAdapter):
    def __init__(self, config: dict):
        super().__init__("Transformer", config)
        self.feature_names = config["features"]["neural_33"]
        self.threshold = config["models"]["transformer"].get("decision_threshold", 0.50)
        self.scaler = None
        self.scaler_path = config["models"]["transformer"].get("scaler", "resources/NeuroSymbolic_LSTM_scaler.pkl")

    def load(self, checkpoint_path: Optional[str] = None) -> None:
        ckpt_path = resolve_resource_path(checkpoint_path or self.config["models"]["transformer"]["checkpoint"])
        ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
        self.model = SatelliteCausalTransformer(input_size=len(self.feature_names), d_model=128, n_heads=4, num_layers=2, ff_dim=256, dropout=0.3)
        self.model.load_state_dict(ckpt["model_state_dict"])

        scaler_file = resolve_resource_path(self.config["models"]["transformer"].get("scaler", self.scaler_path))
        if os.path.exists(scaler_file):
            self.scaler = joblib.load(scaler_file)
            if hasattr(self.scaler, "feature_names_in_") and self.scaler.feature_names_in_ is not None:
                assert list(self.scaler.feature_names_in_) == list(self.feature_names)
            assert self.scaler.n_features_in_ == len(self.feature_names)

        self.model.to(self.device)
        self.model.eval()
        self.is_loaded = True

    def validate(self) -> bool:
        assert self.is_loaded, "Model not loaded"
        assert self.scaler is not None, "Scaler not loaded"
        test_tensor = torch.randn(2, 20, len(self.feature_names)).to(self.device)
        with torch.no_grad():
            out = self.model(test_tensor)
        assert out.shape == (2, 20, 2), f"Expected shape (2, 20, 2), got {out.shape}"
        return True

    def preprocess(self, data: Any) -> torch.Tensor:
        if isinstance(data, pd.DataFrame):
            if "event_id" in data.columns:
                grouped = data.groupby("event_id")
                tensors = []
                for eid, group in grouped:
                    grp = group.sort_values("normalized_step" if "normalized_step" in group.columns else "time_index")
                    x_df = grp[self.feature_names]
                    if self.scaler is not None and hasattr(self.scaler, "feature_names_in_") and self.scaler.feature_names_in_ is not None:
                        assert list(x_df.columns) == list(self.scaler.feature_names_in_)
                        assert x_df.shape[1] == self.scaler.n_features_in_
                    x_scaled = self.scaler.transform(x_df) if self.scaler is not None else x_df.values
                    tensors.append(torch.tensor(x_scaled, dtype=torch.float32))
                return torch.stack(tensors).to(self.device)
            else:
                x_df = data[self.feature_names]
                if self.scaler is not None and hasattr(self.scaler, "feature_names_in_") and self.scaler.feature_names_in_ is not None:
                    assert list(x_df.columns) == list(self.scaler.feature_names_in_)
                    assert x_df.shape[1] == self.scaler.n_features_in_
                x_scaled = self.scaler.transform(x_df) if self.scaler is not None else x_df.values
                return torch.tensor(x_scaled, dtype=torch.float32).unsqueeze(0).to(self.device)
        elif isinstance(data, torch.Tensor):
            if data.dim() == 2:
                data = data.unsqueeze(0)
            return data.to(self.device)
        elif isinstance(data, np.ndarray):
            if data.ndim == 2:
                if data.shape[1] == len(self.feature_names) and data.shape[0] != 20 and self.scaler is not None:
                    x_df = pd.DataFrame(data, columns=self.feature_names)
                    x_scaled = self.scaler.transform(x_df)
                    return torch.tensor(x_scaled, dtype=torch.float32).unsqueeze(0).to(self.device)
            t = torch.tensor(data, dtype=torch.float32)
            if t.dim() == 2:
                t = t.unsqueeze(0)
            return t.to(self.device)
        return data

    def predict_proba(self, x: Any) -> np.ndarray:
        tensor_in = self.preprocess(x)
        self.model.eval()
        with torch.no_grad():
            logits = self.model(tensor_in)
            probs = F.softmax(logits, dim=-1).cpu().numpy()
        return probs

    def predict(self, x: Any, threshold: Optional[float] = None) -> np.ndarray:
        thresh = threshold if threshold is not None else self.threshold
        probs = self.predict_proba(x)
        p_commit = probs[..., 1]
        return (p_commit >= thresh).astype(int)


# ============================================================
# 5. PATCHTST ADAPTER
# ============================================================
class PatchTSTAdapter(ResearchModelAdapter):
    def __init__(self, config: dict):
        super().__init__("PatchTST", config)
        self.feature_names = config["features"]["patchtst_44"]
        self.threshold = config["models"]["patchtst"].get("decision_threshold", 0.50)

    def load(self, checkpoint_path: Optional[str] = None) -> None:
        ckpt_path = resolve_resource_path(checkpoint_path or self.config["models"]["patchtst"]["checkpoint"])
        ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
        self.scaler = ckpt["scaler"]
        self.feature_names = ckpt.get("feature_cols", self.feature_names)
        self.model = PatchTST(num_features=len(self.feature_names), seq_len=20, patch_len=5, stride=2, d_model=128, n_heads=4, n_layers=3, dropout=0.2)
        self.model.load_state_dict(ckpt["model_state_dict"])
        self.model.to(self.device)
        self.model.eval()
        self.is_loaded = True

    def validate(self) -> bool:
        assert self.is_loaded, "Model not loaded"
        test_df = pd.DataFrame(np.random.randn(20, len(self.feature_names)), columns=self.feature_names)
        test_df["event_id"] = 1
        test_df["time_index"] = range(20)
        out = self.preprocess(test_df)
        assert out.shape == (1, 20, len(self.feature_names)), f"Expected shape (1, 20, {len(self.feature_names)}), got {out.shape}"
        return True

    def preprocess(self, data: Any) -> torch.Tensor:
        if isinstance(data, pd.DataFrame):
            df_proc = data.copy()
            for orb in ["GEO", "LEO", "MEO"]:
                if f"orbit_type_{orb}" not in df_proc.columns and "orbit_type" in df_proc.columns:
                    df_proc[f"orbit_type_{orb}"] = (df_proc["orbit_type"] == orb).astype(float)
            if "event_id" in df_proc.columns:
                grouped = df_proc.groupby("event_id")
                tensors = []
                for eid, group in grouped:
                    grp = group.sort_values("normalized_step" if "normalized_step" in group.columns else "time_index")
                    x_df = grp[self.feature_names]
                    if hasattr(self.scaler, "feature_names_in_") and self.scaler.feature_names_in_ is not None:
                        assert list(x_df.columns) == list(self.scaler.feature_names_in_)
                        assert x_df.shape[1] == self.scaler.n_features_in_
                    x_scaled = self.scaler.transform(x_df)
                    tensors.append(torch.tensor(x_scaled, dtype=torch.float32))
                return torch.stack(tensors).to(self.device)
            else:
                x_df = df_proc[self.feature_names]
                if hasattr(self.scaler, "feature_names_in_") and self.scaler.feature_names_in_ is not None:
                    assert list(x_df.columns) == list(self.scaler.feature_names_in_)
                    assert x_df.shape[1] == self.scaler.n_features_in_
                x_scaled = self.scaler.transform(x_df)
                return torch.tensor(x_scaled, dtype=torch.float32).unsqueeze(0).to(self.device)
        elif isinstance(data, torch.Tensor):
            if data.dim() == 2:
                data = data.unsqueeze(0)
            return data.to(self.device)
        elif isinstance(data, np.ndarray):
            if data.ndim == 2:
                if data.shape[1] == len(self.feature_names) and data.shape[0] != 20 and self.scaler is not None:
                    x_df = pd.DataFrame(data, columns=self.feature_names)
                    x_scaled = self.scaler.transform(x_df)
                    return torch.tensor(x_scaled, dtype=torch.float32).unsqueeze(0).to(self.device)
            t = torch.tensor(data, dtype=torch.float32)
            if t.dim() == 2:
                t = t.unsqueeze(0)
            return t.to(self.device)
        return data

    def predict_proba(self, x: Any) -> np.ndarray:
        tensor_in = self.preprocess(x)
        self.model.eval()
        with torch.no_grad():
            logits = self.model(tensor_in)
            probs = F.softmax(logits, dim=-1).cpu().numpy()
        return probs

    def predict(self, x: Any, threshold: Optional[float] = None) -> np.ndarray:
        thresh = threshold if threshold is not None else self.threshold
        probs = self.predict_proba(x) # (B, 2)
        p_commit = probs[:, 1]
        return (p_commit >= thresh).astype(int)


# ============================================================
# 6. XGBOOST ADAPTER
# ============================================================
class XGBoostAdapter(ResearchModelAdapter):
    def __init__(self, config: dict):
        super().__init__("XGBoost", config)
        self.feature_names = config["features"]["xgboost_45"]
        self.threshold = config["models"]["xgboost"].get("decision_threshold", 0.50)

    def load(self, checkpoint_path: Optional[str] = None) -> None:
        ckpt_path = resolve_resource_path(checkpoint_path or self.config["models"]["xgboost"]["checkpoint"])
        ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
        self.model = ckpt["xgboost_model"]
        self.feature_names = ckpt.get("feature_columns", self.feature_names)
        self.is_loaded = True

    def validate(self) -> bool:
        assert self.is_loaded, "Model not loaded"
        test_tensor = pd.DataFrame(np.random.randn(5, len(self.feature_names)), columns=self.feature_names)
        probs = self.model.predict_proba(test_tensor)
        assert probs.shape == (5, 2), f"Expected shape (5, 2), got {probs.shape}"
        return True

    def preprocess(self, data: Any) -> pd.DataFrame:
        if isinstance(data, pd.DataFrame):
            df_proc = data.copy()
            for orb in ["GEO", "LEO", "MEO"]:
                if f"orbit_type_{orb}" not in df_proc.columns and "orbit_type" in df_proc.columns:
                    df_proc[f"orbit_type_{orb}"] = (df_proc["orbit_type"] == orb).astype(float)
            return df_proc[self.feature_names]
        elif isinstance(data, (np.ndarray, torch.Tensor)):
            arr = data.cpu().numpy() if isinstance(data, torch.Tensor) else data
            if arr.ndim == 3: # (batch, 20, 45) -> reshape to (batch*20, 45)
                arr = arr.reshape(-1, arr.shape[-1])
            return pd.DataFrame(arr, columns=self.feature_names)
        return data

    def predict_proba(self, x: Any) -> np.ndarray:
        df_in = self.preprocess(x)
        probs = self.model.predict_proba(df_in)
        return probs

    def predict(self, x: Any, threshold: Optional[float] = None) -> np.ndarray:
        thresh = threshold if threshold is not None else self.threshold
        probs = self.predict_proba(x) # (N, 2)
        p_commit = probs[:, 1]
        return (p_commit >= thresh).astype(int)


# Factory Function
def get_adapter(model_name: str, config: dict) -> ResearchModelAdapter:
    name_map = {
        "gru": GRUAdapter,
        "lstm": LSTMAdapter,
        "tcn": TCNAdapter,
        "transformer": TransformerAdapter,
        "patchtst": PatchTSTAdapter,
        "xgboost": XGBoostAdapter
    }
    key = model_name.lower()
    if key not in name_map:
        raise ValueError(f"Unknown model name {model_name}. Available: {list(name_map.keys())}")
    adapter = name_map[key](config)
    adapter.load()
    adapter.validate()
    return adapter
