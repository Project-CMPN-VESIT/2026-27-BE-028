"""
FastAPI Application for Satellite Collision Avoidance System
=============================================================
Integrates:
- Updated Dataset (backend/updated_4_scenarios_dataset.csv)
- Model Preprocessing (backend/neurosymbolic_reconstructed_preprocessing.zip)
- 6 Trained Models from backend/model_files/:
  * LSTM (NeuroSymbolic_LSTM_final.pt.zip)
  * GRU (final_physics_regularized_gru.pth)
  * TCN (satellite_tcn_modelt4.pt.zip)
  * Causal Transformer (causal_transformer_physics.pt.zip)
  * PatchTST (patchtst_model.pt.zip)
  * XGBoost (xgboost_model.pt.zip)
- New Symbolic Safety Layer (backend/updated_symbolic_layer.py)
"""

import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from model_service import get_model_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("satellite_api")

app = FastAPI(
    title="Satellite Collision Avoidance AI Decision System",
    description="6-Model Neuro-Symbolic collision avoidance timing under orbital uncertainty",
    version="2.1.0",
)

# CORS middleware for React frontend (Vite & production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize model service (loads dataset, scalers, all 6 models)
service = get_model_service()

# -----------------------------------------------------------------------------
# PYDANTIC SCHEMAS
# -----------------------------------------------------------------------------

class PredictInput(BaseModel):
    sequence: Optional[Any] = None
    event_id: Optional[int] = None
    current_step: Optional[int] = 0

class DecisionRequest(BaseModel):
    event_id: Optional[int] = None
    fuel_available: Optional[float] = 100.0


# -----------------------------------------------------------------------------
# API ROUTES (Supporting both /api/* and root paths for compatibility)
# -----------------------------------------------------------------------------

@app.get("/health")
@app.get("/api/health")
def health_check():
    """Health check endpoint with loaded model statuses."""
    return {
        "status": "healthy",
        "version": "2.1.0",
        "timestamp": datetime.utcnow().isoformat(),
        "models": service.model_status,
        "dataset_rows": len(service.df) if service.df is not None else 0,
        "unique_events": len(service.event_summaries),
    }


@app.get("/events")
@app.get("/api/events")
def list_events():
    """List all available conjunction events from updated dataset."""
    return list(service.event_summaries.values())


@app.get("/events/{event_id}")
@app.get("/api/events/{event_id}")
def get_event(event_id: int):
    """Retrieve detailed event telemetry and trend by event ID."""
    if event_id not in service.event_summaries:
        if not service._ensure_event_loaded(event_id):
            raise HTTPException(status_code=404, detail=f"Event {event_id} not found in dataset")
    return service.event_summaries[event_id]


@app.post("/evaluate/{event_id}")
@app.post("/api/evaluate/{event_id}")
def evaluate_event(event_id: int, current_step: int = Query(default=0), fuel_available: Optional[float] = Query(default=100.0)):
    """
    Run 6-model inference with model-specific preprocessing and the new symbolic safety layer.
    Returns multi-model decisions, commit/wait probabilities, symbolic correction
    flags, auditable reasons, 20-step timeline, and maneuver options.
    """
    if event_id not in service.event_sequences_33:
        if not service._ensure_event_loaded(event_id):
            raise HTTPException(status_code=404, detail=f"Event {event_id} not found in dataset")
    return service.evaluate_event(event_id, current_step=current_step)


@app.post("/decision")
@app.post("/api/decision")
def make_decision(request: DecisionRequest):
    """Orchestrate decision for request object."""
    event_id = request.event_id or 1
    return evaluate_event(event_id, fuel_available=request.fuel_available)


@app.get("/models/comparison")
@app.get("/api/models/comparison")
@app.get("/api/analytics/models")
def get_model_comparison():
    """
    Return dynamic, non-hardcoded evaluation metrics comparing all 6 models
    (LSTM, GRU, TCN, PatchTST, Transformer, XGBoost) on updated_4_scenarios_dataset.csv.
    """
    return service.get_model_comparison_metrics()


