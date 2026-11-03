import type { OrbitalXObservation, OrbitalXScenario } from '../../services/api/orbitalx';
import { simulateGameManeuver } from './gameSimulation';

export type ManeuverDirection = 'RADIAL' | 'ALONG_TRACK' | 'CROSS_TRACK';

export interface ManeuverConfiguration {
  currentTimestep: number;
  executionTimestep: number;
  deltaV: number;
  direction: ManeuverDirection;
}

export interface ManeuverScore {
  earned: number;
  possible: number;
  safety: number;
  timing: number;
  explanation: string[];
}

export interface ManeuverSimulationResult {
  valid: boolean;
  feasible: boolean | null;
  validationMessages: string[];
  executionObservation: OrbitalXObservation | null;
  observedPocChange: number | null;
  observedMissDistanceChange: number | null;
  fuelUse: number | null;
  remainingFuelAfter: number | null;
  maneuverPoc: number | null;
  maneuverMissDistance: number | null;
  score: ManeuverScore | null;
}

export function getLastFeasibleTimestep(scenario: OrbitalXScenario, currentTimestep: number): number | null {
  const lastIndex = scenario.observations.reduce(
    (lastFeasible, observation) => observation.maneuverFeasible === true
      ? observation.datasetIndex
      : lastFeasible,
    -1,
  );
  return lastIndex >= currentTimestep ? lastIndex : null;
}

function scoreObservedTiming(
  scenario: OrbitalXScenario,
  configuration: ManeuverConfiguration,
): number {
  const current = scenario.observations[configuration.currentTimestep];
  const selected = scenario.observations[configuration.executionTimestep];
  if (!current || !selected) return 0;

  let score = 12;
  if (current.probabilityOfCollision !== null && selected.probabilityOfCollision !== null) {
    if (selected.probabilityOfCollision < current.probabilityOfCollision) score += 8;
    if (selected.probabilityOfCollision > current.probabilityOfCollision) score -= 8;
  }
  if (current.missDistance !== null && selected.missDistance !== null) {
    if (selected.missDistance > current.missDistance) score += 3;
    if (selected.missDistance < current.missDistance) score -= 3;
  }
  if (current.fuelRemaining !== null && selected.fuelRemaining !== null) {
    if (selected.fuelRemaining > current.fuelRemaining) score += 2;
    if (selected.fuelRemaining < current.fuelRemaining) score -= 2;
  }

  const missedFeasibleObservations = scenario.observations
    .slice(configuration.currentTimestep + 1, configuration.executionTimestep)
    .filter((observation) => observation.maneuverFeasible === false).length;
  score -= missedFeasibleObservations * 5;

  return Math.max(0, Math.min(25, score));
}

export function simulateManeuverDecision(
  scenario: OrbitalXScenario,
  configuration: ManeuverConfiguration,
): ManeuverSimulationResult {
  const messages: string[] = [];
  const observation = scenario.observations[configuration.executionTimestep];
  const currentObservation = scenario.observations[configuration.currentTimestep];
  if (!observation || !currentObservation) {
    return {
      valid: false,
      feasible: null,
      validationMessages: ['The selected execution timestep is outside the event sequence.'],
      executionObservation: observation ?? null,
      observedPocChange: null,
      observedMissDistanceChange: null,
      fuelUse: null,
      remainingFuelAfter: null,
      maneuverPoc: null,
      maneuverMissDistance: null,
      score: null,
    };
  }

  if (configuration.executionTimestep < configuration.currentTimestep) {
    messages.push('Execution cannot be scheduled before the current observation.');
  }
  if (!Number.isFinite(configuration.deltaV) || configuration.deltaV <= 0) {
    messages.push('Configured Δv must be a positive finite number.');
  }

  const maxDeltaV = observation.maxDeltaV;
  if (maxDeltaV === null) {
    messages.push('The game did not provide a maximum Δv for this step.');
  } else if (configuration.deltaV > maxDeltaV) {
    messages.push(`Configured Δv exceeds the game limit of ${maxDeltaV.toFixed(3)} game units.`);
  }
  if (observation.requiredDeltaV !== null && configuration.deltaV < observation.requiredDeltaV) {
    messages.push(`Configured Δv is below the simulated game requirement of ${observation.requiredDeltaV.toFixed(3)} game units.`);
  }

  if (observation.maneuverFeasible === false) {
    messages.push('The simulated game safety rule marks this execution timestep infeasible.');
  } else if (observation.maneuverFeasible === null) {
    messages.push('The game feasibility result is unavailable for this timestep.');
  }

  const valid = messages.length === 0;
  const feasible = observation.maneuverFeasible === null
    ? null
    : valid && observation.maneuverFeasible;
  const observedPocChange = currentObservation?.probabilityOfCollision !== null
    && currentObservation?.probabilityOfCollision !== undefined
    && observation.probabilityOfCollision !== null
    ? observation.probabilityOfCollision - currentObservation.probabilityOfCollision
    : null;
  const observedMissDistanceChange = currentObservation?.missDistance !== null
    && currentObservation?.missDistance !== undefined
    && observation.missDistance !== null
    ? observation.missDistance - currentObservation.missDistance
    : null;

  if (!valid || feasible !== true || !currentObservation) {
    return {
      valid,
      feasible,
      validationMessages: messages,
      executionObservation: observation,
      observedPocChange,
      observedMissDistanceChange,
      fuelUse: null,
      remainingFuelAfter: null,
      maneuverPoc: null,
      maneuverMissDistance: null,
      score: feasible === false
        ? {
          earned: 0,
          possible: 85,
          safety: 0,
          timing: 0,
          explanation: ['No points are awarded for an invalid or game-infeasible maneuver.'],
        }
        : null,
    };
  }

  const gameOutcome = simulateGameManeuver(observation, configuration.deltaV, configuration.direction);
  const safety = 60;
  const timing = scoreObservedTiming(scenario, configuration);
  const scoreExplanation = [
    'Simulated game checks: 60 points for a positive configured value within the game Δv limit and a game-feasible timestep.',
    `Timing: ${timing}/25; starting at 12, game PoC change adds/subtracts 8, game miss-distance change adds/subtracts 3, game fuel change adds/subtracts 2, and each skipped infeasible step subtracts 5.`,
    'Fuel use, PoC reduction, and miss-distance change are game estimates only; they are not physical propagation or real model output.',
  ];

  return {
    valid: true,
    feasible: true,
    validationMessages: [
      'The simulated game feasibility rule and game Δv limit passed. This is not a real-world safety assessment.',
      'The game estimates maneuver effects using its documented approximation; no physical orbit is propagated.',
    ],
    executionObservation: observation,
    observedPocChange,
    observedMissDistanceChange,
    fuelUse: gameOutcome?.fuelUsed ?? null,
    remainingFuelAfter: gameOutcome?.fuelRemaining ?? null,
    maneuverPoc: gameOutcome?.probabilityOfCollision ?? null,
    maneuverMissDistance: gameOutcome?.missDistance ?? null,
    score: {
      earned: safety + timing,
      possible: 85,
      safety,
      timing,
      explanation: scoreExplanation,
    },
  };
}

export function getDirectionDescription(direction: ManeuverDirection): string {
  switch (direction) {
    case 'RADIAL':
      return 'Radial: toward or away from the central body.';
    case 'ALONG_TRACK':
      return 'Along-track: forward or backward along the orbit direction.';
    case 'CROSS_TRACK':
      return 'Cross-track: out of the orbital plane.';
  }
}
