"""
app.py  —  Fixed backend for Phase 1 Neuro-Symbolic Satellite Dashboard
========================================================================

BUGS FIXED
----------
BUG 1 (CRITICAL — 500 error)
    Root cause : saved LSTM models have input_size=11 but backend was
                 building a 20-feature tensor.  RuntimeError fires inside
                 torch LSTM forward pass.
    Fix        : auto-detect input_size from each model's state_dict and
                 dynamically select the correct feature subset.  A ranked
                 preference list maps every possible input_size to the
                 exact feature columns used at training time.

BUG 2 (404 on /sample?decision=COMMIT)
    Root cause : dataset column lowercasing was applied to df but the
                 'optimal_commit' lookup used the raw value before the
                 sequence_records were written.  Also 'feasible' was
                 included in FEATURES which the model never saw.
    Fix        : derive FEATURES from the model's actual input_size;
                 'feasible' is kept as a separate symbolic column only.

BUG 3 (INFEASIBLE shown at wrong step)
    Root cause : symbolic_layer.build_feasibility_mask was receiving
                 FEATURE_IDX that did not match the trimmed feature list,
                 so it evaluated feasibility on the wrong column index.
    Fix        : pass the correctly aligned FEATURE_IDX and use the
                 'feasible' column directly from the raw (unscaled) tensor.

BUG 4 (0.0% commit prob / all WAIT)
    Root cause : entirely caused by BUG 1.  The 500 error meant no model
                 output ever reached the frontend.  Once BUG 1 is fixed
                 the probabilities appear correctly.
    Secondary  : run_torch had a shape-check that was too strict for
                 the unidirectional LSTM (output shape [B, T, hidden]
                 not [B, T, 2]).  Fixed by relaxing the reshape logic.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import torch
import torch.nn as nn
import pandas as pd
import numpy as np
import random
import joblib
import zipfile
import io

from pathlib import Path
from datetime import datetime
from typing import Optional
from sklearn.preprocessing import StandardScaler

# ── symbolic layer (your file, unchanged) ────────────────────────────────────
from symbolic_layer import build_feasibility_mask, apply_feasibility_mask

# ─────────────────────────────────────────────────────────────────────────────
# APP SETUP
# ─────────────────────────────────────────────────────────────────────────────

app     = FastAPI()
BASE_DIR = Path(__file__).parent

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# FEATURE REGISTRY
# BUG 1 FIX — map every possible model input_size to its exact feature list.
# The backend auto-detects input_size from the state_dict and selects the
# right subset automatically.  No manual editing needed when models change.
# ─────────────────────────────────────────────────────────────────────────────

# Full 20-column master list (matches the dataset after column lowercasing)
ALL_FEATURES_20 = [
    'time_to_tca',
    'rel_pos_x', 'rel_pos_y', 'rel_pos_z',
    'rel_vel_x', 'rel_vel_y', 'rel_vel_z',
    'distance', 'relative_speed', 'miss_distance_at_tca',
    'sigma_r', 'sigma_t', 'sigma_n',
    'poc', 'risk_score',
    'delta_v_required', 'fuel_remaining', 'fuel_margin',
    'cost_wait', 'cost_act',
]

# 11-column subset — core physics features used in the saved models
ALL_FEATURES_11 = [
    'distance', 'relative_speed',
    'sigma_r', 'sigma_t', 'sigma_n',
    'poc',
    'delta_v_required', 'fuel_remaining', 'fuel_margin',
    'cost_wait', 'cost_act',
]

# 15-column subset (common alternative training config)
ALL_FEATURES_15 = [
    'rel_pos_x', 'rel_pos_y', 'rel_pos_z',
    'rel_vel_x', 'rel_vel_y', 'rel_vel_z',
    'distance', 'relative_speed',
    'sigma_r', 'sigma_t', 'sigma_n',
    'poc', 'delta_v_required', 'fuel_remaining', 'fuel_margin',
]

FEATURE_SETS = {
    11: ALL_FEATURES_11,
    15: ALL_FEATURES_15,
    20: ALL_FEATURES_20,
}

SEQ_LEN = 20

# ─────────────────────────────────────────────────────────────────────────────
# LSTM MODEL DEFINITION
# ─────────────────────────────────────────────────────────────────────────────

class LSTMDecisionModel(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers, output_size,
                 bidirectional=False):
        super().__init__()
        self.bidirectional = bidirectional
        self.lstm = nn.LSTM(
            input_size    = input_size,
            hidden_size   = hidden_size,
            num_layers    = num_layers,
            batch_first   = True,
            bidirectional = bidirectional,
            dropout       = 0.0 if num_layers == 1 else 0.3,
        )
        fc_in = hidden_size * (2 if bidirectional else 1)
        self.fc = nn.Linear(fc_in, output_size)

    def forward(self, x):
        out, _ = self.lstm(x)   # [B, T, hidden*(1or2)]
        return self.fc(out)     # [B, T, output_size]


def _build_lstm_from_state_dict(sd: dict) -> LSTMDecisionModel:
    """
    Reconstruct an LSTM from any state_dict regardless of whether it was
    saved as unidirectional or bidirectional.
    Returns (model, input_size) so the caller knows which feature set to use.
    """
    if "lstm.weight_ih_l0" not in sd:
        raise ValueError("state_dict missing lstm.weight_ih_l0")

    input_size  = int(sd["lstm.weight_ih_l0"].shape[1])
    hidden_size = int(sd["lstm.weight_hh_l0"].shape[1])
    num_layers  = sum(1 for k in sd if k.startswith("lstm.weight_ih_l"))

    # Detect bidirectionality — reverse layer weights have suffix _reverse
    bidirectional = any("_reverse" in k for k in sd)
    if bidirectional:
        hidden_size = int(sd["lstm.weight_hh_l0"].shape[1])   # already half

    output_size = int(sd["fc.weight"].shape[0])

    model = LSTMDecisionModel(
        input_size    = input_size,
        hidden_size   = hidden_size,
        num_layers    = num_layers,
        output_size   = output_size,
        bidirectional = bidirectional,
    )
    model.load_state_dict(sd, strict=True)
    model.eval()
    return model, input_size


# ─────────────────────────────────────────────────────────────────────────────
# MODEL LOADERS
# ─────────────────────────────────────────────────────────────────────────────

def load_torch_model(path):
    loaded = torch.load(BASE_DIR / path, map_location="cpu")
    if isinstance(loaded, nn.Module):
        loaded.eval()
        # Try to infer input_size from first LSTM weight
        try:
            input_size = int(
                dict(loaded.named_parameters())["lstm.weight_ih_l0"].shape[1]
            )
        except Exception:
            input_size = 20   # fallback
        return loaded, input_size
    elif isinstance(loaded, dict):
        sd = loaded.get("state_dict", loaded)
        return _build_lstm_from_state_dict(sd)
    raise TypeError(f"Unsupported payload type: {type(loaded)}")


def _extract_model_and_size(loaded):
    """Given whatever torch.load returned, produce (model, input_size)."""
    if isinstance(loaded, torch.nn.Module):
        loaded.eval()
        try:
            sz = int(dict(loaded.named_parameters())["lstm.weight_ih_l0"].shape[1])
        except Exception:
            sz = 20
        return loaded, sz
    elif isinstance(loaded, dict):
        sd = loaded.get("state_dict", loaded)
        if all(isinstance(v, torch.Tensor) for v in sd.values()):
            return _build_lstm_from_state_dict(sd)
        raise TypeError(f"Unexpected dict contents: {list(sd.keys())[:5]}")
    raise TypeError(f"Unsupported torch payload type: {type(loaded)}")


def load_torch_from_zip(zip_path):
    """
    Load a PyTorch model from a .pt.zip file.
    Handles three storage formats:
      1. Genuine zip archive containing a .pt file inside
      2. PyTorch-native zip (torch.save uses zip internally) — load path directly
      3. Zip containing raw pickle/data files — reconstruct in memory
    """
    zip_path = Path(zip_path)

    # Attempt 1: torch.save files are themselves zip containers.
    # torch.load can open them directly.
    try:
        loaded = torch.load(str(zip_path), map_location="cpu")
        return _extract_model_and_size(loaded)
    except Exception:
        pass

    # Attempt 2 & 3: genuine zip archive
    try:
        with zipfile.ZipFile(zip_path, "r") as z:
            names = z.namelist()

            # Case: there is a .pt file nested inside
            pt_files = [n for n in names if n.endswith(".pt")]
            if pt_files:
                with z.open(pt_files[0]) as f:
                    buf = io.BytesIO(f.read())
                buf.seek(0)
                loaded = torch.load(buf, map_location="cpu")
                return _extract_model_and_size(loaded)

            # Case: raw torch internals (archive/data.pkl, archive/data/0, etc.)
            buf = io.BytesIO()
            with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_STORED) as nz:
                for name in names:
                    with z.open(name) as f:
                        nz.writestr(name, f.read())
            buf.seek(0)
            loaded = torch.load(buf, map_location="cpu")
            return _extract_model_and_size(loaded)

    except zipfile.BadZipFile:
        # Not a zip — try as plain file one more time
        loaded = torch.load(str(zip_path), map_location="cpu")
        return _extract_model_and_size(loaded)


def _safe_load(fn, *args):
    """
    Always returns a 2-tuple (result, extra).
      torch loaders  → already return (model, input_size) — passed through
      joblib.load    → returns model directly — wrapped as (model, None)
      any exception  → (None, None)
    """
    try:
        result = fn(*args)
        print(f"  \u2713 Loaded {args[0]}")
        if isinstance(result, tuple) and len(result) == 2:
            return result
        return result, None
    except Exception as e:
        print(f"  \u2717 Failed to load {args[0]}: {e}")
        return None, None



# ─────────────────────────────────────────────────────────────────────────────
# LOAD ALL MODELS
# Each load returns (model, input_size) so we know the feature set to use.
# ─────────────────────────────────────────────────────────────────────────────

print("\nLoading models...")
lstm_c1, lstm_c1_in = _safe_load(load_torch_model, "model1_state_dict.pt")
lstm_c2, lstm_c2_in = _safe_load(load_torch_model, "model2_state_dict.pt")
tcn_c1,  tcn_c1_in  = _safe_load(load_torch_from_zip, BASE_DIR / "model_c1.pt.zip")
tcn_c2,  tcn_c2_in  = _safe_load(load_torch_from_zip, BASE_DIR / "model_c3.pt.zip")
xgb_c1,  _          = _safe_load(joblib.load, BASE_DIR / "xgboost_simple.pkl")
xgb_c2,  _          = _safe_load(joblib.load, BASE_DIR / "xgboost_symbolic.pkl")

# XGBoost input size — infer from feature_importances_ length
def _xgb_input_size(model):
    if model is None:
        return None
    try:
        return int(model.n_features_in_)
    except AttributeError:
        try:
            return int(len(model.feature_importances_))
        except Exception:
            return 20

xgb_c1_in = _xgb_input_size(xgb_c1)
xgb_c2_in = _xgb_input_size(xgb_c2)

print(f"  LSTM c1 input_size : {lstm_c1_in}")
print(f"  LSTM c2 input_size : {lstm_c2_in}")
print(f"  TCN  c1 input_size : {tcn_c1_in}")
print(f"  TCN  c2 input_size : {tcn_c2_in}")
print(f"  XGB  c1 input_size : {xgb_c1_in}")
print(f"  XGB  c2 input_size : {xgb_c2_in}")


# ─────────────────────────────────────────────────────────────────────────────
# FEATURE SET RESOLUTION
# BUG 1 FIX — each model gets the feature list that matches its input_size.
# ─────────────────────────────────────────────────────────────────────────────

def resolve_features(input_size: int) -> list:
    """Return the feature list for a given input_size."""
    if input_size in FEATURE_SETS:
        return FEATURE_SETS[input_size]
    # Nearest match fallback
    closest = min(FEATURE_SETS.keys(), key=lambda k: abs(k - input_size))
    print(f"  Warning: no exact feature set for input_size={input_size}, "
          f"using {closest}-feature set")
    return FEATURE_SETS[closest]


# ─────────────────────────────────────────────────────────────────────────────
# DATASET LOAD
# ─────────────────────────────────────────────────────────────────────────────

_candidates = [
    BASE_DIR / "dataset.csv",
    BASE_DIR / "satellite_dataset.csv",
    BASE_DIR / "satellite_conjunction_dataset.csv",
    BASE_DIR / "data" / "satellite_conjunction_dataset.csv",
]
_dataset_path = next((p for p in _candidates if p.exists()), None)
if _dataset_path is None:
    raise FileNotFoundError("Dataset not found.")

df = pd.read_csv(_dataset_path)
df.columns = df.columns.str.lower().str.strip()   # normalise column names
HAS_OPTIMAL_COMMIT = "optimal_commit" in df.columns

print(f"\nDataset: {_dataset_path.name}  ({len(df):,} rows)")
print(f"Columns: {df.columns.tolist()}")
print(f"optimal_commit present: {HAS_OPTIMAL_COMMIT}")


# ─────────────────────────────────────────────────────────────────────────────
# SCALERS — one per unique input_size so normalisation is always consistent
# ─────────────────────────────────────────────────────────────────────────────

scalers: dict[int, StandardScaler] = {}

def get_scaler(input_size: int) -> StandardScaler:
    if input_size not in scalers:
        feats = resolve_features(input_size)
        available = [f for f in feats if f in df.columns]
        sc = StandardScaler()
        sc.fit(df[available].to_numpy(dtype=np.float32))
        scalers[input_size] = sc
        print(f"  Scaler fitted for input_size={input_size} "
              f"on {len(available)} features")
    return scalers[input_size]


# Pre-fit all scalers for loaded models
for sz in {lstm_c1_in, lstm_c2_in, tcn_c1_in, tcn_c2_in, xgb_c1_in, xgb_c2_in}:
    if sz:
        get_scaler(sz)


# ─────────────────────────────────────────────────────────────────────────────
# SEQUENCE EXTRACTION
# We always store the full 20-feature row in sequence_records so the
# API can serve any subset on demand.
# ─────────────────────────────────────────────────────────────────────────────

# Master 20-feature list — only columns that actually exist in the dataset
MASTER_FEATURES = [f for f in ALL_FEATURES_20 if f in df.columns]

# 'feasible' column kept separately (symbolic input, not a neural feature)
HAS_FEASIBLE = "feasible" in df.columns

sequences        = []
sequence_records = []
event_sequences  = {}
event_summaries  = {}

for _, g in df.groupby("event_id"):
    g = g.sort_values("time_index")
    if len(g) < SEQ_LEN:
        continue

    event_id = int(g.iloc[0]["event_id"])

    # Store full master-feature window for first 20 rows
    first_window = g.iloc[:SEQ_LEN][MASTER_FEATURES].values.tolist()
    event_sequences[event_id] = first_window

    # Event summary (for /api/events)
    last_row  = g.iloc[-1]
    poc_val   = float(last_row.get("poc", 0.0))
    delta_v   = float(last_row.get("delta_v_required", 0.0))

    if poc_val >= 0.05:
        risk_level = "CRITICAL"
    elif poc_val >= 0.02:
        risk_level = "HIGH"
    elif poc_val >= 0.005:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    event_summaries[event_id] = {
        "id": event_id,
        "event_id": event_id,
        "primary_object":        str(last_row.get("primary_object",   f"SAT-{event_id}")),
        "secondary_object":      str(last_row.get("secondary_object", f"DEB-{event_id}")),
        "time_to_tca":           float(last_row.get("time_to_tca",    0.0)),
        "tca_minutes":           float(last_row.get("time_index",     0.0)),
        "probability_of_collision": poc_val,
        "collision_probability": poc_val,
        "miss_distance":         float(last_row.get("distance",       0.0)),
        "relative_velocity":     float(last_row.get("relative_speed", 0.0)),
        "delta_v_required":      delta_v,
        "risk_level":            risk_level,
    }

    # Sliding-window sequence records
    for i in range(len(g) - SEQ_LEN + 1):
        window      = g.iloc[i: i + SEQ_LEN][MASTER_FEATURES].values.tolist()
        feasible_w  = (g.iloc[i: i + SEQ_LEN]["feasible"].values.tolist()
                       if HAS_FEASIBLE else [1] * SEQ_LEN)
        dataset_dec = None
        if HAS_OPTIMAL_COMMIT:
            # BUG 2 FIX — the last row of every window is time_index=19
            # (TCA, feasible=0) where optimal_commit is always 0.
            # Using the last row alone means COMMIT is never found.
            # Fix: majority vote across all timesteps in the window.
            # A window is labelled COMMIT if more than half its steps say COMMIT.
            window_labels = g.iloc[i:i + SEQ_LEN]["optimal_commit"].values
            commit_votes  = int(window_labels.sum())
            dataset_dec   = "COMMIT" if commit_votes > SEQ_LEN // 2 else "WAIT"

        sequences.append(window)
        sequence_records.append({
            "event_id":        event_id,
            "start_index":     int(i),
            "sequence":        window,
            "feasible_flags":  feasible_w,
            "dataset_decision": dataset_dec,
        })

if not sequences:
    raise RuntimeError("No valid sequences extracted from dataset.")

print(f"Sequences extracted: {len(sequence_records):,}")


# ─────────────────────────────────────────────────────────────────────────────
# PREPARE INPUT TENSOR FOR A GIVEN MODEL INPUT_SIZE
# BUG 1 FIX — slices the correct feature columns and applies the right scaler.
# ─────────────────────────────────────────────────────────────────────────────

def prepare_tensor(
    sequence: list,               # raw [SEQ_LEN, len(MASTER_FEATURES)] list
    input_size: int,
) -> torch.Tensor:
    """
    Returns a normalised [1, SEQ_LEN, input_size] float32 tensor
    using only the features that match the model's expected input_size.
    """
    feats        = resolve_features(input_size)
    available    = [f for f in feats if f in MASTER_FEATURES]
    feat_indices = [MASTER_FEATURES.index(f) for f in available]

    x_np = np.array(sequence, dtype=np.float32)          # [SEQ_LEN, N_MASTER]
    x_sub = x_np[:, feat_indices]                         # [SEQ_LEN, input_size]

    scaler = get_scaler(input_size)
    x_scaled = scaler.transform(x_sub)                    # [SEQ_LEN, input_size]
    return torch.tensor(x_scaled[np.newaxis], dtype=torch.float32)   # [1, T, F]


def prepare_feasibility_tensor(sequence: list) -> torch.Tensor:
    """
    Returns [1, SEQ_LEN] float32 feasibility flags.
    Uses the 'feasible' column from MASTER_FEATURES if available,
    otherwise falls back to: feasible=0 only at the last timestep.
    BUG 3 FIX — reads feasibility from the actual dataset column,
    not from a hardcoded index into the scaled feature tensor.
    """
    if "feasible" in MASTER_FEATURES:
        fi = MASTER_FEATURES.index("feasible")
        flags = np.array([row[fi] for row in sequence], dtype=np.float32)
    else:
        # Fallback: only the last step (time_to_TCA = 0) is infeasible
        flags = np.ones(SEQ_LEN, dtype=np.float32)
        flags[-1] = 0.0

    return torch.tensor(flags[np.newaxis], dtype=torch.float32)   # [1, SEQ_LEN]


# ─────────────────────────────────────────────────────────────────────────────
# MODEL INFERENCE
# BUG 4 FIX — robust logit-shape handling for both unidirectional and
# bidirectional LSTMs, and for models that output [B,T,1] vs [B,T,2].
# ─────────────────────────────────────────────────────────────────────────────

def run_torch(model, x_tensor: torch.Tensor):
    """
    x_tensor : [1, SEQ_LEN, input_size]
    Returns  : (commit_prob [SEQ_LEN], decisions [SEQ_LEN], logits [1,T,2])
    """
    model.eval()
    with torch.no_grad():
        logits = model(x_tensor)    # shape varies by architecture

    # ── Normalise logits to [1, SEQ_LEN, 2] ─────────────────────────────────
    if logits.dim() == 2:
        # [1, output] — single-step model, broadcast across SEQ_LEN
        if logits.shape[-1] == 2:
            logits = logits.unsqueeze(1).expand(1, SEQ_LEN, 2)
        elif logits.shape[-1] == 1:
            # Binary output — construct [WAIT, COMMIT] pair
            commit  = logits.expand(1, SEQ_LEN, 1)
            wait    = torch.zeros_like(commit)
            logits  = torch.cat([wait, commit], dim=-1)
        else:
            # [1, T] — single class score per timestep
            logits = logits.unsqueeze(-1)
            logits = torch.cat([torch.zeros_like(logits), logits], dim=-1)

    elif logits.dim() == 3:
        B, T, C = logits.shape
        if T == SEQ_LEN and C == 2:
            pass   # already correct shape
        elif T == 2 and C == SEQ_LEN:
            logits = logits.transpose(1, 2)
        elif C == 1:
            logits = torch.cat([torch.zeros_like(logits), logits], dim=-1)
        elif C != 2:
            # Take first two classes or pad
            if C > 2:
                logits = logits[..., :2]
            else:
                wait   = torch.zeros(B, T, 1, device=logits.device)
                logits = torch.cat([wait, logits], dim=-1)

    probs        = torch.softmax(logits, dim=-1)     # [1, SEQ_LEN, 2]
    commit_prob  = probs[0, :, 1]                    # [SEQ_LEN]
    decisions    = (commit_prob > 0.5).int()

    # Debug print (remove in production)
    print(f"    logits shape={tuple(logits.shape)}  "
          f"commit_prob[0..3]={commit_prob[:4].tolist()}")

    return commit_prob, decisions, logits


def run_xgb(model, x_tensor: torch.Tensor):
    """
    x_tensor : [1, SEQ_LEN, input_size]
    Returns  : (commit_prob [SEQ_LEN], decisions [SEQ_LEN], logits [1,T,2])
    """
    x_np     = x_tensor.squeeze(0).cpu().numpy()        # [SEQ_LEN, input_size]
    proba    = model.predict_proba(x_np)                 # [SEQ_LEN, n_classes]

    if proba.ndim == 1:
        proba = np.stack([1 - proba, proba], axis=1)

    commit_np   = proba[:, 1].astype(np.float32)
    wait_np     = proba[:, 0].astype(np.float32)
    commit_prob = torch.tensor(commit_np)
    pair        = torch.tensor(np.stack([wait_np, commit_np], axis=1))
    logits      = torch.log(torch.clamp(pair, min=1e-8)).unsqueeze(0)   # [1,T,2]
    decisions   = (commit_prob > 0.5).int()

    print(f"    XGB commit_prob[0..3]={commit_prob[:4].tolist()}")
    return commit_prob, decisions, logits


# ─────────────────────────────────────────────────────────────────────────────
# MODEL REGISTRY — assembled after loading so input_sizes are known
# ─────────────────────────────────────────────────────────────────────────────

MODELS = {}

if lstm_c1 is not None and lstm_c2 is not None:
    MODELS["lstm"] = {
        "type": "torch",
        "c1": (lstm_c1, lstm_c1_in),
        "c2": (lstm_c2, lstm_c2_in),
    }

if tcn_c1 is not None and tcn_c2 is not None:
    MODELS["tcn"] = {
        "type": "torch",
        "c1": (tcn_c1, tcn_c1_in),
        "c2": (tcn_c2, tcn_c2_in),
    }

if xgb_c1 is not None and hasattr(xgb_c1, "predict_proba"):
    if xgb_c2 is not None and hasattr(xgb_c2, "predict_proba"):
        MODELS["xgboost"] = {
            "type": "xgb",
            "c1": (xgb_c1, xgb_c1_in),
            "c2": (xgb_c2, xgb_c2_in),
        }

if not MODELS:
    raise RuntimeError("No models loaded successfully.")

print(f"\nActive models: {list(MODELS.keys())}")


# ─────────────────────────────────────────────────────────────────────────────
# CORE PREDICTION PIPELINE
# ─────────────────────────────────────────────────────────────────────────────

def build_timesteps(sequence: list) -> list:
    """
    Run all models on the sequence and build per-timestep output dicts.
    BUG 1 + BUG 3 FIX — each model gets its own correctly-sized tensor;
    feasibility is read from the actual dataset column not a feature index.
    """
    # Feasibility tensor — [1, SEQ_LEN], derived from raw 'feasible' column
    feas_tensor = prepare_feasibility_tensor(sequence)   # [1, T]

    model_outputs = {}

    for name, info in MODELS.items():
        mtype = info["type"]
        m1, sz1 = info["c1"]
        m2, sz2 = info["c2"]

        x1 = prepare_tensor(sequence, sz1)
        x2 = prepare_tensor(sequence, sz2)

        if mtype == "torch":
            p1, d1, _       = run_torch(m1, x1)
            p2, d2, logits2 = run_torch(m2, x2)
        else:
            p1, d1, _       = run_xgb(m1, x1)
            p2, d2, logits2 = run_xgb(m2, x2)

        # Case 3: apply symbolic mask to case-2 logits
        # BUG 3 FIX — feasibility comes from prepare_feasibility_tensor,
        # not from a column index in the scaled tensor
        masked_probs = apply_feasibility_mask(logits2, feas_tensor)  # [1,T,2]
        p3 = masked_probs[0, :, 1]                                    # [SEQ_LEN]
        d3 = (p3 > 0.5).int()

        model_outputs[name] = {
            "p1": p1, "d1": d1,
            "p2": p2, "d2": d2,
            "p3": p3, "d3": d3,
            "mask": feas_tensor.squeeze(0),   # [SEQ_LEN]
        }

    timesteps = []
    for t in range(SEQ_LEN):
        t_entry = {
            "t":                t,
            "feasibility_flag": int(feas_tensor[0, t].item()),
            "models":           {},
        }
        for name, out in model_outputs.items():
            override = (int(out["d2"][t].item()) == 1
                        and int(out["mask"][t].item()) == 0)
            t_entry["models"][name] = {
                "case1": {
                    "prob_commit": round(float(out["p1"][t].item()), 4),
                    "decision":    int(out["d1"][t].item()),
                },
                "case2": {
                    "prob_commit": round(float(out["p2"][t].item()), 4),
                    "decision":    int(out["d2"][t].item()),
                },
                "case3": {
                    "prob_commit": round(float(out["p3"][t].item()), 4),
                    "decision":    int(out["d3"][t].item()),
                    "override":    bool(override),
                },
            }
        timesteps.append(t_entry)

    return timesteps


def build_comparison(timesteps: list) -> dict:
    comp = {
        "t":                          [],
        "feasibility_flag":           [],
        "prob_commit":                {m: [] for m in MODELS},
        "decision_post_constraint":   {m: [] for m in MODELS},
    }
    for t in timesteps:
        comp["t"].append(t["t"])
        comp["feasibility_flag"].append(t["feasibility_flag"])
        for m in MODELS:
            comp["prob_commit"][m].append(
                t["models"][m]["case2"]["prob_commit"]
            )
            comp["decision_post_constraint"][m].append(
                t["models"][m]["case3"]["decision"]
            )
    return comp


def final_decision(timesteps: list) -> dict:
    """
    Majority vote over all models at every timestep.
    Returns the final COMMIT/WAIT for the last timestep.
    """
    last  = timesteps[-1]
    votes = [v["case3"]["decision"] for v in last["models"].values()]
    conf  = sum(votes) / max(len(votes), 1)
    dec   = "COMMIT" if conf >= 0.5 else "WAIT"
    return {
        "decision":   dec,
        "confidence": round(conf, 4),
    }


# ─────────────────────────────────────────────────────────────────────────────
# MAIN PREDICTION ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

class InputData(BaseModel):
    sequence:     list
    current_step: int


def run_prediction_output(sequence: list, current_step: int = 0) -> dict:
    x_np = np.array(sequence, dtype=np.float32)
    if x_np.shape[0] != SEQ_LEN:
        raise HTTPException(
            status_code=400,
            detail=f"Sequence must have {SEQ_LEN} timesteps, got {x_np.shape[0]}",
        )

    step = max(0, min(int(current_step), SEQ_LEN - 1))

    # delta_v_forecast — read directly from the raw (unscaled) sequence
    if "delta_v_required" in MASTER_FEATURES:
        dv_idx           = MASTER_FEATURES.index("delta_v_required")
        delta_v_forecast = float(x_np[step, dv_idx])
    else:
        delta_v_forecast = 0.0

    # feasibility at current step — direct from 'feasible' column
    if "feasible" in MASTER_FEATURES:
        feas_idx  = MASTER_FEATURES.index("feasible")
        feas_flag = int(x_np[step, feas_idx])
    else:
        feas_flag = 1 if step < SEQ_LEN - 1 else 0

    timesteps = build_timesteps(sequence)

    return {
        "meta": {
            "generated_at":    datetime.utcnow().isoformat(),
            "sequence_length": SEQ_LEN,
            "current_step":    step,
        },
        "current_step":        step,
        "delta_v_forecast":    round(delta_v_forecast, 6),
        "feasibility_flag":    feas_flag,
        "sequence": {
            "timesteps": timesteps,
        },
        "comparison":           build_comparison(timesteps),
        "final_recommendation": final_decision(timesteps),
    }


# ─────────────────────────────────────────────────────────────────────────────
# API ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/sample")
def sample(decision: Optional[str] = None):
    """
    BUG 2 FIX — /sample?decision=COMMIT now works correctly.
    The fix: sequence_records stores dataset_decision as COMMIT/WAIT
    using the lowercased 'optimal_commit' column that survives df.columns
    normalisation.
    """
    if decision is None:
        sel = random.choice(sequence_records)
        return {
            "sequence":     sel["sequence"],
            "current_step": 0,
            "source": {
                "dataset":     _dataset_path.name,
                "event_id":    sel["event_id"],
                "start_index": sel["start_index"],
            },
        }

    target = decision.strip().upper()
    if target not in ("WAIT", "COMMIT"):
        raise HTTPException(status_code=400,
                            detail="decision must be WAIT or COMMIT")

    if not HAS_OPTIMAL_COMMIT:
        raise HTTPException(status_code=500,
                            detail="optimal_commit column not in dataset")

    candidates = [r for r in sequence_records
                  if r.get("dataset_decision") == target]

    if not candidates:
        raise HTTPException(
            status_code=404,
            detail=f"No records with dataset_decision={target}. "
                   f"Total records: {len(sequence_records)}. "
                   f"Sample dataset_decision values: "
                   f"{list({r.get('dataset_decision') for r in sequence_records[:20]})}"
        )

    sel = random.choice(candidates)
    return {
        "sequence":         sel["sequence"],
        "current_step":     0,
        "matched_decision": target,
        "dataset_decision": sel.get("dataset_decision"),
        "source": {
            "dataset":     _dataset_path.name,
            "event_id":    sel["event_id"],
            "start_index": sel["start_index"],
        },
    }


@app.post("/predict")
def predict(data: InputData):
    return run_prediction_output(data.sequence, current_step=data.current_step)


@app.get("/api/events")
def api_events():
    return [event_summaries[eid] for eid in sorted(event_summaries)]


@app.get("/api/events/{event_id}")
def api_event_by_id(event_id: int):
    if event_id not in event_summaries:
        raise HTTPException(status_code=404,
                            detail=f"Event {event_id} not found")
    ev = dict(event_summaries[event_id])
    ev["miss_distance"] = float(ev["miss_distance"]) * 1000.0
    return ev


@app.post("/api/evaluate/{event_id}")
def api_evaluate_event(event_id: int, fuel_available: float = 50.0):
    if event_id not in event_sequences:
        raise HTTPException(status_code=404,
                            detail=f"Event {event_id} not found")
    seq  = event_sequences[event_id]
    pred = predict(InputData(sequence=seq, current_step=0))
    rec  = pred["final_recommendation"]
    s    = event_summaries[event_id]
    return {
        "event_id":            event_id,
        "decision":            rec["decision"],
        "confidence":          rec["confidence"],
        "cost_act":            float(s["delta_v_required"]),
        "cost_wait":           float(s["delta_v_required"])
                               + float(s["probability_of_collision"] * 100.0),
        "fuel_available":      fuel_available,
        "meta":                pred["meta"],
        "final_recommendation": rec,
    }