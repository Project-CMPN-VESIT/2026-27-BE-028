import type { OrbitalXObservation } from '../../services/api/orbitalx';

export type WaitingRiskAnswer = 'SAFE_TO_WAIT' | 'RISK_MAY_INCREASE';
export type FuelSufficiencyAnswer = 'YES' | 'NO';
export type DecisionTimingAnswer = 'ACT_NOW' | 'WAIT_A_LITTLE' | 'WAIT_LONGER';
export type PredictionAnswer = WaitingRiskAnswer | FuelSufficiencyAnswer | DecisionTimingAnswer;
export type EvaluationStatus = 'CORRECT' | 'PARTIALLY_CORRECT' | 'INCORRECT' | 'UNCERTAIN';
export type PredictionQuestionId = 'waitingRisk' | 'fuelSufficiency' | 'decisionTiming';

export interface PredictionAnswers {
  waitingRisk: WaitingRiskAnswer | null;
  fuelSufficiency: FuelSufficiencyAnswer | null;
  decisionTiming: DecisionTimingAnswer | null;
}

export interface PredictionEvaluationItem {
  question: PredictionQuestionId;
  prompt: string;
  answer: PredictionAnswer;
  expected: PredictionAnswer | null;
  status: EvaluationStatus;
  pointsEarned: number;
  pointsPossible: number;
  explanation: string;
}

export interface PredictionRound {
  timestep: number;
  current: OrbitalXObservation;
  next: OrbitalXObservation;
  items: PredictionEvaluationItem[];
  pointsEarned: number;
  pointsPossible: number;
}

export interface PredictionSessionState {
  answers: PredictionAnswers;
  rounds: PredictionRound[];
  submitted: PredictionRound | null;
}

export type PredictionSessionEvent =
  | { type: 'ANSWER'; question: PredictionQuestionId; answer: PredictionAnswer }
  | { type: 'SUBMIT'; current: OrbitalXObservation; next: OrbitalXObservation }
  | { type: 'NEXT_TIMESTEP' }
  | { type: 'CLEAR_CURRENT' }
  | { type: 'RESET' };

export const initialPredictionAnswers: PredictionAnswers = {
  waitingRisk: null,
  fuelSufficiency: null,
  decisionTiming: null,
};

export const initialPredictionSession: PredictionSessionState = {
  answers: initialPredictionAnswers,
  rounds: [],
  submitted: null,
};

export function predictionSessionReducer(
  state: PredictionSessionState,
  event: PredictionSessionEvent,
): PredictionSessionState {
  switch (event.type) {
    case 'ANSWER':
      if (state.submitted) return state;
      return {
        ...state,
        answers: { ...state.answers, [event.question]: event.answer },
      };
    case 'SUBMIT': {
      if (state.submitted) return state;
      const submitted = evaluatePredictionRound(event.current, event.next, state.answers);
      return {
        ...state,
        rounds: [...state.rounds, submitted],
        submitted,
      };
    }
    case 'NEXT_TIMESTEP':
      return state.submitted
        ? { ...state, answers: initialPredictionAnswers, submitted: null }
        : state;
    case 'CLEAR_CURRENT':
      return { ...state, answers: initialPredictionAnswers, submitted: null };
    case 'RESET':
      return initialPredictionSession;
    default:
      return state;
  }
}

