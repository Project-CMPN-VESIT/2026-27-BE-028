import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, RotateCcw, Shield, Target } from 'lucide-react';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { OrbitalXScene } from '../../components/visualization/OrbitalXScene';
import type { OrbitalXModelRecommendation, OrbitalXObservation, OrbitalXScenario } from '../../services/api/orbitalx';
import {
  getDirectionDescription,
  getLastFeasibleTimestep,
  simulateManeuverDecision,
  type ManeuverDirection,
  type ManeuverSimulationResult,
} from './maneuverSimulator';
import type { ManeuverAssessmentSnapshot } from './missionReport';
import { simulateGameManeuver, type GameManeuverOutcome } from './gameSimulation';

interface AdvancedManeuverSimulatorProps {
  scenario: OrbitalXScenario;
  currentTimestep: number;
  selectedExecutionTimestep: number;
  selectedDirection: ManeuverDirection;
  selectedDeltaV: number | null;
  previousAssessment: ManeuverAssessmentSnapshot | null;
  onConfigurationChange: (configuration: { executionTimestep: number; direction: ManeuverDirection; deltaV: number | null }) => void;
  onAssessment: (
    result: ManeuverSimulationResult | null,
    configuration: { executionTimestep: number; direction: ManeuverDirection; deltaV: number | null } | null,
  ) => void;
  onReturnToMission: () => void;
  onRetry: () => void;
}

const directionOptions: Array<{ value: ManeuverDirection; label: string }> = [
  { value: 'RADIAL', label: 'Radial' },
  { value: 'ALONG_TRACK', label: 'Along-track' },
  { value: 'CROSS_TRACK', label: 'Cross-track' },
];

function formatValue(value: number | null, digits = 3): string {
  return value === null ? 'Unavailable' : value.toFixed(digits);
}

function formatChange(value: number | null, digits = 5): string {
  if (value === null) return 'Unavailable';
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;
}

function formatProbabilityChange(value: number | null): string {
  if (value === null) return 'Unavailable';
  return `${value > 0 ? '+' : ''}${value.toExponential(3)}`;
}

function formatScientific(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value)
    ? 'Unavailable'
    : value.toExponential(3);
}

