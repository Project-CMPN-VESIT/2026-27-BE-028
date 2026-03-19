"""
Causal reasoning engine for decision explanation.

Performs counterfactual analysis to explain decision outcomes:
- What happens if we act now?
- What happens if we wait?
- What's the causal impact of each choice?
"""

import numpy as np
from typing import Dict
import logging

from app.models.schema import (
    ConjunctionEvent,
    CausalExplanation
)
from app.utils import constants

logger = logging.getLogger(__name__)


class CausalEngine:
    """
    Performs causal reasoning and counterfactual analysis.

    Simulates outcomes of different decision paths to provide
    explanatory insights for the decision.
    """

    def __init__(self):
        """Initialize causal engine."""
        self.time_horizon = constants.CAUSAL_TIME_HORIZON
        self.timesteps = constants.CAUSAL_TIMESTEPS

    def simulate_act_now_scenario(
        self,
        event: ConjunctionEvent
    ) -> Dict[str, float]:
        """
        Simulate outcomes if we act immediately.

        Args:
            event: Conjunction event

        Returns:
            Dictionary with outcome metrics
        """
        # Immediate maneuver outcomes
        fuel_consumed = event.delta_v_required

        # Assume maneuver reduces Pc significantly (10x reduction typical)
        residual_pc = event.probability_of_collision * 0.1

        # Risk eliminated immediately
        risk_reduction = event.probability_of_collision - residual_pc

        # No waiting time
        decision_time = 0.0

        # Feasibility is current
        feasibility = 1.0

        outcomes = {
            'fuel_consumed': fuel_consumed,
            'final_pc': residual_pc,
            'risk_reduction': risk_reduction,
            'decision_time_hours': decision_time,
            'feasibility': feasibility,
            'uncertainty_resolved': 0.0  # Immediate action, no time for better data
        }

        return outcomes

    def simulate_wait_scenario(
        self,
        event: ConjunctionEvent,
        uncertainty_current: float,
        uncertainty_projected: float,
        wait_time_hours: float = 6.0
    ) -> Dict[str, float]:
        """
        Simulate outcomes if we wait for better information.

        Args:
            event: Conjunction event
            uncertainty_current: Current uncertainty level
            uncertainty_projected: Expected uncertainty after waiting
            wait_time_hours: How long to wait

        Returns:
            Dictionary with outcome metrics
        """
        # After waiting, delta-v may increase slightly
        delta_v_growth = constants.DELTA_V_GROWTH_RATE * wait_time_hours
        fuel_consumed = event.delta_v_required + delta_v_growth

        # Uncertainty decreases with better observations
        uncertainty_reduction = uncertainty_current - uncertainty_projected

        # Pc may change (could increase if object is maneuvering, typically stable)
        # Assume small random variation
        pc_variation = np.random.normal(0, event.probability_of_collision * 0.1)
        final_pc = max(event.probability_of_collision + pc_variation, 0.0)

        # Feasibility decreases as TCA approaches
        time_remaining = event.time_to_tca - wait_time_hours
        if time_remaining > 0:
            feasibility = min(time_remaining / event.time_to_tca, 1.0)
        else:
            feasibility = 0.0

        outcomes = {
            'fuel_consumed': fuel_consumed,
            'final_pc': final_pc * 0.1,  # Assuming eventual maneuver
            'risk_reduction': event.probability_of_collision - (final_pc * 0.1),
            'decision_time_hours': wait_time_hours,
            'feasibility': feasibility,
            'uncertainty_resolved': uncertainty_reduction
        }

        return outcomes

    def compute_causal_effects(
        self,
        event: ConjunctionEvent,
        uncertainty_current: float,
        uncertainty_projected: float,
        wait_time_hours: float = 6.0
    ) -> CausalExplanation:
        """
        Compute causal effects and generate explanation.

        Args:
            event: Conjunction event
            uncertainty_current: Current uncertainty
            uncertainty_projected: Projected uncertainty
            wait_time_hours: Waiting duration to analyze

        Returns:
            CausalExplanation with comparative analysis
        """
        # Simulate both scenarios
        act_now = self.simulate_act_now_scenario(event)
        wait = self.simulate_wait_scenario(
            event,
            uncertainty_current,
            uncertainty_projected,
            wait_time_hours
        )

        # Compute deltas
        risk_delta = (wait['final_pc'] - act_now['final_pc']) * 100  # Percent
        fuel_delta = wait['fuel_consumed'] - act_now['fuel_consumed']

        # Determine recommendation strength
        # Based on magnitude of differences
        risk_magnitude = abs(risk_delta) / event.probability_of_collision if event.probability_of_collision > 0 else 0
        fuel_magnitude = abs(fuel_delta) / event.delta_v_required if event.delta_v_required > 0 else 0

        recommendation_strength = min((risk_magnitude + fuel_magnitude) / 2, 1.0)

        # Generate explanation text
        explanation = self._generate_explanation_text(
            event,
            act_now,
            wait,
            risk_delta,
            fuel_delta
        )

        causal_explanation = CausalExplanation(
            scenario_act_now=act_now,
            scenario_wait=wait,
            risk_delta=risk_delta,
            fuel_delta=fuel_delta,
            recommendation_strength=recommendation_strength,
            explanation_text=explanation
        )

        return causal_explanation

    def _generate_explanation_text(
        self,
        event: ConjunctionEvent,
        act_now: Dict[str, float],
        wait: Dict[str, float],
        risk_delta: float,
        fuel_delta: float
    ) -> str:
        """
        Generate human-readable causal explanation.

        Args:
            event: Conjunction event
            act_now: Act now scenario outcomes
            wait: Wait scenario outcomes
            risk_delta: Change in risk (%)
            fuel_delta: Change in fuel cost (m/s)

        Returns:
            Explanation text
        """
        explanations = []

        # Risk analysis
        if abs(risk_delta) > 1.0:
            if risk_delta > 0:
                explanations.append(
                    f"⚠ Waiting increases collision risk by {abs(risk_delta):.1f}%"
                )
            else:
                explanations.append(
                    f"✓ Waiting decreases collision risk by {abs(risk_delta):.1f}%"
                )
        else:
            explanations.append("≈ Waiting has minimal impact on collision risk")

        # Fuel analysis
        if abs(fuel_delta) > 0.001:
            if fuel_delta > 0:
                explanations.append(
                    f"⚠ Waiting increases fuel cost by {fuel_delta:.3f} m/s"
                )
            else:
                explanations.append(
                    f"✓ Waiting saves {abs(fuel_delta):.3f} m/s of fuel"
                )
        else:
            explanations.append("≈ Fuel cost is similar for both options")

        # Uncertainty analysis
        uncertainty_gain = wait['uncertainty_resolved']
        if uncertainty_gain > 0:
            explanations.append(
                f"✓ Waiting reduces uncertainty, enabling better decisions"
            )

        # Feasibility analysis
        if wait['feasibility'] < 0.5:
            explanations.append(
                f"⚠ Waiting significantly reduces maneuver feasibility"
            )

        # Time pressure
        if event.time_to_tca < constants.CRITICAL_TIME_THRESHOLD:
            explanations.append(
                f"⏰ Time critical: Only {event.time_to_tca:.1f} hours to TCA"
            )

        # Combine into coherent explanation
        full_explanation = " | ".join(explanations)

        return full_explanation

    def explain_decision(
        self,
        decision: str,
        cost_difference: float,
        event: ConjunctionEvent
    ) -> str:
        """
        Generate a clear explanation for the decision made.

        Args:
            decision: Decision type (WAIT, COMMIT, FORCE_COMMIT)
            cost_difference: C_wait - C_act
            event: Conjunction event

        Returns:
            Clear explanation string
        """
        if decision == "FORCE_COMMIT":
            reason = "Safety rules mandate immediate action"
            if event.probability_of_collision > constants.CRITICAL_PC_THRESHOLD:
                reason += f" (Pc = {event.probability_of_collision:.2e} exceeds critical threshold)"
            if event.time_to_tca < constants.CRITICAL_TIME_THRESHOLD:
                reason += f" (Time to TCA = {event.time_to_tca:.1f}h is critically short)"
            return reason

        elif decision == "COMMIT":
            explanation = f"Cost analysis favors immediate action (ΔCost = {cost_difference:.2f}). "
            if cost_difference > 10:
                explanation += "Waiting is significantly more expensive. "
            explanation += "Acting now minimizes overall risk and preserves feasibility."
            return explanation

        else:  # WAIT
            explanation = f"Cost analysis favors waiting (ΔCost = {cost_difference:.2f}). "
            if event.time_to_tca > 24:
                explanation += "Sufficient time remains for better observations. "
            explanation += "Uncertainty will decrease, enabling a more informed decision."
            return explanation


# Singleton instance
_causal_engine_instance = None


def get_causal_engine() -> CausalEngine:
    """
    Get or create global causal engine instance.

    Returns:
        CausalEngine instance
    """
    global _causal_engine_instance

    if _causal_engine_instance is None:
        _causal_engine_instance = CausalEngine()
        logger.info("Causal engine initialized")

    return _causal_engine_instance
