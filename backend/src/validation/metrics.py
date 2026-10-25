import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
    confusion_matrix
)
from typing import Dict, Any, Tuple

def compute_classification_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_prob_commit: np.ndarray
) -> Dict[str, float]:
    """
    Computes research-grade evaluation metrics for binary classification under class imbalance.
    """
    y_t = np.asarray(y_true).ravel()
    y_p = np.asarray(y_pred).ravel()
    y_prob = np.asarray(y_prob_commit).ravel()

    acc = float(accuracy_score(y_t, y_p))
    prec = float(precision_score(y_t, y_p, zero_division=0))
    rec = float(recall_score(y_t, y_p, zero_division=0))
    f1 = float(f1_score(y_t, y_p, zero_division=0))
    
    try:
        roc_auc = float(roc_auc_score(y_t, y_prob))
    except Exception:
        roc_auc = 0.5
        
    try:
        pr_auc = float(average_precision_score(y_t, y_prob))
    except Exception:
        pr_auc = float(np.mean(y_t))
        
    brier = float(brier_score_loss(y_t, y_prob))
    
    # Expected Calibration Error (ECE) with 10 bins
    bins = np.linspace(0.0, 1.0, 11)
    ece = 0.0
    for i in range(len(bins) - 1):
        bin_mask = (y_prob >= bins[i]) & (y_prob < bins[i+1])
        if np.sum(bin_mask) > 0:
            bin_acc = np.mean(y_t[bin_mask] == (y_prob[bin_mask] >= 0.5).astype(int))
            bin_conf = np.mean(y_prob[bin_mask])
            ece += (np.sum(bin_mask) / len(y_prob)) * np.abs(bin_acc - bin_conf)
            
    cm = confusion_matrix(y_t, y_p)
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)
    
    return {
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "f1_score": f1,
        "roc_auc": roc_auc,
        "pr_auc": pr_auc,
        "brier_score": brier,
        "ece": float(ece),
        "true_negatives": int(tn),
        "false_positives": int(fp),
        "false_negatives": int(fn),
        "true_positives": int(tp),
        "total_samples": int(len(y_t))
    }
