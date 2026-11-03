import type { PredictionRound } from './predictionMode';
import type { OrbitalXActionRecord, OrbitalXOutcome } from './orbitalxGame';
import type { HumanDecisionRecord } from './AIHumanDecisionSimulator';
import type { ManeuverDirection, ManeuverSimulationResult } from './maneuverSimulator';

const HISTORY_STORAGE_KEY = 'orbitalx.completedMissions.v1';

export interface ManeuverAssessmentSnapshot {
  timestep: number;
  deltaV: number | null;
  direction: ManeuverDirection;
  feasible: boolean | null;
  scoreEarned: number | null;
  scorePossible: number | null;
  observedPocChange: number | null;
  observedMissDistanceChange: number | null;
  estimatedFuelUse: number | null;
  estimatedFuelRemaining: number | null;
  estimatedPostManeuverPoc: number | null;
  estimatedPostManeuverMissDistance: number | null;
  message: string;
}

export interface MissionCategoryScore {
  category: 'Prediction' | 'Advanced Maneuver' | 'AI vs Human';
  score: number | null;
  detail: string;
}

export interface OrbitalXMissionReport {
  missionId: string;
  eventId: string;
  eventName: string;
  startedAt: string;
  completedAt: string;
  status: string;
  outcome: OrbitalXOutcome | null;
  finalTimestep: number;
  decisions: OrbitalXActionRecord[];
  predictionRounds: PredictionRound[];
  maneuver: ManeuverAssessmentSnapshot | null;
  aiHumanDecisions: HumanDecisionRecord[];
  categoryScores: MissionCategoryScore[];
  totalScore: number | null;
  finalObservation: {
    timestep: number;
    timeToTca: number | null;
    probabilityOfCollision: number | null;
    missDistance: number | null;
    fuelRemaining: number | null;
    maneuverFeasible: boolean | null;
  };
  limitations: string[];
}

export function makeManeuverSnapshot(
  result: ManeuverSimulationResult,
  configuration: { executionTimestep: number; deltaV: number | null; direction: ManeuverDirection },
): ManeuverAssessmentSnapshot {
  return {
    timestep: configuration.executionTimestep + 1,
    deltaV: configuration.deltaV,
    direction: configuration.direction,
    feasible: result.feasible,
    scoreEarned: result.score?.earned ?? null,
    scorePossible: result.score?.possible ?? null,
    observedPocChange: result.observedPocChange,
    observedMissDistanceChange: result.observedMissDistanceChange,
    estimatedFuelUse: result.fuelUse,
    estimatedFuelRemaining: result.remainingFuelAfter,
    estimatedPostManeuverPoc: result.maneuverPoc,
    estimatedPostManeuverMissDistance: result.maneuverMissDistance,
    message: result.validationMessages.join(' '),
  };
}

export function calculateMissionScores(
  predictionRounds: PredictionRound[],
  maneuver: ManeuverAssessmentSnapshot | null,
): { categoryScores: MissionCategoryScore[]; totalScore: number | null } {
  const predictionItems = predictionRounds.flatMap((round) => round.items);
  const scorablePredictionItems = predictionItems.filter((item) => item.status !== 'UNCERTAIN');
  const predictionScore = scorablePredictionItems.length
    ? Math.round(
      (scorablePredictionItems.reduce((sum, item) => sum + item.pointsEarned, 0)
        / scorablePredictionItems.length) * 100,
    )
    : null;

  const maneuverScore = maneuver?.feasible === true
    && maneuver.scoreEarned !== null
    && maneuver.scorePossible !== null
    && maneuver.scorePossible > 0
    ? Math.round((maneuver.scoreEarned / maneuver.scorePossible) * 100)
    : maneuver?.feasible === false ? 0 : null;

  const categoryScores: MissionCategoryScore[] = [
    {
      category: 'Prediction',
      score: predictionScore,
      detail: predictionScore === null
        ? 'Unavailable until at least one answer is evaluated against the next simulated game step.'
        : `${scorablePredictionItems.length} evaluable answers compared with the next simulated game step; uncertain questions excluded and partial credit retained.`,
    },
    {
      category: 'Advanced Maneuver',
      score: maneuverScore,
      detail: maneuverScore === null
        ? 'Unavailable until a maneuver is simulated; an infeasible maneuver scores zero.'
        : 'Normalized from game feasibility and timing. Estimated fuel use and post-burn risk are shown separately, but are not scored as physical outcomes.',
    },
    {
      category: 'AI vs Human',
      score: null,
      detail: 'Not scored: both choices use the same game estimates, so there is no independent ground truth to fairly grade the player or advisor.',
    },
  ];
  const availableScores = categoryScores
    .map((item) => item.score)
    .filter((score): score is number => score !== null);
  const totalScore = availableScores.length
    ? Math.round(availableScores.reduce((sum, score) => sum + score, 0) / availableScores.length)
    : null;

  return { categoryScores, totalScore };
}

export function readMissionHistory(): OrbitalXMissionReport[] {
  const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Stored OrbitalX history has an unexpected format.');
  return parsed.filter((item): item is OrbitalXMissionReport => (
    typeof item === 'object'
    && item !== null
    && typeof (item as OrbitalXMissionReport).missionId === 'string'
    && typeof (item as OrbitalXMissionReport).eventId === 'string'
    && Array.isArray((item as OrbitalXMissionReport).categoryScores)
  ));
}

export function saveMissionReport(report: OrbitalXMissionReport): void {
  const history = readMissionHistory().filter((saved) => saved.missionId !== report.missionId);
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([report, ...history].slice(0, 50)));
}
