import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple

def compute_top_k_agreement(
    rankings_dict: Dict[str, List[str]],
    common_features: List[str],
    k_values: List[int] = [1, 3, 5]
) -> pd.DataFrame:
    """
    Computes pairwise Top-k Jaccard agreement across model XAI rankings on common features.
    Explicitly categorizes agreement by architectural representation subset.
    """
    model_names = sorted(rankings_dict.keys())
    neural_models = {"GRU", "LSTM", "TCN", "TRANSFORMER"}
    results = []

    for i in range(len(model_names)):
        for j in range(i + 1, len(model_names)):
            m1, m2 = model_names[i], model_names[j]
            # Filter rankings to common features
            r1 = [f for f in rankings_dict[m1] if f in common_features]
            r2 = [f for f in rankings_dict[m2] if f in common_features]

            if m1 in neural_models and m2 in neural_models:
                scope = "SHARED_NEURAL_33_REPRESENTATION"
            elif m1 == "PATCHTST" or m2 == "PATCHTST":
                scope = "CROSS_REPRESENTATION_PATCHTST_NEURAL"
            else:
                scope = "CROSS_REPRESENTATION_XGBOOST_TABULAR"

            row = {
                "model_1": m1,
                "model_2": m2,
                "comparison_scope": scope
            }
            for k in k_values:
                top_1 = set(r1[:k])
                top_2 = set(r2[:k])
                jaccard = len(top_1.intersection(top_2)) / max(1, len(top_1.union(top_2)))
                row[f"top_{k}_agreement"] = float(jaccard)

            results.append(row)

    df_agreement = pd.DataFrame(results)
    return df_agreement
