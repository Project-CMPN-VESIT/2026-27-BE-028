"""
Pydantic data models for the satellite collision avoidance system.

These schemas define the structure for:
- Satellite conjunction events (input data)
- Simulation results
- Decision outputs
- API requests/responses
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict
from datetime import datetime
from enum import Enum


# ============================================
# ENUMS
# ============================================

class DecisionType(str, Enum):
    """Decision outcomes"""
    WAIT = "WAIT"
    COMMIT = "COMMIT"
    FORCE_COMMIT = "FORCE_COMMIT"


class RiskLevel(str, Enum):
    """Risk classification levels"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


# ============================================
# INPUT MODELS
# ============================================

class CovarianceMatrix(BaseModel):
    """3x3 covariance matrix representation"""
    x: float = Field(..., description="X-axis covariance (meters)")
    y: float = Field(..., description="Y-axis covariance (meters)")
    z: float = Field(..., description="Z-axis covariance (meters)")

    @field_validator('x', 'y', 'z')
    @classmethod
    def validate_positive(cls, v):
        if v < 0:
            raise ValueError("Covariance values must be positive")
        return v


class RelativePosition(BaseModel):
    """3D relative position vector"""
    x: float = Field(..., description="X position (meters)")
    y: float = Field(..., description="Y position (meters)")
    z: float = Field(..., description="Z position (meters)")


class ConjunctionEvent(BaseModel):
    """
    Satellite conjunction event data.

    This represents all available information about a potential collision event
    at a specific observation time. Corresponds to one row in the dataset.
    """
    event_id: int = Field(..., description="Unique event identifier")
    primary_object_id: int = Field(..., description="Primary satellite ID (NORAD ID)")
    secondary_object_id: int = Field(..., description="Secondary object ID (NORAD ID)")
    observation_time: str = Field(..., description="Time of observation (ISO format)")
    time_to_tca: float = Field(..., description="Time to TCA in hours", gt=0)

    # Relative state
    relative_position: RelativePosition = Field(..., description="Relative position vector")
    relative_velocity: float = Field(..., description="Relative velocity (km/s)", gt=0)
    miss_distance: float = Field(..., description="Predicted miss distance (meters)", ge=0)

    # Uncertainty
    covariance: CovarianceMatrix = Field(..., description="Position covariance matrix")

    # Risk assessment
    probability_of_collision: float = Field(..., description="Collision probability", ge=0, le=1)

    # Physical parameters
    hard_body_radius: float = Field(..., description="Combined hard body radius (meters)", gt=0)

    # Maneuver parameters
    delta_v_required: float = Field(..., description="Delta-V required for avoidance (m/s)", ge=0)

    @field_validator('observation_time')
    @classmethod
    def validate_time_format(cls, v):
        """Ensure time is in valid format"""
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
        except ValueError:
            # Try parsing without timezone
            try:
                datetime.strptime(v, "%Y-%m-%d %H:%M")
            except ValueError:
                raise ValueError("observation_time must be in ISO format or 'YYYY-MM-DD HH:MM'")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "event_id": 1,
                "primary_object_id": 40579,
                "secondary_object_id": 37467,
                "observation_time": "2025-01-27 11:53",
                "time_to_tca": 70.22,
                "relative_position": {"x": 1561.41, "y": -615.73, "z": 458.82},
                "relative_velocity": 12.21,
                "miss_distance": 1740.01,
                "covariance": {"x": 86.91, "y": 79.84, "z": 87.28},
                "probability_of_collision": 2.43e-05,
                "hard_body_radius": 8.59,
                "delta_v_required": 0.027
            }
        }


# ============================================
# SIMULATION MODELS
# ============================================

class OrbitState(BaseModel):
    """Orbital state at a specific time"""
    time: float = Field(..., description="Time since reference epoch (hours)")
    position: RelativePosition = Field(..., description="Position vector (meters)")
    velocity: RelativePosition = Field(..., description="Velocity vector (m/s)")
    distance: float = Field(..., description="Relative distance (meters)")


class SimulationResult(BaseModel):
    """Results from orbital simulation"""
    future_states: List[OrbitState] = Field(..., description="Predicted orbital states")
    collision_probability_trend: List[Dict[str, float]] = Field(
        ...,
        description="Pc evolution over time"
    )
    uncertainty_trend: List[Dict[str, float]] = Field(
        ...,
        description="Uncertainty evolution"
    )
    maneuver_feasibility: List[Dict[str, float]] = Field(
        ...,
        description="Maneuver feasibility over time"
    )


# ============================================
# COST & DECISION MODELS
# ============================================

class CostBreakdown(BaseModel):
    """Detailed breakdown of decision costs"""
    # Acting costs
    fuel_cost: float = Field(..., description="Cost of Delta-V expenditure")
    risk_cost: float = Field(..., description="Risk cost from collision probability")
    total_act_cost: float = Field(..., description="Total cost of acting now")

    # Waiting costs
    uncertainty_cost: float = Field(..., description="Cost of remaining uncertainty")
    feasibility_loss_cost: float = Field(..., description="Cost of feasibility degradation")
    time_pressure_cost: float = Field(..., description="Cost from approaching TCA")
    total_wait_cost: float = Field(..., description="Total cost of waiting")

    # Comparison
    cost_difference: float = Field(..., description="C_wait - C_act (positive means act)")