function formatMetric(value: number | null | undefined, digits = 4): string {
  return value === null || value === undefined || !Number.isFinite(value)
    ? 'Unavailable'
    : value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function currentModelDecision(recommendations: OrbitalXModelRecommendation[]): string {
  if (!recommendations.length) return 'Unavailable';
  const commits = recommendations.filter((recommendation) => recommendation.final === 'COMMIT').length;
  const waits = recommendations.filter((recommendation) => recommendation.final === 'WAIT').length;
  return `${commits} COMMIT · ${waits} WAIT game advisors`;
}

function gameAdvisorOutcome(observation: OrbitalXObservation): {
  decision: 'COMMIT' | 'WAIT' | null;
  outcome: GameManeuverOutcome | null;
  feasible: boolean | null;
} {
  const recommendations = observation.recommendations.filter(
    (recommendation) => recommendation.final === 'COMMIT' || recommendation.final === 'WAIT',
  );
  if (!recommendations.length) return { decision: null, outcome: null, feasible: observation.maneuverFeasible };

  const commits = recommendations.filter((recommendation) => recommendation.final === 'COMMIT').length;
  const decision = commits / recommendations.length >= 0.5 ? 'COMMIT' : 'WAIT';
  const unchanged: GameManeuverOutcome | null = observation.fuelRemaining !== null
    && observation.probabilityOfCollision !== null
    && observation.missDistance !== null
    ? {
      fuelUsed: 0,
      fuelRemaining: observation.fuelRemaining,
      probabilityOfCollision: observation.probabilityOfCollision,
      missDistance: observation.missDistance,
      fuelUnit: 'game fuel points',
    }
    : null;
  const requiredDeltaV = observation.requiredDeltaV ?? 0;
  const maxDeltaV = observation.maxDeltaV ?? 0;
  const deltaV = Math.min(maxDeltaV, Math.max(requiredDeltaV, maxDeltaV * 0.55));
  const outcome = decision === 'COMMIT' && observation.maneuverFeasible === true
    ? simulateGameManeuver(observation, deltaV, 'ALONG_TRACK')
    : unchanged;

  return { decision, outcome, feasible: observation.maneuverFeasible };
}

function ManeuverResult({
  result,
  executionTimestep,
  deltaV,
  direction,
}: {
  result: ManeuverSimulationResult;
  executionTimestep: number;
  deltaV: number | null;
  direction: ManeuverDirection;
}) {
  return (
    <GlassPanel className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/55">Game simulation result</div>
          <h2 className="mt-1 font-[Orbitron] text-lg text-white">Player strategy assessment</h2>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${result.feasible === true ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100' : result.feasible === false ? 'border-rose-300/25 bg-rose-400/10 text-rose-100' : 'border-amber-300/25 bg-amber-400/10 text-amber-100'}`}>
          {result.feasible === true ? 'Game checks passed' : result.feasible === false ? 'Checks failed' : 'Feasibility unavailable'}
        </span>
      </div>

      <p className="text-sm text-slate-300">
        Timestep {executionTimestep + 1} · Δv {formatValue(deltaV)} game units · {direction.replace('_', ' ').toLowerCase()}
      </p>
      <ul className="space-y-1 text-sm text-slate-300">
        {result.validationMessages.map((message) => <li key={message}>{message}</li>)}
      </ul>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-white/8 bg-slate-950/45 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Simulated fuel consumed</div>
          <div className="mt-1 text-sm text-slate-100">{formatMetric(result.fuelUse, 2)} game fuel points</div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Simplified game rule, not propellant mass or a real engine calculation.</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-slate-950/45 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Simulated fuel remaining</div>
          <div className="mt-1 text-sm text-slate-100">{formatMetric(result.remainingFuelAfter, 2)} game fuel points</div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Current game fuel minus the simulated game burn.</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-slate-950/45 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Simulated post-maneuver PoC</div>
          <div className="mt-1 font-mono text-sm text-slate-100">{formatScientific(result.maneuverPoc)}</div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Estimated by the game formula; not a backend prediction.</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-slate-950/45 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Simulated miss distance</div>
          <div className="mt-1 text-sm text-slate-100">{formatMetric(result.maneuverMissDistance, 3)} game distance units</div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Estimated by the game formula; no real orbit is propagated.</p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-300/15 bg-amber-300/5 p-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-amber-100/70">Observed scenario trend · not maneuver effect</div>
        <p className="mt-1 text-sm text-slate-200">
          Game PoC trend while advancing to selected observation: {formatProbabilityChange(result.observedPocChange)} ·
          {' '}game miss-distance trend: {formatChange(result.observedMissDistanceChange, 3)}.
        </p>
      </div>

      {result.score ? (
        <div className="rounded-xl border border-cyan-300/15 bg-slate-950/45 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Strategy score</h3>
            <span className="font-[Orbitron] text-lg text-white">{result.score.earned}/{result.score.possible}</span>
          </div>
          <ul className="mt-2 space-y-1 text-xs text-slate-400">
            {result.score.explanation.map((explanation) => <li key={explanation}>{explanation}</li>)}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-amber-100/75">Score unavailable until the backend feasibility and maneuver requirements can be verified.</p>
      )}
    </GlassPanel>
  );
}

export function AdvancedManeuverSimulator({
  scenario,
  currentTimestep,
  selectedExecutionTimestep,
  selectedDirection,
  selectedDeltaV,
  previousAssessment,
  onConfigurationChange,
  onAssessment,
  onReturnToMission,
  onRetry,
}: AdvancedManeuverSimulatorProps) {
  const firstFeasible = useMemo(
    () => scenario.observations.find((observation) => observation.datasetIndex >= currentTimestep && observation.maneuverFeasible === true)?.datasetIndex,
    [scenario, currentTimestep],
  );
  const [executionTimestep, setExecutionTimestep] = useState(selectedExecutionTimestep);
  const [direction, setDirection] = useState<ManeuverDirection>(selectedDirection);
  const [deltaV, setDeltaV] = useState<number | null>(selectedDeltaV);
  const [result, setResult] = useState<ManeuverSimulationResult | null>(null);

  useEffect(() => {
    const selectedIsFeasible = scenario.observations[selectedExecutionTimestep]?.maneuverFeasible === true;
    const nextExecution = selectedIsFeasible && selectedExecutionTimestep >= currentTimestep
      ? selectedExecutionTimestep
      : Math.max(currentTimestep, firstFeasible ?? currentTimestep);
    const maxForSelection = scenario.observations[nextExecution]?.maxDeltaV ?? null;
    const nextDeltaV = selectedExecutionTimestep === nextExecution
      && selectedDeltaV !== null
      && maxForSelection !== null
      && selectedDeltaV <= maxForSelection
      ? selectedDeltaV
      : maxForSelection;
    setExecutionTimestep(nextExecution);
    setDeltaV(nextDeltaV);
    setResult(null);
    onConfigurationChange({ executionTimestep: nextExecution, direction, deltaV: nextDeltaV });
  }, [currentTimestep, firstFeasible, scenario.event.id]);

  const currentObservation = scenario.observations[currentTimestep];
  const executionObservation = scenario.observations[executionTimestep];
  const lastFeasible = getLastFeasibleTimestep(scenario, currentTimestep);
  const maxDeltaV = executionObservation?.maxDeltaV ?? null;
  const requiredDeltaV = executionObservation?.requiredDeltaV ?? scenario.event.requiredDeltaV;
  const advisor = executionObservation ? gameAdvisorOutcome(executionObservation) : null;
  const timingWarning = !executionObservation
    ? 'No data exists for the selected execution timestep.'
    : executionObservation.maneuverFeasible === false
      ? 'The simulated game safety check marks this timestep infeasible. It cannot be selected for execution.'
      : executionObservation.maneuverFeasible === null
        ? 'Game feasibility is unavailable. The maneuver cannot be simulated as feasible.'
        : null;
  const deltaVWarning = deltaV === null
    ? 'The game Δv limit is unavailable.'
    : maxDeltaV === null
      ? 'The game Δv limit is unavailable.'
      : deltaV > maxDeltaV
        ? 'Configured Δv exceeds the game Δv limit.'
        : deltaV <= 0
          ? 'Configured Δv must be greater than zero.'
          : null;
  const canSimulate = Boolean(
    executionObservation
    && currentObservation
    && executionTimestep >= currentTimestep
    && executionObservation.maneuverFeasible === true
    && deltaV !== null
    && deltaV >= (executionObservation.requiredDeltaV ?? 0)
    && maxDeltaV !== null
    && deltaV <= maxDeltaV,
  );

  function runSimulation() {
    const nextResult = simulateManeuverDecision(scenario, {
      currentTimestep,
      executionTimestep,
      deltaV: deltaV ?? 0,
      direction,
    });
    setResult(nextResult);
    onAssessment(nextResult, { executionTimestep, deltaV, direction });
  }

  return (
    <section className="space-y-5" aria-labelledby="advanced-maneuver-title">
      <div className="rounded-xl border border-cyan-300/15 bg-slate-950/45 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/55">Advanced Maneuver Simulator · Event {scenario.event.id}</div>
            <h2 id="advanced-maneuver-title" className="mt-1 font-[Orbitron] text-xl text-white">{scenario.event.name}</h2>
            <p className="mt-1 text-xs text-slate-400">Current observation {currentTimestep + 1}/20 · Execution observation {executionTimestep + 1}/20</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Retry
            </button>
            <button type="button" onClick={onReturnToMission} className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/8 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-300/15">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Return to Mission
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          This is a fictional game scenario. Maneuver results use a simplified game formula and are not real model predictions or orbital propagation.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <GlassPanel className="p-3 sm:p-4">
          <OrbitalXScene
            timestep={currentTimestep}
            eventName={scenario.event.name}
            maneuver={{
              direction,
              executionTimestep: executionTimestep + 1,
              deltaV: deltaV ?? 0,
            }}
          />
        </GlassPanel>
        <GlassPanel className="p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/8 bg-slate-950/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Current timestep</div>
              <div className="mt-1 font-[Orbitron] text-lg text-white">{currentTimestep + 1}/20</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-slate-950/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Last simulated feasible step</div>
              <div className="mt-1 font-[Orbitron] text-lg text-white">{lastFeasible === null ? 'None remaining' : `${lastFeasible + 1}/20`}</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-slate-950/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Current TCA</div>
              <div className="mt-1 text-sm text-white">{formatValue(currentObservation?.timeToTca ?? null)} <span className="text-xs text-slate-500">game time units</span></div>
            </div>
            <div className="rounded-xl border border-white/8 bg-slate-950/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Current PoC</div>
              <div className="mt-1 text-sm text-white">{currentObservation?.probabilityOfCollision === null || !currentObservation ? 'Unavailable' : currentObservation.probabilityOfCollision.toExponential(3)}</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-slate-950/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Game fuel remaining</div>
              <div className="mt-1 text-sm text-white">{currentObservation?.fuelRemaining === null || !currentObservation ? 'Unavailable' : `${currentObservation.fuelRemaining} game points`}</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-slate-950/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Game fuel margin</div>
              <div className="mt-1 text-sm text-white">{formatValue(currentObservation?.fuelMargin ?? null)}</div>
              <div className="mt-1 text-[10px] text-slate-500">Simulated game margin</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-slate-950/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Predicted miss distance</div>
              <div className="mt-1 text-sm text-white">{currentObservation?.missDistance === null || !currentObservation ? 'Unavailable' : `${formatValue(currentObservation.missDistance, 2)} game units`}</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-slate-950/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Required Δv · game estimate</div>
              <div className="mt-1 text-sm text-white">{formatValue(requiredDeltaV)}</div>
              <div className="mt-1 text-[10px] text-slate-500">Game units</div>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300/15 bg-amber-300/5 p-3 text-xs leading-relaxed text-amber-100/80">
            <Shield className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>All feasibility and Δv limits are game rules. Changing execution timestep, Δv, or direction updates the estimated fuel use, PoC, and miss distance after simulation.</span>
          </div>
        </GlassPanel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <GlassPanel className="space-y-4 p-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/55">Maneuver configuration</div>
            <h3 className="mt-1 font-[Orbitron] text-lg text-white">Your Strategy</h3>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-200">Execution timestep</span>
            <select
              value={executionTimestep}
              onChange={(event) => {
                const nextTimestep = Number(event.target.value);
                const nextDeltaV = scenario.observations[nextTimestep]?.maxDeltaV ?? null;
                setExecutionTimestep(nextTimestep);
                setDeltaV(nextDeltaV);
                onConfigurationChange({ executionTimestep: nextTimestep, direction, deltaV: nextDeltaV });
                setResult(null);
                onAssessment(null, null);
              }}
              className="w-full rounded-lg border border-white/12 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
            >
              {scenario.observations.slice(currentTimestep).map((observation) => (
                <option
                  key={observation.datasetIndex}
                  value={observation.datasetIndex}
                  disabled={observation.maneuverFeasible === false}
                >
                  Game step {observation.datasetIndex + 1} · TCA {observation.timeToTca ?? 'Unavailable'} · {observation.maneuverFeasible === true ? 'Feasible' : observation.maneuverFeasible === false ? 'Infeasible' : 'Unknown'}
                </option>
              ))}
            </select>
          </label>

          {timingWarning ? (
            <p className="flex items-start gap-2 rounded-lg border border-rose-300/20 bg-rose-400/8 p-3 text-xs text-rose-100" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {timingWarning}
            </p>
          ) : null}

          <div>
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="maneuver-delta-v" className="text-xs font-semibold text-slate-200">Maneuver Δv</label>
              <span className="font-[Orbitron] text-sm text-cyan-100">{formatValue(deltaV)} game units</span>
            </div>
            <input
              id="maneuver-delta-v"
              type="range"
              min={requiredDeltaV ?? 0}
              max={maxDeltaV ?? 0}
              step={maxDeltaV === null ? 0.001 : Math.max(maxDeltaV / 1000, 0.000001)}
              value={deltaV ?? 0}
              disabled={maxDeltaV === null}
              onChange={(event) => {
                const nextDeltaV = Number(event.target.value);
                setDeltaV(nextDeltaV);
                onConfigurationChange({ executionTimestep, direction, deltaV: nextDeltaV });
                setResult(null);
                onAssessment(null, null);
              }}
              className="timeline-slider mt-3"
            />
            <div className="mt-1 flex justify-between text-[10px] text-slate-500">
              <span>0</span>
              <span>Game limit: {formatValue(maxDeltaV)}</span>
            </div>
            {deltaVWarning ? <p className="mt-2 text-xs text-amber-100/80">{deltaVWarning}</p> : null}
          </div>

          <fieldset>
            <legend className="text-xs font-semibold text-slate-200">Maneuver direction</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {directionOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={direction === option.value}
                  onClick={() => {
                    setDirection(option.value);
                    onConfigurationChange({ executionTimestep, direction: option.value, deltaV });
                    setResult(null);
                    onAssessment(null, null);
                  }}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold ${direction === option.value ? 'border-cyan-200/45 bg-cyan-300/12 text-cyan-50' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">{getDirectionDescription(direction)}</p>
          </fieldset>

          <div className="rounded-lg border border-white/8 bg-slate-950/35 p-3">
            <div className="text-xs font-semibold text-slate-200">Execution strategy</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md border border-cyan-300/20 bg-cyan-300/8 px-2 py-1 text-cyan-100">Single burn · available for assessment</span>
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-slate-500">Multiple burns · unsupported</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">This game evaluates only one burn; it does not simulate burn splitting.</p>
          </div>

          <button
            type="button"
            onClick={runSimulation}
            disabled={!canSimulate}
            className="w-full rounded-xl border border-cyan-200/45 bg-cyan-300/15 px-4 py-3 text-sm font-bold uppercase tracking-wider text-cyan-50 hover:bg-cyan-300/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Simulate Decision
          </button>
          {!canSimulate && !timingWarning && !deltaVWarning ? (
            <p className="text-xs text-slate-500">Choose Δv at or above the game requirement and within the game limit.</p>
          ) : null}
        </GlassPanel>

        <GlassPanel className="space-y-4 p-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/55">Strategy comparison</div>
            <h3 className="mt-1 font-[Orbitron] text-lg text-white">Game Advisor Strategy</h3>
          </div>
          <p className="rounded-lg border border-amber-300/15 bg-amber-300/5 p-3 text-sm leading-relaxed text-amber-100/80">
            This is a rule-based game advisor, not a trained AI or optimizer. It uses the same selected game step and feasibility rule as your strategy; estimates below are game-only approximations.
          </p>
          <div className="rounded-xl border border-white/8 bg-slate-950/40 p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Recommendation at selected game step</div>
            <div className="mt-1 text-sm font-semibold text-cyan-100">{currentModelDecision(executionObservation?.recommendations ?? [])}</div>
            <p className="mt-2 text-xs text-slate-300">Advisor action: {advisor?.decision ?? 'No recommendation'} · feasibility: {advisor?.feasible === null || advisor?.feasible === undefined ? 'Unavailable' : advisor.feasible ? 'Pass' : 'Rejected'}</p>
            {advisor?.decision === 'COMMIT' && advisor.feasible !== true ? (
              <p className="mt-1 text-xs text-rose-200">The game safety rule rejects this advisor maneuver. No burn is applied.</p>
            ) : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-white/8 bg-slate-950/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Estimated fuel used / remaining</div>
              <div className="mt-1 text-sm text-slate-100">{advisor?.outcome ? `${formatMetric(advisor.outcome.fuelUsed, 2)} / ${formatMetric(advisor.outcome.fuelRemaining, 1)} game points` : 'Unavailable'}</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-slate-950/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Estimated PoC / miss distance</div>
              <div className="mt-1 text-sm text-slate-100">{advisor?.outcome ? `${formatScientific(advisor.outcome.probabilityOfCollision)} / ${formatMetric(advisor.outcome.missDistance, 2)} game units` : 'Unavailable'}</div>
            </div>
          </div>
          {result ? (
            <div className="rounded-xl border border-cyan-300/15 bg-slate-950/35 p-3 text-xs text-slate-300">
              Both strategies use the same selected game step. Differences reflect the game's rules, not a real-world winner or AI performance claim.
            </div>
          ) : (
            <p className="text-xs text-slate-500">Select a feasible game step, Δv, and direction to compare your estimate with the game advisor.</p>
          )}
        </GlassPanel>
      </div>

      {result ? (
        <ManeuverResult
          result={result}
          executionTimestep={executionTimestep}
          deltaV={deltaV}
          direction={direction}
        />
      ) : previousAssessment ? (
        <GlassPanel className="space-y-2 p-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/55">Previous assessment · preserved this attempt</div>
          <p className="text-sm text-slate-200">
            Game step {previousAssessment.timestep} · {previousAssessment.direction.replace('_', ' ')} · Δv {formatValue(previousAssessment.deltaV)} game units · feasibility {previousAssessment.feasible === null ? 'unavailable' : previousAssessment.feasible ? 'passed' : 'failed'} · score {previousAssessment.scoreEarned === null ? 'Unavailable' : `${previousAssessment.scoreEarned}/${previousAssessment.scorePossible}`}
          </p>
        </GlassPanel>
      ) : null}

      <GlassPanel className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="max-w-3xl text-xs leading-relaxed text-slate-500">
          Fictional mission values and maneuvers are game simulations only. They are designed to make the decisions and their effects visible, not to represent real satellite operations.
        </p>
        <button type="button" onClick={onReturnToMission} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10">
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          Return to Mission
        </button>
      </GlassPanel>
    </section>
  );
}
