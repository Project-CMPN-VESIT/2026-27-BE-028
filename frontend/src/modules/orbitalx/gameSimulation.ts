import type { OrbitalXCatalogEvent, OrbitalXObservation, OrbitalXScenario } from '../../services/api/orbitalx';

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function eventSeed(eventId: string): number {
  return [...eventId].reduce((seed, character) => (seed * 31 + character.charCodeAt(0)) >>> 0, 7);
}

function syntheticRecommendation(
  model: string,
  commitScore: number,
  phase: number,
): OrbitalXObservation['recommendations'][number] {
  const probabilityOfCommit = clamp(commitScore + phase, 0.04, 0.96);
  const recommendsManeuver = probabilityOfCommit >= 0.5;
  return {
    model,
    raw: recommendsManeuver ? 'COMMIT' : 'WAIT',
    final: recommendsManeuver ? 'COMMIT' : 'WAIT',
    probabilityOfCommit,
    symbolicOverride: null,
    reason: recommendsManeuver
      ? 'Risk is rising or the chance to maneuver is getting smaller, so it suggests acting.'
      : 'Risk is still manageable and there is time to act later, so it suggests waiting.',
  };
}

export function createGameScenario(event: OrbitalXCatalogEvent): OrbitalXScenario {
  const seed = eventSeed(event.id);
  const phase = (seed % 1000) / 1000 * Math.PI * 2;
  const basePoc = 0.00001 + (seed % 30) * 0.000001;
  const baseTca = 60 + (seed % 121);
  const initialFuel = 58 + (seed % 38);
  const baseMissDistance = 1.5 + (seed % 50) / 10;
  const baseDeltaV = 0.06 + (seed % 20) / 100;
  const maxDeltaV = baseDeltaV * 2.4;
  const feasibleUntil = 10 + seed % 9;

  const observations = Array.from({ length: 20 }, (_, index): OrbitalXObservation => {
    const progress = index / 19;
    const oscillation = Math.sin(progress * Math.PI * (2 + seed % 3) + phase);
    const riskWave = 1 + progress * (0.8 + (seed % 4) * 0.12) + oscillation * 0.25;
    const probabilityOfCollision = clamp(basePoc * riskWave, 1e-10, 0.99);
    const fuelRemaining = Math.max(8, initialFuel - (index * (0.45 + (seed % 5) * 0.08)) - progress * progress * 10);
    const requiredDeltaV = baseDeltaV * (0.82 + progress * 0.75 + Math.max(0, oscillation) * 0.12);
    const stepMaxDeltaV = maxDeltaV * (1 - progress * 0.28);
    const maneuverFeasible = index < feasibleUntil
      && fuelRemaining > 12
      && requiredDeltaV <= stepMaxDeltaV;
    const missDistance = Math.max(0.02, baseMissDistance * (1.12 - progress * 0.3 - (riskWave - 1) * 0.18));
    const riskSignal = clamp((probabilityOfCollision / basePoc - 1) * 0.58 + progress * 0.65, 0.02, 0.96);
    const recommendations = [
      syntheticRecommendation('GAME ADVISOR A', riskSignal, Math.sin(index + phase) * 0.12),
      syntheticRecommendation('GAME ADVISOR B', riskSignal, Math.cos(index * 0.7 + phase) * 0.16),
      syntheticRecommendation('GAME ADVISOR C', riskSignal, Math.sin(index * 0.45 - phase) * 0.2),
    ];

    return {
      datasetIndex: index,
      timeToTca: Math.max(0, baseTca * (1 - progress * 0.94)),
      probabilityOfCollision,
      missDistance,
      relativeVelocity: 7 + (seed % 25) / 10,
      fuelRemaining,
      requiredDeltaV,
      maxDeltaV: stepMaxDeltaV,
      fuelMargin: clamp((stepMaxDeltaV - requiredDeltaV) / stepMaxDeltaV, 0, 1),
      maneuverFeasible,
      recommendations,
    };
  });

  return {
    event: {
      ...event,
      probabilityOfCollision: observations[0]?.probabilityOfCollision ?? basePoc,
      timeToTca: observations[0]?.timeToTca ?? baseTca,
      missDistance: observations[0]?.missDistance ?? baseMissDistance,
      relativeVelocity: observations[0]?.relativeVelocity ?? event.relativeVelocity,
      requiredDeltaV: observations[0]?.requiredDeltaV ?? baseDeltaV,
      fuelRemaining: observations[0]?.fuelRemaining ?? initialFuel,
    },
    observations,
    simulationMode: 'GAME',
  };
}

