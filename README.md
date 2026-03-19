# AI-Based Satellite Collision Avoidance Decision System

**Capstone Project 2026**

---

## Overview

This is a complete AI-based decision system for determining optimal satellite collision avoidance maneuver timing under uncertainty. The system combines:

- **Orbital Simulation** (Skyfield only)
- **Uncertainty Modeling** (Covariance propagation)
- **Cost-Based Decision Theory**
- **Safety Constraint Enforcement**
- **Causal Reasoning** for explainability

---

## Architecture

```
backend/
├── app/
│   ├── main.py                  # FastAPI application
│   ├── routes/
│   │   └── decision.py          # API endpoints
│   ├── services/
│   │   ├── data_processor.py    # Dataset handling
│   │   ├── simulation.py        # Orbital mechanics
│   │   ├── uncertainty_model.py # Uncertainty quantification
│   │   ├── cost_model.py        # Cost functions
│   │   ├── safety_checks.py     # Safety rules
│   │   ├── causal_engine.py     # Counterfactual analysis
│   │   └── decision_engine.py   # Main decision logic
│   ├── models/
│   │   └── schema.py            # Pydantic data models
│   └── utils/
│       └── constants.py         # Physics constants
├── data/
│   └── satellite_conjunction_dataset.csv
└── requirements.txt

frontend/
├── index.html                   # Web interface
└── app.js                       # React app, API integration & charts
```

---

## Features

### 1. Decision Engine
- **Cost-Based Analysis**: Compares cost of acting vs. waiting
- **Uncertainty Modeling**: Projects how uncertainty evolves
- **Safety Rules**: Enforces NASA-standard thresholds
- **No-Return Detection**: Identifies point of no return

### 2. Simulation
- **Skyfield**: Earth-satellite ephemeris and propagation
- **Linearized Dynamics**: Relative motion for conjunction analysis
- **Monte Carlo**: Uncertainty propagation

### 3. Cost Functions

**Cost of Acting:**
```
C_act = α × ΔV + β × Pc
```

**Cost of Waiting:**
```
C_wait = γ × Uncertainty + δ × Feasibility_Loss
```

**Decision Rule:**
```
IF C_wait > C_act → COMMIT
ELSE → WAIT
```

### 4. Safety Rules
- **Critical Pc**: If Pc > 1e-4 → FORCE_COMMIT
- **Time Critical**: If time to TCA < 6 hours → FORCE_COMMIT
- **No-Return**: If ΔV > fuel OR time < min_safe → FORCE_COMMIT

### 5. Causal Reasoning
- Simulates "What if we act now?" vs "What if we wait?"
- Computes ΔRisk, ΔFuel, ΔFeasibility
- Generates human-readable explanations

---

## Installation

### Prerequisites
- Python 3.9+
- pip

### Setup

1. **Clone the repository:**
```bash
cd e:/capstone_26/CapstoneProject-Group-28
```

2. **Create virtual environment:**
```bash
cd backend
python -m venv venv
```

3. **Activate virtual environment:**

Windows:
```bash
venv\Scripts\activate
```

Linux/Mac:
```bash
source venv/bin/activate
```

4. **Install dependencies:**
```bash
pip install -r requirements.txt
```

---

## Usage

### Start the Backend

```bash
cd backend
python main.py
```

The API will be available at:
- **API**: http://localhost:8000/api
- **Documentation**: http://localhost:8000/docs
- **Frontend**: http://localhost:8000

---

## API Endpoints

### 1. Make Decision
**POST** `/api/decision`

Request body:
```json
{
  "event": {
    "event_id": 1,
    "primary_object_id": 40579,
    "secondary_object_id": 37467,
    "observation_time": "2025-01-27 11:53",
    "time_to_tca": 70.22,
    "relative_position": {"x": 1561.41, "y": -615.73, "z": 458.82},
    "relative_velocity": 12.21,
    "miss_distance": 1740.01,
    "covariance": {"x": 86.91, "y": 79.84, "z": 87.28},
    "probability_of_collision": 0.00002432,
    "hard_body_radius": 8.59,
    "delta_v_required": 0.027
  },
  "fuel_available": 50.0
}
```

Response:
```json
{
  "decision": "WAIT",
  "confidence": 0.85,
  "explanation": "Waiting is optimal: uncertainty is decreasing...",
  "costs": {
    "total_act_cost": 2.43,
    "total_wait_cost": 1.85,
    "cost_difference": -0.58
  },
  "safety": { ... },
  "simulation": { ... },
  "causal_analysis": { ... }
}
```

### 2. Evaluate Event by ID
**POST** `/api/evaluate/{event_id}`

Parameters:
- `event_id`: Event ID from dataset
- `fuel_available`: Available fuel (optional, default: 50.0)

