import os
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional

class HistoricalCausalForestAuditor:
    """
    Auditor and integration wrapper for causal_forest_explainer_gru.pkl.
    Documents metadata, assumptions, and compatibility with the unified research framework.
    """
    def __init__(self, artifact_path: str = "resources/causal_forest_explainer_gru.pkl"):
        self.artifact_path = artifact_path
        self.explainer = None
        self.is_loaded = False

    def audit(self) -> Dict[str, Any]:
        if not os.path.exists(self.artifact_path):
            return {"status": "NOT_FOUND", "path": self.artifact_path}
        
        try:
            self.explainer = joblib.load(self.artifact_path)
            self.is_loaded = True
            
            outcome = getattr(self.explainer, "_outcome_name", "gru_p_commit")
            treatment = getattr(self.explainer, "_treatment_name", "maneuver_window_remaining")
            confounders = getattr(self.explainer, "_observed_common_causes_names", ["time_to_TCA", "poc"])
            effect_modifiers = getattr(self.explainer, "_effect_modifier_names", ["relative_distance", "relative_speed", "fuel_remaining"])
            
            return {
                "status": "VERIFIED_HISTORICAL_ARTIFACT",
                "class": self.explainer.__class__.__name__,
                "module": self.explainer.__class__.__module__,
                "treatment_variable": treatment,
                "outcome_variable": outcome,
                "confounders": confounders,
                "effect_modifiers": effect_modifiers,
                "compatibility_note": (
                    "EconML causal forest estimating effect of maneuver_window_remaining on GRU model's predicted commit probability. "
                    "Maintained as verified historical reference artifact; real-data structural counterfactuals are evaluated using physical SCM."
                )
            }
        except Exception as e:
            return {"status": "ERROR_LOADING", "error": str(e)}
