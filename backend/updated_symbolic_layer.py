"""
Common Symbolic Layer for Satellite Collision Avoidance Decision Models
========================================================================
Extracted strictly from model implementations:
- Capstone_GRU_Model.ipynb
- LSTM_model.ipynb
- Transformer_Encoder.ipynb
- TCN.ipynb
- xgboost.ipynb
- patchtst.ipynb

Implements:
1. Feature and Symbolic column definitions (SYMBOLIC_COLS, IDENTIFIERS, etc.)
2. Model-independent hard symbolic safety shield (apply_symbolic_safety_layer)
3. Physics-informed regularization loss (physics_informed_loss)
4. Symbolic model evaluation and timing analysis (evaluate_symbolic_model, analyze_timing)
5. Authoritative symbolic unit tests (run_symbolic_tests)
"""

from collections import Counter
import numpy as np
try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    pd = None
    HAS_PANDAS = False

try:
    import torch
    import torch.nn as nn
    HAS_TORCH = True
except ImportError:
    torch = None
    nn = None
    HAS_TORCH = False

try:
    from sklearn.metrics import (
        accuracy_score,
        precision_score,
        recall_score,
        f1_score,
        classification_report
    )
    HAS_SKLEARN = True
except ImportError:
    accuracy_score = None
    precision_score = None
    recall_score = None
    f1_score = None
    classification_report = None
    HAS_SKLEARN = False

# ============================================================
# 1. FEATURE DEFINITIONS & SYMBOLIC VARIABLE SPECIFICATIONS
# ============================================================

IDENTIFIERS = [
    "event_id",
    "time_index"
]

TARGET_COL = "commit_decision"

# Symbolic Constraints (Routed only to logic layer)
# Maintained in strict index order for deterministic access downstream.
# [0:feasibility, 1:tca, 2:man_window, 3:fuel, 4:deltav, 5:cost_act, 6:cost_wait, 7:poc]
SYMBOLIC_COLS = [
    "feasibility_flag",
    "time_to_TCA",
    "maneuver_window_remaining",
    "fuel_remaining",
    "deltav_required",
    "cost_of_acting",
    "cost_of_waiting",
    "poc"
]

# Leakage-Prone & Redundant Variables excluded from neural learning
EXCLUDED_DERIVED_COLS = [
    "orbit_type",
    "risk_score",
    "maneuver_capability_score",
    "environmental_disturbance_index"
]

ALL_EXCLUDED = list(set(IDENTIFIERS + [TARGET_COL] + SYMBOLIC_COLS + EXCLUDED_DERIVED_COLS))


# ============================================================
# 2. UNIFIED RESULT CONTAINER FOR SYMBOLIC SAFETY LAYER
# ============================================================

class SymbolicShieldResult(tuple):
    """
    Unified result object compatible across all model notebooks:
    - Supports 5-element tuple unpacking:
        raw_preds, final_preds, correction_mask, reasons, hard_infeasible = apply_symbolic_safety_layer(...)
    - Supports dictionary key access (TCN / tabular style):
        result["raw_prediction"], result["final_prediction"], result["hard_infeasible"],
        result["symbolic_correction"], result["reason"]
    - Supports attribute access:
        result.final_preds, result.hard_infeasible, result.reasons, etc.
    """
    def __new__(cls, raw_preds, final_preds, correction_mask, reasons, hard_infeasible):
        return super().__new__(cls, (raw_preds, final_preds, correction_mask, reasons, hard_infeasible))

    @property
    def raw_preds(self):
        return self[0]

    @property
    def raw_prediction(self):
        return self[0]

    @property
    def final_preds(self):
        return self[1]

    @property
    def final_prediction(self):
        return self[1]

    @property
    def correction_mask(self):
        return self[2]

    @property
    def symbolic_correction(self):
        return self[2]

    @property
    def reasons(self):
        return self[3]

    @property
    def reason(self):
        return self[3]

    @property
    def hard_infeasible(self):
        return self[4]

    def __getitem__(self, item):
        if isinstance(item, str):
            mapping = {
                "raw_preds": self[0],
                "raw_prediction": self[0],
                "final_preds": self[1],
                "final_prediction": self[1],
                "correction_mask": self[2],
                "symbolic_correction": self[2],
                "reasons": self[3],
                "reason": self[3],
                "hard_infeasible": self[4]
            }
            if item in mapping:
                return mapping[item]
            raise KeyError(f"Invalid key '{item}' for SymbolicShieldResult")
        return super().__getitem__(item)

    def get(self, key, default=None):
        try:
            return self[key]
        except KeyError:
            return default

    def keys(self):
        return ["raw_prediction", "final_prediction", "hard_infeasible", "symbolic_correction", "reason"]

    def values(self):
        return [self[0], self[1], self[4], self[2], self[3]]

    def items(self):
        return list(zip(self.keys(), self.values()))


