import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from .structural_scm import SatelliteStructuralSCM

class CounterfactualGenerator:
    """
    Generates structured counterfactual scenarios across sample conjunction events.
    """
    def __init__(self, scm: Optional[SatelliteStructuralSCM] = None):
        self.scm = scm or SatelliteStructuralSCM()

    def find_actionable_decision_step(self, event_df: pd.DataFrame) -> Optional[int]:
        """
        Identifies the final actionable pre-TCA observation step where conjunction is active
        and maneuver window remains open (time_to_TCA > 0 and maneuver_window_remaining > 0).
        """
        tca_col = "time_to_TCA"
        win_col = "maneuver_window_remaining" if "maneuver_window_remaining" in event_df.columns else tca_col
        active_mask = (event_df[tca_col] > 0) & (event_df[win_col] > 0)
        active_indices = np.where(active_mask.values)[0]
        if len(active_indices) > 0:
            return int(active_indices[-1])
        return None

    def generate_event_counterfactuals(
        self,
        event_df: pd.DataFrame,
        timing_advances: List[float] = [10.0, 30.0, 60.0],
        dv_scalings: List[float] = [0.8, 1.2, 1.5],
        target_step: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        results = []
        act_step = self.find_actionable_decision_step(event_df)
        if target_step is not None:
            target_idx = target_step
        elif act_step is not None:
            target_idx = act_step
        else:
            target_idx = len(event_df) - 1

        target_row = event_df.iloc[target_idx].to_dict()
        eid = target_row.get("event_id", 0)
        # Establish canonical immutable factual snapshot
        canonical_factual = None

        for dt in timing_advances:
            res = self.scm.propagate_maneuver_timing_intervention(dict(target_row), delta_t_adv=dt)
            res["event_id"] = eid
            if canonical_factual is None:
                canonical_factual = res["factual"]
            else:
                assert res["factual"] == canonical_factual, f"Factual state changed across interventions! {res['factual']} vs {canonical_factual}"
            results.append(res)

        for s in dv_scalings:
            res = self.scm.propagate_deltav_scaling_intervention(dict(target_row), scale_factor=s)
            res["event_id"] = eid
            assert res["factual"] == canonical_factual, f"Factual state changed across interventions! {res['factual']} vs {canonical_factual}"
            results.append(res)

        return results

