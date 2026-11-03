import type { OrbitalXObservation, OrbitalXScenario } from '../../services/api/orbitalx';
import { simulateGameManeuver, type GameManeuverOutcome } from './gameSimulation';

export type OrbitalXStatus = 'READY' | 'ACTIVE' | 'COMPLETED' | 'ERROR';
export type OrbitalXActionName = 'ACT NOW' | 'WAIT';
export type OrbitalXOutcome =
  | 'MISSION_PROTECTED_SIMULATED'
  | 'MANEUVER_OPPORTUNITY_LOST'
  | 'ENCOUNTER_COMPLETE_UNRESOLVED';

export interface OrbitalXActionRecord {
  action: OrbitalXActionName;
  timestep: number;
  accepted: boolean;
  maneuverFeasible: boolean | null;
  recommendations: OrbitalXObservation['recommendations'];
  simulatedOutcome: GameManeuverOutcome | null;
}

export interface OrbitalXGameState {
  selectedEventId: string;
  status: OrbitalXStatus;
  isProcessing: boolean;
  scenario: OrbitalXScenario | null;
  timestep: number;
  actions: OrbitalXActionRecord[];
  outcome: OrbitalXOutcome | null;
  feedback: string;
  error: string | null;
}

export type OrbitalXGameEvent =
  | { type: 'SELECT_EVENT'; eventId: string }
  | { type: 'START_REQUEST' }
  | { type: 'START_SUCCESS'; scenario: OrbitalXScenario }
  | { type: 'START_FAILURE'; message: string }
  | { type: 'RESTART' }
  | { type: 'PLAYER_ACTION'; action: OrbitalXActionName }
  | { type: 'PREDICTION_NEXT_TIMESTEP' }
  | { type: 'AI_HUMAN_NEXT_TIMESTEP'; nextTimestep: number }
  | { type: 'FINISH_MISSION' };

export const initialOrbitalXState: OrbitalXGameState = {
  selectedEventId: '',
  status: 'READY',
  isProcessing: false,
  scenario: null,
  timestep: 0,
  actions: [],
  outcome: null,
  feedback: 'Select a conjunction event, then start the mission.',
  error: null,
};

function finish(
  state: OrbitalXGameState,
  outcome: OrbitalXOutcome,
  feedback: string,
): OrbitalXGameState {
  return {
    ...state,
    status: 'COMPLETED',
    isProcessing: false,
    outcome,
    feedback,
  };
}

function recordAction(
  state: OrbitalXGameState,
  action: OrbitalXActionName,
  accepted: boolean,
): OrbitalXGameState {
  const observation = state.scenario?.observations[state.timestep];
  if (!observation) return state;

  const actionRecord: OrbitalXActionRecord = {
    action,
    timestep: state.timestep + 1,
    accepted,
    maneuverFeasible: observation.maneuverFeasible,
    recommendations: observation.recommendations,
    simulatedOutcome: action === 'ACT NOW' && accepted
      ? simulateGameManeuver(
        observation,
        Math.min(
          observation.maxDeltaV ?? 0,
          Math.max(observation.requiredDeltaV ?? 0, (observation.maxDeltaV ?? 0) * 0.55),
        ),
        'ALONG_TRACK',
      )
      : null,
  };

  return {
    ...state,
    actions: [...state.actions, actionRecord],
  };
}

function advance(state: OrbitalXGameState, action: OrbitalXActionName): OrbitalXGameState {
  if (state.status !== 'ACTIVE' || state.isProcessing || !state.scenario) return state;

  const observation = state.scenario.observations[state.timestep];
  if (!observation) return state;

  if (action === 'WAIT') {
    const next = recordAction(state, action, false);
    if (state.timestep === state.scenario.observations.length - 1) {
      if (observation.maneuverFeasible === false) {
        return finish(next, 'MANEUVER_OPPORTUNITY_LOST', 'The final simulated observation marks the maneuver infeasible. The opportunity is recorded as lost in the game.');
      }
      return finish(next, 'ENCOUNTER_COMPLETE_UNRESOLVED', 'The 20-step game encounter ended.');
    }

    return {
      ...next,
      timestep: state.timestep + 1,
      feedback: `Advanced to game step ${state.timestep + 2}/20. Simulated risk, fuel, and AI advice have updated.`,
    };
  }

  const accepted = observation.maneuverFeasible === true;
  const next = recordAction(state, action, accepted);
  if (accepted) {
    return finish(
      next,
      'MISSION_PROTECTED_SIMULATED',
      'The simulated game safety check permits this maneuver. Game-only risk and fuel estimates have been recorded; they are not real orbital calculations.',
    );
  }

  if (state.timestep === state.scenario.observations.length - 1) {
    if (observation.maneuverFeasible === false) {
      return finish(next, 'MANEUVER_OPPORTUNITY_LOST', 'The simulated safety layer rejected the maneuver at the final game step; no later opportunity remains.');
    }
    return finish(next, 'ENCOUNTER_COMPLETE_UNRESOLVED', 'The final observation has no feasibility result. The encounter ended without a supported maneuver outcome.');
  }

  return {
    ...next,
    timestep: state.timestep + 1,
    feedback: `The simulated safety check did not permit a maneuver at game step ${state.timestep + 1}. The game advances to step ${state.timestep + 2}/20.`,
  };
}