# ============================================================
# 3. COMMON SYMBOLIC SAFETY SHIELD
# ============================================================

def apply_symbolic_safety_layer(
    raw_preds,
    symbolic_data=None,
    feasibility=None,
    time_to_tca=None,
    maneuver_window=None
):
    """
    Model-independent hard symbolic safety shield.
    Only converts unsafe COMMIT (1) to WAIT (0). Never converts WAIT to COMMIT.

    Deterministic Constraint Hierarchy:
    1. Physical Infeasibility: feasibility_flag <= 0 -> Reason: 'Physical infeasibility'
    2. TCA Reached / Passed:   time_to_TCA <= 0       -> Reason: 'TCA already occurred'
    3. Maneuver Expired:       maneuver_window <= 0   -> Reason: 'Maneuver window expired'

    Index mapping for symbolic_data tensor/array:
    [0:feasibility, 1:time_to_TCA, 2:maneuver_window_remaining, 3:fuel, 4:deltav, 5:cost_act, 6:cost_wait, 7:poc]

    Parameters
    ----------
    raw_preds : torch.Tensor, np.ndarray, or pd.Series
        Raw binary model predictions (0 for WAIT, 1 for COMMIT).
    symbolic_data : torch.Tensor, np.ndarray, or pd.DataFrame, optional
        Symbolic array or tensor where [..., 0]=feasibility, [..., 1]=tca, [..., 2]=window.
        If DataFrame, extracts 'feasibility_flag', 'time_to_TCA', 'maneuver_window_remaining'.
    feasibility : array-like or torch.Tensor, optional
        feasibility_flag column if passed separately.
    time_to_tca : array-like or torch.Tensor, optional
        time_to_TCA column if passed separately.
    maneuver_window : array-like or torch.Tensor, optional
        maneuver_window_remaining column if passed separately.

    Returns
    -------
    SymbolicShieldResult:
        (raw_preds, final_preds, correction_mask, reasons, hard_infeasible)
    """
    # --------------------------------------------------------
    # 1. Resolve inputs: Torch Tensor vs NumPy / Pandas
    # --------------------------------------------------------
    is_torch = HAS_TORCH and isinstance(raw_preds, torch.Tensor)

    # If symbolic_data is passed as 2nd positional argument
    if symbolic_data is not None:
        if HAS_PANDAS and isinstance(symbolic_data, pd.DataFrame):
            feas = symbolic_data["feasibility_flag"].to_numpy()
            tca = symbolic_data["time_to_TCA"].to_numpy()
            win = symbolic_data["maneuver_window_remaining"].to_numpy()
        elif is_torch and isinstance(symbolic_data, torch.Tensor):
            feas = symbolic_data[..., 0]
            tca = symbolic_data[..., 1]
            win = symbolic_data[..., 2]
        else:
            sym_arr = np.asarray(symbolic_data)
            feas = sym_arr[..., 0]
            tca = sym_arr[..., 1]
            win = sym_arr[..., 2]
    else:
        # Separate columns passed
        feas = feasibility
        tca = time_to_tca
        win = maneuver_window

    # --------------------------------------------------------
    # 2. Torch Tensor Implementation (GRU, LSTM, Transformer)
    # --------------------------------------------------------
    if is_torch:
        if not isinstance(feas, torch.Tensor):
            feas = torch.as_tensor(feas, dtype=torch.float32, device=raw_preds.device)
        if not isinstance(tca, torch.Tensor):
            tca = torch.as_tensor(tca, dtype=torch.float32, device=raw_preds.device)
        if not isinstance(win, torch.Tensor):
            win = torch.as_tensor(win, dtype=torch.float32, device=raw_preds.device)

        final_preds = raw_preds.clone()

        # Physical infeasibility conditions
        m_feas = (feas <= 0)
        m_tca = (tca <= 0)
        m_win = (win <= 0)

        hard_infeasible = m_feas | m_tca | m_win

        # Mask where raw is COMMIT and state is hard-infeasible
        correction_mask = (raw_preds == 1) & hard_infeasible

        # Apply hard override (COMMIT -> WAIT)
        final_preds[correction_mask] = 0

        # Generate auditable reasons using deterministic priority
        reasons = []
        feas_flat = m_feas.detach().cpu().numpy().reshape(-1)
        tca_flat = m_tca.detach().cpu().numpy().reshape(-1)
        win_flat = m_win.detach().cpu().numpy().reshape(-1)
        corr_flat = correction_mask.detach().cpu().numpy().reshape(-1)

        for i in range(len(corr_flat)):
            if corr_flat[i]:
                if feas_flat[i]:
                    reasons.append("Physical infeasibility")
                elif tca_flat[i]:
                    reasons.append("TCA already occurred")
                elif win_flat[i]:
                    reasons.append("Maneuver window expired")
                else:
                    reasons.append("No symbolic correction")
            else:
                reasons.append("No symbolic correction")

        return SymbolicShieldResult(
            raw_preds,
            final_preds,
            correction_mask,
            reasons,
            hard_infeasible
        )

    # --------------------------------------------------------
    # 3. NumPy / Pandas Implementation (TCN, XGBoost, PatchTST)
    # --------------------------------------------------------
    raw_np = np.asarray(raw_preds).astype(int)
    feas_np = np.asarray(feas)
    tca_np = np.asarray(tca)
    win_np = np.asarray(win)

    if not (raw_np.shape == feas_np.shape == tca_np.shape == win_np.shape):
        raise ValueError(
            f"Shape mismatch in symbolic safety layer: raw_preds={raw_np.shape}, "
            f"feasibility={feas_np.shape}, tca={tca_np.shape}, maneuver_window={win_np.shape}"
        )

    physical_infeasible = (feas_np <= 0)
    tca_reached = (tca_np <= 0)
    maneuver_window_expired = (win_np <= 0)

    hard_infeasible_np = (
        physical_infeasible
        | tca_reached
        | maneuver_window_expired
    )

    final_predictions_np = raw_np.copy()
    corrections_np = (raw_np == 1) & hard_infeasible_np
    final_predictions_np[corrections_np] = 0

    reasons_np = np.empty(raw_np.shape, dtype=object)
    reasons_np[:] = "No symbolic correction"
    reasons_np[corrections_np & physical_infeasible] = "Physical infeasibility"
    reasons_np[corrections_np & ~physical_infeasible & tca_reached] = "TCA already occurred"
    reasons_np[corrections_np & ~physical_infeasible & ~tca_reached & maneuver_window_expired] = "Maneuver window expired"

    # Convert reasons to standard list if 1D or flattened
    reasons_out = list(reasons_np.ravel()) if reasons_np.ndim <= 2 else reasons_np

    return SymbolicShieldResult(
        raw_np,
        final_predictions_np,
        corrections_np,
        reasons_out,
        hard_infeasible_np
    )


