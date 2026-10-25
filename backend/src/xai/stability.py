import numpy as np
import pandas as pd
import scipy.stats as stats
import torch
from typing import Dict, List, Any, Tuple

def evaluate_explanation_stability(
    explainer,
    x_tensor: Any,
    n_trials: int = 10,
    noise_level: float = 0.05,
    top_k_list: List[int] = [1, 3, 5],
    seed: int = 42
) -> Dict[str, Any]:
    """
    Evaluates attribution stability under small valid Gaussian noise perturbations.
    Computes Spearman rank correlation and Top-k Jaccard overlap.
    """
    np.random.seed(seed)
    torch.manual_seed(seed)
    
    # Base explanation
    if hasattr(explainer, "explain_instance"):
        base_exp = explainer.explain_instance(x_tensor)
        base_scores = base_exp["feature_attributions_abs"]
        base_ranks = np.argsort(-base_scores)
    elif hasattr(explainer, "explain_local"):
        base_exp = explainer.explain_local(x_tensor)
        base_scores = base_exp["mean_abs_shap"]
        base_ranks = np.argsort(-base_scores)
    else:
        raise ValueError("Unsupported explainer type")

    rank_correlations = []
    top_k_overlaps = {k: [] for k in top_k_list}

    # Generate perturbations
    for i in range(n_trials):
        if isinstance(x_tensor, torch.Tensor):
            noise = torch.randn_like(x_tensor) * noise_level
            x_pert = x_tensor + noise
        elif isinstance(x_tensor, pd.DataFrame):
            x_pert = x_tensor.copy()
            num_cols = x_pert.select_dtypes(include=[np.number]).columns
            noise = np.random.randn(len(x_pert), len(num_cols)) * noise_level
            x_pert[num_cols] = x_pert[num_cols] + noise
        elif isinstance(x_tensor, np.ndarray):
            noise = np.random.randn(*x_tensor.shape) * noise_level
            x_pert = x_tensor + noise
        else:
            x_pert = x_tensor

        if hasattr(explainer, "explain_instance"):
            pert_exp = explainer.explain_instance(x_pert)
            pert_scores = pert_exp["feature_attributions_abs"]
            pert_ranks = np.argsort(-pert_scores)
        else:
            pert_exp = explainer.explain_local(x_pert)
            pert_scores = pert_exp["mean_abs_shap"]
            pert_ranks = np.argsort(-pert_scores)

        # Spearman rank correlation
        rho, _ = stats.spearmanr(base_scores, pert_scores)
        if not np.isnan(rho):
            rank_correlations.append(float(rho))

        # Top-k Jaccard overlap
        for k in top_k_list:
            set_base = set(base_ranks[:k])
            set_pert = set(pert_ranks[:k])
            overlap = len(set_base.intersection(set_pert)) / len(set_base.union(set_pert))
            top_k_overlaps[k].append(float(overlap))

    mean_rho = float(np.mean(rank_correlations)) if rank_correlations else 1.0
    mean_top_k = {f"top_{k}_overlap": float(np.mean(top_k_overlaps[k])) for k in top_k_list}

    return {
        "mean_rank_correlation_rho": mean_rho,
        "std_rank_correlation_rho": float(np.std(rank_correlations)) if rank_correlations else 0.0,
        **mean_top_k,
        "n_trials": n_trials,
        "noise_level": noise_level
    }
