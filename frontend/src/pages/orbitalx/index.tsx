import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Clock3, Fuel, Orbit, Play, RotateCcw, Shield, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MissionShell } from '../../components/layout/MissionShell';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { OrbitalXScene } from '../../components/visualization/OrbitalXScene';
import {
  fetchOrbitalXEvents,
  type OrbitalXCatalogEvent,
  type OrbitalXObservation,
} from '../../services/api/orbitalx';
import { createGameScenario } from '../../modules/orbitalx/gameSimulation';
import {
  getOutcomeLabel,
  initialOrbitalXState,
  orbitalXReducer,
  type OrbitalXActionRecord,
  type OrbitalXOutcome,
} from '../../modules/orbitalx/orbitalxGame';
import type { OrbitalXScenario } from '../../services/api/orbitalx';
import { PredictionModePanel } from '../../modules/orbitalx/PredictionModePanel';
import {
  initialPredictionSession,
  predictionSessionReducer,
  type PredictionAnswers,
  type PredictionQuestionId,
} from '../../modules/orbitalx/predictionMode';
import { AdvancedManeuverSimulator } from '../../modules/orbitalx/AdvancedManeuverSimulator';
import {
  AIHumanDecisionSimulator,
  type HumanDecisionAction,
  type HumanDecisionRecord,
} from '../../modules/orbitalx/AIHumanDecisionSimulator';
import {
  calculateMissionScores,
  makeManeuverSnapshot,
  readMissionHistory,
  saveMissionReport,
  type ManeuverAssessmentSnapshot,
  type OrbitalXMissionReport,
} from '../../modules/orbitalx/missionReport';
import { MissionReportPanel } from '../../modules/orbitalx/MissionReportPanel';
import type { ManeuverDirection, ManeuverSimulationResult } from '../../modules/orbitalx/maneuverSimulator';

type OrbitalXMode = 'DECISION' | 'PREDICTION' | 'MANEUVER' | 'AI_HUMAN' | 'REPORT';

const fallbackGameEvents: OrbitalXCatalogEvent[] = [
  {
    id: 'GAME-001',
    name: 'Simulated Conjunction · Blue Horizon',
    riskLevel: 'SIMULATED',
    probabilityOfCollision: null,
    timeToTca: null,
    missDistance: null,
    relativeVelocity: null,
    requiredDeltaV: null,
    fuelRemaining: null,
  },
  {
    id: 'GAME-002',
    name: 'Simulated Conjunction · Night Watch',
    riskLevel: 'SIMULATED',
    probabilityOfCollision: null,
    timeToTca: null,
    missDistance: null,
    relativeVelocity: null,
    requiredDeltaV: null,
    fuelRemaining: null,
  },
  {
    id: 'GAME-003',
    name: 'Simulated Conjunction · Aurora Pass',
    riskLevel: 'SIMULATED',
    probabilityOfCollision: null,
    timeToTca: null,
    missDistance: null,
    relativeVelocity: null,
    requiredDeltaV: null,
    fuelRemaining: null,
  },
];

function formatValue(value: number | null, digits = 2): string {
  return value === null ? 'Unavailable' : value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function formatProbability(value: number | null): string {
  return value === null ? 'Unavailable' : value.toExponential(2);
}

function outcomeTone(outcome: OrbitalXOutcome | null): string {
  if (outcome === 'MISSION_PROTECTED_SIMULATED') return 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100';
  if (outcome === 'MANEUVER_OPPORTUNITY_LOST') return 'border-rose-300/30 bg-rose-400/10 text-rose-100';
  return 'border-amber-300/30 bg-amber-400/10 text-amber-100';
}

function observationLabel(value: boolean | null): string {
  if (value === null) return 'Unavailable';
  return value ? 'Feasible' : 'Not feasible';
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-slate-950/45 p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">
        <Icon className="h-4 w-4 text-cyan-300/75" aria-hidden="true" />
        {label}
      </div>
      <div className="mt-2 break-words font-[Orbitron] text-lg text-white">{value}</div>
      {detail ? <div className="mt-1 text-[11px] text-slate-500">{detail}</div> : null}
    </div>
  );
}

