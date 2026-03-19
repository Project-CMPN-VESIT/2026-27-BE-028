"""
Safety checks and constraint enforcement.

Implements real-world safety rules and operational constraints for
collision avoidance decisions.
"""

from typing import List, Tuple
import logging

from app.models.schema import (
    ConjunctionEvent,
    SafetyAssessment,
    RiskLevel
)
from app.utils import constants

logger = logging.getLogger(__name__)


class SafetyChecker:
    """
    Enforces safety rules and operational constraints.

    Implements NASA and industry-standard safety thresholds
    for collision avoidance.
    """

    def __init__(self):
        """Initialize safety checker with threshold values."""
        self.critical_pc = constants.CRITICAL_PC_THRESHOLD
        self.medium_pc = constants.MEDIUM_PC_THRESHOLD
        self.min_maneuver_time = constants.MINIMUM_MANEUVER_TIME
        self.critical_time = constants.CRITICAL_TIME_THRESHOLD
        self.max_fuel = constants.MAX_FUEL_CAPACITY
        self.min_fuel_reserve = constants.MIN_FUEL_RESERVE

    def check_critical_risk(self, event: ConjunctionEvent) -> bool:
        """
        Check if collision probability exceeds critical threshold.

        NASA standard: Pc > 1e-4 requires immediate action.

        Args:
            event: Conjunction event

        Returns:
            True if Pc exceeds critical threshold
        """
        is_critical = event.probability_of_collision > self.critical_pc

        if is_critical:
            logger.warning(
                f"Event {event.event_id}: CRITICAL Pc = {event.probability_of_collision:.2e} "
                f"(threshold: {self.critical_pc:.2e})"
            )

        return is_critical

    def check_time_critical(self, event: ConjunctionEvent) -> bool:
        """
        Check if time to TCA is critically short.

        Args:
            event: Conjunction event

        Returns:
            True if TCA is approaching critical threshold
        """
        is_time_critical = event.time_to_tca < self.critical_time

        if is_time_critical:
            logger.warning(
                f"Event {event.event_id}: Time critical - {event.time_to_tca:.1f} hours to TCA "
                f"(threshold: {self.critical_time} hours)"
            )

        return is_time_critical

    def check_no_return_point(
        self,
        event: ConjunctionEvent,
        fuel_available: float
    ) -> Tuple[bool, str]:
        """
        Check if no-return point has been reached.

        No-return conditions:
        1. Delta-V required > fuel available
        2. Time to TCA < minimum safe maneuver time

        Args:
            event: Conjunction event
            fuel_available: Available fuel (m/s)

        Returns:
            Tuple of (no_return_reached, reason)
        """
        # Check fuel constraint
        if event.delta_v_required > fuel_available:
            reason = (
                f"Delta-V required ({event.delta_v_required:.3f} m/s) exceeds "
                f"available fuel ({fuel_available:.3f} m/s)"
            )
            logger.critical(f"Event {event.event_id}: NO RETURN - {reason}")
            return True, reason

        # Check fuel reserve constraint
        if event.delta_v_required > (fuel_available - self.min_fuel_reserve):
            reason = (
                f"Maneuver would deplete fuel below minimum reserve "
                f"({self.min_fuel_reserve} m/s)"
            )
            logger.warning(f"Event {event.event_id}: Low fuel margin - {reason}")
            # Not quite no-return, but concerning
            # return True, reason

        # Check time constraint
        if event.time_to_tca < self.min_maneuver_time:
            reason = (
                f"Time to TCA ({event.time_to_tca:.2f} hours) below minimum "
                f"safe maneuver time ({self.min_maneuver_time} hours)"
            )
            logger.critical(f"Event {event.event_id}: NO RETURN - {reason}")
            return True, reason

        return False, ""

    def classify_risk_level(self, event: ConjunctionEvent) -> RiskLevel:
        """
        Classify risk level based on Pc and geometry.

        Risk levels:
        - LOW: Pc < 1e-5
        - MEDIUM: 1e-5 <= Pc < 1e-4
        - HIGH: 1e-4 <= Pc < 1e-3
        - CRITICAL: Pc >= 1e-3

        Args:
            event: Conjunction event

        Returns:
            RiskLevel enum
        """
        pc = event.probability_of_collision

        if pc >= 1e-3:
            return RiskLevel.CRITICAL
        elif pc >= self.critical_pc:
            return RiskLevel.HIGH
        elif pc >= self.medium_pc:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW

    def check_miss_distance_safety(self, event: ConjunctionEvent) -> bool:
        """
        Check if miss distance provides adequate safety margin.

        Args:
            event: Conjunction event

        Returns:
            True if miss distance is safe
        """
        safety_margin = 3.0  # 3x hard body radius
        safe_distance = event.hard_body_radius * safety_margin

        is_safe = event.miss_distance > safe_distance

        if not is_safe:
            logger.warning(
                f"Event {event.event_id}: Miss distance ({event.miss_distance:.1f}m) "
                f"below safe threshold ({safe_distance:.1f}m)"
            )

        return is_safe

    def evaluate_safety_constraints(
        self,
        event: ConjunctionEvent,
        fuel_available: float = constants.MAX_FUEL_CAPACITY
    ) -> SafetyAssessment:
        """
        Perform complete safety assessment.

        Args:
            event: Conjunction event
            fuel_available: Available fuel capacity

        Returns:
            SafetyAssessment with all checks
        """
        violations = []

        # Critical risk check
        is_critical_risk = self.check_critical_risk(event)
        if is_critical_risk:
            violations.append(f"Pc ({event.probability_of_collision:.2e}) exceeds critical threshold")

        # Time critical check
        is_time_critical = self.check_time_critical(event)
        if is_time_critical:
            violations.append(f"Time to TCA ({event.time_to_tca:.1f}h) is critically short")

        # No-return point check
        no_return, no_return_reason = self.check_no_return_point(event, fuel_available)
        if no_return:
            violations.append(f"No-return point reached: {no_return_reason}")

        # Risk classification
        risk_level = self.classify_risk_level(event)

        # Miss distance check
        miss_distance_safe = self.check_miss_distance_safety(event)
        if not miss_distance_safe:
            violations.append(
                f"Miss distance ({event.miss_distance:.1f}m) insufficient for safety"
            )

        # Determine if force action required
        force_action = (
            is_critical_risk or
            no_return or
            (is_time_critical and risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL])
        )

        assessment = SafetyAssessment(
            is_critical_risk=is_critical_risk,
            is_time_critical=is_time_critical,
            no_return_point_reached=no_return,
            force_action_required=force_action,
            risk_level=risk_level,
            safety_violations=violations
        )

        return assessment

    def validate_maneuver_feasibility(
        self,
        event: ConjunctionEvent,
        fuel_available: float
    ) -> Tuple[bool, str]:
        """
        Validate that proposed maneuver is feasible.

        Args:
            event: Conjunction event with delta-v requirement
            fuel_available: Available fuel

        Returns:
            Tuple of (is_feasible, reason)
        """
        # Check fuel availability
        if event.delta_v_required > fuel_available:
            return False, f"Insufficient fuel: need {event.delta_v_required:.3f} m/s, have {fuel_available:.3f} m/s"

        # Check time availability
        if event.time_to_tca < self.min_maneuver_time:
            return False, f"Insufficient time: {event.time_to_tca:.2f}h < {self.min_maneuver_time}h minimum"

        # Check fuel reserve
        remaining_fuel = fuel_available - event.delta_v_required
        if remaining_fuel < self.min_fuel_reserve:
            return False, f"Would violate fuel reserve: {remaining_fuel:.3f} m/s < {self.min_fuel_reserve} m/s"

        return True, "Maneuver is feasible"

    def compute_safety_margin(self, event: ConjunctionEvent) -> float:
        """
        Compute overall safety margin (0-1 scale).

        Combines multiple factors:
        - Miss distance margin
        - Time margin
        - Probability margin

        Args:
            event: Conjunction event

        Returns:
            Safety margin (0 = no margin, 1 = large margin)
        """
        # Miss distance component (normalized)
        safe_miss = constants.SAFE_MISS_DISTANCE
        miss_margin = min(event.miss_distance / safe_miss, 1.0)

        # Time component (normalized)
        time_margin = min(event.time_to_tca / 48.0, 1.0)  # 48 hours = comfortable

        # Probability component (inverse)
        pc_margin = 1.0 - min(event.probability_of_collision / self.critical_pc, 1.0)

        # Weighted average
        overall_margin = (
            0.4 * miss_margin +
            0.3 * time_margin +
            0.3 * pc_margin
        )

        return float(overall_margin)


# Singleton instance
_safety_checker_instance = None


def get_safety_checker() -> SafetyChecker:
    """
    Get or create global safety checker instance.

    Returns:
        SafetyChecker instance
    """
    global _safety_checker_instance

    if _safety_checker_instance is None:
        _safety_checker_instance = SafetyChecker()
        logger.info("Safety checker initialized")

    return _safety_checker_instance