# ============================================================
# 4. PHYSICS-INFORMED REGULARIZATION LOSS
# ============================================================

def physics_informed_loss(
    logits,
    y_true,
    symbolic_data,
    criterion=None,
    lambda_phys=1.0
):
    """
    Soft Training Regularizer: L_total = L_CE + lambda_phys * L_NRP

    Penalizes non-zero COMMIT probabilities when in physically invalid states:
    infeasible_mask = (feasibility <= 0) | (time_to_tca <= 0) | (man_window <= 0)

    Parameters
    ----------
    logits : torch.Tensor
        Model output logits [batch, seq_len, 2] or [batch * seq_len, 2].
    y_true : torch.Tensor
        Ground truth labels [batch, seq_len] or [batch * seq_len].
    symbolic_data : torch.Tensor
        Symbolic tensor with [..., 0]=feasibility, [..., 1]=tca, [..., 2]=window,
        OR precomputed boolean feasibility mask (where mask < 0.5 is infeasible).
    criterion : nn.Module, optional
        Standard classification loss (default: nn.CrossEntropyLoss()).
    lambda_phys : float
        Physics regularization weight.

    Returns
    -------
    tuple: (L_total, L_ce, L_phys)
    """
    if not HAS_TORCH:
        raise ImportError("PyTorch is required to compute physics_informed_loss.")

    if criterion is None:
        criterion = nn.CrossEntropyLoss()

    L_ce = criterion(logits.reshape(-1, 2), y_true.reshape(-1))

    # Determine infeasibility mask
    if symbolic_data.dim() == 2 and symbolic_data.shape[-1] != len(SYMBOLIC_COLS) and symbolic_data.shape[-1] != 3:
        # Precomputed feasibility mask (1=feasible, 0=infeasible)
        infeasible_mask = (symbolic_data < 0.5)
    else:
        feasibility = symbolic_data[:, :, 0]
        time_to_tca = symbolic_data[:, :, 1]
        man_window = symbolic_data[:, :, 2]
        infeasible_mask = (feasibility <= 0) | (time_to_tca <= 0) | (man_window <= 0)

    probs = torch.softmax(logits, dim=-1)
    commit_probs = probs[:, :, 1] if logits.dim() == 3 else probs[:, 1]

    if infeasible_mask.any():
        L_phys = torch.mean((commit_probs[infeasible_mask]) ** 2)
    else:
        L_phys = torch.tensor(0.0, device=logits.device)

    L_total = L_ce + lambda_phys * L_phys

    return L_total, L_ce, L_phys


