import { AlertTriangle, Archive, RotateCcw } from 'lucide-react';
import { GlassPanel } from '../../components/ui/GlassPanel';
import type { OrbitalXMissionReport } from './missionReport';

interface MissionReportPanelProps {
  currentReport: OrbitalXMissionReport | null;
  history: OrbitalXMissionReport[];
  selectedHistoryId: string | null;
  historyError: string | null;
  onSelectHistory: (missionId: string) => void;
  onReplay: (eventId: string) => void;
  onNextScenario: () => void;
  onFinalize: () => void;
  missionActive: boolean;
  hasNextScenario: boolean;
}

function formatted(value: number | null | undefined, digits = 3): string {
  return value === null || value === undefined ? 'Unavailable' : value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function statusLabel(report: OrbitalXMissionReport): string {
  if (report.outcome === 'MISSION_PROTECTED_SIMULATED') return 'Simulated game outcome · maneuver accepted';
  if (report.outcome === 'MANEUVER_OPPORTUNITY_LOST') return 'Maneuver opportunity lost';
  if (report.outcome === 'ENCOUNTER_COMPLETE_UNRESOLVED') return 'Encounter complete · physical outcome unavailable';
  return report.status;
}

function SummaryDetail({ report }: { report: OrbitalXMissionReport }) {
  const predictionItems = report.predictionRounds.flatMap((round) => round.items);
  const improvementNotes = [
    ...predictionItems
      .filter((item) => item.status === 'INCORRECT' || item.status === 'PARTIALLY_CORRECT')
      .map((item) => `${item.prompt}: review the observed next-step changes before choosing this prediction again.`),
    ...(report.maneuver?.feasible === false
      ? ['Review the selected maneuver timing and feasibility constraints; an infeasible maneuver cannot be credited for fuel savings.']
      : []),
    ...(report.maneuver && report.maneuver.feasible === true && report.maneuver.scoreEarned !== null && report.maneuver.scorePossible !== null && report.maneuver.scoreEarned < report.maneuver.scorePossible
      ? ['Compare the simulated risk trend across game steps and execute before the simulated maneuver window closes.']
      : []),
    ...(report.aiHumanDecisions.length
      ? ['Use the model recommendation as one input, then independently check the safety result; agreement is not evidence that either choice was correct.']
      : []),
    ...(!report.predictionRounds.length
      ? ['Try Prediction Mode during the next attempt to build a data-grounded assessment of encounter trends.']
      : []),
    ...(!report.maneuver
      ? ['Try Advanced Maneuver Mode during the next attempt to record a feasibility and timing assessment.']
      : []),
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-200/55">Mission report</div>
          <h2 className="mt-1 font-[Orbitron] text-xl text-white">{report.eventName}</h2>
          <p className="mt-1 text-xs text-slate-400">Mission {report.missionId} · Event {report.eventId} · started {new Date(report.startedAt).toLocaleString()} · completed {new Date(report.completedAt).toLocaleString()}</p>
        </div>
        <div className="rounded-full border border-cyan-300/20 bg-cyan-300/8 px-3 py-1.5 text-xs text-cyan-100">{statusLabel(report)}</div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/8 bg-slate-950/40 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Unified score</div>
          <div className="mt-1 font-[Orbitron] text-xl text-white">{report.totalScore === null ? 'Unavailable' : `${report.totalScore}/100`}</div>
          <p className="mt-1 text-[10px] text-slate-500">Equal average of evaluable categories only</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-slate-950/40 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Final timestep</div>
          <div className="mt-1 font-[Orbitron] text-xl text-white">{report.finalTimestep}/20</div>
        </div>
        <div className="rounded-xl border border-white/8 bg-slate-950/40 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Final simulated PoC</div>
          <div className="mt-1 font-mono text-sm text-white">{report.finalObservation.probabilityOfCollision === null ? 'Unavailable' : report.finalObservation.probabilityOfCollision.toExponential(3)}</div>
        </div>
        <div className="rounded-xl border border-white/8 bg-slate-950/40 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Final game feasibility</div>
          <div className="mt-1 text-sm text-white">{report.finalObservation.maneuverFeasible === null ? 'Unavailable' : report.finalObservation.maneuverFeasible ? 'Feasible' : 'Infeasible'}</div>
        </div>
      </div>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">Category scores</h3>
        <div className="mt-2 grid gap-2 lg:grid-cols-3">
          {report.categoryScores.map((item) => (
            <div key={item.category} className="rounded-xl border border-white/8 bg-slate-950/35 p-3">
              <div className="flex items-center justify-between gap-2 text-sm text-white">
                <span>{item.category}</span>
                <strong className="font-[Orbitron]">{item.score === null ? 'Unavailable' : `${item.score}/100`}</strong>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">Mission decisions</h3>
        {report.decisions.length || report.aiHumanDecisions.length ? (
          <ol className="mt-2 space-y-2">
            {report.decisions.map((item, index) => (
              <li key={`mission-${index}`} className="rounded-lg border border-white/8 bg-slate-950/35 p-3 text-xs text-slate-300">
                Game step {item.timestep}: {item.action} · game safety {item.maneuverFeasible === null ? 'unavailable' : item.maneuverFeasible ? 'feasible' : 'infeasible'} · {item.accepted ? 'accepted by game rule' : item.action === 'WAIT' ? 'waited' : 'not accepted'}
                {item.simulatedOutcome ? <span className="mt-1 block text-cyan-100/80">Estimated result: PoC {item.simulatedOutcome.probabilityOfCollision.toExponential(3)} · miss distance {formatted(item.simulatedOutcome.missDistance)} game units · fuel used {formatted(item.simulatedOutcome.fuelUsed, 2)} game points · remaining {formatted(item.simulatedOutcome.fuelRemaining, 1)} game points.</span> : null}
              </li>
            ))}
            {report.aiHumanDecisions.map((item, index) => (
              <li key={`ai-human-${index}`} className="rounded-lg border border-white/8 bg-slate-950/35 p-3 text-xs text-slate-300">
                Game step {item.timestep}: player {item.action} · game advisor {item.aiDecision ?? 'unavailable'} · safety {item.maneuverFeasible === null ? 'unavailable' : item.maneuverFeasible ? 'feasible' : 'infeasible'}
                {item.playerOutcome ? <span className="mt-1 block text-cyan-100/80">Player estimate: PoC {item.playerOutcome.probabilityOfCollision.toExponential(3)} · miss distance {formatted(item.playerOutcome.missDistance)} game units · fuel used {formatted(item.playerOutcome.fuelUsed, 2)} game points.</span> : null}
                {item.aiOutcome ? <span className="mt-1 block text-violet-100/80">Advisor estimate: PoC {item.aiOutcome.probabilityOfCollision.toExponential(3)} · miss distance {formatted(item.aiOutcome.missDistance)} game units · fuel used {formatted(item.aiOutcome.fuelUsed, 2)} game points.</span> : null}
              </li>
            ))}
          </ol>
        ) : <p className="mt-2 text-sm text-slate-400">No player decisions were recorded.</p>}
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">Prediction Mode</h3>
        {predictionItems.length ? (
          <ul className="mt-2 space-y-2">
            {predictionItems.map((item, index) => (
              <li key={`${item.question}-${index}`} className="rounded-lg border border-white/8 bg-slate-950/35 p-3 text-xs">
                <div className="flex flex-wrap justify-between gap-2 text-slate-200">
                  <span>{item.prompt}</span>
                  <span>{item.status} · {item.pointsEarned}/{item.pointsPossible}</span>
                </div>
                <p className="mt-1 text-slate-400">Your answer: {item.answer.replaceAll('_', ' ')} · {item.explanation}</p>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-slate-400">Prediction Mode was not played during this attempt.</p>}
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">Advanced Maneuver assessment</h3>
        {report.maneuver ? (
          <div className="mt-2 rounded-lg border border-white/8 bg-slate-950/35 p-3 text-xs text-slate-300">
            <p>Game step {report.maneuver.timestep} · Δv {formatted(report.maneuver.deltaV)} game units · {report.maneuver.direction.replace('_', ' ')}</p>
            <p className="mt-1">Game feasibility: {report.maneuver.feasible === null ? 'Unavailable' : report.maneuver.feasible ? 'Passed' : 'Failed'} · strategy score: {report.maneuver.scoreEarned === null ? 'Unavailable' : `${report.maneuver.scoreEarned}/${report.maneuver.scorePossible}`}</p>
            <p className="mt-1">Game PoC trend before maneuver: {report.maneuver.observedPocChange === null ? 'Unavailable' : report.maneuver.observedPocChange.toExponential(3)} · game miss-distance trend: {formatted(report.maneuver.observedMissDistanceChange)} units</p>
            <p className="mt-1">Simulated result: fuel used {formatted(report.maneuver.estimatedFuelUse, 2)} game points · remaining {formatted(report.maneuver.estimatedFuelRemaining, 2)} game points · post-maneuver PoC {report.maneuver.estimatedPostManeuverPoc === null || report.maneuver.estimatedPostManeuverPoc === undefined ? 'Unavailable' : report.maneuver.estimatedPostManeuverPoc.toExponential(3)} · miss distance {formatted(report.maneuver.estimatedPostManeuverMissDistance)} game units.</p>
            <p className="mt-1 text-slate-400">{report.maneuver.message}</p>
          </div>
        ) : <p className="mt-2 text-sm text-slate-400">No maneuver assessment was recorded.</p>}
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">Simulated game status and estimates</h3>
        <div className="mt-2 rounded-lg border border-white/8 bg-slate-950/35 p-3 text-xs text-slate-300">
          <p>Game step {report.finalObservation.timestep}/20 · TCA {formatted(report.finalObservation.timeToTca)} game units · PoC {report.finalObservation.probabilityOfCollision === null ? 'Unavailable' : report.finalObservation.probabilityOfCollision.toExponential(3)} · miss distance {report.finalObservation.missDistance === null ? 'Unavailable' : `${formatted(report.finalObservation.missDistance, 2)} game units`} · fuel remaining {report.finalObservation.fuelRemaining === null ? 'Unavailable' : `${formatted(report.finalObservation.fuelRemaining, 1)} game points`}.</p>
          <p className="mt-1 text-slate-400">These are fictional game values. Maneuver post-burn estimates appear in the decision results above; they do not represent real fuel mass or orbital propagation.</p>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">Strengths</h3>
        <ul className="mt-2 space-y-1 text-xs text-slate-300">
          {report.maneuver?.feasible === true ? <li>Strength: the selected maneuver passed the simulated game feasibility rule.</li> : null}
          {predictionItems.some((item) => item.status === 'CORRECT') ? <li>Strength: at least one prediction matched the next simulated game step.</li> : null}
          {report.decisions.some((item) => item.action === 'ACT NOW' && !item.accepted) ? <li>Review: an ACT NOW attempt was rejected by the simulated game feasibility rule.</li> : null}
          {report.maneuver?.feasible === false ? <li>Review: an infeasible maneuver receives no maneuver score, irrespective of fuel use.</li> : null}
          <li>Learning note: use model recommendations, safety flags, observed data, and causal estimates as distinct evidence types.</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">Suggestions for improvement</h3>
        <ul className="mt-2 space-y-1 text-xs text-slate-300">
          {improvementNotes.length
            ? improvementNotes.map((note) => <li key={note}>{note}</li>)
            : <li>No scored prediction or maneuver issues were identified; outcome quality remains limited by unavailable physical-result ground truth.</li>}
        </ul>
      </section>

      {report.limitations.length ? (
        <div className="rounded-lg border border-amber-300/15 bg-amber-300/5 p-3 text-xs text-amber-100/80">
          <div className="font-semibold">Data limitations</div>
          <ul className="mt-1 list-disc space-y-1 pl-4">{report.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      ) : null}
    </div>
  );
}

export function MissionReportPanel(props: MissionReportPanelProps) {
  const report = props.history.find((item) => item.missionId === props.selectedHistoryId) ?? props.currentReport;
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.6fr)]">
      <GlassPanel className="space-y-5 p-5 sm:p-6">
        {report ? <SummaryDetail report={report} /> : (
          <div className="grid min-h-56 place-items-center text-center">
            <div>
              <Archive className="mx-auto h-8 w-8 text-cyan-200/60" aria-hidden="true" />
              <h2 className="mt-3 font-[Orbitron] text-lg text-white">Mission report not ready</h2>
              <p className="mt-2 max-w-md text-sm text-slate-400">Complete the encounter to generate and save a report. A current attempt that is still in progress is not archived.</p>
            </div>
          </div>
        )}
        {props.historyError ? (
          <p role="alert" className="flex gap-2 rounded-lg border border-rose-300/20 bg-rose-400/8 p-3 text-xs text-rose-100">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />{props.historyError}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 border-t border-white/8 pt-4">
          {props.missionActive ? (
            <button type="button" onClick={props.onFinalize} className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs text-amber-100 hover:bg-amber-300/20">
              Finish Mission & Save Report
            </button>
          ) : null}
          {report ? (
            <button type="button" onClick={() => props.onReplay(report.eventId)} className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-300/20">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />Replay This Scenario
            </button>
          ) : null}
          <button type="button" onClick={props.onNextScenario} disabled={!props.hasNextScenario} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40">Next Scenario</button>
        </div>
      </GlassPanel>

      <GlassPanel className="p-5">
        <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/55">Local mission history</div>
        <h2 className="mt-1 font-[Orbitron] text-lg text-white">Completed attempts</h2>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">Saved in this browser only; history does not sync to the backend or other devices.</p>
        {props.history.length ? (
          <ul className="mt-4 space-y-2">
            {props.history.map((item) => (
              <li key={item.missionId}>
                <button
                  type="button"
                  aria-pressed={props.selectedHistoryId === item.missionId}
                  onClick={() => props.onSelectHistory(item.missionId)}
                  className={`w-full rounded-lg border p-3 text-left ${props.selectedHistoryId === item.missionId ? 'border-cyan-200/35 bg-cyan-300/10' : 'border-white/8 bg-slate-950/35 hover:bg-white/5'}`}
                >
                  <span className="flex justify-between gap-2 text-xs font-semibold text-slate-100"><span>Event {item.eventId} · {item.eventName}</span><span>{item.totalScore === null ? '—' : `${item.totalScore}/100`}</span></span>
                  <span className="mt-1 block text-[10px] text-slate-500">{new Date(item.completedAt).toLocaleString()} · {item.finalTimestep}/20 observations</span>
                  <span className="mt-1 block text-[10px] text-slate-400">{statusLabel(item)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="mt-4 text-sm text-slate-400">No completed missions saved in this browser yet.</p>}
      </GlassPanel>
    </div>
  );
}