@app.get("/dataset/stats")
@app.get("/api/dataset/stats")
def get_dataset_statistics():
    """Summary statistics for the updated dataset."""
    df = service.df
    if df is None:
        raise HTTPException(status_code=500, detail="Dataset not loaded")
    return {
        "total_observations": len(df),
        "unique_events": int(df["event_id"].nunique()),
        "features_count": len(service.feature_cols_33),
        "feature_columns": service.feature_cols_33,
        "symbolic_columns": [
            "feasibility_flag",
            "time_to_TCA",
            "maneuver_window_remaining",
            "fuel_remaining",
            "deltav_required",
            "cost_of_acting",
            "cost_of_waiting",
            "poc",
        ],
        "poc_stats": {
            "mean": float(df["poc"].mean()),
            "max": float(df["poc"].max()),
            "min": float(df["poc"].min()),
        },
        "time_to_tca_stats": {
            "mean": float(df["time_to_TCA"].mean()),
            "max": float(df["time_to_TCA"].max()),
            "min": float(df["time_to_TCA"].min()),
        },
        "deltav_stats": {
            "mean": float(df["deltav_required"].mean()),
            "max": float(df["deltav_required"].max()),
            "min": float(df["deltav_required"].min()),
        },
    }


@app.get("/sample")
def get_sample(decision: Optional[str] = None, event_id: Optional[int] = None):
    """Return a sample event sequence with target decision matching or specific event ID."""
    events = list(service.event_sequences_33.keys())
    if not events:
        raise HTTPException(status_code=500, detail="No event sequences available")

    if event_id is not None:
        if event_id not in service.event_sequences_33:
            service._ensure_event_loaded(event_id)
    if event_id is not None and event_id in service.event_sequences_33:
        selected_eid = event_id
        target = service.event_summaries[event_id].get("dataset_decision", "WAIT")
    elif decision:
        target = decision.strip().upper()
        if target == "COMMIT" and service.commit_event_ids:
            selected_eid = service.commit_event_ids[0]
        elif target == "WAIT" and service.wait_event_ids:
            selected_eid = service.wait_event_ids[0]
        else:
            selected_eid = events[0]
    else:
        selected_eid = events[0]
        target = "ALL"

    eval_data = service.evaluate_event(selected_eid)
    seq_arr = service.event_sequences_33[selected_eid].tolist()
    eval_data["sequence"] = seq_arr
    eval_data["raw_sequence"] = seq_arr
    eval_data["current_step"] = 0
    eval_data["matched_decision"] = eval_data["decision"]
    eval_data["dataset_decision"] = "COMMIT" if selected_eid in service.commit_event_ids else "WAIT"
    eval_data["source"] = {
        "dataset": service.dataset_path.name,
        "event_id": selected_eid,
        "start_index": 0,
    }
    return eval_data


@app.post("/predict")
def predict(data: PredictInput):
    """Run multi-model prediction on provided sequence or event ID."""
    step = data.current_step or 0
    if data.event_id is not None:
        if data.event_id not in service.event_sequences_33:
            service._ensure_event_loaded(data.event_id)
    if data.event_id is not None and data.event_id in service.event_sequences_33:
        eid = data.event_id
    else:
        eid = list(service.event_sequences_33.keys())[0]

    eval_data = service.evaluate_event(eid, current_step=step)
    seq_arr = service.event_sequences_33[eid].tolist()
    eval_data["sequence"] = seq_arr
    eval_data["raw_sequence"] = seq_arr
    eval_data["current_step"] = step
    return eval_data


# -----------------------------------------------------------------------------
# MERGED CAUSAL & XAI SUITE (from Capstone-Causal-XAI)
# -----------------------------------------------------------------------------
try:
    from src.api.app import app as causal_xai_app
    # Integrate all Causal-XAI endpoints (/api/overview, /api/causal/summary,
    # /api/counterfactuals/{id}, /api/events/{id}/what-if, /api/xai/global,
    # /api/xai/event/{id}, /api/physics/{id}, /api/events/{id}/analysis, etc.)
    for r in causal_xai_app.router.routes:
        if r.path not in ["/api/health", "/api/events"]:
            app.router.routes.append(r)
    logger.info("Successfully merged Causal-XAI research suite endpoints into unified backend.")
except Exception as e:
    logger.warning(f"Could not load Causal-XAI router: {e}")


# -----------------------------------------------------------------------------
# FRONTEND STATIC SERVING (Optional fallback)
# -----------------------------------------------------------------------------

frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    @app.get("/")
    async def serve_index():
        return FileResponse(str(frontend_dist / "index.html"))

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("events") or full_path.startswith("evaluate"):
            raise HTTPException(status_code=404, detail="Not found")
        file_candidate = frontend_dist / full_path
        if file_candidate.exists() and file_candidate.is_file():
            return FileResponse(str(file_candidate))
        return FileResponse(str(frontend_dist / "index.html"))

else:
    @app.get("/")
    async def root():
        return {
            "name": "Satellite Collision Avoidance AI Decision System",
            "version": "2.1.0",
            "status": "online",
            "models_loaded": [k for k, v in service.model_status.items() if v["available"]],
            "docs": "/docs",
            "api": "/api",
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)