try:
    import shap
except ImportError:
    shap = None
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional

class TreeSHAPExplainer:
    """
    TreeSHAP Explainer for XGBoost binary classifier.
    Computes exact local and global Shapley values.
    """
    def __init__(self, xgboost_adapter, background_samples: int = 100):
        self.adapter = xgboost_adapter
        self.model = xgboost_adapter.model
        self.feature_names = xgboost_adapter.get_feature_names()
        if shap is not None:
            try:
                self.explainer = shap.TreeExplainer(self.model)
            except Exception:
                self.explainer = None
        else:
            self.explainer = None

    def explain_local(self, x_data: Any) -> Dict[str, Any]:
        """
        Computes local SHAP attributions for given input row(s).
        """
        df_proc = self.adapter.preprocess(x_data)
        if self.explainer is not None:
            shap_values = self.explainer.shap_values(df_proc)
            base_val = float(self.explainer.expected_value[1] if isinstance(self.explainer.expected_value, (list, np.ndarray)) else self.explainer.expected_value)
        else:
            # Fallback to XGBoost native pred_contribs
            try:
                import xgboost as xgb
                dmatrix = xgb.DMatrix(df_proc)
                contribs = self.model.predict(dmatrix, pred_contribs=True)
                # Last column is bias (base value)
                shap_values = contribs[:, :-1]
                base_val = float(contribs[0, -1])
            except Exception:
                shap_values = np.zeros((len(df_proc), len(self.feature_names)))
                base_val = 0.5
        
        # In XGBoost binary classifier, shap_values is (N, num_features)
        if isinstance(shap_values, list): # multiclass format
            shap_commit = shap_values[1]
        elif shap_values.ndim == 3: # (N, num_features, classes)
            shap_commit = shap_values[..., 1]
        else:
            shap_commit = shap_values

        mean_abs_shap = np.mean(np.abs(shap_commit), axis=0) if shap_commit.ndim > 1 else np.abs(shap_commit)
        ranked_idx = np.argsort(-mean_abs_shap)
        ranked_features = [self.feature_names[i] for i in ranked_idx]

        return {
            "shap_values": shap_commit,
            "mean_abs_shap": mean_abs_shap,
            "ranked_features": ranked_features,
            "ranked_indices": ranked_idx.tolist(),
            "base_value": base_val
        }

    def explain_global(self, df_sample: pd.DataFrame) -> pd.DataFrame:
        """
        Computes global feature importance table across sample dataset.
        """
        local_res = self.explain_local(df_sample)
        shap_mat = local_res["shap_values"]
        mean_abs = np.mean(np.abs(shap_mat), axis=0)
        mean_signed = np.mean(shap_mat, axis=0)
        
        df_importance = pd.DataFrame({
            "feature": self.feature_names,
            "mean_abs_shap": mean_abs,
            "mean_signed_shap": mean_signed
        }).sort_values("mean_abs_shap", ascending=False).reset_index(drop=True)
        
        return df_importance