# ============================================================
# 5. SYMBOLIC MODEL EVALUATION (ABLATION ANALYSIS)
# ============================================================

def evaluate_symbolic_model(model, dataloader, model_name, device=None):
    """
    Evaluates a PyTorch neural model before and after applying the hard symbolic safety shield.
    Verifies that the symbolic safety shield eliminates all hard constraint violations.

    Parameters
    ----------
    model : torch.nn.Module
        Trained PyTorch model.
    dataloader : torch.utils.data.DataLoader
        DataLoader yielding (X, y, sym, metadata).
    model_name : str
        Display name for the model.
    device : torch.device, optional
        Computation device (inferred from model if None).

    Returns
    -------
    tuple: (all_y, all_raw, all_final, r_acc, s_acc, r_f1, s_f1, r_unsafe, s_unsafe)
    """
    if not HAS_TORCH:
        raise ImportError("PyTorch is required for evaluate_symbolic_model.")
    if not HAS_SKLEARN:
        raise ImportError("scikit-learn is required for evaluate_symbolic_model.")

    if device is None:
        device = next(model.parameters()).device

    model.eval()
    all_y, all_raw_preds, all_final_preds = [], [], []
    all_reasons, all_hard_infeasible = [], []

    with torch.no_grad():
        for batch in dataloader:
            X, y, sym = batch[0], batch[1], batch[2]
            X, y, sym = X.to(device), y.to(device), sym.to(device)

            logits = model(X)
            raw_preds = logits.argmax(dim=-1)

            _, final_preds, _, reasons, hard_infeasible = apply_symbolic_safety_layer(raw_preds, sym)

            all_y.extend(y.cpu().numpy().flatten())
            all_raw_preds.extend(raw_preds.cpu().numpy().flatten())
            all_final_preds.extend(final_preds.cpu().numpy().flatten())
            all_reasons.extend(reasons)
            all_hard_infeasible.extend(hard_infeasible.cpu().numpy().flatten())

    all_y = np.array(all_y)
    all_raw = np.array(all_raw_preds)
    all_final = np.array(all_final_preds)
    all_infeasible = np.array(all_hard_infeasible)

    # Raw metrics (Predictive Capability)
    r_acc = accuracy_score(all_y, all_raw)
    r_f1 = f1_score(all_y, all_raw, average="macro", zero_division=0)
    r_prec = precision_score(all_y, all_raw, zero_division=0)
    r_rec = recall_score(all_y, all_raw, zero_division=0)
    r_rep = classification_report(all_y, all_raw, output_dict=True, zero_division=0)
    r_commits = np.sum(all_raw == 1)
    r_unsafe = np.sum((all_raw == 1) & all_infeasible)

    # Final metrics (Complete Decision System Safety)
    s_acc = accuracy_score(all_y, all_final)
    s_f1 = f1_score(all_y, all_final, average="macro", zero_division=0)
    s_prec = precision_score(all_y, all_final, zero_division=0)
    s_rec = recall_score(all_y, all_final, zero_division=0)
    s_rep = classification_report(all_y, all_final, output_dict=True, zero_division=0)
    s_commits = np.sum(all_final == 1)
    s_unsafe = np.sum((all_final == 1) & all_infeasible)

    # FATAL ASSERTION: The shield MUST prevent all hard-constraint violations
    assert s_unsafe == 0, f"FATAL ERROR: Symbolic shield failed to prevent hard-constraint violations in {model_name}!"

    # Correction Stats & Compliance Rates
    corrections = np.sum(all_raw != all_final)
    correction_rate = corrections / max(len(all_y), 1)
    commit_reduction_rate = (r_commits - s_commits) / max(r_commits, 1)

    r_compliance = 1.0 - (r_unsafe / r_commits) if r_commits > 0 else 1.0
    s_compliance = 1.0 - (s_unsafe / s_commits) if s_commits > 0 else 1.0

    print(f"\n{'=' * 15} {model_name} EVALUATION {'=' * 15}")
    print(f"{'Metric':<28} | {'RAW MODEL':<15} | {'+ SYMBOLIC SHIELD':<15}")
    print("-" * 65)
    print(f"{'Accuracy':<28} | {r_acc:<15.4f} | {s_acc:<15.4f}")
    print(f"{'Macro F1':<28} | {r_f1:<15.4f} | {s_f1:<15.4f}")
    print(f"{'Precision':<28} | {r_prec:<15.4f} | {s_prec:<15.4f}")
    print(f"{'Recall':<28} | {r_rec:<15.4f} | {s_rec:<15.4f}")
    print(f"{'COMMIT Precision':<28} | {r_rep['1']['precision']:<15.4f} | {s_rep['1']['precision']:<15.4f}")
    print(f"{'COMMIT Recall':<28} | {r_rep['1']['recall']:<15.4f} | {s_rep['1']['recall']:<15.4f}")
    print("-" * 65)
    print(f"{'Raw COMMIT count':<28} | {r_commits:<15} | -")
    print(f"{'Final COMMIT count':<28} | -               | {s_commits:<15}")
    print(f"{'Symbolically Infeasible':<28} | {r_unsafe:<15} | {s_unsafe:<15}")
    print(f"{'Constraint Compliance Rate':<28} | {r_compliance:<15.2%} | {s_compliance:<15.2%}")
    print(f"{'Symbolic Corrections':<28} | -               | {corrections:<15}")

    print("\n--- Summary Rates ---")
    print(f"Symbolic Correction Rate: {correction_rate:.2%}")
    print(f"COMMIT Reduction Rate:    {commit_reduction_rate:.2%}")

    print("\n--- Correction Reasons Breakdown ---")
    reason_counts = Counter([r for r in all_reasons if r != "No symbolic correction"])
    if not reason_counts:
        print("  None")
    else:
        for r, c in reason_counts.most_common():
            print(f"  {r:<25}: {c}")

    return all_y, all_raw, all_final, r_acc, s_acc, r_f1, s_f1, r_unsafe, s_unsafe


