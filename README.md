# AI-Based Satellite Collision Avoidance Decision System

**Capstone Project | Group 28 | 2026**

An AI-assisted decision-support system for satellite conjunction analysis, focused on the central question:

> **When should a satellite maneuver be committed, and when is it better to wait for more information?**

The project combines temporal machine learning, uncertainty-aware decision logic, safety constraints, causal analysis, and explainability to support the **WAIT / COMMIT** decision under changing collision risk and maneuver feasibility.

> **Research prototype:** This project is intended for academic research and demonstration. Its outputs should not be treated as operational flight guidance or a replacement for professional conjunction assessment and mission-control procedures.

---

## Problem Statement

Satellite conjunctions are uncertain: new observations can change the estimated collision risk, while waiting can reduce uncertainty but also consume the time and maneuver capability needed to avoid a collision.

Many collision-avoidance workflows focus on collision-risk assessment and maneuver planning. This project investigates the **timing of the maneuver decision**—whether to act now or wait—by modeling the evolving conjunction state and evaluating the consequences of each choice.

## Project Objectives

- Analyze satellite conjunction events and their evolving temporal features.
- Estimate the decision to **WAIT** or **COMMIT** using trained machine-learning models.
- Compare the potential costs, risks, and feasibility of acting now versus waiting.
- Apply a neuro-symbolic safety layer to incorporate explicit constraints into decision-making.
- Use causal and counterfactual analysis to examine alternative actions and their effects.
- Provide interpretable outputs through a web interface, metrics, and visualizations.

## Key Features

- **Temporal and tabular ML models:** Includes LSTM, GRU, TCN, Transformer-based, PatchTST, and XGBoost model artifacts for research and comparison.
- **Decision analysis:** Evaluates maneuver commitment in relation to collision risk, uncertainty, fuel, and remaining maneuver window.
- **Neuro-symbolic safety layer:** Combines model-based predictions with rule-based feasibility and safety checks.
- **Causal and counterfactual analysis:** Supports investigation of “what if we commit now?” versus “what if we continue waiting?”
- **Explainability and validation artifacts:** Includes model metrics, causal results, counterfactual outputs, and XAI analyses.
- **Interactive dashboard:** Presents decision results, risk trends, model comparisons, and orbital visualizations.

---

## System Architecture

```text
┌──────────────────────────────┐
│        React Frontend       │
│ Dashboard, charts, 3D views  │
└──────────────┬───────────────┘
               │ HTTP / REST
┌──────────────▼───────────────┐
│       FastAPI Backend       │
│ API routes and data schemas │
└──────────────┬───────────────┘
               │
┌──────────────▼────────────────────────────┐
│             Decision Pipeline            │
│ Data processing and feature preparation  │
│ ML inference / decision engine           │
│ Uncertainty and cost analysis             │
│ Safety checks and feasibility constraints│
│ Causal and counterfactual analysis        │
└──────────────┬────────────────────────────┘
               │
┌──────────────▼───────────────┐
│ Dataset, model artifacts,   │
│ configuration and research  │
│ outputs                     │
└──────────────────────────────┘
```

### Backend

The backend is built with **Python and FastAPI**. It provides REST endpoints and coordinates data processing, decision evaluation, simulation, uncertainty modeling, cost analysis, safety checks, and causal reasoning.

### Frontend

The frontend is built with **React, TypeScript, and Vite**. It provides the interactive project dashboard, charts, and orbital visualization components.

---

## Technology Stack

| Component | Technologies |
|---|---|
| Backend/API | Python, FastAPI, Uvicorn, Pydantic |
| Machine Learning | PyTorch, XGBoost, scikit-learn |
| Data Processing | Pandas, NumPy, SciPy |
| Explainability / Causal Analysis | SHAP, Captum, NetworkX, project causal-analysis modules |
| Orbital / Simulation Support | Skyfield and project simulation components |
| Frontend | React, TypeScript, Vite |
| Visualization | Recharts, Chart.js, Three.js, React Three Fiber |
| Configuration | YAML |

---

## Repository Structure

```text
CapstoneProject-Group-28/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI application
│   │   ├── routes/                 # API endpoints
│   │   ├── models/                 # Request/response schemas
│   │   ├── services/               # Decision and analysis modules
│   │   └── utils/                  # Shared constants and utilities
│   ├── configs/
│   │   └── config.yaml             # Project and data configuration
│   ├── resources/                  # Dataset and model resources
│   ├── model_files/                # Model artifacts
│   ├── research_artifacts/          # Evaluation, causal, XAI and validation outputs
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/              # Dashboard, charts and visualization components
    │   └── App.tsx                  # Main frontend application
    ├── package.json
    └── index.html
```