function RecommendationList({ observation }: { observation: OrbitalXObservation }) {
  if (observation.recommendations.length === 0) {
    return <p className="text-sm text-slate-400">No game-advisor suggestion for this step.</p>;
  }

  return (
    <ul className="space-y-2" aria-label="Simulated game-advisor suggestions">
      {observation.recommendations.map((recommendation) => (
        <li key={recommendation.model} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/8 bg-slate-950/40 px-3 py-2">
          <span className="text-xs font-semibold tracking-wide text-slate-200">{recommendation.model}</span>
          <span className="text-xs text-cyan-100">
            {recommendation.final ?? 'No suggestion'}
            {recommendation.symbolicOverride === true ? <span className="ml-1 text-amber-200">(safety override)</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function MissionReport({
  outcome,
  actions,
  scenario,
}: {
  outcome: OrbitalXOutcome;
  actions: OrbitalXActionRecord[];
  scenario: OrbitalXScenario;
}) {
  const outcomeDescription = outcome === 'MISSION_PROTECTED_SIMULATED'
    ? 'Game rule: an ACT NOW accepted by simulated feasibility ends the encounter as protected. The displayed post-burn risk and fuel values are game estimates, not real orbital propagation.'
    : outcome === 'MANEUVER_OPPORTUNITY_LOST'
      ? 'The final simulated game step rejected the maneuver, so the game records the opportunity as lost.'
      : 'The 20-step fictional game encounter ended without a protected outcome.';

  return (
    <GlassPanel className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-200/55">Mission report · simulated game</div>
          <h2 className="mt-2 font-[Orbitron] text-xl text-white">Encounter complete</h2>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${outcomeTone(outcome)}`}>
          {getOutcomeLabel(outcome)}
        </span>
      </div>

      <p className="mt-4 rounded-xl border border-white/8 bg-slate-950/40 p-3 text-sm leading-relaxed text-slate-300">
        {outcomeDescription}
      </p>

      <div className="mt-5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Actions and safety checks</h3>
        {actions.length ? (
          <ol className="mt-3 space-y-3">
            {actions.map((action, index) => (
              <li key={`${action.timestep}-${index}`} className="rounded-xl border border-white/8 bg-slate-950/40 p-3">
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="font-semibold text-white">Game step {action.timestep} · {action.action}</span>
                  <span className={action.maneuverFeasible === null ? 'text-slate-400' : action.maneuverFeasible ? 'text-emerald-200' : 'text-rose-200'}>
                    Game feasibility: {observationLabel(action.maneuverFeasible)}
                  </span>
                </div>
                {action.action === 'ACT NOW' ? (
                  <>
                    <p className="mt-1 text-xs text-slate-400">{action.accepted ? 'Maneuver accepted by the game feasibility rule.' : 'Maneuver rejected; no burn was recorded.'}</p>
                    {action.simulatedOutcome ? (
                      <p className="mt-1 text-xs text-cyan-100/80">
                        Game estimate: PoC {formatProbability(action.simulatedOutcome.probabilityOfCollision)} · miss distance {formatValue(action.simulatedOutcome.missDistance)} game units · fuel used {formatValue(action.simulatedOutcome.fuelUsed)} game points · remaining {formatValue(action.simulatedOutcome.fuelRemaining, 1)} game points.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">Waited and advanced the encounter sequence.</p>
                )}
                {action.recommendations.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {action.recommendations.map((recommendation) => (
                      <span key={recommendation.model} className="rounded-md border border-white/8 px-2 py-1 text-[11px] text-slate-300">
                        {recommendation.model}: {recommendation.final ?? 'Unavailable'}
                      </span>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-slate-400">No player actions were recorded.</p>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/8 bg-slate-950/40 p-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Game fuel usage</div>
          <div className="mt-1 text-sm text-slate-200">
            {formatValue(actions.reduce((total, action) => total + (action.simulatedOutcome?.fuelUsed ?? 0), 0), 2)} game points
          </div>
        </div>
        <div className="rounded-xl border border-white/8 bg-slate-950/40 p-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Final simulated game step</div>
          <div className="mt-1 text-sm text-slate-200">
            PoC {formatProbability(scenario.observations[scenario.observations.length - 1]?.probabilityOfCollision)} · Feasibility {observationLabel(scenario.observations[scenario.observations.length - 1]?.maneuverFeasible ?? null)}
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}

export default function OrbitalXPage() {
  const [game, dispatch] = useReducer(orbitalXReducer, initialOrbitalXState);
  const [predictionSession, predictionDispatch] = useReducer(predictionSessionReducer, initialPredictionSession);
  const [mode, setMode] = useState<OrbitalXMode>('DECISION');
  const [humanDecisionHistory, setHumanDecisionHistory] = useState<HumanDecisionRecord[]>([]);
  const [aiHumanSelection, setAiHumanSelection] = useState<{ timestep: number; action: HumanDecisionAction }>({
    timestep: 0,
    action: 'WAIT',
  });
  const [maneuverSelection, setManeuverSelection] = useState<{
    executionTimestep: number;
    direction: ManeuverDirection;
    deltaV: number | null;
  }>({ executionTimestep: 0, direction: 'ALONG_TRACK', deltaV: null });
  const [maneuverAssessment, setManeuverAssessment] = useState<ManeuverAssessmentSnapshot | null>(null);
  const [attemptStartedAt, setAttemptStartedAt] = useState<string | null>(null);
  const [missionId, setMissionId] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [historyLoad] = useState(() => {
    try {
      return { reports: readMissionHistory(), error: null as string | null };
    } catch (error) {
      return {
        reports: [] as OrbitalXMissionReport[],
        error: error instanceof Error ? `Saved mission history could not be loaded: ${error.message}` : 'Saved mission history could not be loaded.',
      };
    }
  });
  const [missionHistory, setMissionHistory] = useState<OrbitalXMissionReport[]>(historyLoad.reports);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(historyLoad.error);
  const [events, setEvents] = useState<OrbitalXCatalogEvent[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const actionLock = useRef(false);
  const startLock = useRef(false);
  const predictionAdvanceLock = useRef(false);

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    fetchOrbitalXEvents()
      .then((loadedEvents) => {
        if (!active) return;
        setEvents(loadedEvents);
        setCatalogError(null);
        dispatch({ type: 'SELECT_EVENT', eventId: loadedEvents[0]?.id ?? '' });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setEvents(fallbackGameEvents);
        dispatch({ type: 'SELECT_EVENT', eventId: fallbackGameEvents[0]?.id ?? '' });
        setCatalogError(
          `Backend event catalog unavailable; using local simulated scenarios. ${error instanceof Error ? error.message : 'Failed to load events.'}`,
        );
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === game.selectedEventId) ?? null,
    [events, game.selectedEventId],
  );
  const scenario = game.scenario;
  const observation = scenario?.observations[game.timestep] ?? null;
  const nextObservation = scenario?.observations[game.timestep + 1] ?? null;
  const timestep = scenario ? game.timestep + 1 : 0;
  const remainingFeasibility = scenario
    ? scenario.observations.slice(game.timestep).reduce(
      (summary, nextObservation) => {
        if (nextObservation.maneuverFeasible === true) summary.feasible += 1;
        if (nextObservation.maneuverFeasible === null) summary.unavailable += 1;
        return summary;
      },
      { feasible: 0, unavailable: 0 },
    )
    : null;
  const canAct = game.status === 'ACTIVE' && !game.isProcessing;

  useEffect(() => {
    if (game.status === 'COMPLETED' && !completedAt) setCompletedAt(new Date().toISOString());
  }, [game.status, completedAt]);

  async function startMission(eventId = game.selectedEventId) {
    if (!eventId || game.isProcessing || startLock.current) return;
    startLock.current = true;
    setMode('DECISION');
    predictionDispatch({ type: 'RESET' });
    setHumanDecisionHistory([]);
    setAiHumanSelection({ timestep: 0, action: 'WAIT' });
    setManeuverAssessment(null);
    setManeuverSelection({ executionTimestep: 0, direction: 'ALONG_TRACK', deltaV: null });
    setAttemptStartedAt(null);
    setMissionId(null);
    setCompletedAt(null);
    setSelectedHistoryId(null);
    dispatch({ type: 'START_REQUEST' });
    try {
      const selectedEventForGame = events.find((event) => event.id === eventId);
      if (!selectedEventForGame) throw new Error('Select an available event before starting the game.');
      const loadedScenario = createGameScenario(selectedEventForGame);
      const started = new Date().toISOString();
      setAttemptStartedAt(started);
      setMissionId(`${eventId}-${Date.now()}`);
      const firstFeasible = loadedScenario.observations.find((item) => item.maneuverFeasible === true);
      setManeuverSelection({
        executionTimestep: firstFeasible?.datasetIndex ?? 0,
        direction: 'ALONG_TRACK',
        deltaV: firstFeasible?.maxDeltaV ?? null,
      });
      dispatch({ type: 'START_SUCCESS', scenario: loadedScenario });
    } catch (error) {
      dispatch({
        type: 'START_FAILURE',
        message: error instanceof Error ? error.message : 'Failed to load the selected event scenario.',
      });
    } finally {
      startLock.current = false;
    }
  }

  function chooseAction(action: 'ACT NOW' | 'WAIT') {
    if (!canAct || actionLock.current) return;
    actionLock.current = true;
    dispatch({ type: 'PLAYER_ACTION', action });
    window.setTimeout(() => {
      actionLock.current = false;
    }, 0);
  }

  function handleSelectEvent(eventId: string) {
    predictionDispatch({ type: 'RESET' });
    setHumanDecisionHistory([]);
    setAiHumanSelection({ timestep: 0, action: 'WAIT' });
    setManeuverAssessment(null);
    setAttemptStartedAt(null);
    setMissionId(null);
    setCompletedAt(null);
    setSelectedHistoryId(null);
    dispatch({ type: 'SELECT_EVENT', eventId });
  }

  function handleRestart() {
    if (game.status === 'ACTIVE' && !window.confirm('Restarting will discard this unfinished attempt. Completed mission history will be kept. Continue?')) return;
    predictionDispatch({ type: 'RESET' });
    setHumanDecisionHistory([]);
    setAiHumanSelection({ timestep: 0, action: 'WAIT' });
    setManeuverAssessment(null);
    const firstFeasible = game.scenario?.observations.find((item) => item.datasetIndex >= game.timestep && item.maneuverFeasible === true);
    setManeuverSelection({
      executionTimestep: firstFeasible?.datasetIndex ?? game.timestep,
      direction: 'ALONG_TRACK',
      deltaV: firstFeasible?.maxDeltaV ?? null,
    });
    setAttemptStartedAt(null);
    setMissionId(null);
    setCompletedAt(null);
    setSelectedHistoryId(null);
    dispatch({ type: 'RESTART' });
  }

  function handleNextScenario() {
    if (events.length < 2) return;
    if (game.status === 'ACTIVE' && !window.confirm('Starting another scenario will discard this unfinished attempt. Continue?')) return;
    const selectedIndex = events.findIndex((event) => event.id === game.selectedEventId);
    const nextEvent = events[(selectedIndex + 1 + events.length) % events.length];
    if (!nextEvent) return;
    predictionDispatch({ type: 'RESET' });
    setHumanDecisionHistory([]);
    setAiHumanSelection({ timestep: 0, action: 'WAIT' });
    setManeuverAssessment(null);
    setAttemptStartedAt(null);
    setMissionId(null);
    setCompletedAt(null);
    setSelectedHistoryId(null);
    if (game.status === 'ACTIVE') dispatch({ type: 'RESTART' });
    dispatch({ type: 'SELECT_EVENT', eventId: nextEvent.id });
    setMode('DECISION');
  }

  function handleReplay(eventId: string) {
    if (game.status === 'ACTIVE' && !window.confirm('Replaying will discard the current unfinished attempt. Completed mission history will be kept. Continue?')) return;
    if (game.status === 'ACTIVE') dispatch({ type: 'RESTART' });
    dispatch({ type: 'SELECT_EVENT', eventId });
    setMode('DECISION');
    void startMission(eventId);
  }

  function handleFinishMission() {
    if (game.status !== 'ACTIVE') return;
    dispatch({ type: 'FINISH_MISSION' });
  }

  function handleNextAiHumanTimestep(nextTimestep: number) {
    if (
      !canAct
      || !scenario
      || nextTimestep <= game.timestep
      || nextTimestep >= scenario.observations.length
      || !humanDecisionHistory.some((record) => record.timestep === nextTimestep)
    ) return;
    predictionDispatch({ type: 'CLEAR_CURRENT' });
    dispatch({ type: 'AI_HUMAN_NEXT_TIMESTEP', nextTimestep });
    setAiHumanSelection((selection) => ({ ...selection, timestep: nextTimestep }));
  }

  function handlePredictionAnswer(
    question: PredictionQuestionId,
    answer: PredictionAnswers[PredictionQuestionId],
  ) {
    if (answer !== null) predictionDispatch({ type: 'ANSWER', question, answer });
  }

  function handleSubmitPredictions() {
    if (!observation || !nextObservation) return;
    predictionDispatch({ type: 'SUBMIT', current: observation, next: nextObservation });
  }

  function handleNextPredictionTimestep() {
    if (!predictionSession.submitted || !nextObservation || predictionAdvanceLock.current) return;
    predictionAdvanceLock.current = true;
    predictionDispatch({ type: 'NEXT_TIMESTEP' });
    dispatch({ type: 'PREDICTION_NEXT_TIMESTEP' });
    window.setTimeout(() => {
      predictionAdvanceLock.current = false;
    }, 0);
  }

  const selectedEventName = scenario?.event.name ?? selectedEvent?.name ?? 'Awaiting event selection';
  const modeSelectionDisabled = game.isProcessing;
  const lastObservation = scenario?.observations[game.timestep] ?? null;
  const scores = useMemo(
    () => calculateMissionScores(predictionSession.rounds, maneuverAssessment),
    [predictionSession.rounds, maneuverAssessment],
  );
  const currentReport = useMemo<OrbitalXMissionReport | null>(() => {
    if (
      game.status !== 'COMPLETED'
      || !scenario
      || !lastObservation
      || !missionId
      || !completedAt
    ) return null;

    return {
      missionId,
      eventId: scenario.event.id,
      eventName: scenario.event.name,
      startedAt: attemptStartedAt ?? completedAt,
      completedAt,
      status: game.status,
      outcome: game.outcome,
      finalTimestep: Math.max(1, game.timestep + 1),
      decisions: game.actions,
      predictionRounds: predictionSession.rounds,
      maneuver: maneuverAssessment,
      aiHumanDecisions: humanDecisionHistory,
      categoryScores: scores.categoryScores,
      totalScore: scores.totalScore,
      finalObservation: {
        timestep: lastObservation.datasetIndex + 1,
        timeToTca: lastObservation.timeToTca,
        probabilityOfCollision: lastObservation.probabilityOfCollision,
        missDistance: lastObservation.missDistance,
        fuelRemaining: lastObservation.fuelRemaining,
        maneuverFeasible: lastObservation.maneuverFeasible,
      },
      limitations: [
        'Scenario values, advisor suggestions, and maneuver effects are simulated from the selected event ID.',
        'Fuel use, PoC changes, and miss-distance changes are simplified estimates, not physical orbital calculations.',
        'The changing advisor recommendation is rule-based, not a trained model; agreement alone does not determine the score.',
      ],
    };
  }, [
    game.status,
    game.outcome,
    game.timestep,
    game.actions,
    scenario,
    lastObservation,
    missionId,
    attemptStartedAt,
    completedAt,
    predictionSession.rounds,
    maneuverAssessment,
    humanDecisionHistory,
    scores,
  ]);

  useEffect(() => {
    if (!currentReport) return;
    try {
      saveMissionReport(currentReport);
      const history = readMissionHistory();
      setMissionHistory(history);
      setSelectedHistoryId(currentReport.missionId);
      setHistoryError(null);
    } catch (error) {
      setHistoryError(error instanceof Error ? `Mission report could not be saved in this browser: ${error.message}` : 'Mission report could not be saved in this browser.');
    }
  }, [currentReport]);

  return (
    <MissionShell title="OrbitalX · Interactive Mission" subtitle="The Final Decision" tone="critical">
      <div className="space-y-5">
        <GlassPanel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-200/55">Mission modes</div>
            <p className="mt-1 text-xs text-slate-400">Switch between mission, prediction, maneuver, and AI-versus-human decisions without losing the current scenario.</p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Select OrbitalX mode">
            <button
              type="button"
              aria-pressed={mode === 'DECISION'}
              disabled={modeSelectionDisabled}
              onClick={() => setMode('DECISION')}
              className={`rounded-lg border px-4 py-2 text-xs font-semibold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-50 ${mode === 'DECISION' ? 'border-cyan-200/50 bg-cyan-300/15 text-cyan-50' : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'}`}
            >
              Decision Mode
            </button>
            <button
              type="button"
              aria-pressed={mode === 'PREDICTION'}
              disabled={modeSelectionDisabled}
              onClick={() => setMode('PREDICTION')}
              className={`rounded-lg border px-4 py-2 text-xs font-semibold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-50 ${mode === 'PREDICTION' ? 'border-cyan-200/50 bg-cyan-300/15 text-cyan-50' : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'}`}
            >
              Prediction Mode
            </button>
            <button
              type="button"
              aria-pressed={mode === 'MANEUVER'}
              disabled={modeSelectionDisabled}
              onClick={() => setMode('MANEUVER')}
              className={`rounded-lg border px-4 py-2 text-xs font-semibold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-50 ${mode === 'MANEUVER' ? 'border-cyan-200/50 bg-cyan-300/15 text-cyan-50' : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'}`}
            >
              Advanced Maneuver Simulator
            </button>
            <button
              type="button"
              aria-pressed={mode === 'AI_HUMAN'}
              disabled={modeSelectionDisabled}
              onClick={() => setMode('AI_HUMAN')}
              className={`rounded-lg border px-4 py-2 text-xs font-semibold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-50 ${mode === 'AI_HUMAN' ? 'border-cyan-200/50 bg-cyan-300/15 text-cyan-50' : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'}`}
            >
              AI vs Human
            </button>
            <button
              type="button"
              aria-pressed={mode === 'REPORT'}
              onClick={() => setMode('REPORT')}
              className={`rounded-lg border px-4 py-2 text-xs font-semibold uppercase tracking-wider ${mode === 'REPORT' ? 'border-cyan-200/50 bg-cyan-300/15 text-cyan-50' : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'}`}
            >
              Mission Report & History
            </button>
          </div>
        </GlassPanel>

        <p className="px-1 text-sm leading-relaxed text-slate-300">
          {mode === 'DECISION' && 'A conjunction is approaching. Choose whether to act now or wait for the next update.'}
          {mode === 'PREDICTION' && 'Study the current readings, predict what comes next, then check your answer.'}
          {mode === 'MANEUVER' && 'Choose when and how to maneuver, then compare the estimated effect on risk and fuel.'}
          {mode === 'AI_HUMAN' && 'Make a decision alongside the advisor, then compare how both choices perform.'}
          {mode === 'REPORT' && 'Review your mission decisions, results, score, and saved mission history.'}
        </p>

        {scenario ? (
          <GlassPanel className="p-3 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold uppercase tracking-wider text-cyan-100">{mode === 'REPORT' ? 'Mission Report' : mode === 'AI_HUMAN' ? 'AI vs Human' : mode === 'MANEUVER' ? 'Advanced Maneuver' : mode === 'PREDICTION' ? 'Prediction Mode' : 'Mission Dashboard'}</span>
              <span className="text-slate-400">Event {scenario.event.id} · step {timestep}/20 · {game.status}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8" role="progressbar" aria-label="Mission sequence progress" aria-valuemin={0} aria-valuemax={20} aria-valuenow={timestep}>
              <div className="h-full rounded-full bg-cyan-300 transition-[width] duration-300" style={{ width: `${(timestep / 20) * 100}%` }} />
            </div>
          </GlassPanel>
        ) : null}

        <GlassPanel className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-100">
                <Orbit className="h-4 w-4" aria-hidden="true" />
                {game.status === 'ACTIVE' ? 'Mission Active' : game.status === 'COMPLETED' ? 'Mission Complete' : game.status === 'ERROR' ? 'Mission Error' : 'Mission Ready'}
              </span>
              <span className="text-xs text-slate-400">Scenario: <strong className="text-slate-200">{selectedEventName}</strong></span>
              <span className="text-xs text-slate-400">Event ID: <strong className="font-mono text-cyan-100">{scenario?.event.id ?? selectedEvent?.id ?? 'Not selected'}</strong></span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="orbitalx-event">Select conjunction event</label>
              <select
                id="orbitalx-event"
                value={game.selectedEventId}
                onChange={(event) => handleSelectEvent(event.target.value)}
                disabled={catalogLoading || game.status === 'ACTIVE' || game.isProcessing}
                className="min-w-0 rounded-xl border border-white/12 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 disabled:opacity-50 sm:min-w-[220px]"
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>{event.id} · {event.name}</option>
                ))}
              </select>

              {game.status === 'ACTIVE' || game.status === 'COMPLETED' ? (
                <button
                  type="button"
                  onClick={handleRestart}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:border-cyan-200/40 hover:bg-white/10"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Restart Mission
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void startMission()}
                  disabled={!game.selectedEventId || catalogLoading || game.isProcessing}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-200/50 bg-cyan-300/15 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-cyan-50 hover:bg-cyan-300/25 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  {game.isProcessing ? 'Loading scenario…' : 'Start Mission'}
                </button>
              )}
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            Track the conjunction, make decisions, and see how each choice changes the mission values.
          </p>
        </GlassPanel>

        {catalogError ? (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-300/25 bg-rose-400/10 p-4 text-sm text-rose-100">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div><strong>Event catalog unavailable.</strong> {catalogError}</div>
          </div>
        ) : null}
        {game.error ? (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-300/25 bg-rose-400/10 p-4 text-sm text-rose-100">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div><strong>Mission could not start.</strong> {game.error}</div>
          </div>
        ) : null}

        {mode === 'REPORT' ? (
          <MissionReportPanel
            currentReport={currentReport}
            history={missionHistory}
            selectedHistoryId={selectedHistoryId}
            historyError={historyError}
            onSelectHistory={(id) => setSelectedHistoryId(id)}
            onReplay={handleReplay}
            onNextScenario={handleNextScenario}
            onFinalize={handleFinishMission}
            missionActive={game.status === 'ACTIVE'}
            hasNextScenario={events.length > 1}
          />
        ) : scenario && observation ? (
          <>
            {mode === 'MANEUVER' ? (
              <AdvancedManeuverSimulator
                key={scenario.event.id}
                scenario={scenario}
                currentTimestep={game.timestep}
                selectedExecutionTimestep={maneuverSelection.executionTimestep}
                selectedDirection={maneuverSelection.direction}
                selectedDeltaV={maneuverSelection.deltaV}
                previousAssessment={maneuverAssessment}
                onConfigurationChange={(selection) => setManeuverSelection(selection)}
                onAssessment={(result, configuration) => {
                  setManeuverAssessment(result && configuration ? makeManeuverSnapshot(result, configuration) : null);
                }}
                onReturnToMission={() => setMode('DECISION')}
                onRetry={handleRestart}
              />
            ) : mode === 'AI_HUMAN' ? (
              <AIHumanDecisionSimulator
                key={scenario.event.id}
                scenario={scenario}
                currentTimestep={game.timestep}
                history={humanDecisionHistory}
                selectedTimestep={aiHumanSelection.timestep}
                selectedAction={aiHumanSelection.action}
                onConfigurationChange={(selection) => setAiHumanSelection(selection)}
                onRecord={(record) => setHumanDecisionHistory((history) => [...history, record])}
                onAdvance={handleNextAiHumanTimestep}
                onFinalize={handleFinishMission}
                onRetry={handleRestart}
                onReturnToMission={() => setMode('DECISION')}
              />
            ) : (
            <>
            <div className="grid gap-5 xl:grid-cols-[1.4fr_0.85fr]">
              <GlassPanel className="min-h-[320px] p-3 sm:p-4">
                <OrbitalXScene timestep={game.timestep} eventName={selectedEventName} />
              </GlassPanel>

              <div className="space-y-5">
                <GlassPanel className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.28em] text-cyan-200/55">Current game step</div>
                      <div className="mt-1 font-[Orbitron] text-xl text-white">Timestep {timestep}/20</div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${observation.maneuverFeasible === true ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100' : observation.maneuverFeasible === false ? 'border-rose-300/25 bg-rose-400/10 text-rose-100' : 'border-white/10 bg-white/5 text-slate-300'}`}>
                      {observationLabel(observation.maneuverFeasible)}
                    </span>
                  </div>
                  <div
                    className="mt-4 h-2 overflow-hidden rounded-full bg-white/8"
                    role="progressbar"
                    aria-label="Encounter progress"
                    aria-valuemin={1}
                    aria-valuemax={20}
                    aria-valuenow={timestep}
                  >
                    <div className="h-full rounded-full bg-cyan-300 transition-[width] duration-300" style={{ width: `${(timestep / 20) * 100}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Encounter progress · simulated game step {timestep} of 20</p>
                  {remainingFeasibility && mode === 'DECISION' ? (
                    <p className="mt-2 text-xs text-slate-400">
                      Feasible game steps remaining: <strong className="text-slate-200">{remainingFeasibility.feasible}</strong>
                      {remainingFeasibility.unavailable > 0 ? ` · feasibility unavailable for ${remainingFeasibility.unavailable} observations` : ''}
                      <span className="block text-slate-500">Sequence summary only; not a real-world maneuver-window prediction.</span>
                    </p>
                  ) : null}

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Metric label="Time to closest approach" value={formatValue(observation.timeToTca)} detail="Game time units · simulated" icon={Clock3} />
                    <Metric label="Collision probability" value={formatProbability(observation.probabilityOfCollision)} detail="Simulated PoC" icon={Target} />
                    <Metric label="Predicted miss distance" value={observation.missDistance === null ? 'Unavailable' : `${formatValue(observation.missDistance)} game units`} detail="Simulated game estimate" icon={Orbit} />
                    <Metric label="Relative velocity" value={observation.relativeVelocity === null ? 'Unavailable' : `${formatValue(observation.relativeVelocity)} game units`} detail="Simulated game estimate" icon={ArrowLeft} />
                    <Metric label="Fuel remaining" value={observation.fuelRemaining === null ? 'Unavailable' : `${formatValue(observation.fuelRemaining, 1)} game points`} detail="Simulated game fuel" icon={Fuel} />
                    <Metric label="Required Δv" value={observation.requiredDeltaV === null ? 'Unavailable' : `${formatValue(observation.requiredDeltaV)} game units`} detail="Simulated game requirement" icon={Target} />
                  </div>
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300/15 bg-amber-300/5 p-3 text-xs leading-relaxed text-amber-100/80">
                    <Shield className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>This game feasibility rule uses the generated fuel and Δv values. The changing game-advisor recommendation is separate.</span>
                  </div>
                </GlassPanel>
              </div>
            </div>

            {mode === 'DECISION' ? (
              <>
                <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                  <GlassPanel className="p-5">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-cyan-200" aria-hidden="true" />
                  <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">Game advisor · current timestep</h2>
                </div>
                <div className="mt-3"><RecommendationList observation={observation} /></div>
                <p className="mt-3 text-xs text-slate-500">Rule-based simulated game suggestions change by timestep; they are not trained-model or LLM outputs.</p>
                  </GlassPanel>

                  <GlassPanel className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/55">Player decision</div>
                    <h2 className="mt-1 font-[Orbitron] text-lg text-white">Choose the next action</h2>
                  </div>
                  <span className="text-xs text-slate-500">Current step: {timestep}/20</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => chooseAction('ACT NOW')}
                    disabled={!canAct}
                    className="min-h-14 rounded-xl border border-rose-300/35 bg-rose-500/15 px-4 py-3 text-sm font-black tracking-[0.2em] text-rose-100 hover:border-rose-200/65 hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ACT NOW
                    <span className="mt-1 block text-[10px] font-normal tracking-normal text-rose-100/65">Attempt a maneuver; safety feasibility is checked first</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => chooseAction('WAIT')}
                    disabled={!canAct}
                    className="min-h-14 rounded-xl border border-cyan-300/35 bg-cyan-400/10 px-4 py-3 text-sm font-black tracking-[0.2em] text-cyan-100 hover:border-cyan-200/65 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    WAIT
                    <span className="mt-1 block text-[10px] font-normal tracking-normal text-cyan-100/65">Advance to the next simulated game step</span>
                  </button>
                </div>
                <p className="mt-4 min-h-5 text-sm text-slate-300" role="status" aria-live="polite">{game.feedback}</p>
                {game.status === 'COMPLETED' ? (
                  <p className="mt-2 text-xs text-slate-400">Encounter actions are closed. Restart Mission to play this scenario again or choose another event.</p>
                ) : null}
                  </GlassPanel>
                </div>

                {game.status === 'COMPLETED' && game.outcome ? (
                  <MissionReport outcome={game.outcome} actions={game.actions} scenario={scenario} />
                ) : null}
              </>
            ) : (
              <PredictionModePanel
                session={predictionSession}
                current={observation}
                next={nextObservation}
                scenario={scenario}
                timestep={timestep}
                onAnswer={handlePredictionAnswer}
                onSubmit={handleSubmitPredictions}
                onNextTimestep={handleNextPredictionTimestep}
                onRetry={handleRestart}
                onNextScenario={handleNextScenario}
                hasNextScenario={events.length > 1}
              />
            )}
            </>
            )}
          </>
        ) : (
          <GlassPanel className="grid min-h-[360px] place-items-center p-8 text-center">
            <div className="max-w-xl">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/8 text-cyan-100">
                {game.isProcessing || catalogLoading ? <Orbit className="h-7 w-7 animate-pulse" aria-hidden="true" /> : <Target className="h-7 w-7" aria-hidden="true" />}
              </div>
              <h2 className="mt-5 font-[Orbitron] text-xl text-white">
                {game.isProcessing ? 'Preparing simulated game scenario' : catalogLoading ? 'Connecting to event catalog' : 'Mission control standing by'}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {game.isProcessing
                  ? 'Generating the selected event’s fictional 20-step scenario locally.'
                  : catalogLoading
                    ? 'Requesting available scenarios from the configured backend.'
                    : 'Select a conjunction event and start the mission to generate changing game values and advisor suggestions.'}
              </p>
            </div>
          </GlassPanel>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4 text-xs text-slate-500">
          <span>Scenario values and advisor suggestions update as you advance. Maneuver results are estimates.</span>
          <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Return to Dashboard
          </Link>
        </div>
      </div>
    </MissionShell>
  );
}