class UncertaintyMetrics(BaseModel):
    """Uncertainty quantification"""
    current_uncertainty: float = Field(..., description="Current uncertainty level")
    projected_uncertainty: float = Field(..., description="Projected future uncertainty")
    covariance_trace: float = Field(..., description="Trace of covariance matrix")
    position_uncertainty: float = Field(..., description="3-sigma position uncertainty (m)")


class FeasibilityMetrics(BaseModel):
    """Maneuver feasibility metrics"""
    current_delta_v: float = Field(..., description="Current Delta-V required (m/s)")
    projected_delta_v: float = Field(..., description="Projected Delta-V after waiting (m/s)")
    fuel_available: float = Field(..., description="Available fuel capacity (m/s)")
    feasibility_index: float = Field(..., description="Feasibility score (0-1)", ge=0, le=1)
    time_to_no_return: Optional[float] = Field(None, description="Hours until no-return point")


class SafetyAssessment(BaseModel):
    """Safety checks and flags"""
    is_critical_risk: bool = Field(..., description="Pc exceeds critical threshold")
    is_time_critical: bool = Field(..., description="TCA approaching critical time")
    no_return_point_reached: bool = Field(..., description="Past point of no return")
    force_action_required: bool = Field(..., description="Immediate action mandated")
    risk_level: RiskLevel = Field(..., description="Overall risk classification")
    safety_violations: List[str] = Field(default_factory=list, description="Safety rule violations")


class CausalExplanation(BaseModel):
    """Causal reasoning and counterfactual analysis"""
    scenario_act_now: Dict[str, float] = Field(..., description="Outcomes if acting now")
    scenario_wait: Dict[str, float] = Field(..., description="Outcomes if waiting")
    risk_delta: float = Field(..., description="Change in collision risk (%)")
    fuel_delta: float = Field(..., description="Change in fuel cost (m/s)")
    recommendation_strength: float = Field(..., description="Confidence in recommendation (0-1)")
    explanation_text: str = Field(..., description="Human-readable causal explanation")


# ============================================
# OUTPUT MODELS
# ============================================

class DecisionOutput(BaseModel):
    """
    Complete decision output from the AI system.

    This is the main API response containing the decision, supporting analysis,
    simulation results, and detailed explanations.
    """
    # Core decision
    decision: DecisionType = Field(..., description="Final decision: WAIT, COMMIT, or FORCE_COMMIT")
    confidence: float = Field(..., description="Decision confidence (0-1)", ge=0, le=1)

    # Event identifiers
    event_id: int = Field(..., description="Event identifier")
    primary_object_id: int = Field(..., description="Primary satellite ID")
    secondary_object_id: int = Field(..., description="Secondary object ID")
    observation_time: str = Field(..., description="Observation timestamp")
    time_to_tca: float = Field(..., description="Hours until TCA")

    # Cost analysis
    costs: CostBreakdown = Field(..., description="Detailed cost breakdown")

    # Risk metrics
    probability_of_collision: float = Field(..., description="Current Pc")
    miss_distance: float = Field(..., description="Predicted miss distance (m)")

    # Uncertainty & feasibility
    uncertainty: UncertaintyMetrics = Field(..., description="Uncertainty quantification")
    feasibility: FeasibilityMetrics = Field(..., description="Maneuver feasibility")

    # Safety assessment
    safety: SafetyAssessment = Field(..., description="Safety checks and classification")

    # Simulation results
    simulation: SimulationResult = Field(..., description="Orbital propagation results")

    # Causal reasoning
    causal_analysis: CausalExplanation = Field(..., description="Counterfactual reasoning")

    # Summary explanation
    explanation: str = Field(..., description="Clear, concise decision rationale")
    recommended_action_time: Optional[float] = Field(
        None,
        description="If WAIT, recommended hours before re-evaluation"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "decision": "WAIT",
                "confidence": 0.85,
                "event_id": 1,
                "primary_object_id": 40579,
                "secondary_object_id": 37467,
                "observation_time": "2025-01-27 11:53",
                "time_to_tca": 70.22,
                "explanation": "Waiting is optimal: uncertainty is decreasing, sufficient time remains, and costs favor observation."
            }
        }


# ============================================
# API REQUEST MODELS
# ============================================

class DecisionRequest(BaseModel):
    """API request for decision evaluation"""
    event: ConjunctionEvent = Field(..., description="Conjunction event data")
    fuel_available: Optional[float] = Field(
        50.0,
        description="Available fuel for maneuver (m/s)"
    )
    custom_thresholds: Optional[Dict[str, float]] = Field(
        None,
        description="Custom decision thresholds (overrides defaults)"
    )


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="Service status")
    version: str = Field(..., description="API version")
    timestamp: str = Field(..., description="Current server time")