# ============================================================
# 6. COMMITMENT TIMING ANALYSIS
# ============================================================

def analyze_timing(dataloader, y_true_flat, y_raw_flat, y_shielded_flat, seq_len=20):
    """
    Calculates step-by-step commitment timing statistics comparing raw model
    and symbolic shielded system against reference ground truth.

    Parameters
    ----------
    dataloader : torch.utils.data.DataLoader
        DataLoader providing metadata.
    y_true_flat : array-like
        Flattened ground truth labels.
    y_raw_flat : array-like
        Flattened raw model predictions.
    y_shielded_flat : array-like
        Flattened shielded predictions.
    seq_len : int
        Sequence length per event (default: 20).

    Returns
    -------
    pd.DataFrame: DataFrame containing per-event commitment timings and errors.
    """
    if not HAS_PANDAS:
        raise ImportError("Pandas is required for analyze_timing.")

    y_true_seq = np.array(y_true_flat).reshape(-1, seq_len)
    y_raw_seq = np.array(y_raw_flat).reshape(-1, seq_len)
    y_shielded_seq = np.array(y_shielded_flat).reshape(-1, seq_len)

    results = []
    event_idx = 0

    for batch in dataloader:
        X, meta = batch[0], batch[3]
        for b in range(X.size(0)):
            t_true = np.where(y_true_seq[event_idx] == 1)[0]
            t_raw = np.where(y_raw_seq[event_idx] == 1)[0]
            t_shield = np.where(y_shielded_seq[event_idx] == 1)[0]

            ref_t = t_true[0] if len(t_true) > 0 else -1
            raw_t = t_raw[0] if len(t_raw) > 0 else -1
            shield_t = t_shield[0] if len(t_shield) > 0 else -1

            event_id_val = meta[b, 0, 0].item() if hasattr(meta[b, 0, 0], "item") else meta[b, 0, 0]

            results.append({
                "event_id": event_id_val,
                "reference_commit": ref_t,
                "raw_commit": raw_t,
                "shielded_commit": shield_t,
                "raw_timing_error": (raw_t - ref_t) if ref_t != -1 and raw_t != -1 else np.nan,
                "shielded_timing_error": (shield_t - ref_t) if ref_t != -1 and shield_t != -1 else np.nan
            })
            event_idx += 1

    df = pd.DataFrame(results)
    total = len(df)

    never_true = len(df[df["reference_commit"] == -1])
    never_raw = len(df[df["raw_commit"] == -1])
    never_shielded = len(df[df["shielded_commit"] == -1])

    df_valid_raw = df[(df["reference_commit"] != -1) & (df["raw_commit"] != -1)]
    df_valid_shield = df[(df["reference_commit"] != -1) & (df["shielded_commit"] != -1)]

    early_raw = len(df_valid_raw[df_valid_raw["raw_timing_error"] < 0])
    late_raw = len(df_valid_raw[df_valid_raw["raw_timing_error"] > 0])

    early_shield = len(df_valid_shield[df_valid_shield["shielded_timing_error"] < 0])
    late_shield = len(df_valid_shield[df_valid_shield["shielded_timing_error"] > 0])

    print(f"\n=== Commitment Timing Statistics ===")
    print("Note: Positive timing error indicates a later predicted commitment than reference commitment.")
    print("Negative timing error indicates an earlier predicted commitment.")
    print("-" * 65)
    print(f"Total Events Evaluated: {total}")
    print(f"Events that NEVER commit (Ground Truth):   {never_true} ({(never_true/total):.2%})")
    print(f"Events that NEVER commit (Raw Model):      {never_raw} ({(never_raw/total):.2%})")
    print(f"Events that NEVER commit (Shielded Model): {never_shielded} ({(never_shielded/total):.2%})")

    print("\n--- Timing Analysis Among Committing Events ---")
    print("-" * 65)
    print(f"{'Timing Metric':<30} | {'Raw Model':<15} | {'Shielded System':<15}")
    print("-" * 65)

    mean_raw = df_valid_raw["raw_timing_error"].mean() if not df_valid_raw.empty else np.nan
    mean_shield = df_valid_shield["shielded_timing_error"].mean() if not df_valid_shield.empty else np.nan
    mae_raw = df_valid_raw["raw_timing_error"].abs().mean() if not df_valid_raw.empty else np.nan
    mae_shield = df_valid_shield["shielded_timing_error"].abs().mean() if not df_valid_shield.empty else np.nan

    pct_early_raw = early_raw / len(df_valid_raw) if not df_valid_raw.empty else 0
    pct_early_shield = early_shield / len(df_valid_shield) if not df_valid_shield.empty else 0
    pct_late_raw = late_raw / len(df_valid_raw) if not df_valid_raw.empty else 0
    pct_late_shield = late_shield / len(df_valid_shield) if not df_valid_shield.empty else 0

    print(f"{'Mean Timing Error (Steps)':<30} | {mean_raw:<15.2f} | {mean_shield:<15.2f}")
    print(f"{'Mean Absolute Error':<30} | {mae_raw:<15.2f} | {mae_shield:<15.2f}")
    print(f"{'Early Commitments':<30} | {early_raw} ({pct_early_raw:.2%}){'':<4} | {early_shield} ({pct_early_shield:.2%})")
    print(f"{'Late Commitments':<30} | {late_raw} ({pct_late_raw:.2%}){'':<5} | {late_shield} ({pct_late_shield:.2%})")

    return df


