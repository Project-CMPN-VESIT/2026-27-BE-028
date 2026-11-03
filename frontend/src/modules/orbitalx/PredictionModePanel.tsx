import { AlertTriangle, ArrowRight, CheckCircle2, CircleHelp, RotateCcw, Target } from 'lucide-react';
import type { OrbitalXObservation, OrbitalXScenario } from '../../services/api/orbitalx';
import {
  summarizePredictionRounds,
  type DecisionTimingAnswer,
  type EvaluationStatus,
  type FuelSufficiencyAnswer,
  type PredictionAnswers,
  type PredictionQuestionId,
  type PredictionRound,
  type PredictionSessionState,
  type WaitingRiskAnswer,
} from './predictionMode';

interface PredictionModePanelProps {
  session: PredictionSessionState;
  current: OrbitalXObservation;
  next: OrbitalXObservation | null;
  scenario: OrbitalXScenario;
  timestep: number;
  onAnswer: (question: PredictionQuestionId, answer: PredictionAnswers[PredictionQuestionId]) => void;
  onSubmit: () => void;
  onNextTimestep: () => void;
  onRetry: () => void;
  onNextScenario: () => void;
  hasNextScenario: boolean;
}

const questionOptions: Array<{
  id: PredictionQuestionId;
  prompt: string;
  options: Array<{ value: WaitingRiskAnswer | FuelSufficiencyAnswer | DecisionTimingAnswer; label: string }>;
}> = [
  {
    id: 'waitingRisk',
    prompt: 'What is likely to happen if we wait longer?',
    options: [
      { value: 'SAFE_TO_WAIT', label: 'Safe to wait' },
      { value: 'RISK_MAY_INCREASE', label: 'Risk may increase' },
    ],
  },
  {
    id: 'fuelSufficiency',
    prompt: 'Will sufficient fuel and maneuver capability remain if we act later?',
    options: [
      { value: 'YES', label: 'Yes' },
      { value: 'NO', label: 'No' },
    ],
  },
  {
    id: 'decisionTiming',
    prompt: 'What should the controller do at this stage?',
    options: [
      { value: 'ACT_NOW', label: 'Act now' },
      { value: 'WAIT_A_LITTLE', label: 'Wait a little' },
      { value: 'WAIT_LONGER', label: 'Wait longer' },
    ],
  },
];

function numberChange(current: number | null, next: number | null, digits = 3): string {
  if (current === null || next === null) return 'Unavailable';
  const difference = next - current;
  const sign = difference > 0 ? '+' : '';
  return `${sign}${difference.toFixed(digits)} (${current.toFixed(digits)} → ${next.toFixed(digits)})`;
}

function probabilityChange(current: number | null, next: number | null): string {
  if (current === null || next === null) return 'Unavailable';
  const difference = next - current;
  const sign = difference > 0 ? '+' : '';
  return `${sign}${difference.toExponential(3)} (${current.toExponential(3)} → ${next.toExponential(3)})`;
}

function observationChange(
  current: number | null,
  next: number | null,
  digits: number,
  suffix = '',
): string {
  const change = numberChange(current, next, digits);
  return change === 'Unavailable' || !suffix ? change : `${change}${suffix}`;
}

function statusStyle(status: EvaluationStatus): string {
  switch (status) {
    case 'CORRECT':
      return 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100';
    case 'PARTIALLY_CORRECT':
      return 'border-amber-300/25 bg-amber-400/10 text-amber-100';
    case 'INCORRECT':
      return 'border-rose-300/25 bg-rose-400/10 text-rose-100';
    case 'UNCERTAIN':
      return 'border-slate-300/20 bg-white/5 text-slate-300';
  }
}

function formatAnswer(answer: PredictionRound['items'][number]['answer'] | null): string {
  switch (answer) {
    case 'SAFE_TO_WAIT':
      return 'Safe to wait';
    case 'RISK_MAY_INCREASE':
      return 'Risk may increase';
    case 'YES':
      return 'Yes';
    case 'NO':
      return 'No';
    case 'ACT_NOW':
      return 'Act now';
    case 'WAIT_A_LITTLE':
      return 'Wait a little';
    case 'WAIT_LONGER':
      return 'Wait longer';
    default:
      return 'Not answered';
  }
}

function ChangeSummary({
  current,
  next,
}: {
  current: OrbitalXObservation;
  next: OrbitalXObservation;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-lg border border-white/8 bg-slate-950/45 p-3">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">PoC change · scientific notation</div>
        <div className="mt-1 break-words font-mono text-xs text-slate-200">{probabilityChange(current.probabilityOfCollision, next.probabilityOfCollision)}</div>
      </div>
      <div className="rounded-lg border border-white/8 bg-slate-950/45 p-3">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">Game TCA change</div>
        <div className="mt-1 text-xs text-slate-200">{numberChange(current.timeToTca, next.timeToTca, 2)}</div>
      </div>
      <div className="rounded-lg border border-white/8 bg-slate-950/45 p-3">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">Game fuel change</div>
        <div className="mt-1 text-xs text-slate-200">{observationChange(current.fuelRemaining, next.fuelRemaining, 2, '%')}</div>
      </div>
      <div className="rounded-lg border border-white/8 bg-slate-950/45 p-3">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">Maneuver opportunity</div>
        <div className="mt-1 text-xs text-slate-200">
          {current.maneuverFeasible === null || next.maneuverFeasible === null
            ? 'Unavailable'
            : `${current.maneuverFeasible ? 'Feasible' : 'Not feasible'} → ${next.maneuverFeasible ? 'Feasible' : 'Not feasible'}`}
        </div>
      </div>
    </div>
  );
}

