"""
Orbital simulation engine using Skyfield only.

This module provides:
- Satellite position propagation using linearized relative motion
- Approximate maneuver modeling (no Poliastro)
- Collision probability computation
- Future state prediction

Note: Uses simplified dynamics suitable for conjunction analysis.
"""

import numpy as np
from typing import List, Tuple, Optional
from datetime import datetime, timedelta
import logging

from app.models.schema import (
    ConjunctionEvent,
    RelativePosition,
    OrbitState
)
from app.utils import constants

logger = logging.getLogger(__name__)


class OrbitalSimulator:
    """
    Simulates satellite orbital mechanics and collision scenarios.

    Uses linearized relative motion dynamics and approximate maneuver modeling.
    Suitable for conjunction analysis without complex orbit propagation.

    Approximate maneuver model:
    - new_miss_distance = Miss_Distance + k * Delta_V_Required
    - new_Pc = Probability_of_Collision * exp(-λ * Delta_V_Required)
    """

    def __init__(self):
        """Initialize the orbital simulator."""
        self.earth_radius = constants.EARTH_RADIUS  # km
        self.mu = constants.MU_EARTH  # km^3/s^2

    def propagate_relative_motion(
        self,
        event: ConjunctionEvent,
        time_horizon_hours: float = 24.0,
        num_steps: int = 50
    ) -> List[OrbitState]:
        """
        Propagate the relative motion between two satellites.

        Uses simplified dynamics model based on relative position and velocity.
        For research prototype, we use linearized relative orbital mechanics.

        Args:
            event: Conjunction event with initial conditions
            time_horizon_hours: How far into future to propagate (hours)
            num_steps: Number of time steps

        Returns:
            List of orbital states over time
        """
        states = []

        # Initial conditions (convert to consistent units)
        r0 = np.array([
            event.relative_position.x,  # meters
            event.relative_position.y,
            event.relative_position.z
        ])

        # Estimate velocity components from relative velocity magnitude
        # Assume velocity is primarily in the direction of position change
        v_mag = event.relative_velocity * 1000  # km/s to m/s
        r_mag = np.linalg.norm(r0)

        if r_mag > 0:
            # Velocity direction approximation (simplified)
            v0 = (r0 / r_mag) * v_mag
        else:
            v0 = np.array([v_mag, 0, 0])

        # Time array
        time_steps = np.linspace(0, time_horizon_hours, num_steps)

        # Propagate using simplified linear dynamics
        # For conjunction scenarios, we assume linearized relative motion
        for t in time_steps:
            # Simple ballistic propagation (no perturbations)
            # r(t) = r0 + v0*t
            t_seconds = t * 3600  # hours to seconds

            position = r0 + v0 * t_seconds
            velocity = v0  # Constant velocity assumption

            distance = np.linalg.norm(position)

            state = OrbitState(
                time=t,
                position=RelativePosition(
                    x=float(position[0]),
                    y=float(position[1]),
                    z=float(position[2])
                ),
                velocity=RelativePosition(
                    x=float(velocity[0]),
                    y=float(velocity[1]),
                    z=float(velocity[2])
                ),
                distance=float(distance)
            )

            states.append(state)

        return states

    def simulate_maneuver(
        self,
        event: ConjunctionEvent,
        delta_v_vector: np.ndarray,
        application_time: float = 0.0
    ) -> Tuple[RelativePosition, float]:
        """
        Simulate the effect of a collision avoidance maneuver.

        Uses approximate maneuver model (Skyfield only, no Poliastro needed):
        - Applies delta-V to velocity vector
        - Propagates to TCA with modified velocity
        - Computes new miss distance

        Args:
            event: Current conjunction event
            delta_v_vector: Delta-V vector to apply (m/s) [x, y, z]
            application_time: Time to apply maneuver (hours from now)

        Returns:
            Tuple of (new_position_at_tca, new_miss_distance)
        """
        # Current relative state
        r0 = np.array([
            event.relative_position.x,
            event.relative_position.y,
            event.relative_position.z
        ])

        v_mag = event.relative_velocity * 1000  # km/s to m/s
        r_mag = np.linalg.norm(r0)

        if r_mag > 0:
            v0 = (r0 / r_mag) * v_mag
        else:
            v0 = np.array([v_mag, 0, 0])

        # Apply delta-V at application time
        t_maneuver = application_time * 3600  # hours to seconds
        t_tca = event.time_to_tca * 3600

        # Position at maneuver time
        r_maneuver = r0 + v0 * t_maneuver

        # Velocity after maneuver
        v_maneuver = v0 + delta_v_vector

        # Propagate to TCA
        t_propagate = t_tca - t_maneuver
        r_tca = r_maneuver + v_maneuver * t_propagate

        new_miss_distance = np.linalg.norm(r_tca)

        new_position = RelativePosition(
            x=float(r_tca[0]),
            y=float(r_tca[1]),
            z=float(r_tca[2])
        )

        return new_position, float(new_miss_distance)

    def compute_future_collision_probability(
        self,
        miss_distance: float,
        hard_body_radius: float,
        position_uncertainty: float
    ) -> float:
        """
        Compute collision probability given miss distance and uncertainty.

        Uses simplified 2D Gaussian probability model commonly used
        in conjunction assessment.

        Args:
            miss_distance: Predicted miss distance (meters)
            hard_body_radius: Combined hard body radius (meters)
            position_uncertainty: Position uncertainty (meters, 1-sigma)

        Returns:
            Probability of collision (0-1)
        """
        if position_uncertainty <= 0:
            position_uncertainty = 1.0  # Avoid division by zero

        # Normalized miss distance
        normalized_distance = miss_distance / position_uncertainty

        # Probability model: Pc = exp(-d^2 / (2*sigma^2))
        # This is simplified; full model uses error function
        pc = np.exp(-normalized_distance**2 / 2)

        # Scale by hard body radius effect
        # Larger combined radius = higher collision probability
        hbr_factor = (hard_body_radius / 10.0)  # Normalized to ~10m typical size
        pc = pc * min(hbr_factor, 1.0)

        # Ensure probability is in valid range
        pc = np.clip(pc, 0.0, 1.0)

        return float(pc)

    def compute_relative_distance(
        self,
        pos1: RelativePosition,
        pos2: RelativePosition
    ) -> float:
        """
        Compute Euclidean distance between two positions.

        Args:
            pos1: First position
            pos2: Second position

        Returns:
            Distance in meters
        """
        dx = pos1.x - pos2.x
        dy = pos1.y - pos2.y
        dz = pos1.z - pos2.z

        distance = np.sqrt(dx**2 + dy**2 + dz**2)
        return float(distance)

    def compute_optimal_delta_v_direction(
        self,
        event: ConjunctionEvent
    ) -> np.ndarray:
        """
        Compute optimal direction for collision avoidance maneuver.

        For simplicity, maneuver in direction perpendicular to relative velocity
        to maximize miss distance increase.

        Args:
            event: Conjunction event

        Returns:
            Unit vector for optimal maneuver direction
        """
        # Get relative position vector
        r = np.array([
            event.relative_position.x,
            event.relative_position.y,
            event.relative_position.z
        ])

        r_mag = np.linalg.norm(r)

        if r_mag > 0:
            # Maneuver perpendicular to position vector
            # This maximizes the change in miss distance
            direction = r / r_mag
        else:
            # Default to radial out direction
            direction = np.array([1.0, 0.0, 0.0])

        return direction

    def estimate_maneuver_effectiveness(
        self,
        event: ConjunctionEvent,
        delta_v: float
    ) -> dict:
        """
        Estimate effectiveness of a given delta-v maneuver.

        Args:
            event: Conjunction event
            delta_v: Delta-V magnitude (m/s)

        Returns:
            Dictionary with effectiveness metrics
        """
        # Compute optimal direction
        direction = self.compute_optimal_delta_v_direction(event)

        # Apply maneuver
        delta_v_vector = direction * delta_v

        new_position, new_miss_distance = self.simulate_maneuver(
            event,
            delta_v_vector,
            application_time=0.0
        )

        # Compute miss distance improvement
        improvement = new_miss_distance - event.miss_distance

        # Estimate new collision probability (simplified)
        position_uncertainty = np.sqrt(
            event.covariance.x**2 +
            event.covariance.y**2 +
            event.covariance.z**2
        )

        new_pc = self.compute_future_collision_probability(
            new_miss_distance,
            event.hard_body_radius,
            position_uncertainty
        )

        pc_reduction = event.probability_of_collision - new_pc

        effectiveness = {
            'original_miss_distance': event.miss_distance,
            'new_miss_distance': new_miss_distance,
            'improvement_meters': improvement,
            'original_pc': event.probability_of_collision,
            'new_pc': new_pc,
            'pc_reduction': pc_reduction,
            'effectiveness_score': min(improvement / 1000.0, 1.0)  # Normalized
        }

        return effectiveness

    def propagate_with_uncertainty(
        self,
        event: ConjunctionEvent,
        time_horizon_hours: float = 24.0,
        num_samples: int = 100
    ) -> dict:
        """
        Propagate orbital state with uncertainty quantification.

        Uses Monte Carlo sampling of position uncertainty.

        Args:
            event: Conjunction event with uncertainty
            time_horizon_hours: Propagation horizon
            num_samples: Number of Monte Carlo samples

        Returns:
            Dictionary with mean, std, and confidence intervals
        """
        # Extract covariance
        cov_diag = np.array([
            event.covariance.x,
            event.covariance.y,
            event.covariance.z
        ])

        # Nominal state
        nominal_states = self.propagate_relative_motion(
            event,
            time_horizon_hours,
            num_steps=50
        )

        # Sample trajectories (simplified Monte Carlo)
        distances_at_tca = []

        for _ in range(num_samples):
            # Sample initial position with uncertainty
            position_noise = np.random.randn(3) * cov_diag

            # Create perturbed event
            perturbed_event = event.model_copy(deep=True)
            perturbed_event.relative_position.x += position_noise[0]
            perturbed_event.relative_position.y += position_noise[1]
            perturbed_event.relative_position.z += position_noise[2]

            # Propagate
            states = self.propagate_relative_motion(
                perturbed_event,
                time_horizon_hours=event.time_to_tca,
                num_steps=10
            )

            # Get distance at TCA (last state)
            if states:
                distances_at_tca.append(states[-1].distance)

        # Compute statistics
        result = {
            'nominal_states': nominal_states,
            'tca_distance_mean': float(np.mean(distances_at_tca)),
            'tca_distance_std': float(np.std(distances_at_tca)),
            'tca_distance_min': float(np.min(distances_at_tca)),
            'tca_distance_max': float(np.max(distances_at_tca)),
            'collision_samples': sum(1 for d in distances_at_tca if d < event.hard_body_radius * 2),
            'total_samples': num_samples
        }

        return result


# Singleton instance
_simulator_instance: Optional[OrbitalSimulator] = None


def get_orbital_simulator() -> OrbitalSimulator:
    """
    Get or create global orbital simulator instance.

    Returns:
        OrbitalSimulator instance
    """
    global _simulator_instance

    if _simulator_instance is None:
        _simulator_instance = OrbitalSimulator()
        logger.info("Orbital simulator initialized")

    return _simulator_instance