# ============================================================
# 7. AUTHORITATIVE SYMBOLIC LAYER UNIT TESTS
# ============================================================

def run_symbolic_tests():
    """
    Runs comprehensive unit test suite matching all model notebooks (GRU, LSTM, Transformer, TCN).
    """
    print("--- Running Symbolic Layer Unit Tests ---")

    # Helper for PyTorch tensor tests
    if HAS_TORCH:
        def make_sym(feas, tca, window):
            return torch.tensor([[[feas, tca, window, 0, 0, 0, 0, 0]]], dtype=torch.float32)

        # Case 1: Feasible COMMIT -> Expected: COMMIT
        sym1 = make_sym(1, 5.0, 10.0)
        raw1 = torch.tensor([[[1]]])
        _, f1, _, _, _ = apply_symbolic_safety_layer(raw1, sym1)
        assert f1.item() == 1, "Torch Case 1 Failed"

        # Case 2: Infeasible COMMIT -> Expected: WAIT
        sym2 = make_sym(0, 5.0, 10.0)
        raw2 = torch.tensor([[[1]]])
        _, f2, _, r2, _ = apply_symbolic_safety_layer(raw2, sym2)
        assert f2.item() == 0 and r2[0] == "Physical infeasibility", "Torch Case 2 Failed"

        # Case 3: TCA passed -> Expected: WAIT
        sym3 = make_sym(1, 0.0, 10.0)
        raw3 = torch.tensor([[[1]]])
        _, f3, _, r3, _ = apply_symbolic_safety_layer(raw3, sym3)
        assert f3.item() == 0 and r3[0] == "TCA already occurred", "Torch Case 3 Failed"

        # Case 4: Maneuver window expired -> Expected: WAIT
        sym4 = make_sym(1, 5.0, 0.0)
        raw4 = torch.tensor([[[1]]])
        _, f4, _, r4, _ = apply_symbolic_safety_layer(raw4, sym4)
        assert f4.item() == 0 and r4[0] == "Maneuver window expired", "Torch Case 4 Failed"

        # Case 5: WAIT must never become COMMIT
        sym5a = make_sym(1, 5.0, 10.0)  # Feasible
        sym5b = make_sym(0, 0.0, 0.0)   # Infeasible
        raw5 = torch.tensor([[[0]]])
        _, f5a, _, _, _ = apply_symbolic_safety_layer(raw5, sym5a)
        _, f5b, _, _, _ = apply_symbolic_safety_layer(raw5, sym5b)
        assert f5a.item() == 0 and f5b.item() == 0, "Torch Case 5 Failed"

        # Case 6: Multiple violations -> Priority 1 (Physical infeasibility)
        sym6 = make_sym(0, 0.0, 0.0)
        raw6 = torch.tensor([[[1]]])
        _, f6, _, r6, _ = apply_symbolic_safety_layer(raw6, sym6)
        assert f6.item() == 0 and r6[0] == "Physical infeasibility", "Torch Case 6 Failed"

        print("  [PASS] PyTorch Tensor Unit Tests Passed")

    # NumPy / Tabular Unit Tests (TCN, XGBoost style)
    # Test 1: Feasible COMMIT -> Expected: COMMIT
    res1 = apply_symbolic_safety_layer([1], feasibility=[1], time_to_tca=[10], maneuver_window=[10])
    assert res1["final_prediction"][0] == 1, "NumPy Case 1 Failed"

    # Test 2: Infeasible COMMIT -> Expected: WAIT (Physical infeasibility)
    res2 = apply_symbolic_safety_layer([1], feasibility=[0], time_to_tca=[10], maneuver_window=[10])
    assert res2["final_prediction"][0] == 0 and res2["reason"][0] == "Physical infeasibility", "NumPy Case 2 Failed"

    # Test 3: TCA reached -> Expected: WAIT (TCA already occurred)
    res3 = apply_symbolic_safety_layer([1], feasibility=[1], time_to_tca=[0], maneuver_window=[10])
    assert res3["final_prediction"][0] == 0 and res3["reason"][0] == "TCA already occurred", "NumPy Case 3 Failed"

    # Test 4: Maneuver window expired -> Expected: WAIT (Maneuver window expired)
    res4 = apply_symbolic_safety_layer([1], feasibility=[1], time_to_tca=[10], maneuver_window=[0])
    assert res4["final_prediction"][0] == 0 and res4["reason"][0] == "Maneuver window expired", "NumPy Case 4 Failed"

    # Test 5: WAIT must never become COMMIT
    res5 = apply_symbolic_safety_layer([0], feasibility=[0], time_to_tca=[0], maneuver_window=[0])
    assert res5["final_prediction"][0] == 0, "NumPy Case 5 Failed"

    # Test 6: Multiple violations -> Deterministic Priority 1
    res6 = apply_symbolic_safety_layer([1], feasibility=[0], time_to_tca=[0], maneuver_window=[0])
    assert res6["final_prediction"][0] == 0 and res6["reason"][0] == "Physical infeasibility", "NumPy Case 6 Failed"

    print("  [PASS] NumPy / Array Unit Tests Passed")
    print("All Symbolic Layer Unit Tests Passed Successfully!\n")


if __name__ == "__main__":
    run_symbolic_tests()