export function orbitalXReducer(state: OrbitalXGameState, event: OrbitalXGameEvent): OrbitalXGameState {
  switch (event.type) {
    case 'SELECT_EVENT':
      return state.status === 'ACTIVE' || state.isProcessing
        ? state
        : { ...initialOrbitalXState, selectedEventId: event.eventId };
    case 'START_REQUEST':
      return {
        ...state,
        status: 'READY',
        isProcessing: true,
        scenario: null,
        timestep: 0,
        actions: [],
        outcome: null,
        error: null,
        feedback: 'Preparing a locally simulated 20-step game scenario...',
      };
    case 'START_SUCCESS':
      return {
        ...state,
        status: 'ACTIVE',
        isProcessing: false,
        scenario: event.scenario,
        timestep: 0,
        actions: [],
        outcome: null,
        error: null,
        feedback: 'Mission started. Simulated risk, fuel, feasibility, and game-advisor values are ready.',
      };
    case 'START_FAILURE':
      return {
        ...state,
        status: 'ERROR',
        isProcessing: false,
        error: event.message,
        feedback: 'Mission could not start.',
      };
    case 'RESTART':
      return {
        ...initialOrbitalXState,
        selectedEventId: state.selectedEventId,
      };
    case 'PLAYER_ACTION':
      return advance(state, event.action);
    case 'PREDICTION_NEXT_TIMESTEP':
      if (state.status !== 'ACTIVE' || state.isProcessing || !state.scenario) return state;
      if (state.timestep >= state.scenario.observations.length - 1) {
        return finish(state, 'ENCOUNTER_COMPLETE_UNRESOLVED', 'The final dataset observation has been reached. No later timestep is available.');
      }
      if (state.timestep === state.scenario.observations.length - 2) {
        return finish(
          { ...state, timestep: state.timestep + 1 },
          'ENCOUNTER_COMPLETE_UNRESOLVED',
          'The final dataset observation has been reached. No later timestep is available.',
        );
      }
      return {
        ...state,
        timestep: state.timestep + 1,
        feedback: `Prediction round complete. Advanced to simulated game step ${state.timestep + 2}/20.`,
      };
    case 'AI_HUMAN_NEXT_TIMESTEP':
      if (state.status !== 'ACTIVE' || state.isProcessing || !state.scenario) return state;
      if (
        event.nextTimestep <= state.timestep
        || event.nextTimestep >= state.scenario.observations.length
      ) return state;
      return {
        ...state,
        timestep: event.nextTimestep,
        feedback: `AI vs Human assessment complete. Advanced to simulated game step ${event.nextTimestep + 1}/20.`,
      };
    case 'FINISH_MISSION':
      if (state.status !== 'ACTIVE' || state.isProcessing || !state.scenario) return state;
      return finish(
        state,
        'ENCOUNTER_COMPLETE_UNRESOLVED',
        'The player finished the game at the current simulated step.',
      );
    default:
      return state;
  }
}

export function getOutcomeLabel(outcome: OrbitalXOutcome | null): string {
  switch (outcome) {
    case 'MISSION_PROTECTED_SIMULATED':
      return 'Mission Protected (simulated game outcome)';
    case 'MANEUVER_OPPORTUNITY_LOST':
      return 'Maneuver Opportunity Lost';
    case 'ENCOUNTER_COMPLETE_UNRESOLVED':
      return 'Encounter Complete — Outcome Unavailable';
    default:
      return 'In progress';
  }
}
