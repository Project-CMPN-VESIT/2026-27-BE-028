import numpy as np
import pandas as pd
import torch
from typing import Dict, List, Any, Optional

from src.models import get_adapter
from src.xai import NeuralXAIExplainer, TreeSHAPExplainer
from src.physics.adapter import ExistingPhysicsSymbolicAdapter
from src.counterfactual.structural_scm import SatelliteStructuralSCM

class UnifiedEventAnalyzer:
    """
    Event-Level Research Analysis Engine.
    Produces comprehensive, auditable answers to:
      - WHAT did each of the six models predict?
      - WHY did each model make its prediction (XAI)?
      - WHAT IF we intervene structurally (Counterfactuals)?
      - IS IT PHYSICALLY VALID under existing astrodynamic laws?
      - WHAT DECISION follows under the validated framework?
    """
    def __init__(self, config: dict, loaded_adapters: Optional[dict] = None):
        self.config = config
        self.adapters = loaded_adapters or {}
        if not self.adapters:
            for m in ["gru", "lstm", "tcn", "transformer", "patchtst", "xgboost"]:
                self.adapters[m] = get_adapter(m, config)
        self.physics_adapter = ExistingPhysicsSymbolicAdapter(config)
        self.scm = SatelliteStructuralSCM(self.physics_adapter)

    def analyze_event(self, event_df: pd.DataFrame, target_step: Optional[int] = None) -> Dict[str, Any]:
        """
        Executes complete multi-model, XAI, causal, counterfactual, and symbolic audit for a single conjunction event.
        Evaluates at the actionable pre-TCA decision epoch (or specified target_step).
        """
        if event_df.empty:
            raise ValueError("event_df is empty; cannot analyze non-existent event.")
        eid = int(event_df["event_id"].iloc[0])
        orbit = str(event_df["orbit_type"].iloc[0]) if "orbit_type" in event_df.columns else "UNKNOWN"
        n_steps = len(event_df)

        # ------------------------------------------------------------
        # 0. RESOLVE ACTIONABLE DECISION HORIZON
        # ------------------------------------------------------------
        tca_vals = event_df["time_to_TCA"].values
        win_vals = event_df["maneuver_window_remaining"].values if "maneuver_window_remaining" in event_df.columns else tca_vals
        active_indices = np.where((tca_vals > 0) & (win_vals > 0))[0]

        if target_step is not None:
            actionable_idx = int(target_step)
            decision_horizon_type = "ACTIONABLE_PRE_TCA" if (tca_vals[actionable_idx] > 0 and win_vals[actionable_idx] > 0) else "POST_TCA_ELAPSED"
        elif len(active_indices) > 0:
            actionable_idx = int(active_indices[-1])
            decision_horizon_type = "ACTIONABLE_PRE_TCA"
        else:
            actionable_idx = len(event_df) - 1
            decision_horizon_type = "POST_TCA_ELAPSED"

        actionable_row = event_df.iloc[actionable_idx].to_dict()
        last_row = event_df.iloc[-1].to_dict()

        # ------------------------------------------------------------
        # 1. WHAT: Predictions from all 6 models evaluated at actionable decision epoch
        # ------------------------------------------------------------
        what_results = {}
        for mname, adapter in self.adapters.items():
            probs = adapter.predict_proba(event_df)
            raw_preds = adapter.predict(event_df)
            
            if mname == "patchtst":
                prob_commit_final = float(probs[0, 1])
                prob_wait_final = float(probs[0, 0])
                raw_decision_final = int(raw_preds[0])
            elif mname == "xgboost":
                prob_commit_final = float(probs[actionable_idx, 1])
                prob_wait_final = float(probs[actionable_idx, 0])
                raw_decision_final = int(raw_preds[actionable_idx])
            else: # sequence models (batch, 20, 2)
                prob_commit_final = float(probs[0, actionable_idx, 1])
                prob_wait_final = float(probs[0, actionable_idx, 0])
                raw_decision_final = int(raw_preds[0, actionable_idx])

            what_results[mname] = {
                "prob_wait": prob_wait_final,
                "prob_commit": prob_commit_final,
                "raw_decision": raw_decision_final,
                "decision_label": "COMMIT" if raw_decision_final == 1 else "WAIT"
            }

        # ------------------------------------------------------------
        # 2. WHY: Model-Specific XAI Explanations at actionable decision epoch
        # ------------------------------------------------------------
        why_results = {}
        # Neural XAI for GRU (as representative sequence model)
        gru_adapter = self.adapters["gru"]
        gru_exp = NeuralXAIExplainer(gru_adapter, n_steps=20).explain_instance(
            gru_adapter.preprocess(event_df), target_timestep=actionable_idx, target_class=1
        )
        why_results["gru"] = {
            "top_5_features": gru_exp["ranked_features"][:5],
            "convergence_delta": gru_exp["convergence_delta"]
        }

        # XGBoost TreeSHAP at actionable decision epoch
        xgb_adapter = self.adapters["xgboost"]
        xgb_exp = TreeSHAPExplainer(xgb_adapter).explain_local(event_df.iloc[[actionable_idx]])
        why_results["xgboost"] = {
            "top_5_features": xgb_exp["ranked_features"][:5],
            "base_value": xgb_exp["base_value"]
        }

        # Combined key drivers for consensus/API representation
        combined_drivers = []
        for idx in gru_exp["ranked_indices"][:3]:
            feat = gru_adapter.get_feature_names()[idx]
            attr = float(gru_exp["feature_attributions_signed"][idx])
            combined_drivers.append({"feature": feat, "attribution": attr, "model": "GRU"})
        for idx in xgb_exp["ranked_indices"][:3]:
            feat = xgb_adapter.get_feature_names()[idx]
            shap_arr = np.asarray(xgb_exp["shap_values"]).flatten()
            attr = float(shap_arr[idx])
            combined_drivers.append({"feature": feat, "attribution": attr, "model": "XGBOOST"})
        why_results["key_drivers"] = combined_drivers

        # ------------------------------------------------------------
        # 3. WHAT IF: Structural Counterfactuals
        # ------------------------------------------------------------
        # Structural counterfactuals evaluated at the decision epoch
        cf_timing = self.scm.propagate_maneuver_timing_intervention(actionable_row, delta_t_adv=30.0)
        cf_thrust = self.scm.propagate_deltav_scaling_intervention(actionable_row, scale_factor=1.25)
        what_if_results = {
            "decision_epoch_step": actionable_idx,
            "decision_horizon_type": decision_horizon_type,
            "advance_timing_30s": cf_timing,
            "boost_thrust_25pct": cf_thrust
        }

        # ------------------------------------------------------------
        # 4. IS IT PHYSICALLY VALID: Symbolic Shield Audit
        # ------------------------------------------------------------
        feas_arr = event_df["feasibility_flag"].values
        tca_arr = event_df["time_to_TCA"].values
        win_arr = event_df["maneuver_window_remaining"].values if "maneuver_window_remaining" in event_df.columns else tca_arr
        dv_req = event_df["deltav_required"].values if "deltav_required" in event_df.columns else None
        dv_max = event_df["max_delta_v"].values if "max_delta_v" in event_df.columns else None

        state_val = self.physics_adapter.validate_state(last_row)
        actionable_state_val = self.physics_adapter.validate_state(actionable_row)
        
        # Apply shield to all models evaluated at the actionable decision epoch
        shielded_decisions = {}
        for mname, res in what_results.items():
            shield_eval = self.physics_adapter.apply_shield(
                np.array([res["raw_decision"]]),
                np.array([feas_arr[actionable_idx]]),
                np.array([tca_arr[actionable_idx]]),
                np.array([win_arr[actionable_idx]]),
                np.array([dv_req[actionable_idx]]) if dv_req is not None else None,
                np.array([dv_max[actionable_idx]]) if dv_max is not None else None
            )
            shielded_decisions[mname] = {
                "raw": res["raw_decision"],
                "final_shielded": int(shield_eval["final_predictions"][0]),
                "operational_state": str(shield_eval.get("operational_states", ["ACTIONABLE_WAIT"])[0]),
                "is_corrected": bool(shield_eval["corrections"][0]),
                "reason": str(shield_eval["reasons"][0])
            }

        # ------------------------------------------------------------
        # 5. FINAL OPERATIONAL & SAFETY DECISION RECOMMENDATION
        # ------------------------------------------------------------
        tca_actionable = float(tca_arr[actionable_idx])
        win_actionable = float(win_arr[actionable_idx])
        tca_final = float(tca_arr[-1])
        win_final = float(win_arr[-1])

        raw_commits = sum(res["raw_decision"] for res in what_results.values())
        ml_consensus = "COMMIT" if raw_commits >= 4 else "WAIT"
        final_commits = sum(d["final_shielded"] for d in shielded_decisions.values())

        if tca_actionable <= 0 or win_actionable <= 0:
            operational_status = "INVALID_CLOSED"
            operational_reason = f"Conjunction encounter has passed (t_TCA={tca_actionable:.2f}s) or maneuver window expired (W_rem={win_actionable:.2f}s); closed to new interventions"
            final_decision = "INVALID_CLOSED"
        elif not actionable_state_val["is_physically_admissible"]:
            operational_status = "INFEASIBLE_HIGH_RISK"
            operational_reason = actionable_state_val["reason"]
            final_decision = "INVALID_CLOSED"
        else:
            if final_commits >= 4:
                operational_status = "ACTIONABLE_COMMIT"
                operational_reason = f"Maneuver window open ({win_actionable:.1f}s) and delta-V feasible. High-risk consensus reached ({final_commits}/6 models commit)."
                final_decision = "COMMIT"
            else:
                operational_status = "ACTIONABLE_WAIT"
                operational_reason = f"Maneuver window open ({win_actionable:.1f}s) and delta-V feasible. Risk below commit threshold ({final_commits}/6 models commit)."
                final_decision = "WAIT"

        return {
            "event_id": eid,
            "orbit_type": orbit,
            "timesteps": n_steps,
            "decision_epoch_step": actionable_idx,
            "encounter_elapsed_by_final_step": bool(tca_final <= 0 or win_final <= 0),
            "final_step_tca": tca_final,
            "WHAT": what_results,
            "WHY": why_results,
            "WHAT_IF": what_if_results,
            "PHYSICALLY_VALID": {
                "factual_state_admissible": actionable_state_val["is_physically_admissible"],
                "actionable_epoch_admissible": actionable_state_val["is_physically_admissible"],
                "validation_reason": actionable_state_val["reason"],
                "shielded_decisions": shielded_decisions
            },
            "DECISION": {
                "decision_epoch_step": actionable_idx,
                "decision_horizon_type": decision_horizon_type,
                "ml_raw_consensus": ml_consensus,
                "ml_raw_commits_count": raw_commits,
                "operational_status": operational_status,
                "operational_reason": operational_reason,
                "final_decision": final_decision,
                "shielded_commits_count": final_commits,
                "total_models": len(self.adapters)
            },
            "ASSUMPTIONS": [
                "Temporal non-anticipation: observations at step t use only past and current measurements.",
                "Type A physical laws (delta-V limits and non-retroactivity) are inviolable hard constraints.",
                "Structural counterfactual propagation respects impulse kinematics."
            ],
            "LIMITATIONS": [
                "commit_decision is a supervised decision target, not randomized experimental trial data.",
                "Point-estimate sensor noise approximations are subject to tracking covariance uncertainty."
            ]
        }

