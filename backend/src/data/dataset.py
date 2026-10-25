import torch
from torch.utils.data import Dataset
import pandas as pd
import numpy as np
from typing import List, Dict, Tuple, Optional

class SequenceDataset(Dataset):
    """
    PyTorch Dataset for sequential 33-feature models (GRU, LSTM, TCN, Transformer).
    Shapes per item:
      X: (20, 33) float32 tensor
      y: (20,) int64 tensor (per-timestep target)
      symbolic: dict of (20,) numpy arrays for symbolic rules
      metadata: dict of event metadata
    """
    def __init__(
        self,
        df: pd.DataFrame,
        feature_cols: List[str],
        symbolic_cols: Optional[List[str]] = None,
        target_col: str = "commit_decision"
    ):
        self.feature_cols = feature_cols
        self.symbolic_cols = symbolic_cols or [
            "feasibility_flag", "time_to_TCA", "maneuver_window_remaining",
            "fuel_remaining", "deltav_required", "cost_of_acting", "cost_of_waiting", "poc"
        ]
        self.target_col = target_col
        
        # Group by event_id in order
        self.event_ids = sorted(df["event_id"].unique())
        self.X_list = []
        self.y_list = []
        self.symbolic_list = []
        self.metadata_list = []
        
        grouped = df.groupby("event_id")
        for eid in self.event_ids:
            raw_group = grouped.get_group(eid)
            sort_col = "normalized_step" if "normalized_step" in raw_group.columns else "time_index"
            group = raw_group.sort_values(sort_col)
            if len(group) != 20:
                raise ValueError(f"Event {eid} has {len(group)} rows; expected exactly 20.")
            
            x_mat = group[self.feature_cols].values.astype(np.float32)
            y_vec = group[self.target_col].values.astype(np.int64)
            
            sym_dict = {col: group[col].values.astype(np.float64) for col in self.symbolic_cols if col in group.columns}
            meta_dict = {
                "event_id": eid,
                "orbit_type": group["orbit_type"].iloc[0] if "orbit_type" in group.columns else "UNKNOWN",
                "time_index": group["time_index"].values
            }
            
            self.X_list.append(torch.tensor(x_mat, dtype=torch.float32))
            self.y_list.append(torch.tensor(y_vec, dtype=torch.long))
            self.symbolic_list.append(sym_dict)
            self.metadata_list.append(meta_dict)
            
        self.X = torch.stack(self.X_list)
        self.y = torch.stack(self.y_list)

    def __len__(self) -> int:
        return len(self.event_ids)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor, Dict, Dict]:
        return self.X[idx], self.y[idx], self.symbolic_list[idx], self.metadata_list[idx]


class PatchTSTDataset(Dataset):
    """
    PyTorch Dataset for PatchTST with 44 features and scaler preprocessing.
    Outputs:
      X: (20, 44) float32 tensor
      y_event: int64 scalar (event-level commit if any timestep commits or last timestep)
      y_seq: (20,) int64 tensor
    """
    def __init__(
        self,
        df: pd.DataFrame,
        feature_cols: List[str],
        scaler: any,
        target_col: str = "commit_decision"
    ):
        self.feature_cols = feature_cols
        self.scaler = scaler
        self.target_col = target_col
        self.event_ids = sorted(df["event_id"].unique())
        
        self.X_list = []
        self.y_seq_list = []
        self.y_event_list = []
        self.metadata_list = []
        
        grouped = df.groupby("event_id")
        for eid in self.event_ids:
            raw_group = grouped.get_group(eid)
            sort_col = "normalized_step" if "normalized_step" in raw_group.columns else "time_index"
            group = raw_group.sort_values(sort_col)
            x_df = group[self.feature_cols]
            if hasattr(self.scaler, "feature_names_in_") and self.scaler.feature_names_in_ is not None:
                assert list(x_df.columns) == list(self.scaler.feature_names_in_)
                assert x_df.shape[1] == self.scaler.n_features_in_
            x_scaled = self.scaler.transform(x_df)
            y_seq = group[self.target_col].values.astype(np.int64)
            y_event = int(y_seq[-1]) # final commitment state
            
            self.X_list.append(torch.tensor(x_scaled, dtype=torch.float32))
            self.y_seq_list.append(torch.tensor(y_seq, dtype=torch.long))
            self.y_event_list.append(y_event)
            self.metadata_list.append({"event_id": eid})
            
        self.X = torch.stack(self.X_list)
        self.y_seq = torch.stack(self.y_seq_list)
        self.y_event = torch.tensor(self.y_event_list, dtype=torch.long)

    def __len__(self) -> int:
        return len(self.event_ids)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int, torch.Tensor, Dict]:
        return self.X[idx], self.y_event[idx].item(), self.y_seq[idx], self.metadata_list[idx]


class TabularDataset:
    """
    Prepares tabular data for XGBoost (45 features).
    """
    def __init__(self, df: pd.DataFrame, feature_cols: List[str], target_col: str = "commit_decision"):
        self.feature_cols = feature_cols
        self.target_col = target_col
        self.X = df[feature_cols].values
        self.y = df[target_col].values
        self.event_ids = df["event_id"].values
        self.time_indices = df["time_index"].values
