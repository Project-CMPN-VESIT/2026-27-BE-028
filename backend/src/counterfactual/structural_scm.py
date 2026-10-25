import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple, Optional
from src.physics.adapter import ExistingPhysicsSymbolicAdapter


def compute_uncertainty(
    time_to_tca: float,
    t_max: float,
    sigma_initial: float,
    k: float,
    r_scale: float,
    t_scale: float,
    n_scale: float,
) -> Tuple[float, float, float]:
    """Reproduce the original simulator's uncertainty calculation."""
    normalized_time = time_to_tca / max(t_max, 1e-6)
    sigma_base = sigma_initial * np.exp(-k * (1.0 - normalized_time))
    sigma_r = np.clip(sigma_base * r_scale, 5.0, 50.0)
    sigma_t = np.clip(sigma_base * t_scale, 5.0, 50.0)
    sigma_n = np.clip(sigma_base * n_scale, 5.0, 50.0)
    return float(sigma_r), float(sigma_t), float(sigma_n)

class SatelliteStructuralSCM:
    """
    Structural Causal Model for Satellite Conjunction Kinematics and Propellant Mechanics.
    Implements structural propagation of physical interventions:
      Factual State -> Exogenous Residuals -> Intervention -> Structural Equations -> Counterfactual Trajectory
    """
    def __init__(self, physics_adapter: Optional[Any] = None):
        if isinstance(physics_adapter, dict):
            self.physics_adapter = ExistingPhysicsSymbolicAdapter(physics_adapter)
        else:
            self.physics_adapter = physics_adapter or ExistingPhysicsSymbolicAdapter()

    def propagate_maneuver_timing_intervention(
        self,
        factual_row: Dict[str, Any],
        delta_t_adv: float,
        uncertainty_params: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """
        Intervention: Advance maneuver decision by delta_t_adv > 0.
        Structural mechanism:
          1. t_TCA_cf = t_TCA_fact + delta_t_adv
          2. Required delta-v scales inversely with available propagation lead time:
             dv_cf = dv_fact * (t_TCA_fact / t_TCA_cf)
          3. Fuel margin updates: fuel_margin_cf = (max_dv - dv_cf) / max_dv
          4. Feasibility flag updates: feasibility_flag_cf = (dv_cf <= max_dv)
          5. Factual distance is held fixed while uncertainty and PoC are recomputed.
        """
        t_fact = float(factual_row.get("time_to_TCA", 100.0))
        dv_fact = float(factual_row.get("deltav_required", 0.05))
        max_dv = float(factual_row.get("max_delta_v", 10.0))
        poc_fact = float(factual_row.get("poc", 0.0))
        distance_key = "distance" if "distance" in factual_row else "relative_distance"
        if distance_key not in factual_row:
            raise ValueError(
                "Timing counterfactual requires factual 'distance' or 'relative_distance'."
            )
        factual_distance = float(factual_row[distance_key])

        params = uncertainty_params or factual_row.get("uncertainty_params")
        required_params = [
            "t_max", "sigma_initial", "k", "r_scale", "t_scale", "n_scale"
        ]
        has_complete_params = params is not None and all(
            name in params for name in required_params
        )

        sigma_keys = ["sigma_r", "sigma_t", "sigma_n"]
        if not all(name in factual_row for name in sigma_keys):
            raise ValueError(
                "Timing counterfactual requires factual sigma state "
                f"{sigma_keys} when complete uncertainty_params are unavailable."
            )

        t_cf = t_fact + delta_t_adv
        if t_fact <= 0 or t_cf <= 0:
            dv_cf = dv_fact * 10.0 # Extreme penalty for post-TCA / expired maneuver
        else:
            dv_cf = dv_fact * (t_fact / t_cf)

        if has_complete_params:
            sigma_r_cf, sigma_t_cf, sigma_n_cf = compute_uncertainty(
                time_to_tca=t_cf,
                t_max=float(params["t_max"]),
                sigma_initial=float(params["sigma_initial"]),
                k=float(params["k"]),
                r_scale=float(params["r_scale"]),
                t_scale=float(params["t_scale"]),
                n_scale=float(params["n_scale"]),
            )
            uncertainty_source = "ORIGINAL_GENERATOR_PARAMETERS"
            scenario_type = "TEMPORAL_SHIFT"
        else:
            # The original generator parameters are unavailable. Hold the observed
            # uncertainty state fixed and label this as a partial sensitivity case.
            sigma_r_cf = float(factual_row["sigma_r"])
            sigma_t_cf = float(factual_row["sigma_t"])
            sigma_n_cf = float(factual_row["sigma_n"])
            uncertainty_source = "FACTUAL_SIGMA_STATE_HELD_FIXED"
            scenario_type = "PARTIAL_TEMPORAL_SENSITIVITY"
        sigma_cf = (sigma_r_cf + sigma_t_cf + sigma_n_cf) / 3.0

        # Astrodynamic Collision Probability Formulation (Foster 1992 B-Plane clearance):
        # Non-anticipatively evaluated using strictly information available at epoch t.
        comb_cov = max(1e-4, float(factual_row.get("combined_covariance_magnitude", sigma_cf ** 2)))
        sigma_comb = np.sqrt(comb_cov)
        dv_m = dv_fact * 1000.0 if dv_fact < 0.1 else dv_fact
        extra_defl = dv_m * delta_t_adv

        if poc_fact > 1e-15:
            # Calibrated relative risk decay preserving baseline factual scale
            base_poc = poc_fact
            poc_mode = "OBSERVED_DIRECT"
        else:
            # Non-anticipative B-plane encounter risk projection from epoch t state
            hbr = float(factual_row.get("hard_body_radius", 0.005))
            b_plane_peak = 0.5 * (hbr ** 2 / comb_cov)
            defl_offset = (dv_m * max(1.0, t_fact)) / sigma_comb
            base_poc = float(b_plane_peak * np.exp(-0.5 * min(50.0, (defl_offset / sigma_comb) ** 2)))
            poc_mode = "ESTIMATED_ENCOUNTER_PROJECTION"

        poc_cf = float(base_poc * np.exp(-0.5 * min(50.0, (extra_defl / sigma_comb) ** 2)))

        fuel_margin_cf = (max_dv - dv_cf) / (max_dv + 1e-8)
        feasibility_flag_cf = 1 if dv_cf <= max_dv else 0

        cf_state = factual_row.copy()
        cf_state["time_to_TCA"] = t_cf
        cf_state["maneuver_window_remaining"] = max(0.0, float(factual_row.get("maneuver_window_remaining", t_fact)) + delta_t_adv)
        cf_state["deltav_required"] = dv_cf
        cf_state["fuel_margin"] = fuel_margin_cf
        cf_state["feasibility_flag"] = feasibility_flag_cf
        cf_state["poc"] = poc_cf
        cf_state["sigma_r"] = sigma_r_cf
        cf_state["sigma_t"] = sigma_t_cf
        cf_state["sigma_n"] = sigma_n_cf

        # Physics Shield Validation
        fact_val = self.physics_adapter.validate_state(factual_row)
        val_res = self.physics_adapter.validate_state(cf_state)

        mw_fact = float(factual_row.get("maneuver_window_remaining", t_fact))
        is_actionable = (t_fact > 0) and (mw_fact > 0) and fact_val["is_physically_admissible"]
        op_status = "ACTIONABLE" if is_actionable else "INVALID_FOR_INTERVENTION"

        poc_status_fact = "BELOW_NUMERICAL_RESOLUTION" if base_poc <= 1e-15 else "EVALUATED"
        poc_status_cf = "BELOW_NUMERICAL_RESOLUTION" if poc_cf <= 1e-15 else "EVALUATED"

        return {
            "scenario_type": scenario_type,
            "intervention_type": "Maneuver Lead-Time Advance (Temporal Scenario)",
            "delta_t_adv": delta_t_adv,
            "structurally_computable": True,
            "uncertainty_source": uncertainty_source,
            "exact_original_uncertainty_replay": has_complete_params,
            "operationally_actionable": is_actionable,
            "operational_status": op_status,
            "factual_admissible": fact_val["is_physically_admissible"],
            "counterfactual_admissible": val_res["is_physically_admissible"],
            "poc_mode": poc_mode,
            "factual": {
                "time_to_TCA": t_fact,
                "deltav_required": dv_fact,
                "fuel_margin": float(factual_row.get("fuel_margin", 0.8)),
                "feasibility_flag": int(factual_row.get("feasibility_flag", 1)),
                "poc": base_poc,
                "observed_poc": poc_fact,
                "poc_status": poc_status_fact
            },
            "counterfactual": {
                "time_to_TCA": t_cf,
                "deltav_required": dv_cf,
                "fuel_margin": fuel_margin_cf,
                "feasibility_flag": feasibility_flag_cf,
                "poc": poc_cf,
                "distance": factual_distance,
                "sigma_r": sigma_r_cf,
                "sigma_t": sigma_t_cf,
                "sigma_n": sigma_n_cf,
                "poc_status": poc_status_cf
            },
            "deltas": {
                "delta_deltav_required": dv_cf - dv_fact,
                "delta_fuel_margin": fuel_margin_cf - float(factual_row.get("fuel_margin", 0.8)),
                "delta_poc": poc_cf - base_poc
            },
            "factual_physics_validation": fact_val,
            "physics_validation": val_res
        }

    def propagate_deltav_scaling_intervention(
        self,
        factual_row: Dict[str, Any],
        scale_factor: float = 1.25 # boost impulsive thrust by 25%
    ) -> Dict[str, Any]:
        """
        Operational Intervention: Scale impulsive thruster delta-V magnitude by scale_factor.
        Structural mechanism:
          1. dv_cf = dv_fact * scale_factor
          2. fuel_margin_cf = (max_dv - dv_cf) / max_dv
          3. feasibility_flag_cf = (dv_cf <= max_dv)
          4. PoC drops due to enhanced clearance.
        """
        dv_fact = float(factual_row.get("deltav_required", 0.05))
        max_dv = float(factual_row.get("max_delta_v", 10.0))
        poc_fact = float(factual_row.get("poc", 0.0))
        comb_cov = max(1e-4, float(factual_row.get("combined_covariance_magnitude", 100.0)))
        sigma_comb = np.sqrt(comb_cov)
        t_fact = float(factual_row.get("time_to_TCA", 100.0))
        mw_fact = float(factual_row.get("maneuver_window_remaining", t_fact))

        dv_cf = dv_fact * scale_factor
        fuel_margin_cf = (max_dv - dv_cf) / (max_dv + 1e-8)
        feasibility_flag_cf = 1 if dv_cf <= max_dv else 0

        dv_m = dv_fact * 1000.0 if dv_fact < 0.1 else dv_fact

        if poc_fact > 1e-15:
            base_poc = poc_fact
            poc_mode = "OBSERVED_DIRECT"
        else:
            hbr = float(factual_row.get("hard_body_radius", 0.005))
            b_plane_peak = 0.5 * (hbr ** 2 / comb_cov)
            defl_offset = (dv_m * max(1.0, t_fact)) / sigma_comb
            base_poc = float(b_plane_peak * np.exp(-0.5 * min(50.0, (defl_offset / sigma_comb) ** 2)))
            poc_mode = "ESTIMATED_ENCOUNTER_PROJECTION"

        if scale_factor < 1.0:
            reduced_defl = (1.0 - scale_factor) * dv_m * max(1.0, t_fact)
            poc_cf = min(1.0, float(base_poc * np.exp(+0.5 * min(50.0, (reduced_defl / sigma_comb) ** 2))))
        else:
            extra_defl = (scale_factor - 1.0) * dv_m * max(1.0, t_fact)
            poc_cf = float(base_poc * np.exp(-0.5 * min(50.0, (extra_defl / sigma_comb) ** 2)))

        cf_state = factual_row.copy()
        cf_state["deltav_required"] = dv_cf
        cf_state["fuel_margin"] = fuel_margin_cf
        cf_state["feasibility_flag"] = feasibility_flag_cf
        cf_state["poc"] = poc_cf

        fact_val = self.physics_adapter.validate_state(factual_row)
        val_res = self.physics_adapter.validate_state(cf_state)

        is_actionable = (t_fact > 0) and (mw_fact > 0) and fact_val["is_physically_admissible"]
        op_status = "ACTIONABLE" if is_actionable else "INVALID_FOR_INTERVENTION"

        poc_status_fact = "BELOW_NUMERICAL_RESOLUTION" if base_poc <= 1e-15 else "EVALUATED"
        poc_status_cf = "BELOW_NUMERICAL_RESOLUTION" if poc_cf <= 1e-15 else "EVALUATED"

        return {
            "scenario_type": "OPERATIONAL_INTERVENTION",
            "intervention_type": "Delta-V Impulse Scaling (Operational Intervention)",
            "scale_factor": scale_factor,
            "structurally_computable": True,
            "operationally_actionable": is_actionable,
            "operational_status": op_status,
            "factual_admissible": fact_val["is_physically_admissible"],
            "counterfactual_admissible": val_res["is_physically_admissible"],
            "poc_mode": poc_mode,
            "factual": {
                "time_to_TCA": t_fact,
                "deltav_required": dv_fact,
                "fuel_margin": float(factual_row.get("fuel_margin", 0.8)),
                "feasibility_flag": int(factual_row.get("feasibility_flag", 1)),
                "poc": base_poc,
                "observed_poc": poc_fact,
                "poc_status": poc_status_fact
            },
            "counterfactual": {
                "time_to_TCA": t_fact,
                "deltav_required": dv_cf,
                "fuel_margin": fuel_margin_cf,
                "feasibility_flag": feasibility_flag_cf,
                "poc": poc_cf,
                "poc_status": poc_status_cf
            },
            "deltas": {
                "delta_deltav_required": dv_cf - dv_fact,
                "delta_fuel_margin": fuel_margin_cf - float(factual_row.get("fuel_margin", 0.8)),
                "delta_poc": poc_cf - base_poc
            },
            "factual_physics_validation": fact_val,
            "physics_validation": val_res
        }
