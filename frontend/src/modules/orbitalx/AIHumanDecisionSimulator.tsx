import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BrainCircuit, Shield, Target } from 'lucide-react';
import { OrbitalXScene } from '../../components/visualization/OrbitalXScene';
import { GlassPanel } from '../../components/ui/GlassPanel';
import type { OrbitalXObservation, OrbitalXScenario } from '../../services/api/orbitalx';
import {
  simulateGameDecision,
  type GameDecisionResult,
  type GameManeuverOutcome,
} from './gameSimulation';

export type HumanDecisionAction = 'WAIT' | 'NOMINAL MANEUVER' | 'OPTIMIZED MANEUVER' | 'EMERGENCY MANEUVER';

export interface HumanDecisionRecord {
  timestep: number;
  action: HumanDecisionAction;
  aiDecision: 'COMMIT' | 'WAIT' | null;
  aiVoteShare: number | null;
  maneuverFeasible: boolean | null;
  accepted: boolean;
  aiAccepted: boolean | null;
  poc: number | null;
  missDistance: number | null;
  playerOutcome: GameManeuverOutcome | null;
  aiOutcome: GameManeuverOutcome | null;
  deltaV: number;
  direction: 'RADIAL' | 'ALONG_TRACK' | 'CROSS_TRACK' | null;
  aiDeltaV: number;
  aiDirection: 'RADIAL' | 'ALONG_TRACK' | 'CROSS_TRACK' | null;
  finalStatus: string;
}

interface AIHumanDecisionSimulatorProps {
  scenario: OrbitalXScenario;
  currentTimestep: number;
  history: HumanDecisionRecord[];
  selectedTimestep: number;
  selectedAction: HumanDecisionAction;
  onConfigurationChange: (selection: { timestep: number; action: HumanDecisionAction }) => void;
  onRecord: (record: HumanDecisionRecord) => void;
  onAdvance: (nextTimestep: number) => void;
  onFinalize: () => void;
  onRetry: () => void;
  onReturnToMission: () => void;
}

const playerActions: Array<{ value: HumanDecisionAction; label: string; description: string }> = [
  { value: 'WAIT', label: 'WAIT', description: 'Move to the next step without using fuel.' },
  { value: 'NOMINAL MANEUVER', label: 'NOMINAL MANEUVER', description: 'Use a standard burn to move the satellite away from the path.' },
  { value: 'OPTIMIZED MANEUVER', label: 'OPTIMIZED MANEUVER', description: 'Use the smallest allowed burn along the most effective direction.' },
  { value: 'EMERGENCY MANEUVER', label: 'EMERGENCY MANEUVER', description: 'Use the largest allowed burn when the threat is urgent.' },
];

function ensembleDecision(observation: OrbitalXObservation): {
  decision: 'COMMIT' | 'WAIT' | null;
  voteShare: number | null;
  votes: number;
} {
  const available = observation.recommendations.filter(
    (item) => item.final === 'COMMIT' || item.final === 'WAIT',
  );
  if (!available.length) return { decision: null, voteShare: null, votes: 0 };
  const commits = available.filter((item) => item.final === 'COMMIT').length;
  const commitShare = commits / available.length;
  return {
    decision: commitShare >= 0.5 ? 'COMMIT' : 'WAIT',
    voteShare: Math.max(commitShare, 1 - commitShare),
    votes: available.length,
  };
}

function formatProbability(value: number | null): string {
  return value === null ? 'Unavailable' : value.toExponential(3);
}