### 3. Get Event
**GET** `/api/events/{event_id}`

### 4. List Events
**GET** `/api/events`

### 5. Dataset Statistics
**GET** `/api/dataset/stats`

---

## Frontend Interface

Open http://localhost:8000 in your browser.

### Features:
1. **Event Selector**: Load and evaluate events from dataset
2. **Run Simulation**: Execute decision analysis with single click
3. **Visualization**: Collision probability trend chart
4. **Result Display**:
   - Decision badge (WAIT/COMMIT/FORCE_COMMIT)
   - Cost breakdown
   - Risk metrics (Pc, miss distance)
   - Uncertainty metrics
   - Feasibility assessment
   - Causal explanation

---

## Example: Python API Usage

```python
import requests

# API endpoint
url = "http://localhost:8000/api/evaluate/1"

# Parameters
params = {"fuel_available": 50.0}

# Make request
response = requests.post(url, params=params)
result = response.json()

# Print decision
print(f"Decision: {result['decision']}")
print(f"Confidence: {result['confidence'] * 100:.1f}%")
print(f"Explanation: {result['explanation']}")

# Print costs
costs = result['costs']
print(f"\nCost to Act: {costs['total_act_cost']:.2f}")
print(f"Cost to Wait: {costs['total_wait_cost']:.2f}")
print(f"Difference: {costs['cost_difference']:.2f}")

# Safety assessment
safety = result['safety']
print(f"\nRisk Level: {safety['risk_level']}")
print(f"Force Action: {safety['force_action_required']}")
```

---

## Dataset Parameters

Each event in the dataset contains:

| Parameter | Description | Unit |
|-----------|-------------|------|
| Event_ID | Event identifier | - |
| Primary_Object_ID | Primary satellite (NORAD ID) | - |
| Secondary_Object_ID | Secondary object (NORAD ID) | - |
| Observation_Time | Time of observation | ISO format |
| Time_to_TCA_hours | Time until closest approach | hours |
| Relative_Position_X/Y/Z | 3D relative position | meters |
| Relative_Velocity | Relative velocity magnitude | km/s |
| Miss_Distance | Predicted miss distance | meters |
| Covariance_X/Y/Z | Position uncertainty (diagonal) | meters |
| Probability_of_Collision | Collision probability | 0-1 |
| Hard_Body_Radius | Combined object radius | meters |
| Delta_V_required | Required maneuver ΔV | m/s |

---

## Physics & Algorithms

### Uncertainty Model
```python
# Uncertainty metric
uncertainty = trace(Covariance) / time_to_TCA

# Uncertainty evolution (exponential decay)
uncertainty(t) = uncertainty_0 × exp(-k × t)
```

### Feasibility Loss
```python
# Feasibility degradation
feasibility_loss = (ΔV_growth_rate × wait_time) + (1 / time_remaining)
```

### Collision Probability Estimation
```python
# Simplified 2D Gaussian model
normalized_distance = miss_distance / position_uncertainty
Pc = exp(-normalized_distance² / 2)
```

### Orbital Propagation
- **Skyfield**: Ephemeris and relative motion modeling
- **Linearized Relative Dynamics**: For close conjunction scenarios
- **Approximate Maneuver Model**: Delta-V effects on collision probability

---

## Safety Thresholds (NASA Standards)

| Threshold | Value | Action |
|-----------|-------|--------|
| Critical Pc | 1e-4 | Immediate action |
| Medium Pc | 1e-5 | Elevated monitoring |
| Min Maneuver Time | 2 hours | No-return point |
| Critical Time | 6 hours | Force decision |
| Fuel Reserve | 5 m/s | Minimum reserve |

---

## Research Contributions

1. **Cost-Based Decision Framework**: Novel application of decision theory to collision avoidance timing
2. **Uncertainty-Aware Planning**: Explicit modeling of information gain from waiting
3. **Causal Explainability**: Counterfactual reasoning for transparent AI decisions
4. **Real-Time Integration**: Production-ready system combining simulation and decision-making

---

## Future Enhancements

- [ ] Multi-maneuver optimization
- [ ] Machine learning for Pc prediction
- [ ] Integration with real TLE databases
- [ ] Multi-satellite coordination
- [ ] Advanced uncertainty propagation (extended Kalman filter)

---

## References

1. NASA Conjunction Assessment Process
2. ESA Space Debris Mitigation Guidelines
3. Skyfield Documentation: https://rhodesmill.org/skyfield/
4. NORAD TLE Format: https://celestrak.com/

---

## Authors

**Capstone Project - Group 28**
AI-Based Satellite Collision Avoidance Decision System
2026

---

## License

This project is for educational and research purposes.

---

## Contact

For questions or collaboration:
- API Documentation: http://localhost:8000/docs
- GitHub Issues: (repository link)

---
