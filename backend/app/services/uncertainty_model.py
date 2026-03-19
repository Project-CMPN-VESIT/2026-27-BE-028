"""
Uncertainty quantification and modeling.

This module models how uncertainty evolves over time and affects decision-making.
Implements uncertainty decay models and propagation.
"""

import numpy as np
from typing import List, Dict
import logging

from app.models.schema import ConjunctionEvent, UncertaintyMetrics
from app.utils import constants

logger = logging.getLogger(__name__)


class UncertaintyModel:
    """
    Models uncertainty in satellite conjunction events.

    Handles:
    - Covariance analysis
    - Uncertainty evolution over time
    - Position uncertainty quantification
    """

    def __init__(self):
        """Initialize uncertainty model with default parameters."""
        self.decay_rate = constants.UNCERTAINTY_DECAY_RATE
        self.min_uncertainty = constants.MIN_UNCERTAINTY

    def compute_covariance_trace(self, event: ConjunctionEvent) -> float:
        """
        Compute trace of covariance matrix (sum of diagonal elements).

        The trace represents total variance across all dimensions.

        Args:
            event: Conjunction event with covariance data

        Returns:
            Trace of covariance matrix (meters)
        """
        trace = (
            event.covariance.x +
            event.covariance.y +
            event.covariance.z
        )
        return float(trace)

    def compute_uncertainty_metric(self, event: ConjunctionEvent) -> float:
        """
        Compute normalized uncertainty metric.

        Formula: uncertainty = trace(Covariance) / time_to_TCA

        This captures that uncertainty is more critical when time is short.

        Args:
            event: Conjunction event

        Returns:
            Uncertainty metric (dimensionless)
        """
        trace = self.compute_covariance_trace(event)

        # Normalize by time to TCA (uncertainty matters more when time is short)
        if event.time_to_tca > 0:
            uncertainty = trace / event.time_to_tca
        else:
            uncertainty = trace * 1000  # Very high if TCA is now

        # Apply base factor
        uncertainty *= constants.BASE_UNCERTAINTY_FACTOR

        # Ensure minimum floor
        uncertainty = max(uncertainty, self.min_uncertainty)

        return float(uncertainty)

    def project_uncertainty_evolution(
        self,
        current_uncertainty: float,
        time_horizon_hours: float,
        num_steps: int = 20
    ) -> List[Dict[str, float]]:
        """
        Project how uncertainty evolves over time.

        Uncertainty decreases exponentially as more observations are made
        (assuming tracking continues).

        Formula: uncertainty(t) = uncertainty_0 * exp(-k * t)

        Args:
            current_uncertainty: Current uncertainty level
            time_horizon_hours: Time horizon to project
            num_steps: Number of time steps

        Returns:
            List of {time, uncertainty} dictionaries
        """
        evolution = []
        time_steps = np.linspace(0, time_horizon_hours, num_steps)

        for t in time_steps:
            # Exponential decay model
            uncertainty_t = current_uncertainty * np.exp(-self.decay_rate * t)

            # Apply minimum floor
            uncertainty_t = max(uncertainty_t, self.min_uncertainty)

            evolution.append({
                'time': float(t),
                'uncertainty': float(uncertainty_t)
            })

        return evolution

    def compute_position_uncertainty(self, event: ConjunctionEvent, sigma: float = 3.0) -> float:
        """
        Compute 3-sigma position uncertainty ellipsoid size.

        Args:
            event: Conjunction event with covariance
            sigma: Number of standard deviations (default 3-sigma = 99.7%)

        Returns:
            Position uncertainty radius (meters)
        """
        # RSS (Root Sum Square) of covariance diagonal
        variance_sum = (
            event.covariance.x**2 +
            event.covariance.y**2 +
            event.covariance.z**2
        )

        # Standard deviation
        std = np.sqrt(variance_sum)

        # Apply sigma multiplier
        uncertainty_radius = sigma * std

        return float(uncertainty_radius)

    def estimate_measurement_improvement(
        self,
        current_uncertainty: float,
        wait_time_hours: float
    ) -> float:
        """
        Estimate how much uncertainty would decrease if we wait.

        Args:
            current_uncertainty: Current uncertainty level
            wait_time_hours: Time to wait for new measurements

        Returns:
            Expected uncertainty after waiting
        """
        # Uncertainty decreases exponentially with time (more observations)
        improved_uncertainty = current_uncertainty * np.exp(-self.decay_rate * wait_time_hours)

        # But never below minimum floor
        improved_uncertainty = max(improved_uncertainty, self.min_uncertainty)

        return float(improved_uncertainty)

    def compute_uncertainty_metrics(
        self,
        event: ConjunctionEvent,
        projection_horizon: float = 12.0
    ) -> UncertaintyMetrics:
        """
        Compute complete uncertainty metrics for an event.

        Args:
            event: Conjunction event
            projection_horizon: How far ahead to project (hours)

        Returns:
            UncertaintyMetrics object with all metrics
        """
        # Current uncertainty
        current_uncertainty = self.compute_uncertainty_metric(event)

        # Projected uncertainty after waiting
        projected_uncertainty = self.estimate_measurement_improvement(
            current_uncertainty,
            projection_horizon
        )

        # Covariance trace
        cov_trace = self.compute_covariance_trace(event)

        # Position uncertainty (3-sigma)
        position_uncertainty = self.compute_position_uncertainty(event)

        metrics = UncertaintyMetrics(
            current_uncertainty=current_uncertainty,
            projected_uncertainty=projected_uncertainty,
            covariance_trace=cov_trace,
            position_uncertainty=position_uncertainty
        )

        return metrics

    def compute_information_gain(
        self,
        current_uncertainty: float,
        future_uncertainty: float
    ) -> float:
        """
        Compute information gain from waiting for better data.

        Args:
            current_uncertainty: Current uncertainty
            future_uncertainty: Expected future uncertainty

        Returns:
            Information gain (positive = gain, negative = loss)
        """
        if current_uncertainty <= 0:
            return 0.0

        # Information gain as relative reduction
        gain = (current_uncertainty - future_uncertainty) / current_uncertainty

        return float(gain)


# Singleton instance
_uncertainty_model_instance = None


def get_uncertainty_model() -> UncertaintyModel:
    """
    Get or create global uncertainty model instance.

    Returns:
        UncertaintyModel instance
    """
    global _uncertainty_model_instance

    if _uncertainty_model_instance is None:
        _uncertainty_model_instance = UncertaintyModel()
        logger.info("Uncertainty model initialized")

    return _uncertainty_model_instance
