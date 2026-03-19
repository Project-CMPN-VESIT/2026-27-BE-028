"""
Main decision engine orchestrating all components.

This is the core AI system that integrates:
- Simulation
- Uncertainty modeling
- Cost analysis
- Safety checks
- Causal reasoning

To make optimal collision avoidance decisions.
"""

import logging
from typing import Optional
import numpy as np

from app.models.schema import (
    ConjunctionEvent,
    DecisionOutput,
    DecisionType,
    SimulationResult,
    FeasibilityMetrics
)
from app.services.simulation import get_orbital_simulator
from app.services.uncertainty_model import get_uncertainty_model
from app.services.cost_model import get_cost_model
from app.services.safety_checks import get_safety_checker
from app.services.causal_engine import get_causal_engine
from app.utils import constants

logger = logging.getLogger(__name__)


class DecisionEngine:
    """
    AI-based decision system for satellite collision avoidance.

    Integrates multiple analysis components to determine optimal
    timing for collision avoidance maneuvers under uncertainty.
    """

    def __init__(self):
        """Initialize decision engine with all component services."""
        self.simulator = get_orbital_simulator()
        self.uncertainty_model = get_uncertainty_model()
        self.cost_model = get_cost_model()
        self.safety_checker = get_safety_checker()
        self.causal_engine = get_causal_engine()

        logger.info("Decision engine initialized with all components")

    def make_decision(
        self,
        event: ConjunctionEvent,
        fuel_available: float = constants.MAX_FUEL_CAPACITY,
        wait_time_horizon: float = 6.0
    ) -> DecisionOutput:
        """
        Make collision avoidance decision for a conjunction event.

        This is the main decision function that orchestrates all analysis.

        Args:
            event: Conjunction event to analyze
            fuel_available: Available fuel for maneuvers (m/s)
            wait_time_horizon: Time horizon for waiting analysis (hours)

        Returns:
            Complete DecisionOutput with all analysis results
        """
        logger.info(f"Making decision for event {event.event_id}")

        # Step 1: Safety Assessment (highest priority)
        safety_assessment = self.safety_checker.evaluate_safety_constraints(
            event,
            fuel_available
        )

        # If safety rules force action, bypass cost analysis
        if safety_assessment.force_action_required:
            logger.warning(f"Event {event.event_id}: Safety rules force immediate action")
            return self._create_forced_decision(
                event,
                safety_assessment,
                fuel_available
            )

        # Step 2: Uncertainty Analysis
        uncertainty_metrics = self.uncertainty_model.compute_uncertainty_metrics(
            event,
            projection_horizon=wait_time_horizon
        )

        # Step 3: Cost Analysis
        cost_breakdown = self.cost_model.compute_full_cost_breakdown(
            event,
            uncertainty_metrics.current_uncertainty,
            wait_time_horizon
        )

        # Step 4: Simulation
        simulation_result = self._run_simulation(event)

        # Step 5: Feasibility Analysis
        feasibility_metrics = self._compute_feasibility(
            event,
            fuel_available
        )

        # Step 6: Make Decision Based on Costs
        decision_type, confidence = self._apply_decision_rule(
            cost_breakdown.cost_difference,
            safety_assessment,
            feasibility_metrics
        )

        # Step 7: Causal Reasoning and Explanation
        causal_analysis = self.causal_engine.compute_causal_effects(
            event,
            uncertainty_metrics.current_uncertainty,
            uncertainty_metrics.projected_uncertainty,
            wait_time_horizon
        )

        explanation = self.causal_engine.explain_decision(
            decision_type.value,
            cost_breakdown.cost_difference,
            event
        )

        # Step 8: Recommended action time (if WAIT)
        recommended_action_time = None
        if decision_type == DecisionType.WAIT:
            recommended_action_time = self._compute_recommended_wait_time(
                event,
                uncertainty_metrics
            )

        # Assemble complete output
        output = DecisionOutput(
            decision=decision_type,
            confidence=confidence,
            event_id=event.event_id,
            primary_object_id=event.primary_object_id,
            secondary_object_id=event.secondary_object_id,
            observation_time=event.observation_time,
            time_to_tca=event.time_to_tca,
            costs=cost_breakdown,
            probability_of_collision=event.probability_of_collision,
            miss_distance=event.miss_distance,
            uncertainty=uncertainty_metrics,
            feasibility=feasibility_metrics,
            safety=safety_assessment,
            simulation=simulation_result,
            causal_analysis=causal_analysis,
            explanation=explanation,
            recommended_action_time=recommended_action_time
        )

        logger.info(
            f"Event {event.event_id}: Decision = {decision_type.value}, "
            f"Confidence = {confidence:.2f}"
        )

        return output

    def _apply_decision_rule(
        self,
        cost_difference: float,
        safety: any,
        feasibility: any
    ) -> tuple:
        """
        Apply decision rule based on cost difference.

        Rule:
        - If C_wait > C_act: COMMIT
        - If C_wait < C_act: WAIT
        - Adjust confidence based on magnitude

        Args:
            cost_difference: C_wait - C_act
            safety: Safety assessment
            feasibility: Feasibility metrics

        Returns:
            Tuple of (DecisionType, confidence)
        """
        # Cost-based decision
        if cost_difference > 0:
            # Waiting is more expensive → Act now
            decision = DecisionType.COMMIT

            # Confidence based on magnitude of difference
            confidence = min(abs(cost_difference) / 10.0, 1.0)
            confidence = max(confidence, 0.6)  # Minimum 60%

        else:
            # Acting is more expensive → Wait
            decision = DecisionType.WAIT

            # Confidence based on magnitude
            confidence = min(abs(cost_difference) / 10.0, 1.0)
            confidence = max(confidence, 0.6)

        # Adjust confidence based on feasibility
        if feasibility.feasibility_index < 0.5:
            confidence *= 0.8  # Lower confidence if feasibility is poor

        # Adjust confidence based on safety
        if safety.risk_level.value in ["HIGH", "CRITICAL"]:
            if decision == DecisionType.WAIT:
                confidence *= 0.7  # Less confident about waiting if risk is high

        return decision, confidence

    def _create_forced_decision(
        self,
        event: ConjunctionEvent,
        safety: any,
        fuel_available: float
    ) -> DecisionOutput:
        """
        Create decision output for forced action scenarios.

        Args:
            event: Conjunction event
            safety: Safety assessment
            fuel_available: Available fuel

        Returns:
            DecisionOutput with FORCE_COMMIT decision
        """
        # Still compute metrics for completeness
        uncertainty_metrics = self.uncertainty_model.compute_uncertainty_metrics(event)
        cost_breakdown = self.cost_model.compute_full_cost_breakdown(
            event,
            uncertainty_metrics.current_uncertainty
        )
        simulation_result = self._run_simulation(event)
        feasibility_metrics = self._compute_feasibility(event, fuel_available)
        causal_analysis = self.causal_engine.compute_causal_effects(
            event,
            uncertainty_metrics.current_uncertainty,
            uncertainty_metrics.projected_uncertainty
        )

        explanation = self.causal_engine.explain_decision(
            "FORCE_COMMIT",
            0.0,
            event
        )

        output = DecisionOutput(
            decision=DecisionType.FORCE_COMMIT,
            confidence=1.0,  # Absolute certainty on safety rules
            event_id=event.event_id,
            primary_object_id=event.primary_object_id,
            secondary_object_id=event.secondary_object_id,
            observation_time=event.observation_time,
            time_to_tca=event.time_to_tca,
            costs=cost_breakdown,
            probability_of_collision=event.probability_of_collision,
            miss_distance=event.miss_distance,
            uncertainty=uncertainty_metrics,
            feasibility=feasibility_metrics,
            safety=safety,
            simulation=simulation_result,
            causal_analysis=causal_analysis,
            explanation=explanation,
            recommended_action_time=0.0  # Immediate
        )

        return output

    def _run_simulation(self, event: ConjunctionEvent) -> SimulationResult:
        """
        Run orbital simulation for the event.

        Args:
            event: Conjunction event

        Returns:
            SimulationResult with all simulation data
        """
        # Propagate future states
        future_states = self.simulator.propagate_relative_motion(
            event,
            time_horizon_hours=min(event.time_to_tca, 24.0),
            num_steps=constants.PLOT_POINTS
        )

        # Compute collision probability trend
        pc_trend = []
        uncertainty_trend = []
        feasibility_trend = []

        for state in future_states:
            # Estimate Pc at this time
            # (simplified: Pc increases as distance decreases)
            distance_ratio = state.distance / event.miss_distance if event.miss_distance > 0 else 1.0
            pc_t = event.probability_of_collision / max(distance_ratio, 0.1)
            pc_t = min(pc_t, 1.0)

            pc_trend.append({
                'time': state.time,
                'pc': pc_t
            })

            # Uncertainty decreases over time
            uncertainty_t = uncertainty_trend[-1]['uncertainty'] * 0.95 if uncertainty_trend else event.covariance.x
            uncertainty_trend.append({
                'time': state.time,
                'uncertainty': uncertainty_t
            })

            # Feasibility decreases as TCA approaches
            time_remaining = event.time_to_tca - state.time
            feasibility_t = max(time_remaining / event.time_to_tca, 0.0) if event.time_to_tca > 0 else 0.0
            feasibility_trend.append({
                'time': state.time,
                'feasibility': feasibility_t
            })

        simulation_result = SimulationResult(
            future_states=future_states,
            collision_probability_trend=pc_trend,
            uncertainty_trend=uncertainty_trend,
            maneuver_feasibility=feasibility_trend
        )

        return simulation_result

    def _compute_feasibility(
        self,
        event: ConjunctionEvent,
        fuel_available: float
    ) -> FeasibilityMetrics:
        """
        Compute maneuver feasibility metrics.

        Args:
            event: Conjunction event
            fuel_available: Available fuel

        Returns:
            FeasibilityMetrics object
        """
        current_delta_v = event.delta_v_required

        # Project future delta-v (increases slightly with time)
        wait_time = 6.0  # hours
        delta_v_growth = constants.DELTA_V_GROWTH_RATE * wait_time
        projected_delta_v = current_delta_v + delta_v_growth

        # Feasibility index (0-1)
        time_feasibility = min(event.time_to_tca / constants.CRITICAL_TIME_THRESHOLD, 1.0)
        fuel_feasibility = min(fuel_available / (current_delta_v + constants.MIN_FUEL_RESERVE), 1.0)
        feasibility_index = (time_feasibility + fuel_feasibility) / 2.0

        # Time to no-return point
        # When delta-v will exceed fuel or time runs out
        if current_delta_v < fuel_available:
            fuel_time_to_no_return = (fuel_available - current_delta_v) / constants.DELTA_V_GROWTH_RATE
            fuel_time_to_no_return = max(fuel_time_to_no_return, 0.0)
        else:
            fuel_time_to_no_return = 0.0

        time_no_return = max(event.time_to_tca - constants.MINIMUM_MANEUVER_TIME, 0.0)

        time_to_no_return = min(fuel_time_to_no_return, time_no_return)

        metrics = FeasibilityMetrics(
            current_delta_v=current_delta_v,
            projected_delta_v=projected_delta_v,
            fuel_available=fuel_available,
            feasibility_index=feasibility_index,
            time_to_no_return=time_to_no_return if time_to_no_return > 0 else None
        )

        return metrics

    def _compute_recommended_wait_time(
        self,
        event: ConjunctionEvent,
        uncertainty_metrics: any
    ) -> float:
        """
        Compute recommended time before re-evaluation.

        Args:
            event: Conjunction event
            uncertainty_metrics: Uncertainty metrics

        Returns:
            Recommended wait time in hours
        """
        # Balance between uncertainty reduction and time pressure
        # Wait longer if lots of time, shorter if TCA is approaching

        if event.time_to_tca > 48:
            # Plenty of time: wait longer for better data
            recommended_wait = 12.0
        elif event.time_to_tca > 24:
            # Moderate time: medium wait
            recommended_wait = 6.0
        elif event.time_to_tca > 12:
            # Less time: shorter wait
            recommended_wait = 3.0
        else:
            # Very little time: quick re-check
            recommended_wait = 1.0

        # Don't wait past critical threshold
        max_wait = event.time_to_tca - constants.CRITICAL_TIME_THRESHOLD
        recommended_wait = min(recommended_wait, max_wait)

        return max(recommended_wait, 0.5)  # Minimum 30 minutes


# Singleton instance
_decision_engine_instance: Optional[DecisionEngine] = None


def get_decision_engine() -> DecisionEngine:
    """
    Get or create global decision engine instance.

    Returns:
        DecisionEngine instance
    """
    global _decision_engine_instance

    if _decision_engine_instance is None:
        _decision_engine_instance = DecisionEngine()
        logger.info("Decision engine initialized")

    return _decision_engine_instance
