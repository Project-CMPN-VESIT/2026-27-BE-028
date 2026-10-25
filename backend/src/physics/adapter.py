import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple, Optional, Union
from .rules import RULE_REGISTRY

class ExistingPhysicsSymbolicAdapter:
    """
    Authoritative Adapter wrapping the verified Existing Neuro-Symbolic / Physics Safety Shield.
    Preserves existing rule logic and guarantees zero unsafe COMMIT decisions.
    """
    def __init__(self, config: Optional[dict] = None):
        self.config = config or {}
        self.rules = RULE_REGISTRY

    def evaluate_constraints(
        self,
        feasibility: np.ndarray,
        time_to_tca: np.ndarray,
        maneuver_window: np.ndarray,
        deltav_required: Optional[np.ndarray] = None,
        max_delta_v: Optional[np.ndarray] = None
    ) -> Dict[str, np.ndarray]:
        """
        Evaluates Type A hard physical and temporal constraints.
        Returns boolean masks of violations and hard infeasibility.
        """
        feasibility = np.asarray(feasibility)
        time_to_tca = np.asarray(time_to_tca)
        maneuver_window = np.asarray(maneuver_window)

        # R1: Physical infeasibility (feasibility_flag <= 0 or deltav_required > max_delta_v)
        if deltav_required is not None and max_delta_v is not None:
            r1_violation = (deltav_required > max_delta_v) | (feasibility <= 0)
        else:
            r1_violation = (feasibility <= 0)

        # R2: TCA passed or reached (time_to_TCA <= 0)
        r2_violation = (time_to_tca <= 0)

        # R3: Maneuver window expired (maneuver_window_remaining <= 0)
        r3_violation = (maneuver_window <= 0)

        hard_infeasible = r1_violation | r2_violation | r3_violation

        return {
            "r1_deltav_infeasible": r1_violation,
            "r2_tca_passed": r2_violation,
            "r3_window_expired": r3_violation,
            "hard_infeasible": hard_infeasible
        }

    def apply_shield(
        self,
        raw_predictions: np.ndarray,
        feasibility: np.ndarray,
        time_to_tca: np.ndarray,
        maneuver_window: np.ndarray,
        deltav_required: Optional[np.ndarray] = None,
        max_delta_v: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """
        Applies the verified symbolic safety shield to raw model predictions.
        If any Type A constraint is violated, COMMIT (1) is overridden to WAIT (0).
        """
        raw_preds = np.asarray(raw_predictions).copy()
        eval_res = self.evaluate_constraints(
            feasibility, time_to_tca, maneuver_window, deltav_required, max_delta_v
        )
        hard_infeasible = eval_res["hard_infeasible"]

        # An override occurs whenever a raw COMMIT prediction coincides with hard infeasibility
        corrections = (raw_preds == 1) & hard_infeasible
        final_preds = raw_preds.copy()
        final_preds[corrections] = 0

        # Construct specific reasons
        reasons = np.full(raw_preds.shape, "No symbolic correction", dtype=object)
        reasons[corrections & eval_res["r1_deltav_infeasible"]] = "Physical infeasibility: ΔV_req > ΔV_max"
        reasons[corrections & ~eval_res["r1_deltav_infeasible"] & eval_res["r2_tca_passed"]] = "TCA already occurred (t_TCA <= 0)"
        reasons[corrections & ~eval_res["r1_deltav_infeasible"] & ~eval_res["r2_tca_passed"] & eval_res["r3_window_expired"]] = "Maneuver window expired (W_rem <= 0)"

        # Operational states taxonomy:
        # Distinguishes ACTIONABLE_COMMIT, ACTIONABLE_WAIT, INFEASIBLE_HIGH_RISK, and INVALID_CLOSED
        op_states = np.full(raw_preds.shape, "ACTIONABLE_WAIT", dtype=object)
        closed_mask = eval_res["r2_tca_passed"] | eval_res["r3_window_expired"]
        op_states[closed_mask] = "INVALID_CLOSED"
        
        infeasible_mask = ~closed_mask & eval_res["r1_deltav_infeasible"]
        op_states[infeasible_mask & (raw_preds == 1)] = "INFEASIBLE_HIGH_RISK"
        op_states[infeasible_mask & (raw_preds == 0)] = "ACTIONABLE_WAIT"
        
        valid_mask = ~closed_mask & ~eval_res["r1_deltav_infeasible"]
        op_states[valid_mask & (raw_preds == 1)] = "ACTIONABLE_COMMIT"
        op_states[valid_mask & (raw_preds == 0)] = "ACTIONABLE_WAIT"

        return {
            "raw_predictions": raw_preds,
            "final_predictions": final_preds,
            "operational_states": op_states,
            "hard_infeasible": hard_infeasible,
            "corrections": corrections,
            "num_corrections": int(np.sum(corrections)),
            "correction_rate": float(np.mean(corrections)),
            "reasons": reasons,
            "constraint_details": eval_res
        }

    def validate_state(self, state: Union[pd.Series, Dict[str, Any]]) -> Dict[str, Any]:
        """Validates a single observation or event state."""
        feas = state.get("feasibility_flag", 1)
        tca = state.get("time_to_TCA", 100.0)
        win = state.get("maneuver_window_remaining", 100.0)
        dv_req = state.get("deltav_required", None)
        dv_max = state.get("max_delta_v", None)

        res = self.evaluate_constraints(
            np.array([feas]), np.array([tca]), np.array([win]),
            np.array([dv_req]) if dv_req is not None else None,
            np.array([dv_max]) if dv_max is not None else None
        )
        is_admissible = not bool(res["hard_infeasible"][0])
        reason = "State physically admissible" if is_admissible else self.explain_violation(state)

        # Operational status
        r1_inf = bool(res["r1_deltav_infeasible"][0])
        r2_tca = bool(res["r2_tca_passed"][0])
        r3_win = bool(res["r3_window_expired"][0])
        if r2_tca or r3_win:
            op_status = "INVALID_CLOSED"
        elif r1_inf:
            op_status = "INFEASIBLE_HIGH_RISK"
        else:
            op_status = "ACTIONABLE"

        return {
            "is_physically_admissible": is_admissible,
            "operational_status": op_status,
            "reason": reason,
            "violations": {k: bool(v[0]) for k, v in res.items() if k != "hard_infeasible"}
        }

    def validate_intervention(self, intervention: Dict[str, Any], current_state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validates whether a proposed causal intervention is physically feasible within spacecraft physical limits.
        """
        is_valid = True
        violations = []

        if "deltav_required" in intervention:
            proposed_dv = intervention["deltav_required"]
            max_dv = current_state.get("max_delta_v", 10.0)
            if proposed_dv < 0:
                is_valid = False
                violations.append("Negative delta-V is physically undefined for impulsive maneuver.")
            if proposed_dv > max_dv:
                is_valid = False
                violations.append(f"Proposed delta-V ({proposed_dv:.4f} m/s) exceeds maximum thruster capacity ({max_dv:.4f} m/s).")

        if "time_to_TCA" in intervention:
            proposed_tca = intervention["time_to_TCA"]
            if proposed_tca <= 0:
                is_valid = False
                violations.append("Intervention time_to_TCA <= 0 violates temporal causality.")

        return {
            "is_intervention_valid": is_valid,
            "violations": violations
        }

    def validate_counterfactual(self, cf_trajectory: Union[pd.DataFrame, Dict[str, np.ndarray]]) -> Dict[str, Any]:
        """
        Validates an entire SCM-generated counterfactual trajectory against physical constraints.
        """
        if isinstance(cf_trajectory, pd.DataFrame):
            feas = cf_trajectory["feasibility_flag"].values if "feasibility_flag" in cf_trajectory else np.ones(len(cf_trajectory))
            tca = cf_trajectory["time_to_TCA"].values
            win = cf_trajectory["maneuver_window_remaining"].values if "maneuver_window_remaining" in cf_trajectory else tca
            dv_req = cf_trajectory["deltav_required"].values if "deltav_required" in cf_trajectory else None
            dv_max = cf_trajectory["max_delta_v"].values if "max_delta_v" in cf_trajectory else None
        else:
            feas = cf_trajectory.get("feasibility_flag", np.ones(len(cf_trajectory["time_to_TCA"])))
            tca = cf_trajectory["time_to_TCA"]
            win = cf_trajectory.get("maneuver_window_remaining", tca)
            dv_req = cf_trajectory.get("deltav_required", None)
            dv_max = cf_trajectory.get("max_delta_v", None)

        eval_res = self.evaluate_constraints(feas, tca, win, dv_req, dv_max)
        infeasible_count = int(np.sum(eval_res["hard_infeasible"]))
        is_valid = (infeasible_count == 0)

        return {
            "is_counterfactual_physically_admissible": is_valid,
            "infeasible_timesteps_count": infeasible_count,
            "total_timesteps": len(tca),
            "details": eval_res
        }

    def explain_violation(self, state: Dict[str, Any]) -> str:
        reasons = []
        if state.get("feasibility_flag", 1) <= 0 or (state.get("deltav_required", 0) > state.get("max_delta_v", 1e9)):
            reasons.append("Delta-V required exceeds maximum satellite thruster capacity")
        if state.get("time_to_TCA", 1) <= 0:
            reasons.append("TCA has already occurred")
        if state.get("maneuver_window_remaining", 1) <= 0:
            reasons.append("Maneuver window has expired")
        return "; ".join(reasons) if reasons else "No physical constraint violated"

    def get_rule_metadata(self) -> Dict[str, Any]:
        return self.rules
