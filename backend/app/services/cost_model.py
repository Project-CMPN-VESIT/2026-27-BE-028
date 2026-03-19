"""
Cost model for collision avoidance decision-making.

Implements cost functions for:
- Cost of acting (fuel + risk)
- Cost of waiting (uncertainty + feasibility loss)
"""

import numpy as np
from typing import Dict
import logging

from app.models.schema import ConjunctionEvent, CostBreakdown
from app.utils import constants

logger = logging.getLogger(__name__)


class CostModel:
    """
    Computes decision costs for collision avoidance.

    Implements the dual cost framework:
    - C_act: Cost of performing maneuver now
    - C_wait: Cost of waiting for more information
    """

    def __init__(self):
        """Initialize cost model with weights from constants."""
        self.alpha = constants.ALPHA  # Delta-V weight
        self.beta = constants.BETA    # Risk weight
        self.gamma = constants.GAMMA  # Uncertainty weight
        self.delta = constants.DELTA  # Feasibility weight

    def compute_fuel_cost(self, delta_v: float) -> float:
        """
        Compute cost of fuel expenditure.

        Linear cost proportional to delta-v.

        Args:
            delta_v: Required delta-v (m/s)

        Returns:
            Fuel cost
        """
        cost = self.alpha * delta_v
        return float(cost)

    def compute_risk_cost(self, probability_of_collision: float) -> float:
        """
        Compute cost associated with collision risk.

        Risk cost scales with collision probability.

        Args:
            probability_of_collision: Pc (0-1)

        Returns:
            Risk cost
        """
        cost = self.beta * probability_of_collision
        return float(cost)

    def compute_cost_of_acting(
        self,
        event: ConjunctionEvent
    ) -> Dict[str, float]:
        """
        Compute total cost of acting now.

        C_act = α * Delta_V + β * Pc

        Where:
        - α weights fuel cost
        - β weights collision risk

        Args:
            event: Conjunction event with delta-v and Pc

        Returns:
            Dictionary with cost breakdown
        """
        fuel_cost = self.compute_fuel_cost(event.delta_v_required)
        risk_cost = self.compute_risk_cost(event.probability_of_collision)

        total_cost = fuel_cost + risk_cost

        return {
            'fuel_cost': fuel_cost,
            'risk_cost': risk_cost,
            'total': total_cost
        }

    def compute_feasibility_loss(
        self,
        event: ConjunctionEvent,
        wait_time_hours: float
    ) -> float:
        """
        Compute feasibility loss from waiting.

        Feasibility decreases as TCA approaches due to:
        1. Delta-V increases (orbital geometry becomes less favorable)
        2. Time pressure increases (less time to plan/execute)

        Formula:
        feasibility_loss = (Delta_V_growth * wait_time) + (1 / time_remaining)

        Args:
            event: Conjunction event
            wait_time_hours: How long to wait

        Returns:
            Feasibility loss cost
        """
        # Delta-V growth component
        # Maneuvers become more expensive as TCA approaches
        delta_v_growth = constants.DELTA_V_GROWTH_RATE * wait_time_hours

        # Time pressure component
        # Inverse relationship: cost increases dramatically near TCA
        time_remaining = event.time_to_tca - wait_time_hours

        if time_remaining > 0:
            time_pressure = 1.0 / time_remaining
        else:
            time_pressure = 1000.0  # Very high cost if past TCA

        # Exponential factor for approaching TCA
        time_pressure_scaled = time_pressure ** constants.FEASIBILITY_LOSS_FACTOR

        feasibility_loss = delta_v_growth + time_pressure_scaled

        return float(feasibility_loss)

    def compute_cost_of_waiting(
        self,
        event: ConjunctionEvent,
        uncertainty: float,
        wait_time_hours: float = 6.0
    ) -> Dict[str, float]:
        """
        Compute total cost of waiting for more information.

        C_wait = γ * Uncertainty + δ * Feasibility_Loss

        Where:
        - γ weights uncertainty cost
        - δ weights feasibility degradation

        Args:
            event: Conjunction event
            uncertainty: Current uncertainty metric
            wait_time_hours: How long to wait

        Returns:
            Dictionary with cost breakdown
        """
        # Uncertainty cost
        uncertainty_cost = self.gamma * uncertainty

        # Feasibility loss
        feasibility_loss = self.compute_feasibility_loss(event, wait_time_hours)
        feasibility_cost = self.delta * feasibility_loss

        # Time pressure cost (additional component)
        time_pressure_cost = self.compute_time_pressure_cost(event, wait_time_hours)

        total_cost = uncertainty_cost + feasibility_cost + time_pressure_cost

        return {
            'uncertainty_cost': uncertainty_cost,
            'feasibility_loss_cost': feasibility_cost,
            'time_pressure_cost': time_pressure_cost,
            'total': total_cost
        }

    def compute_time_pressure_cost(
        self,
        event: ConjunctionEvent,
        wait_time_hours: float
    ) -> float:
        """
        Additional cost from time pressure as TCA approaches.

        Args:
            event: Conjunction event
            wait_time_hours: How long to wait

        Returns:
            Time pressure cost
        """
        time_remaining = event.time_to_tca - wait_time_hours

        if time_remaining <= 0:
            return 1000.0  # Extremely high cost

        # Exponentially increasing cost as time runs out
        if time_remaining < constants.CRITICAL_TIME_THRESHOLD:
            pressure = 10.0 / time_remaining
        else:
            pressure = 1.0 / time_remaining

        return float(pressure)

    def compute_full_cost_breakdown(
        self,
        event: ConjunctionEvent,
        uncertainty: float,
        wait_time_hours: float = 6.0
    ) -> CostBreakdown:
        """
        Compute complete cost breakdown for decision analysis.

        Args:
            event: Conjunction event
            uncertainty: Uncertainty metric
            wait_time_hours: Waiting duration to consider

        Returns:
            CostBreakdown object with all costs
        """
        # Acting costs
        act_costs = self.compute_cost_of_acting(event)

        # Waiting costs
        wait_costs = self.compute_cost_of_waiting(event, uncertainty, wait_time_hours)

        # Cost difference (positive = should act, negative = should wait)
        cost_difference = wait_costs['total'] - act_costs['total']

        breakdown = CostBreakdown(
            fuel_cost=act_costs['fuel_cost'],
            risk_cost=act_costs['risk_cost'],
            total_act_cost=act_costs['total'],
            uncertainty_cost=wait_costs['uncertainty_cost'],
            feasibility_loss_cost=wait_costs['feasibility_loss_cost'],
            time_pressure_cost=wait_costs['time_pressure_cost'],
            total_wait_cost=wait_costs['total'],
            cost_difference=cost_difference
        )

        return breakdown

    def compute_expected_value(
        self,
        event: ConjunctionEvent,
        maneuver_success_probability: float = 0.99
    ) -> Dict[str, float]:
        """
        Compute expected value of different actions.

        Includes probability of maneuver success/failure.

        Args:
            event: Conjunction event
            maneuver_success_probability: Probability maneuver succeeds

        Returns:
            Dictionary with expected values
        """
        # Cost if maneuver succeeds
        success_cost = self.compute_fuel_cost(event.delta_v_required)

        # Cost if maneuver fails (collision risk remains + fuel wasted)
        failure_cost = (
            success_cost +
            self.compute_risk_cost(event.probability_of_collision)
        )

        # Expected value of acting
        expected_value_act = (
            maneuver_success_probability * success_cost +
            (1 - maneuver_success_probability) * failure_cost
        )

        # Expected value of not acting (just risk)
        expected_value_no_action = self.compute_risk_cost(
            event.probability_of_collision
        )

        return {
            'expected_value_act': expected_value_act,
            'expected_value_no_action': expected_value_no_action,
            'net_benefit': expected_value_no_action - expected_value_act
        }


# Singleton instance
_cost_model_instance = None


def get_cost_model() -> CostModel:
    """
    Get or create global cost model instance.

    Returns:
        CostModel instance
    """
    global _cost_model_instance

    if _cost_model_instance is None:
        _cost_model_instance = CostModel()
        logger.info("Cost model initialized")

    return _cost_model_instance