function RoundFeedback({ round }: { round: PredictionRound }) {
  return (
    <div className="space-y-3 rounded-xl border border-cyan-300/15 bg-slate-950/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Observation {round.timestep} · Prediction feedback</h3>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200">
          {round.pointsEarned}/{round.pointsPossible} points
        </span>
      </div>
      <ChangeSummary current={round.current} next={round.next} />
      <div className="space-y-2">
        {round.items.map((item) => (
          <div key={item.question} className="rounded-lg border border-white/8 bg-black/15 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-100">{item.prompt}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyle(item.status)}`}>
                {item.status.replace('_', ' ')} · {item.pointsEarned}/{item.pointsPossible}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Your answer: <strong className="text-slate-200">{formatAnswer(item.answer)}</strong>
              {item.expected ? <> · Evaluation: <strong className="text-cyan-100">{formatAnswer(item.expected)}</strong></> : ' · Evaluation: uncertain'}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.explanation}</p>
          </div>
        ))}
      </div>
      <p className="flex items-start gap-2 text-xs leading-relaxed text-amber-100/70">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        This round compares adjacent simulated game steps. Values are fictional and are not real-world forecasts.
      </p>
      {round.items.some((item) => item.status === 'INCORRECT' || item.status === 'PARTIALLY_CORRECT') ? (
        <p className="rounded-lg border border-amber-300/15 bg-amber-300/5 p-3 text-xs leading-relaxed text-amber-100/80">
          What you may have missed: {round.items
            .filter((item) => item.status === 'INCORRECT' || item.status === 'PARTIALLY_CORRECT')
            .map((item) => item.question === 'waitingRisk'
              ? 'the observed direction of PoC change'
              : item.question === 'fuelSufficiency'
                ? 'the next game step’s simulated maneuver-feasibility result'
                : 'whether feasibility was about to be lost or the observed risk trend supported waiting')
            .join('; ')}.
        </p>
      ) : null}
    </div>
  );
}

function PredictionReport({
  rounds,
  timestep,
  scenario,
  onRetry,
  onNextScenario,
  hasNextScenario,
}: {
  rounds: PredictionRound[];
  timestep: number;
  scenario: OrbitalXScenario;
  onRetry: () => void;
  onNextScenario: () => void;
  hasNextScenario: boolean;
}) {
  const summary = summarizePredictionRounds(rounds);

  return (
    <section className="space-y-4 rounded-2xl border border-cyan-300/20 bg-slate-950/45 p-4 sm:p-5" aria-labelledby="prediction-report-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/55">Prediction Report · {scenario.event.id}</div>
          <h2 id="prediction-report-title" className="mt-1 font-[Orbitron] text-xl text-white">Scenario complete · {timestep}/20 observations</h2>
        </div>
        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/8 px-3 py-1 text-xs text-cyan-100">Dataset replay complete</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-white/8 bg-black/15 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Correct predictions</div>
          <div className="mt-1 font-[Orbitron] text-lg text-white">{summary.correct}/{summary.answered}</div>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/15 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Prediction accuracy</div>
          <div className="mt-1 font-[Orbitron] text-lg text-white">{summary.accuracyPct === null ? 'Unavailable' : `${summary.accuracyPct}%`}</div>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/15 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Decision timing score</div>
          <div className="mt-1 font-[Orbitron] text-lg text-white">{summary.decisionTimingScore}</div>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/15 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Total score</div>
          <div className="mt-1 font-[Orbitron] text-lg text-white">{summary.scoreEarned}/{summary.scorePossible}</div>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/15 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Uncertain questions</div>
          <div className="mt-1 font-[Orbitron] text-lg text-white">{summary.uncertain}</div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Timestep-by-timestep report</h3>
        {rounds.length ? (
          rounds.map((round) => (
            <div key={round.timestep} className="space-y-2 rounded-xl border border-white/8 bg-black/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-semibold text-slate-100">Observation {round.timestep} → {round.timestep + 1}</h4>
                <span className="text-xs text-cyan-100">{round.pointsEarned}/{round.pointsPossible} points</span>
              </div>
              <ChangeSummary current={round.current} next={round.next} />
              {round.items.map((item) => (
                <p key={item.question} className="text-xs text-slate-400">
                  <span className="text-slate-200">{item.prompt}</span> — {formatAnswer(item.answer)} · {item.status.replace('_', ' ')}. {item.explanation}
                </p>
              ))}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400">No prediction rounds were completed before the final observation.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3 border-t border-white/8 pt-4">
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Retry Scenario
        </button>
        <button type="button" onClick={onNextScenario} disabled={!hasNextScenario} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40">
          Next Scenario
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

export function PredictionModePanel({
  session,
  current,
  next,
  scenario,
  timestep,
  onAnswer,
  onSubmit,
  onNextTimestep,
  onRetry,
  onNextScenario,
  hasNextScenario,
}: PredictionModePanelProps) {
  const summary = summarizePredictionRounds(session.rounds);
  const progress = (timestep / scenario.observations.length) * 100;
  const atTerminalTimestep = timestep === scenario.observations.length;
  const canSubmit = Boolean(
    next
    && !session.submitted
    && session.answers.waitingRisk
    && session.answers.fuelSufficiency
    && session.answers.decisionTiming,
  );

  if (atTerminalTimestep) {
    return (
      <PredictionReport
        rounds={session.rounds}
        timestep={timestep}
        scenario={scenario}
        onRetry={onRetry}
        onNextScenario={onNextScenario}
        hasNextScenario={hasNextScenario}
      />
    );
  }

  return (
    <section className="space-y-4" aria-labelledby="prediction-mode-title">
      <div className="rounded-xl border border-cyan-300/15 bg-slate-950/45 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/55">Prediction Mode · Event {scenario.event.id}</div>
            <h2 id="prediction-mode-title" className="mt-1 font-[Orbitron] text-lg text-white">{scenario.event.name}</h2>
            <p className="mt-1 text-xs text-slate-400">Game step {timestep}/20 · Predict the next simulated step before revealing it</p>
          </div>
          <div className="text-right text-xs text-slate-400">
            <div>Score: <strong className="text-cyan-100">{summary.scoreEarned}/{summary.scorePossible}</strong></div>
            <div>Accuracy: <strong className="text-cyan-100">{summary.accuracyPct === null ? '—' : `${summary.accuracyPct}%`}</strong></div>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8" role="progressbar" aria-label="Prediction scenario progress" aria-valuemin={1} aria-valuemax={scenario.observations.length} aria-valuenow={timestep}>
          <div className="h-full rounded-full bg-cyan-300 transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-white/8 bg-black/15 px-3 py-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">Game TCA</span>
            <strong className="mt-1 block text-sm text-slate-100">{current.timeToTca ?? 'Unavailable'} <span className="text-xs font-normal text-slate-500">simulated units</span></strong>
          </div>
          <div className="rounded-lg border border-white/8 bg-black/15 px-3 py-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">Current PoC</span>
            <strong className="mt-1 block text-sm text-slate-100">{current.probabilityOfCollision === null ? 'Unavailable' : current.probabilityOfCollision.toExponential(3)}</strong>
          </div>
          <div className="rounded-lg border border-white/8 bg-black/15 px-3 py-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">Game fuel remaining</span>
            <strong className="mt-1 block text-sm text-slate-100">{current.fuelRemaining === null ? 'Unavailable' : `${current.fuelRemaining} game points`}</strong>
          </div>
        </div>
      </div>

      {!session.submitted ? (
        <div className="space-y-3">
          {questionOptions.map((question) => (
            <fieldset key={question.id} className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
              <legend className="px-1 text-sm font-semibold text-slate-100">{question.prompt}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {question.options.map((option) => {
                  const selected = session.answers[question.id] === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onAnswer(question.id, option.value)}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium ${selected ? 'border-cyan-200/60 bg-cyan-300/15 text-cyan-50' : 'border-white/10 bg-white/5 text-slate-300 hover:border-cyan-200/30 hover:text-white'}`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <CircleHelp className="h-4 w-4" aria-hidden="true" />
              All values are simulated for this game; next-step results stay hidden until submission.
            </p>
            <button type="button" disabled={!canSubmit} onClick={onSubmit} className="rounded-xl border border-cyan-200/45 bg-cyan-300/15 px-5 py-3 text-sm font-bold uppercase tracking-wider text-cyan-50 hover:bg-cyan-300/25 disabled:cursor-not-allowed disabled:opacity-40">
              Submit Predictions
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <RoundFeedback round={session.submitted} />
          {next ? (
            <button type="button" onClick={onNextTimestep} className="inline-flex items-center gap-2 rounded-xl border border-cyan-200/45 bg-cyan-300/15 px-5 py-3 text-sm font-bold uppercase tracking-wider text-cyan-50 hover:bg-cyan-300/25">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Next Timestep
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
          <div className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
            <Target className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Scoring: each evaluable question is worth 1 point. A cautious but mistimed decision can earn 0.5 timing points; unavailable evidence is marked uncertain and excluded from accuracy.
          </div>
        </div>
      )}

      {session.rounds.length > 0 && !session.submitted ? (
        <div className="rounded-xl border border-white/8 bg-slate-950/35 p-3 text-xs text-slate-400">
          <CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-300" aria-hidden="true" />
          {session.rounds.length} prediction round{session.rounds.length === 1 ? '' : 's'} recorded. Accuracy {summary.accuracyPct === null ? 'unavailable' : `${summary.accuracyPct}%`}.
        </div>
      ) : null}
    </section>
  );
}