---

## Getting Started

### Prerequisites

- Python **3.10 or later** recommended
- Node.js and npm
- Git
- Model and dataset files included in the project or configured at the paths expected by the backend

### 1. Clone the repository

```bash
git clone <repository-url>
cd CapstoneProject-Group-28
```

### 2. Set up the backend

From the project root:

```bash
cd backend
python -m venv .venv
```

Activate the environment:

**Windows PowerShell**
```powershell
.venv\Scripts\Activate.ps1
```

**Windows Command Prompt**
```bat
.venv\Scripts\activate
```

**Linux / macOS**
```bash
source .venv/bin/activate
```

Install dependencies:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Start the API:

```bash
python app/main.py
```

The backend runs at `http://localhost:8000` by default.

### 3. Set up the frontend

Open a **second terminal** from the project root:

```bash
cd frontend
npm install
npm run dev
```

Vite will display the local frontend URL in the terminal (typically `http://localhost:5173`).

Ensure the frontend API configuration points to the running backend at `http://localhost:8000`. If your local setup uses a different API URL, update the frontend configuration accordingly.

---

## API Reference

FastAPI provides interactive API documentation:

- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Main Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/decision` | Evaluate a supplied conjunction event |
| `POST` | `/api/evaluate/{event_id}` | Evaluate an event from the dataset by ID |
| `GET` | `/api/events` | List available event IDs |
| `GET` | `/api/events/{event_id}` | Retrieve a conjunction event |
| `GET` | `/api/dataset/stats` | Retrieve dataset statistics |
| `GET` | `/api/health` | Check backend health |

### Example: Evaluate an Existing Event

```bash
curl -X POST "http://localhost:8000/api/evaluate/1"
```

The response contains the decision and associated analysis. The exact fields are defined by the backend response schema and can be inspected in Swagger UI.

### Example: Submit a Decision Request

`POST /api/decision` accepts a JSON request containing a conjunction event and available maneuver fuel. Refer to `/docs` for the current `DecisionRequest` schema and required fields.

---

## Decision Workflow

At a high level, the system follows this workflow:

1. **Load conjunction data** and prepare the event features.
2. **Analyze the evolving state**, including relative motion, collision-risk indicators, uncertainty, and maneuver constraints.
3. **Generate model predictions** using the configured trained model(s).
4. **Evaluate decision costs and feasibility** for acting versus waiting.
5. **Apply safety checks** to identify conditions where waiting may no longer be feasible.
6. **Perform causal or counterfactual analysis** to explore alternative decision scenarios.
7. **Return the decision and supporting evidence** for visualization and interpretation.

The decision framework is designed to support reasoning about the trade-off between obtaining additional information and preserving sufficient time and maneuver capability.

---

## Research and Evaluation Artifacts

The `backend/research_artifacts/` directory contains generated research outputs, including:

- Model performance and validation metrics
- Model agreement and physics-validation results
- Causal assumptions, graphs, and estimated effects
- Counterfactual analysis results
- Explainability outputs, including global, local, temporal, stability, and faithfulness analyses
- Figures used to inspect model behavior and decision outcomes

These artifacts support research evaluation and interpretation; they should be read alongside the methodology and data-generation assumptions.

---

## Important Notes

- **Research use only:** Not certified for real satellite operations.
- **Model artifacts:** The backend depends on compatible model files and their expected preprocessing/configuration. If model loading fails, check the paths, formats, and versions before running inference.
- **Dataset and configuration:** Check `backend/configs/config.yaml` for the configured dataset path, feature definitions, and evaluation settings.
- **API access:** The frontend requires the backend to be running and reachable at the configured API address.
- **Reproducibility:** Results may depend on the model artifacts, dataset version, configuration, random seed, and runtime environment.

---

## Project Team

**Capstone Project – Group 28**  
**Project:** AI-Based Satellite Collision Avoidance Decision System  
**Year:** 2026

---

## Acknowledgment

This project was developed as an academic capstone exploring AI-assisted, uncertainty-aware satellite maneuver decision-making, with emphasis on explainability, causal analysis, and safety-conscious decision support.
