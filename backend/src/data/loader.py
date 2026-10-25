import os
import yaml
import pandas as pd
import numpy as np
from sklearn.model_selection import GroupShuffleSplit
from typing import Tuple, Dict, List, Optional

def load_config(config_path: str = "configs/config.yaml") -> dict:
    with open(config_path, "r") as f:
        return yaml.safe_load(f)

def load_raw_dataset(dataset_path: str = "resources/capstone_final_merged_dataset.csv") -> pd.DataFrame:
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Authoritative dataset not found at {dataset_path}")
    df = pd.read_csv(dataset_path)
    return df

def validate_schema(df: pd.DataFrame, expected_rows: int = 60000, expected_cols: int = 48) -> Dict[str, any]:
    errors = []
    if len(df) != expected_rows:
        errors.append(f"Row count mismatch: expected {expected_rows}, got {len(df)}")
    if len(df.columns) != expected_cols:
        errors.append(f"Column count mismatch: expected {expected_cols}, got {len(df.columns)}")
    
    null_counts = df.isnull().sum()
    if null_counts.sum() > 0:
        errors.append(f"Null values detected: {null_counts[null_counts > 0].to_dict()}")
        
    if "event_id" not in df.columns or "time_index" not in df.columns or "commit_decision" not in df.columns:
        errors.append("Critical identifiers (event_id, time_index, commit_decision) missing from schema.")
        
    audit_report = {
        "is_valid": len(errors) == 0,
        "errors": errors,
        "rows": len(df),
        "columns": len(df.columns),
        "events": int(df["event_id"].nunique()) if "event_id" in df.columns else 0
    }
    if not audit_report["is_valid"]:
        raise ValueError(f"Schema validation failed: {errors}")
    return audit_report

def normalize_temporal_structure(df: pd.DataFrame) -> pd.DataFrame:
    """
    Standardizes time indexing so that every event has a uniform 'normalized_step' in [0..19],
    while preserving the raw 'time_index' column as recorded in the raw data.
    """
    df_sorted = df.sort_values(by=["event_id", "time_index"]).copy()
    df_sorted["normalized_step"] = df_sorted.groupby("event_id").cumcount()
    
    # Check that each event has exactly 20 steps
    event_counts = df_sorted.groupby("event_id")["normalized_step"].count()
    if not (event_counts == 20).all():
        raise ValueError(f"Temporal normalization failed: not all events have exactly 20 observations.")
    return df_sorted

def prepare_one_hot_orbit(df: pd.DataFrame) -> pd.DataFrame:
    """
    Ensures orbit_type one-hot columns exist for models requiring them (PatchTST, XGBoost).
    """
    df_out = df.copy()
    if "orbit_type" in df_out.columns:
        for orb in ["GEO", "LEO", "MEO"]:
            col_name = f"orbit_type_{orb}"
            df_out[col_name] = (df_out["orbit_type"] == orb).astype(float)
    return df_out

def split_events(
    df: pd.DataFrame,
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = 42
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Splits dataset at the event level (GroupShuffleSplit on event_id).
    Guarantees no event is split across train, val, or test sets.
    """
    assert abs((train_ratio + val_ratio + test_ratio) - 1.0) < 1e-6, "Split ratios must sum to 1.0"
    
    # 1. Split into (Train + Val) and Test
    gss_test = GroupShuffleSplit(n_splits=1, test_size=test_ratio, random_state=seed)
    train_val_idx, test_idx = next(gss_test.split(df, groups=df["event_id"]))
    
    df_train_val = df.iloc[train_val_idx].copy()
    df_test = df.iloc[test_idx].copy()
    
    # 2. Split (Train + Val) into Train and Val
    val_relative_ratio = val_ratio / (train_ratio + val_ratio)
    gss_val = GroupShuffleSplit(n_splits=1, test_size=val_relative_ratio, random_state=seed)
    train_idx, val_idx = next(gss_val.split(df_train_val, groups=df_train_val["event_id"]))
    
    df_train = df_train_val.iloc[train_idx].copy()
    df_val = df_train_val.iloc[val_idx].copy()
    
    verify_no_leakage(df_train, df_val, df_test)
    return df_train, df_val, df_test

def verify_no_leakage(train_df: pd.DataFrame, val_df: pd.DataFrame, test_df: pd.DataFrame) -> bool:
    """
    Verifies that train, val, and test partitions share 0 common event_ids.
    """
    train_events = set(train_df["event_id"].unique())
    val_events = set(val_df["event_id"].unique())
    test_events = set(test_df["event_id"].unique())
    
    train_val_overlap = train_events.intersection(val_events)
    train_test_overlap = train_events.intersection(test_events)
    val_test_overlap = val_events.intersection(test_events)
    
    if train_val_overlap or train_test_overlap or val_test_overlap:
        raise AssertionError(
            f"Event leakage detected! Overlaps: "
            f"Train/Val: {len(train_val_overlap)}, "
            f"Train/Test: {len(train_test_overlap)}, "
            f"Val/Test: {len(val_test_overlap)}"
        )
    return True
