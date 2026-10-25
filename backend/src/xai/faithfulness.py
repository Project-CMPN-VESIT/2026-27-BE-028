import torch
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Callable, Optional

def evaluate_faithfulness_deletion(
    adapter,
    x_input: Any,
    feature_ranking: List[str],
    steps: List[float] = [0.1, 0.2, 0.3, 0.5, 0.7, 1.0],
    n_random_trials: int = 10,
    seed: int = 42
) -> Dict[str, Any]:
    """
    Evaluates attribution faithfulness via progressive Deletion Testing.
    Compares feature removal guided by XAI against random removal.
    Computes Area Over Perturbation Curve (AOPC).
    """
    np.random.seed(seed)
    
    # 1. Baseline prediction
    p_orig = adapter.predict_proba(x_input)
    p_orig_commit = float(p_orig.ravel()[-1] if p_orig.ndim > 1 else p_orig[1])

    all_features = adapter.get_feature_names()
    num_features = len(all_features)
    
    x_tensor = adapter.preprocess(x_input).clone() if hasattr(adapter.preprocess(x_input), "clone") else adapter.preprocess(x_input).copy()
    
    guided_prob_drops = []
    random_prob_drops = []

    for frac in steps:
        k = max(1, int(np.round(frac * num_features)))
        
        # Guided deletion: zero out top k features
        top_k_features = feature_ranking[:k]
        top_k_indices = [all_features.index(f) for f in top_k_features if f in all_features]
        
        x_guided = x_tensor.clone() if hasattr(x_tensor, "clone") else x_tensor.copy()
        if hasattr(x_guided, "shape") and len(x_guided.shape) == 3:
            x_guided[:, :, top_k_indices] = 0.0
        elif isinstance(x_guided, pd.DataFrame):
            x_guided.iloc[:, top_k_indices] = 0.0
        else:
            x_guided[..., top_k_indices] = 0.0

        p_guided = adapter.predict_proba(x_guided)
        p_guided_commit = float(p_guided.ravel()[-1] if p_guided.ndim > 1 else p_guided[1])
        guided_prob_drops.append(p_orig_commit - p_guided_commit)

        # Random deletion baseline: average over n_random_trials
        rand_drops = []
        for _ in range(n_random_trials):
            rand_indices = np.random.choice(num_features, size=k, replace=False)
            x_rand = x_tensor.clone() if hasattr(x_tensor, "clone") else x_tensor.copy()
            if hasattr(x_rand, "shape") and len(x_rand.shape) == 3:
                x_rand[:, :, rand_indices] = 0.0
            elif isinstance(x_rand, pd.DataFrame):
                x_rand.iloc[:, rand_indices] = 0.0
            else:
                x_rand[..., rand_indices] = 0.0

            p_rand = adapter.predict_proba(x_rand)
            p_rand_commit = float(p_rand.ravel()[-1] if p_rand.ndim > 1 else p_rand[1])
            rand_drops.append(p_orig_commit - p_rand_commit)
        random_prob_drops.append(float(np.mean(rand_drops)))

    aopc_guided = float(np.mean(guided_prob_drops))
    aopc_random = float(np.mean(random_prob_drops))
    faithfulness_ratio = aopc_guided / (aopc_random + 1e-8)

    return {
        "steps": steps,
        "guided_prob_drops": guided_prob_drops,
        "random_prob_drops": random_prob_drops,
        "aopc_guided": aopc_guided,
        "aopc_random": aopc_random,
        "faithfulness_ratio": faithfulness_ratio,
        "is_faithful": aopc_guided >= aopc_random
    }