function formatMetric(value: number | null, digits = 3): string {
  return value === null ? 'Unavailable' : value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function actionLabel(decision: 'COMMIT' | 'WAIT' | null): string {
  if (decision === 'COMMIT') return 'Act with a maneuver';
  if (decision === 'WAIT') return 'Wait and watch';
  return 'No suggestion';
}

function DecisionOutcome({
  title,
  action,
  recommended,
  feasible,
  poc,
  missDistance,
  outcome,
  accepted,
  deltaV,
  direction,
  finalStatus,
}: {
  title: string;
  action: string;
  recommended: boolean | null;
  feasible: boolean | null;
  poc: number | null;
  missDistance: number | null;
  outcome: GameManeuverOutcome | null;
  accepted: boolean | null;
  deltaV: number;
  direction: 'RADIAL' | 'ALONG_TRACK' | 'CROSS_TRACK' | null;
  finalStatus: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-slate-950/45 p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/55">{title}</div>
      <h4 className="mt-1 font-semibold text-white">{action}</h4>
      {recommended !== null ? <p className="mt-2 text-xs text-slate-300">AI recommendation match: {recommended ? 'Yes' : 'No'}</p> : null}
      {action !== 'WAIT' ? (
        <p className="mt-2 text-xs text-slate-300">
          Burn check: {feasible === null ? 'Unavailable' : feasible ? 'Passed' : 'Rejected'}
        </p>
      ) : null}
      {accepted !== null ? (
        <p className={`mt-1 text-xs ${accepted ? 'text-emerald-200' : 'text-rose-200'}`}>
          {accepted ? 'Decision accepted' : 'Maneuver rejected; no burn was used'}
        </p>
      ) : null}
      {action !== 'WAIT' ? (
        <p className="mt-1 text-xs text-slate-400">Burn plan: {deltaV.toFixed(3)} Δv · {direction?.replace('_', ' ').toLowerCase() ?? 'no direction'}</p>
      ) : null}
      <dl className="mt-3 space-y-1 border-t border-white/8 pt-3 text-xs">
        <div className="flex justify-between gap-2"><dt className="text-slate-500">Estimated PoC</dt><dd className="font-mono text-slate-200">{formatProbability(outcome?.probabilityOfCollision ?? poc)}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-slate-500">Estimated miss distance</dt><dd className="font-mono text-slate-200">{outcome ? `${formatMetric(outcome.missDistance, 2)} units` : missDistance === null ? 'Unavailable' : `${formatMetric(missDistance, 2)} units`}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-slate-500">Estimated fuel used / remaining</dt><dd className="text-slate-200">{outcome ? `${formatMetric(outcome.fuelUsed, 2)} / ${formatMetric(outcome.fuelRemaining, 1)} points` : 'Unavailable'}</dd></div>
      </dl>
      <p className="mt-3 text-[11px] text-slate-500">{finalStatus}</p>
    </div>
  );
}

export function AIHumanDecisionSimulator({
  scenario,
  currentTimestep,
  history,
  selectedTimestep,
  selectedAction,
  onConfigurationChange,
  onRecord,
  onAdvance,
  onFinalize,
  onRetry,
  onReturnToMission,
}: AIHumanDecisionSimulatorProps) {
  const [executionTimestep, setExecutionTimestep] = useState(selectedTimestep);
  const [action, setAction] = useState<HumanDecisionAction>(selectedAction);
  const [lastResult, setLastResult] = useState<HumanDecisionRecord | null>(null);

  useEffect(() => {
    const nextTimestep = Math.max(currentTimestep, selectedTimestep);
    setExecutionTimestep(nextTimestep);
    setLastResult(null);
    onConfigurationChange({ timestep: nextTimestep, action });
  }, [currentTimestep, scenario.event.id]);

  const selectedObservation = scenario.observations[executionTimestep] ?? null;
  const currentObservation = scenario.observations[currentTimestep] ?? null;
  const ai = useMemo(
    () => selectedObservation ? ensembleDecision(selectedObservation) : { decision: null, voteShare: null, votes: 0 },
    [selectedObservation],
  );
  const maneuverFeasible = selectedObservation?.maneuverFeasible ?? null;
  const canExecute = selectedObservation !== null;
  const latestRecord = lastResult
    ?? history.find((record) => record.timestep === executionTimestep + 1)
    ?? null;

  function executeDecision() {
    if (!selectedObservation || !canExecute || latestRecord) return;
    const humanResult: GameDecisionResult = simulateGameDecision(selectedObservation, action);
    const aiActs = ai.decision === 'COMMIT';
    const aiResult = simulateGameDecision(
      selectedObservation,
      aiActs ? 'OPTIMIZED MANEUVER' : 'WAIT',
    );
    const record: HumanDecisionRecord = {
      timestep: executionTimestep + 1,
      action,
      aiDecision: ai.decision,
      aiVoteShare: ai.voteShare,
      maneuverFeasible,
      accepted: humanResult.accepted,
      aiAccepted: aiActs ? aiResult.accepted : null,
      poc: selectedObservation.probabilityOfCollision,
      missDistance: selectedObservation.missDistance,
      playerOutcome: humanResult.outcome,
      aiOutcome: aiResult.outcome,
      deltaV: humanResult.deltaV,
      direction: humanResult.direction,
      aiDeltaV: aiResult.deltaV,
      aiDirection: aiResult.direction,
      finalStatus: humanResult.message,
    };
    setLastResult(record);
    onRecord(record);
  }

  const timingOptions = scenario.observations.slice(currentTimestep);

  return (
    <section className="space-y-5" aria-labelledby="ai-human-title">
      <GlassPanel className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/55">AI vs Human Decision Simulator · Event {scenario.event.id}</div>
            <h2 id="ai-human-title" className="mt-1 font-[Orbitron] text-xl text-white">{scenario.event.name}</h2>
            <p className="mt-1 text-xs text-slate-400">Current game step {currentTimestep + 1}/20 · Decision evaluation at {executionTimestep + 1}/20</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onRetry} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10">Retry Scenario</button>
            <button type="button" onClick={onReturnToMission} className="rounded-lg border border-cyan-300/20 bg-cyan-300/8 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-300/15">Return to Mission</button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">Your choice and the advisor’s choice are checked at the same step, using the same rules.</p>
      </GlassPanel>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <GlassPanel className="p-3 sm:p-4">
          <OrbitalXScene timestep={executionTimestep} eventName={scenario.event.name} />
        </GlassPanel>
        <GlassPanel className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/8 bg-slate-950/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Timestep</div>
              <div className="mt-1 font-[Orbitron] text-lg text-white">{executionTimestep + 1}/20</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-slate-950/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Maneuver check</div>
              <div className="mt-1 text-sm text-white">{maneuverFeasible === null ? 'Unavailable' : maneuverFeasible ? 'Feasible' : 'Infeasible'}</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-slate-950/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Time to close approach</div>
              <div className="mt-1 text-sm text-white">{formatMetric(selectedObservation?.timeToTca ?? null)} <span className="text-[10px] text-slate-500">steps</span></div>
            </div>
            <div className="rounded-xl border border-white/8 bg-slate-950/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Collision risk estimate</div>
              <div className="mt-1 text-sm text-white">{formatProbability(selectedObservation?.probabilityOfCollision ?? null)}</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-slate-950/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Fuel remaining</div>
              <div className="mt-1 text-sm text-white">{selectedObservation?.fuelRemaining === null || !selectedObservation ? 'Unavailable' : `${formatMetric(selectedObservation.fuelRemaining, 1)} points`}</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-slate-950/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Miss distance estimate</div>
              <div className="mt-1 text-sm text-white">{selectedObservation?.missDistance === null || !selectedObservation ? 'Unavailable' : `${formatMetric(selectedObservation.missDistance, 2)} units`}</div>
            </div>
          </div>
          <div className="rounded-lg border border-amber-300/15 bg-amber-300/5 p-3 text-xs leading-relaxed text-amber-100/80">
            <Shield className="mr-1 inline h-4 w-4 align-text-bottom" aria-hidden="true" />
            The maneuver check can reject a burn. The outcome numbers are estimates, not real satellite measurements.
          </div>
        </GlassPanel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <GlassPanel className="space-y-4 p-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/55">Human controller</div>
            <h3 className="mt-1 font-[Orbitron] text-lg text-white">Choose your decision</h3>
          </div>
          <label className="block text-xs font-semibold text-slate-200" htmlFor="ai-human-timing">
            Commitment timing
            <select
              id="ai-human-timing"
              value={executionTimestep}
              onChange={(event) => {
                const nextTimestep = Number(event.target.value);
                setExecutionTimestep(nextTimestep);
                onConfigurationChange({ timestep: nextTimestep, action });
                setLastResult(null);
              }}
              className="mt-2 w-full rounded-lg border border-white/12 bg-slate-950 px-3 py-2.5 text-sm font-normal text-slate-100"
            >
              {timingOptions.map((item) => (
                <option key={item.datasetIndex} value={item.datasetIndex}>
                  Step {item.datasetIndex + 1} · {item.maneuverFeasible === null ? 'check pending' : item.maneuverFeasible ? 'burn possible' : 'burn not possible'}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Human decision actions">
            {playerActions.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={action === item.value}
                title={item.description}
                onClick={() => {
                  setAction(item.value);
                  onConfigurationChange({ timestep: executionTimestep, action: item.value });
                  setLastResult(null);
                }}
                className={`min-h-16 rounded-xl border p-3 text-left disabled:cursor-not-allowed disabled:opacity-45 ${action === item.value ? 'border-cyan-200/45 bg-cyan-300/12 text-cyan-50' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}
              >
                <span className="block text-xs font-bold">{item.label}</span>
                <span className="mt-1 block text-[10px] leading-relaxed text-slate-400">{item.description}</span>
              </button>
            ))}
          </div>
          {action !== 'WAIT' && maneuverFeasible !== true ? (
            <p role="alert" className="flex gap-2 rounded-lg border border-rose-300/20 bg-rose-400/8 p-3 text-xs text-rose-100">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              A burn cannot be made at this step. Submit your choice to see it recorded as rejected, or choose WAIT.
            </p>
          ) : null}
          <button
            type="button"
            onClick={executeDecision}
            disabled={!canExecute || latestRecord !== null}
            className="w-full rounded-xl border border-cyan-200/45 bg-cyan-300/15 px-4 py-3 text-sm font-bold uppercase tracking-wider text-cyan-50 hover:bg-cyan-300/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {latestRecord ? 'Decision Recorded' : 'Execute Decision'}
          </button>
          {action === 'WAIT' && selectedObservation && executionTimestep > currentTimestep ? (
            <p className="text-xs text-slate-400">You are choosing to wait until step {executionTimestep + 1}.</p>
          ) : null}
        </GlassPanel>

        <GlassPanel className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-cyan-200" aria-hidden="true" />
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/55">Decision advisor</div>
              <h3 className="mt-1 font-[Orbitron] text-lg text-white">Advisor Recommendation</h3>
            </div>
          </div>
          <div className="rounded-xl border border-cyan-300/15 bg-slate-950/45 p-4">
            <div className="text-sm font-semibold text-cyan-100">{actionLabel(ai.decision)}</div>
            <p className="mt-2 text-xs text-slate-300">
              Advisors agree: {ai.voteShare === null ? 'Unavailable' : `${(ai.voteShare * 100).toFixed(1)}%`} {ai.votes ? `· ${ai.votes} opinions` : ''}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              This suggestion looks at whether risk is rising and whether a maneuver can still be made. It is guidance, not a guarantee.
            </p>
          </div>
          {selectedObservation?.recommendations.length ? (
            <ul className="space-y-2">
              {selectedObservation.recommendations.map((item) => (
                <li key={item.model} className="flex flex-wrap justify-between gap-2 rounded-lg border border-white/8 bg-slate-950/35 px-3 py-2 text-xs">
                  <span className="text-slate-200">{item.model}</span>
                <span className="text-cyan-100">{item.final === 'COMMIT' ? 'Act' : item.final === 'WAIT' ? 'Wait' : 'No suggestion'}</span>
                {item.reason ? <span className="basis-full text-slate-400">{item.reason}</span> : null}
              </li>
            ))}
            </ul>
          ) : <p className="text-sm text-slate-400">No advisor suggestion is available for this step.</p>}
          <p className="flex gap-2 text-xs text-slate-400">
            <Target className="h-4 w-4 shrink-0 text-cyan-200" aria-hidden="true" />
            Maneuver check: {maneuverFeasible === null ? 'Unavailable' : maneuverFeasible ? 'A burn can be made at this step' : 'A burn is not allowed at this step'}.
          </p>
        </GlassPanel>
      </div>

      {latestRecord ? (
        <GlassPanel className="space-y-4 p-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/55">Decision comparison · Observation {latestRecord.timestep}</div>
            <h3 className="mt-1 font-[Orbitron] text-lg text-white">Human versus AI</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <DecisionOutcome
              title="Your decision"
              action={latestRecord.action}
              recommended={latestRecord.aiDecision === null ? null : (latestRecord.action === 'WAIT') === (latestRecord.aiDecision === 'WAIT')}
              feasible={latestRecord.maneuverFeasible}
              poc={latestRecord.poc}
              missDistance={latestRecord.missDistance}
              outcome={latestRecord.playerOutcome}
              accepted={latestRecord.accepted}
              deltaV={latestRecord.deltaV}
              direction={latestRecord.direction}
              finalStatus={latestRecord.finalStatus}
            />
            <DecisionOutcome
              title="Advisor choice"
              action={actionLabel(latestRecord.aiDecision)}
              recommended={null}
              feasible={latestRecord.maneuverFeasible}
              poc={latestRecord.poc}
              missDistance={latestRecord.missDistance}
              outcome={latestRecord.aiOutcome}
              accepted={latestRecord.aiAccepted}
              deltaV={latestRecord.aiDeltaV}
              direction={latestRecord.aiDirection}
              finalStatus={latestRecord.aiDecision === 'COMMIT' && latestRecord.aiAccepted === false
                ? 'The safety check rejected the advisor maneuver; no burn was used.'
                : 'The advisor uses the same step and safety check as your decision.'}
            />
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            Compare the risk and fuel estimates. The better choice can change from one step to the next.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
            <p className="text-xs text-slate-500">Decision history: {history.length} recorded {history.length === 1 ? 'decision' : 'decisions'} for this mission.</p>
            {executionTimestep < scenario.observations.length - 1 ? (
              <button type="button" onClick={() => onAdvance(executionTimestep + 1)} disabled={!latestRecord || executionTimestep < currentTimestep} className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-40">
                Continue to Next Timestep
              </button>
            ) : (
              <>
                <span className="text-xs text-amber-100/75">Final selected game step · no later timestep is available.</span>
                <button type="button" onClick={onFinalize} disabled={!latestRecord} className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-40">
                  Finish Mission & Save Report
                </button>
              </>
            )}
          </div>
        </GlassPanel>
      ) : null}
      {history.length ? (
        <GlassPanel className="space-y-3 p-5">
          <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/55">Mission decision history</div>
          <ol className="space-y-2">
            {history.map((item, index) => (
              <li key={`${item.timestep}-${index}`} className="rounded-lg border border-white/8 bg-slate-950/35 px-3 py-2 text-xs text-slate-300">
                Step {item.timestep}: {item.action} · AI {item.aiDecision ?? 'Unavailable'} · {item.accepted ? 'accepted for assessment' : 'rejected'} · PoC {formatProbability(item.poc)}
              </li>
            ))}
          </ol>
        </GlassPanel>
      ) : null}
    </section>
  );
}