function isAvailable(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

function evaluateChoice(
  question: PredictionQuestionId,
  prompt: string,
  answer: PredictionAnswer,
  expected: PredictionAnswer | null,
  explanation: string,
  partialAnswers: PredictionAnswer[] = [],
): PredictionEvaluationItem {
  if (expected === null) {
    return {
      question,
      prompt,
      answer,
      expected: null,
      status: 'UNCERTAIN',
      pointsEarned: 0,
      pointsPossible: 1,
      explanation,
    };
  }

  if (answer === expected) {
    return {
      question,
      prompt,
      answer,
      expected,
      status: 'CORRECT',
      pointsEarned: 1,
      pointsPossible: 1,
      explanation,
    };
  }

  if (partialAnswers.includes(answer)) {
    return {
      question,
      prompt,
      answer,
      expected,
      status: 'PARTIALLY_CORRECT',
      pointsEarned: 0.5,
      pointsPossible: 1,
      explanation,
    };
  }

  return {
    question,
    prompt,
    answer,
    expected,
    status: 'INCORRECT',
    pointsEarned: 0,
    pointsPossible: 1,
    explanation,
  };
}

export function evaluatePredictionRound(
  current: OrbitalXObservation,
  next: OrbitalXObservation,
  answers: PredictionAnswers,
): PredictionRound {
  if (!answers.waitingRisk || !answers.fuelSufficiency || !answers.decisionTiming) {
    throw new Error('Answer all three prediction questions before submission.');
  }

  const currentPoc = current.probabilityOfCollision;
  const nextPoc = next.probabilityOfCollision;
  const riskIncreased = isAvailable(currentPoc) && isAvailable(nextPoc)
    ? nextPoc > currentPoc
    : null;
  const riskChangeIsKnown = riskIncreased !== null;
  const expectedRisk: WaitingRiskAnswer | null = riskIncreased === null
    ? null
    : riskIncreased ? 'RISK_MAY_INCREASE' : 'SAFE_TO_WAIT';
  const riskExplanation = riskIncreased === null
    ? 'The game could not compare risk because a simulated PoC value is missing.'
    : riskIncreased
      ? `The simulated PoC increased from ${current.probabilityOfCollision?.toExponential(2)} to ${next.probabilityOfCollision?.toExponential(2)} on the next game step.`
      : `The simulated PoC did not increase on this game step (${current.probabilityOfCollision?.toExponential(2)} to ${next.probabilityOfCollision?.toExponential(2)}).`;

  const expectedFuel: FuelSufficiencyAnswer | null = next.maneuverFeasible === null
    ? null
    : next.maneuverFeasible ? 'YES' : 'NO';
  const fuelExplanation = next.maneuverFeasible === null
    ? 'The game could not assess the next-step maneuver opportunity.'
    : `The next game step is ${next.maneuverFeasible ? 'feasible' : 'not feasible'} under the simulated fuel and Δv rules.`;

  let expectedTiming: DecisionTimingAnswer | null = null;
  let timingExplanation = 'The game rule could not select a timing answer from the simulated risk and feasibility values.';
  if (current.maneuverFeasible === true && next.maneuverFeasible === false) {
    expectedTiming = 'ACT_NOW';
    timingExplanation = 'The game marks the current step feasible and the next step infeasible. Acting before that simulated loss is the supported timing choice.';
  } else if (current.maneuverFeasible === true && next.maneuverFeasible === true && riskIncreased !== null) {
    expectedTiming = riskIncreased ? 'WAIT_A_LITTLE' : 'WAIT_LONGER';
    timingExplanation = riskIncreased
      ? 'The next game step remains feasible while PoC rises. Under the game rule, wait one step and reassess rather than waiting longer.'
      : 'The next game step remains feasible and PoC does not rise. Under the game rule, waiting longer is supported for this step.';
  }

  const partialTimingAnswers: DecisionTimingAnswer[] = expectedTiming === 'ACT_NOW'
    ? ['WAIT_A_LITTLE']
    : expectedTiming === 'WAIT_A_LITTLE'
      ? ['ACT_NOW', 'WAIT_LONGER']
      : expectedTiming === 'WAIT_LONGER'
      ? ['WAIT_A_LITTLE']
      : [];

  const items = [
    evaluateChoice(
      'waitingRisk',
      'What is likely to happen if we wait longer?',
      answers.waitingRisk,
      expectedRisk,
      riskExplanation,
    ),
    evaluateChoice(
      'fuelSufficiency',
      'Will sufficient fuel and maneuver capability remain if we act later?',
      answers.fuelSufficiency,
      expectedFuel,
      fuelExplanation,
    ),
    evaluateChoice(
      'decisionTiming',
      'What should the controller do at this stage?',
      answers.decisionTiming,
      expectedTiming,
      timingExplanation,
      partialTimingAnswers,
    ),
  ];

  return {
    timestep: current.datasetIndex + 1,
    current,
    next,
    items,
    pointsEarned: items.reduce((total, item) => total + item.pointsEarned, 0),
    pointsPossible: items.reduce((total, item) => total + item.pointsPossible, 0),
  };
}

export function summarizePredictionRounds(rounds: PredictionRound[]) {
  const items = rounds.flatMap((round) => round.items);
  const answered = items.length;
  const scoreEarned = rounds.reduce((total, round) => total + round.pointsEarned, 0);
  const scorePossible = rounds.reduce((total, round) => total + round.pointsPossible, 0);
  const scorable = items.filter((item) => item.status !== 'UNCERTAIN');
  const decisionItems = items.filter((item) => item.question === 'decisionTiming');
  const scorableDecisionItems = decisionItems.filter((item) => item.status !== 'UNCERTAIN');

  return {
    correct: items.filter((item) => item.status === 'CORRECT').length,
    answered,
    uncertain: items.filter((item) => item.status === 'UNCERTAIN').length,
    accuracyPct: scorable.length
      ? Math.round((scorable.reduce((total, item) => total + item.pointsEarned, 0) / scorable.length) * 100)
      : null,
    decisionTimingScore: scorableDecisionItems.length
      ? `${scorableDecisionItems.reduce((total, item) => total + item.pointsEarned, 0)}/${scorableDecisionItems.length}`
      : 'Unavailable',
    scoreEarned,
    scorePossible,
  };
}