export interface GameManeuverOutcome {
  fuelUsed: number;
  fuelRemaining: number;
  probabilityOfCollision: number;
  missDistance: number;
  fuelUnit: 'game fuel points';
}

export type GameDecisionAction = 'WAIT' | 'NOMINAL MANEUVER' | 'OPTIMIZED MANEUVER' | 'EMERGENCY MANEUVER';
export type GameManeuverDirection = 'RADIAL' | 'ALONG_TRACK' | 'CROSS_TRACK';

export interface GameDecisionResult {
  accepted: boolean;
  feasible: boolean;
  deltaV: number;
  direction: GameManeuverDirection | null;
  outcome: GameManeuverOutcome | null;
  message: string;
}

export function simulateGameDecision(
  observation: OrbitalXObservation,
  action: GameDecisionAction,
): GameDecisionResult {
  const baseline = observation.fuelRemaining !== null
    && observation.probabilityOfCollision !== null
    && observation.missDistance !== null
    ? {
      fuelUsed: 0,
      fuelRemaining: observation.fuelRemaining,
      probabilityOfCollision: observation.probabilityOfCollision,
      missDistance: observation.missDistance,
      fuelUnit: 'game fuel points' as const,
    }
    : null;

  if (action === 'WAIT') {
    return {
      accepted: true,
      feasible: observation.maneuverFeasible === true,
      deltaV: 0,
      direction: null,
      outcome: baseline,
      message: 'You chose to wait. The encounter moves to the next step.',
    };
  }

  const requiredDeltaV = observation.requiredDeltaV ?? 0;
  const maxDeltaV = observation.maxDeltaV ?? 0;
  const direction: GameManeuverDirection = action === 'NOMINAL MANEUVER'
    ? 'RADIAL'
    : action === 'OPTIMIZED MANEUVER'
      ? 'ALONG_TRACK'
      : 'CROSS_TRACK';
  const deltaV = action === 'EMERGENCY MANEUVER'
    ? maxDeltaV
    : Math.min(maxDeltaV, requiredDeltaV * (action === 'NOMINAL MANEUVER' ? 1.25 : 1));
  const feasible = observation.maneuverFeasible === true
    && maxDeltaV > 0
    && requiredDeltaV > 0
    && deltaV >= requiredDeltaV
    && deltaV <= maxDeltaV;
  const outcome = feasible ? simulateGameManeuver(observation, deltaV, direction) : null;
  const accepted = feasible && outcome !== null;

  return {
    accepted,
    feasible,
    deltaV,
    direction,
    outcome,
    message: accepted
      ? `${action[0]}${action.slice(1).toLowerCase()} accepted. Estimated risk, distance, and fuel are updated.`
      : 'This step does not have enough maneuver margin. No burn was applied.',
  };
}

export function simulateGameManeuver(
  observation: OrbitalXObservation,
  deltaV: number,
  direction: GameManeuverDirection,
): GameManeuverOutcome | null {
  if (
    observation.maneuverFeasible !== true
    || observation.maxDeltaV === null
    || observation.maxDeltaV <= 0
    || observation.fuelRemaining === null
    || observation.probabilityOfCollision === null
    || observation.missDistance === null
    || !Number.isFinite(deltaV)
    || deltaV <= 0
  ) return null;

  const burnFraction = clamp(deltaV / observation.maxDeltaV, 0, 1);
  const directionEfficiency = direction === 'ALONG_TRACK' ? 1 : direction === 'RADIAL' ? 0.78 : 0.64;
  const fuelUsed = Math.min(observation.fuelRemaining, burnFraction * 12);
  const riskReduction = burnFraction * directionEfficiency * 0.72;
  const missDistanceGain = observation.missDistance * burnFraction * directionEfficiency * 0.45;

  return {
    fuelUsed,
    fuelRemaining: Math.max(0, observation.fuelRemaining - fuelUsed),
    probabilityOfCollision: Math.max(1e-10, observation.probabilityOfCollision * (1 - riskReduction)),
    missDistance: observation.missDistance + missDistanceGain,
    fuelUnit: 'game fuel points',
  };
}
