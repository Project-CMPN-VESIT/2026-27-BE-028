from typing import Dict, Any, List, Tuple
import numpy as np

# Rule Classification Registry
# TYPE A: Hard Physical / Astrodynamic / Temporal Constraints (Inviolable Laws)
# TYPE B: Dataset-Derived Empirical Formulations (Simulation Heuristics)
# TYPE C: Learned Model Decision Rules (Supervised Policies)

# Operational Decision States
OPERATIONAL_STATES = {
    "ACTIONABLE_COMMIT": "High collision risk, maneuver window open, thruster delta-V feasible -> COMMIT to maneuver",
    "ACTIONABLE_WAIT": "Risk below mitigation threshold or information gathering optimal, window open -> WAIT / continue tracking",
    "INFEASIBLE_HIGH_RISK": "High risk detected but required delta-V exceeds thruster capacity or fuel depleted -> Emergency contingency required",
    "INVALID_CLOSED": "TCA has already occurred or maneuver window expired -> Event closed to new collision avoidance maneuvers"
}

RULE_REGISTRY = {
    "R1_DELTAV_FEASIBILITY": {
        "id": "R1",
        "name": "Delta-V Thruster Feasibility",
        "rule_type": "TYPE A (Hard Physical Constraint)",
        "condition": "deltav_required <= max_delta_v",
        "provenance": "Spacecraft Propulsion & Fuel Capacity Physics",
        "violation_reason": "Physical infeasibility: required delta-V exceeds available thruster capacity",
        "action_on_violation": "Override COMMIT -> INFEASIBLE_HIGH_RISK (Non-executable)",
        "operational_target": "INFEASIBLE_HIGH_RISK"
    },
    "R2_TCA_TEMPORAL": {
        "id": "R2",
        "name": "TCA Causality / Non-Retroactivity",
        "rule_type": "TYPE A (Hard Temporal / Astrodynamic Constraint)",
        "condition": "time_to_TCA > 0",
        "provenance": "Orbital Time-to-Closest-Approach Kinematics",
        "violation_reason": "TCA already occurred: collision avoidance maneuvers cannot be executed retroactively",
        "action_on_violation": "Override COMMIT -> INVALID_CLOSED (Encounter elapsed)",
        "operational_target": "INVALID_CLOSED"
    },
    "R3_MANEUVER_WINDOW": {
        "id": "R3",
        "name": "Maneuver Lead-Time Window",
        "rule_type": "TYPE A (Hard Operational / Timing Constraint)",
        "condition": "maneuver_window_remaining > 0",
        "provenance": "Flight Dynamics Maneuver Planning Horizon",
        "violation_reason": "Maneuver window expired: insufficient lead time to execute thruster ignition before conjunction",
        "action_on_violation": "Override COMMIT -> INVALID_CLOSED (Window expired)",
        "operational_target": "INVALID_CLOSED"
    },
    "R4_COST_TRADEOFF": {
        "id": "R4",
        "name": "Cost of Waiting vs Cost of Acting Tradeoff",
        "rule_type": "TYPE B (Empirical Decision Formulation)",
        "condition": "cost_of_waiting > cost_of_acting",
        "provenance": "Simulation Cost Utility Model",
        "violation_reason": "Cost of acting exceeds cost of waiting: premature maneuver consumes unnecessary fuel",
        "action_on_violation": "Informational Decision Boundary (No Hard Override)",
        "operational_target": "ACTIONABLE_WAIT"
    }
}

