from functools import lru_cache
from pathlib import Path
from typing import Any, Literal
import json

import pandas as pd
import yaml
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.data.loader import load_raw_dataset, normalize_temporal_structure, prepare_one_hot_orbit
from src.pipeline.event_analyzer import UnifiedEventAnalyzer
from src.counterfactual import CounterfactualGenerator
from src.api.gemini_service import generate_explanation

ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS = ROOT / "research_artifacts"
CONFIG_PATH = ROOT / "configs" / "config.yaml"

app = FastAPI(
    title="Satellite Maneuver Research API",
    version="1.0.0",
    description="Read-only access to the existing satellite research pipeline and artifacts.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def _json_value(value: Any) -> Any:
    if hasattr(value, "item"):
        return value.item()
    if isinstance(value, dict):
        return {str(key): _json_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_value(item) for item in value]
    return value


@lru_cache(maxsize=1)
def get_config() -> dict:
    with CONFIG_PATH.open(encoding="utf-8") as handle:
        return yaml.safe_load(handle)


@lru_cache(maxsize=1)
def get_dataset() -> pd.DataFrame:
    dataset_path = ROOT / get_config()["data"]["dataset_path"]
    return prepare_one_hot_orbit(normalize_temporal_structure(load_raw_dataset(str(dataset_path))))


@lru_cache(maxsize=1)
def get_analyzer() -> UnifiedEventAnalyzer:
    return UnifiedEventAnalyzer(get_config())


@lru_cache(maxsize=1)
def get_counterfactual_generator() -> CounterfactualGenerator:
    return CounterfactualGenerator()


@lru_cache(maxsize=1)
def get_adapters() -> dict:
    return get_analyzer().adapters


@lru_cache(maxsize=1)
def read_json(relative_path: str) -> dict | None:
    path = ARTIFACTS / relative_path
    if not path.exists():
        return None
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


@lru_cache(maxsize=32)
def read_csv(relative_path: str) -> pd.DataFrame | None:
    path = ARTIFACTS / relative_path
    if not path.exists():
        return None
    return pd.read_csv(path)


def artifact_response(relative_path: str, data: Any) -> dict:
    return {
        "available": data is not None,
        "artifact": relative_path,
        "data": _json_value(data) if data is not None else None,
        "status": "available" if data is not None else "Artifact unavailable",
    }


def latest_event_row(event_id: int) -> pd.Series:
    dataset = get_dataset()
    event = dataset[dataset["event_id"] == event_id].sort_values("normalized_step")
    if event.empty:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")
    return event.iloc[-1]


def event_frame(event_id: int) -> pd.DataFrame:
    dataset = get_dataset()
    event = dataset[dataset["event_id"] == event_id].sort_values("normalized_step")
    if event.empty:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")
    return event


def event_status(row: pd.Series) -> dict:
    return {
        "label": "UNDEFINED",
        "status": "Project risk bands are not defined in the existing backend",
        "source": "No SAFE/MODERATE/URGENT/CRITICAL thresholds found",
    }


class WhatIfRequest(BaseModel):
    intervention: Literal["timing", "delta_v"]
    delta_t_adv: float | None = Field(default=None, ge=0)
    scale_factor: float | None = Field(default=None, gt=0)


def model_output(adapter: Any, frame: pd.DataFrame, target_step: int = -1) -> dict:
    probabilities = adapter.predict_proba(frame)
    predictions = adapter.predict(frame)
    if adapter.model_name == "PatchTST":
        return {
            "prob_wait": float(probabilities[0, 0]),
            "prob_commit": float(probabilities[0, 1]),
            "prediction": int(predictions[0]),
        }
    if adapter.model_name == "XGBoost":
        return {
            "prob_wait": float(probabilities[target_step, 0]),
            "prob_commit": float(probabilities[target_step, 1]),
            "prediction": int(predictions[target_step]),
        }
    return {
        "prob_wait": float(probabilities[0, target_step, 0]),
        "prob_commit": float(probabilities[0, target_step, 1]),
        "prediction": int(predictions[0, target_step]),
    }


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": "satellite-research-api", "read_only": True}


@app.get("/api/overview")
def overview() -> dict:
    audit = read_json("dataset_audit.json") or {}
    metrics = read_csv("validation/model_metrics.csv")
    physics = read_csv("validation/physics_validation.csv")
    return {
        "project": get_config().get("project", {}),
        "dataset": audit,
        "models": ["GRU", "LSTM", "TCN", "TRANSFORMER", "PATCHTST", "XGBOOST"],
        "model_metrics_available": metrics is not None,
        "safety_shield_available": physics is not None,
        "causal_analysis_available": read_csv("causal/causal_effects.csv") is not None,
        "artifacts": {
            "final_causal_results": (ARTIFACTS / "final_causal_results.json").exists(),
            "counterfactual_model_responses": (ARTIFACTS / "validation/counterfactual_model_responses.csv").exists(),
        },
    }


@app.get("/api/events")
def events(
    search: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
) -> dict:
    dataset = get_dataset()
    rows = dataset.sort_values(["event_id", "normalized_step"]).groupby("event_id", as_index=False).tail(1)
    if search:
        rows = rows[rows["event_id"].astype(str).str.contains(search, case=False, na=False)]
    total = len(rows)
    start = (page - 1) * page_size
    selected = rows.iloc[start:start + page_size]
    records = []
    for _, row in selected.iterrows():
        records.append({
            "event_id": int(row["event_id"]),
            "time_to_TCA": float(row["time_to_TCA"]),
            "poc": float(row["poc"]),
            "risk_score": float(row["risk_score"]),
            "feasibility_flag": int(row["feasibility_flag"]),
            "status": event_status(row),
        })
    return {"items": records, "page": page, "page_size": page_size, "total": total}


@app.get("/api/events/{event_id}")
def event(event_id: int) -> dict:
    frame = event_frame(event_id)
    generator = get_counterfactual_generator()
    act_step = generator.find_actionable_decision_step(frame)
    target_idx = act_step if act_step is not None else (len(frame) - 1)
    target_row = frame.iloc[target_idx].to_dict()
    event_poc = float(frame["poc"].max()) if "poc" in frame.columns else 0.0
    target_row["observed_poc_at_epoch"] = float(target_row.get("poc", 0.0))
    target_row["terminal_poc_at_tca"] = event_poc
    latest_row = frame.iloc[-1].to_dict()
    latest_row["observed_poc_at_epoch"] = float(latest_row.get("poc", 0.0))
    latest_row["terminal_poc_at_tca"] = event_poc
    return {
        "event_id": event_id,
        "timesteps": int(len(frame)),
        "decision_epoch_step": int(target_idx),
        "latest": _json_value(target_row),
        "final_step": _json_value(latest_row),
        "observed_poc_at_epoch": float(target_row.get("poc", 0.0)),
        "terminal_poc_at_tca": event_poc,
        "max_poc": event_poc,
        "history": _json_value(frame.to_dict(orient="records")),
        "status": event_status(frame.iloc[target_idx]),
    }


@app.get("/api/events/{event_id}/analysis")
def event_analysis(event_id: int) -> dict:
    report = get_analyzer().analyze_event(event_frame(event_id))
    return _json_value(report)


@app.get("/api/models/metrics")
def model_metrics() -> dict:
    frame = read_csv("validation/model_metrics.csv")
    return artifact_response("validation/model_metrics.csv", frame.to_dict(orient="records") if frame is not None else None)


@app.get("/api/models/predictions/{event_id}")
def model_predictions(event_id: int) -> dict:
    frame = read_csv("model_predictions.csv")
    if frame is not None:
        rows = frame[frame["event_id"] == event_id]
        if not rows.empty:
            return artifact_response("model_predictions.csv", rows.to_dict(orient="records"))
    try:
        e_df = event_frame(event_id)
        records = []
        for name, adapter in get_adapters().items():
            probs = adapter.predict_proba(e_df)
            preds = adapter.predict(e_df)
            for idx in range(len(e_df)):
                norm_step = int(e_df.iloc[idx].get("normalized_step", idx))
                if name.lower() == "patchtst":
                    pw, pc, pr = float(probs[0, 0]), float(probs[0, 1]), int(preds[0])
                elif name.lower() == "xgboost":
                    pw, pc, pr = float(probs[idx, 0]), float(probs[idx, 1]), int(preds[idx])
                else:
                    pw, pc, pr = float(probs[0, idx, 0]), float(probs[0, idx, 1]), int(preds[0, idx])
                records.append({
                    "event_id": event_id,
                    "normalized_step": norm_step,
                    "model": name.upper(),
                    "prob_wait": pw,
                    "prob_commit": pc,
                    "prediction": pr,
                })
        return artifact_response("live_inference", records)
    except Exception:
        return artifact_response("model_predictions.csv", [])


@app.get("/api/xai/global")
def xai_global() -> dict:
    frame = read_csv("xai/xai_global.csv")
    return artifact_response("xai/xai_global.csv", frame.to_dict(orient="records") if frame is not None else None)


@app.get("/api/xai/event/{event_id}")
def xai_event(event_id: int) -> dict:
    frame = read_csv("xai/xai_local.csv")
    if frame is not None:
        rows = frame[frame["event_id"] == event_id]
        if not rows.empty:
            return artifact_response("xai/xai_local.csv", rows.to_dict(orient="records"))
    try:
        report = get_analyzer().analyze_event(event_frame(event_id))
        drivers = report.get("WHY", {}).get("key_drivers", [])
        records = []
        for d in drivers:
            feat = d.get("feature", "")
            val = float(d.get("attribution", 0.0))
            records.append({
                "event_id": event_id,
                "model": "CONSENSUS_XAI",
                "feature": feat,
                "attribution": val,
                "abs_attribution": abs(val),
            })
        if records:
            return artifact_response("live_xai", records)
    except Exception:
        pass
    return {"available": False, "artifact": "xai/xai_local.csv", "data": None, "status": "Event-level XAI artifact unavailable"}


@app.get("/api/causal/summary")
def causal_summary() -> dict:
    effects = read_csv("causal/causal_effects.csv")
    refutation = read_csv("causal/causal_refutation.csv")
    assumptions = ARTIFACTS / "causal/causal_assumptions.md"
    graph = read_json("causal/causal_graph.json")
    return {
        "analysis_type": "Observational causal analysis",
        "disclaimer": "This estimates the relationship between required ΔV and PoC under stated assumptions. It is NOT a simulation of physically executing a maneuver.",
        "effects": effects.to_dict(orient="records") if effects is not None else None,
        "refutation": refutation.to_dict(orient="records") if refutation is not None else None,
        "assumptions": assumptions.read_text(encoding="utf-8") if assumptions.exists() else None,
        "dag": graph,
        "available": effects is not None,
    }


@app.get("/api/counterfactuals/{event_id}")
def counterfactuals(event_id: int) -> dict:
    frame = read_csv("counterfactual/counterfactual_results.csv")
    responses = read_csv("validation/counterfactual_model_responses.csv")
    result = frame[frame["event_id"] == event_id].to_dict(orient="records") if frame is not None else None
    model_result = responses[responses["event_id"] == event_id].to_dict(orient="records") if responses is not None else None

    needs_dynamic = False
    if not result:
        needs_dynamic = True
    elif len(result) > 0 and float(result[0].get("factual_poc", 0.0)) == 0.0:
        try:
            e_df = event_frame(event_id)
            if float(e_df["poc"].max()) > 0.0:
                needs_dynamic = True
        except Exception:
            pass

    if needs_dynamic:
        try:
            e_df = event_frame(event_id)
            generator = get_counterfactual_generator()
            act_idx = generator.find_actionable_decision_step(e_df)
            target_idx = act_idx if act_idx is not None else (len(e_df) - 1)
            cf_list = generator.generate_event_counterfactuals(e_df, target_step=target_idx)
            result = []
            for cf in cf_list:
                result.append({
                    "event_id": event_id,
                    "analysis_type": "COUNTERFACTUAL_SENSITIVITY_ANALYSIS",
                    "scenario_category": "TIMING_SENSITIVITY" if "Timing" in cf["intervention_type"] else "DELTA_V_SENSITIVITY",
                    "scenario_type": cf.get("scenario_type", "OPERATIONAL_INTERVENTION"),
                    "intervention_type": cf["intervention_type"],
                    "factual_poc": float(cf["factual"]["poc"]),
                    "counterfactual_poc": float(cf["counterfactual"]["poc"]),
                    "delta_poc": float(cf["deltas"]["delta_poc"]),
                    "is_physically_admissible": cf["physics_validation"]["is_physically_admissible"],
                    "operational_status": cf.get("operational_status", "ACTIONABLE"),
                    "physics_reason": cf["physics_validation"]["reason"],
                })
        except Exception:
            pass
    return {
        "analysis_type": "Counterfactual Sensitivity Analysis",
        "disclaimer": "These scenarios modify model/state variables to study sensitivity. They do not represent a physically propagated ACT/WAIT maneuver.",
        "available": bool(result),
        "scenarios": _json_value(result),
        "model_responses": _json_value(model_result),
        "model_response_available": bool(model_result),
    }


@app.post("/api/events/{event_id}/what-if")
def interactive_what_if(event_id: int, request: WhatIfRequest) -> dict:
    frame = event_frame(event_id)
    generator = get_counterfactual_generator()
    act_step = generator.find_actionable_decision_step(frame)
    target_idx = act_step if act_step is not None else (len(frame) - 1)
    target_row = frame.iloc[target_idx]
    target_dict = target_row.to_dict()
    event_poc = float(frame["poc"].max()) if "poc" in frame.columns else 0.0

    if request.intervention == "timing":
        if request.delta_t_adv not in {10.0, 30.0, 60.0}:
            raise HTTPException(status_code=422, detail="Supported timing advances are 10, 30, or 60.")
        result = generator.scm.propagate_maneuver_timing_intervention(
            target_dict,
            delta_t_adv=request.delta_t_adv,
        )
    else:
        if request.scale_factor is None or request.scale_factor not in {0.8, 1.2, 1.5}:
            raise HTTPException(status_code=422, detail="Supported delta-V scale factors are 0.8, 1.2, or 1.5.")
        result = generator.scm.propagate_deltav_scaling_intervention(
            target_dict,
            scale_factor=request.scale_factor,
        )

    cf_frame = frame.copy(deep=True)
    target_loc = cf_frame.index[target_idx]
    for key, value in result["counterfactual"].items():
        if key in cf_frame.columns and key != "distance":
            cf_frame.loc[target_loc, key] = value

    model_responses = {}
    for name, adapter in get_adapters().items():
        model_responses[name.upper()] = {
            "factual": model_output(adapter, frame, target_step=target_idx),
            "what_if": model_output(adapter, cf_frame, target_step=target_idx),
        }

    factual_analysis = get_analyzer().analyze_event(frame, target_step=target_idx)
    counterfactual_analysis = get_analyzer().analyze_event(cf_frame, target_step=target_idx)
    current_decision = factual_analysis["DECISION"]["final_decision"]
    what_if_decision = counterfactual_analysis["DECISION"]["final_decision"]
    explanation_context = {
        "event": {
            "event_id": event_id,
            "target_step": int(target_idx),
            "time_to_TCA": float(target_dict["time_to_TCA"]),
            "poc": float(result["factual"]["poc"]),
            "observed_poc": float(target_dict["poc"]),
            "terminal_poc": event_poc,
            "deltav_required": float(target_dict["deltav_required"]),
            "max_delta_v": float(target_dict["max_delta_v"]),
            "fuel_margin": float(target_dict["fuel_margin"]),
        },
        "models": model_responses,
        "decision": {"current": current_decision, "what_if": what_if_decision},
        "what_if": {
            "intervention": request.intervention,
            "factual_poc": float(result["factual"]["poc"]),
            "counterfactual_poc": float(result["counterfactual"]["poc"]),
            "factual_deltav": float(target_dict["deltav_required"]),
            "counterfactual_deltav": float(result["counterfactual"]["deltav_required"]),
        },
    }

    return _json_value({
        "analysis_type": "Interactive What-If Sensitivity Simulator",
        "disclaimer": "These what-if scenarios modify supported state/intervention variables to study sensitivity. They are not physically propagated ACT/WAIT maneuver simulations.",
        "event_id": event_id,
        "target_step_index": int(target_idx),
        "is_pre_tca_actionable": act_step is not None,
        "intervention": request.model_dump(exclude_none=True),
        "factual": {
            "time_to_TCA": float(target_dict["time_to_TCA"]),
            "poc": float(result["factual"]["poc"]),
            "observed_poc_at_epoch": float(target_dict["poc"]),
            "terminal_poc_at_tca": event_poc,
            "deltav_required": float(target_dict["deltav_required"]),
            "max_delta_v": float(target_dict["max_delta_v"]),
            "fuel_remaining": float(target_dict["fuel_remaining"]),
            "fuel_margin": float(target_dict["fuel_margin"]),
            "maneuver_window_remaining": float(target_dict["maneuver_window_remaining"]),
            "feasibility_flag": int(target_dict["feasibility_flag"]),
        },
        "counterfactual": result["counterfactual"],
        "deltas": result["deltas"],
        "factual_admissible": result["factual_admissible"],
        "counterfactual_admissible": result["counterfactual_admissible"],
        "physics_validation": result["physics_validation"],
        "operational_status": result["operational_status"],
        "model_responses": model_responses,
        "decision": {
            "current": current_decision,
            "what_if": what_if_decision,
            "changed": current_decision != what_if_decision,
            "current_operational_status": factual_analysis["DECISION"]["operational_status"],
            "what_if_operational_status": counterfactual_analysis["DECISION"]["operational_status"],
        },
        "explanation_context": explanation_context,
        "deterministic_explanation": generate_explanation(explanation_context),
    })


@app.post("/api/events/{event_id}/xai-explanation")
def xai_explanation(event_id: int) -> dict:
    frame = event_frame(event_id)
    current_analysis = get_analyzer().analyze_event(frame)
    act_step = current_analysis["DECISION"]["decision_epoch_step"]
    row = frame.iloc[act_step]
    prediction_artifact = read_csv("model_predictions.csv")
    xai_artifact = read_csv("xai/xai_local.csv")
    event_predictions = prediction_artifact[prediction_artifact["event_id"] == event_id] if prediction_artifact is not None else None
    event_xai = xai_artifact[xai_artifact["event_id"] == event_id] if xai_artifact is not None else None
    final_predictions = []
    if event_predictions is not None and not event_predictions.empty:
        final_predictions = (
            event_predictions.sort_values("normalized_step")
            .groupby("model", as_index=False)
            .tail(1)[["model", "prediction", "prob_wait", "prob_commit"]]
            .to_dict(orient="records")
        )
    else:
        preds_resp = model_predictions(event_id)
        if preds_resp.get("data"):
            df_p = pd.DataFrame(preds_resp["data"])
            final_predictions = (
                df_p.sort_values("normalized_step")
                .groupby("model", as_index=False)
                .tail(1)[["model", "prediction", "prob_wait", "prob_commit"]]
                .to_dict(orient="records")
            )

    top_features = []
    if event_xai is not None and not event_xai.empty:
        top_features = (
            event_xai.assign(abs_attribution=pd.to_numeric(event_xai["abs_attribution"]))
            .sort_values("abs_attribution", ascending=False)
            .groupby("model", as_index=False)
            .head(5)[["model", "feature", "attribution", "abs_attribution"]]
            .to_dict(orient="records")
        )
    else:
        xai_resp = xai_event(event_id)
        if xai_resp.get("data"):
            df_x = pd.DataFrame(xai_resp["data"])
            top_features = (
                df_x.sort_values("abs_attribution", ascending=False)
                .head(5)[["model", "feature", "attribution", "abs_attribution"]]
                .to_dict(orient="records")
            )

    physics_status = {
        "feasibility_flag": int(row["feasibility_flag"]),
        "deltav_required_lte_max_delta_v": float(row["deltav_required"]) <= float(row["max_delta_v"]),
        "time_to_TCA_gt_zero": float(row["time_to_TCA"]) > 0,
        "maneuver_window_gt_zero": float(row["maneuver_window_remaining"]) > 0,
    }
    causal_frame = read_csv("causal/causal_effects.csv")
    context = {
        "event_id": event_id,
        "verified_event_values": {
            "time_to_TCA": float(row["time_to_TCA"]),
            "poc": float(row["poc"]),
            "relative_distance": float(row["relative_distance"]),
            "deltav_required": float(row["deltav_required"]),
            "fuel_margin": float(row["fuel_margin"]),
            "feasibility_flag": int(row["feasibility_flag"]),
        },
        "model_predictions": _json_value(final_predictions),
        "top_xai_features": _json_value(top_features),
        "model_consensus": {
            "commit_count": sum(item["prediction"] == 1 for item in final_predictions),
            "model_count": len(final_predictions),
        },
        "safety_status": physics_status,
        "causal_result": _json_value(causal_frame.to_dict(orient="records")) if causal_frame is not None else None,
    }
    explanation_context = {
        "event": context["verified_event_values"],
        "models": final_predictions,
        "top_xai_features": top_features,
        "safety": physics_status,
        "causal": context["causal_result"],
        "decision": {"current": current_analysis["DECISION"]["final_decision"]},
    }
    return _json_value({
        **generate_explanation(explanation_context),
        "verified_context": context,
    })


@app.get("/api/physics/{event_id}")
def physics(event_id: int) -> dict:
    frame = event_frame(event_id)
    report = get_analyzer().analyze_event(frame)
    act_step = report["DECISION"]["decision_epoch_step"]
    row = frame.iloc[act_step]
    required_dv = float(row["deltav_required"])
    maximum_dv = float(row["max_delta_v"])
    time_to_tca = float(row["time_to_TCA"])
    maneuver_window = float(row["maneuver_window_remaining"])
    fuel_margin = float(row["fuel_margin"])
    return {
        "event_id": event_id,
        "decision_epoch_step": int(act_step),
        "operational_status": report["DECISION"]["operational_status"],
        "operational_reason": report["DECISION"]["operational_reason"],
        "checks": [
            {"label": "Feasibility flag", "passed": bool(row["feasibility_flag"] > 0)},
            {"label": "Required Delta-V <= Maximum Delta-V", "passed": required_dv <= maximum_dv},
            {"label": "Time to TCA > 0", "passed": time_to_tca > 0},
            {"label": "Maneuver window > 0", "passed": maneuver_window > 0},
            {"label": "Fuel margin >= 0", "passed": fuel_margin >= 0},
        ],
        "values": {
            "feasibility_flag": int(row["feasibility_flag"]),
            "deltav_required": required_dv,
            "max_delta_v": maximum_dv,
            "time_to_TCA": time_to_tca,
            "maneuver_window_remaining": maneuver_window,
            "fuel_margin": fuel_margin,
        },
        "analyzer": _json_value(report["PHYSICALLY_VALID"]),
    }