if __name__ == "__main__":
    import argparse
    import json
    import yaml
    from src.data.loader import load_raw_dataset, normalize_temporal_structure, prepare_one_hot_orbit

    parser = argparse.ArgumentParser(description="Analyze a single conjunction event with 6 models, XAI, causal counterfactuals, and physics shield.")
    parser.add_argument("--event_id", type=int, default=1, help="Event ID to analyze (e.g., 1, 10, 42)")
    parser.add_argument("--config", type=str, default="configs/config.yaml", help="Path to config.yaml")
    args = parser.parse_args()

    with open(args.config, "r") as f:
        cfg = yaml.safe_load(f)

    print(f"Loading dataset and initializing UnifiedEventAnalyzer for Event ID: {args.event_id}...")
    df_raw = load_raw_dataset(cfg["data"]["dataset_path"])
    df_norm = normalize_temporal_structure(df_raw)
    df_orbit = prepare_one_hot_orbit(df_norm)

    event_df = df_orbit[df_orbit["event_id"] == args.event_id].sort_values("normalized_step")
    if event_df.empty:
        print(f"Error: Event ID {args.event_id} not found in dataset!")
    else:
        analyzer = UnifiedEventAnalyzer(cfg)
        report = analyzer.analyze_event(event_df)
        print("\n" + "="*60)
        print(f"EVENT {args.event_id} COMPREHENSIVE AUDIT REPORT")
        print("="*60)
        print(json.dumps(report, indent=2))

