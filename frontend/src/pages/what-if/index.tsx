import { useEffect, useState } from 'react';
import { Workflow, Target, Play, AlertTriangle, CheckCircle, XCircle, ArrowRight, BrainCircuit } from 'lucide-react';
import { MissionShell } from '../../components/layout/MissionShell';
import { GlassPanel } from '../../components/ui/GlassPanel';
import {
  fetchWhatIfScenarios,
  runInteractiveWhatIf,
  type CounterfactualData,
  type WhatIfResult,
} from '../../services/api/causalXai';
import { useMissionStore } from '../../store/missionStore';
import { formatMinutes, formatPercent } from '../../utils/format';
import { StructuredExplanationCard } from '../../components/ui/StructuredExplanationCard';

function formatNumber(value: any, digits = 3) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'Unavailable';
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: digits });
}

function formatScientific(value: any) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'Unavailable';
  return Number(value).toExponential(3);
}

function formatTca(value: any) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'Unavailable';
  const hours = Number(value);
  return hours < 0 ? `${formatNumber(Math.abs(hours), 2)}h ago` : `${formatNumber(hours, 2)}h left`;
}

export default function WhatIfPage() {
  const { events, selectedEvent, selectEvent, loadEvents } = useMissionStore();
  const [activeEventId, setActiveEventId] = useState<string>('1');
  const [eventInput, setEventInput] = useState<string>('1');
  const [data, setData] = useState<CounterfactualData | null>(null);
  const [intervention, setIntervention] = useState<'timing' | 'delta_v'>('timing');
  const [interventionValue, setInterventionValue] = useState<string>('30');
  const [whatIfResult, setWhatIfResult] = useState<WhatIfResult | null>(null);
  const [running, setRunning] = useState<boolean>(false);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    if (!events.length) {
      void loadEvents();
    }
  }, [events.length, loadEvents]);

  useEffect(() => {
    if (selectedEvent?.id) {
      const clean = String(selectedEvent.id).replace(/^EVT-/i, '').replace(/^#/i, '').trim();
      setActiveEventId(clean);
      setEventInput(clean);
    }
  }, [selectedEvent?.id]);

  useEffect(() => {
    let active = true;
    setWhatIfResult(null);
    setRunError(null);
    fetchWhatIfScenarios(activeEventId)
      .then((res) => {
        if (active) setData(res);
      })
      .catch(() => {
        if (active) setData(null);
      });
    return () => {
      active = false;
    };
  }, [activeEventId]);

  const handleSelectEvent = (id: string | number) => {
    const raw = String(id).replace(/^EVT-/i, '').replace(/^#/i, '').trim();
    const num = Math.max(1, Math.min(6150, parseInt(raw, 10) || 1));
    const strId = String(num);
    setActiveEventId(strId);
    setEventInput(strId);
    void selectEvent(strId);
  };

  const handleRunWhatIf = async () => {
    setRunning(true);
    setRunError(null);
    try {
      const body =
        intervention === 'timing'
          ? { intervention: 'timing' as const, delta_t_adv: Number(interventionValue) }
          : { intervention: 'delta_v' as const, scale_factor: Number(interventionValue) };
      const res = await runInteractiveWhatIf(activeEventId, body);
      setWhatIfResult(res);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'What-If evaluation failed');
    } finally {
      setRunning(false);
    }
  };

  const scenarios = data?.scenarios || [];
  const modelResponses = data?.model_responses || [];

  const comparisonRows = whatIfResult
    ? [
        {
          label: 'Probability of Collision (PoC)',
          factual: formatScientific(whatIfResult.factual?.poc),
          whatIf: formatScientific(whatIfResult.counterfactual?.poc),
          delta: formatScientific(whatIfResult.deltas?.delta_poc),
        },
        {
          label: 'Required Delta-V (m/s)',
          factual: formatNumber(whatIfResult.factual?.deltav_required, 4),
          whatIf: formatNumber(whatIfResult.counterfactual?.deltav_required, 4),
          delta: formatNumber(whatIfResult.deltas?.delta_deltav_required, 4),
        },
        {
          label: 'Fuel Margin',
          factual: formatNumber(whatIfResult.factual?.fuel_margin, 4),
          whatIf: formatNumber(whatIfResult.counterfactual?.fuel_margin, 4),
          delta: formatNumber(whatIfResult.deltas?.delta_fuel_margin, 4),
        },
        {
          label: 'Time to TCA',
          factual: formatTca(whatIfResult.factual?.time_to_TCA),
          whatIf: formatTca(whatIfResult.counterfactual?.time_to_TCA),
          delta: '—',
        },
      ]
    : [];

  return (
    <MissionShell
      title="What-If Counterfactual Analysis"
      subtitle="Structural Causal Model (SCM) sensitivity simulation under non-anticipative timing and impulse interventions"
    >
      <div className="space-y-6">
        {/* SCIENTIFIC POSTURE NOTICE */}
        <div className="flex items-start gap-4 rounded-2xl border border-amber-400/30 bg-amber-950/20 p-5 backdrop-blur-xl">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div className="space-y-1">
            <h4 className="font-[Orbitron] text-sm uppercase tracking-wider text-amber-200">
              Counterfactual Sensitivity Analysis (SCM)
            </h4>
            <p className="text-sm leading-relaxed text-white/70">
              What-if counterfactual scenarios modify supported state and decision variables to study sensitivity under
              a structural causal model. The analysis preserves non-anticipative isolation: future trajectory points do
              not leak into the decision state at epoch $t$.
            </p>
          </div>
        </div>

        {/* EVENT SELECTOR & BENCHMARK PRESETS */}
        <GlassPanel className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wider text-white/50">Active Event:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="6150"
                  value={eventInput}
                  onChange={(e) => setEventInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectEvent(eventInput)}
                  className="w-24 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 font-mono text-sm text-cyan-200 focus:border-cyan-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleSelectEvent(eventInput)}
                  className="rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-1.5 font-mono text-xs text-cyan-200 hover:bg-cyan-500/30"
                >
                  LOAD
                </button>
              </div>
            </div>

            {/* PRESETS */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-white/40">Benchmark Presets:</span>
              <button
                type="button"
                onClick={() => handleSelectEvent(1)}
                className={`rounded-full px-3 py-1 transition ${
                  activeEventId === '1'
                    ? 'border border-cyan-400/50 bg-cyan-400/20 text-cyan-200'
                    : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                #1 (Active Wait)
              </button>
              <button
                type="button"
                onClick={() => handleSelectEvent(2080)}
                className={`rounded-full px-3 py-1 transition ${
                  activeEventId === '2080'
                    ? 'border border-cyan-400/50 bg-cyan-400/20 text-cyan-200'
                    : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                #2080 (Operational)
              </button>
              <button
                type="button"
                onClick={() => handleSelectEvent(2594)}
                className={`rounded-full px-3 py-1 transition ${
                  activeEventId === '2594'
                    ? 'border border-cyan-400/50 bg-cyan-400/20 text-cyan-200'
                    : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                #2594 (Active Commit)
              </button>
              <button
                type="button"
                onClick={() => handleSelectEvent(6003)}
                className={`rounded-full px-3 py-1 transition ${
                  activeEventId === '6003'
                    ? 'border border-cyan-400/50 bg-cyan-400/20 text-cyan-200'
                    : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                #6003 (Medium PoC)
              </button>
              <button
                type="button"
                onClick={() => handleSelectEvent(5819)}
                className={`rounded-full px-3 py-1 transition ${
                  activeEventId === '5819'
                    ? 'border border-cyan-400/50 bg-cyan-400/20 text-cyan-200'
                    : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                #5819 (Low PoC)
              </button>
              <button
                type="button"
                onClick={() => handleSelectEvent(2)}
                className={`rounded-full px-3 py-1 transition ${
                  activeEventId === '2'
                    ? 'border border-cyan-400/50 bg-cyan-400/20 text-cyan-200'
                    : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                #2 (Post-TCA Closed)
              </button>
            </div>
          </div>
        </GlassPanel>

        {/* INTERACTIVE WHAT-IF SIMULATOR CONTROLS */}
        <GlassPanel className="p-6">
          <div className="flex items-center gap-3">
            <Workflow className="h-5 w-5 text-cyan-300" />
            <div>
              <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Live SCM Interventions</div>
              <h3 className="font-[Orbitron] text-xl tracking-[0.08em] text-white">
                Interactive Sensitivity Simulator
              </h3>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/50">Intervention Mode</label>
              <select
                value={intervention}
                onChange={(e) => {
                  const val = e.target.value as 'timing' | 'delta_v';
                  setIntervention(val);
                  setInterventionValue(val === 'timing' ? '30' : '1.2');
                }}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-cyan-200 focus:border-cyan-400 focus:outline-none"
              >
                <option value="timing">Timing Advance Sensitivity</option>
                <option value="delta_v">Delta-V Scaling Sensitivity</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-white/50">
                {intervention === 'timing' ? 'Advance Duration (&Delta;t)' : 'Thrust Scaling Factor'}
              </label>
              <select
                value={interventionValue}
                onChange={(e) => setInterventionValue(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
              >
                {intervention === 'timing' ? (
                  <>
                    <option value="10">+10.0 Hours Earlier</option>
                    <option value="30">+30.0 Hours Earlier</option>
                    <option value="60">+60.0 Hours Earlier</option>
                  </>
                ) : (
                  <>
                    <option value="0.8">0.8x Maneuver Budget (Reduced)</option>
                    <option value="1.2">1.2x Maneuver Budget (Enhanced)</option>
                    <option value="1.5">1.5x Maneuver Budget (Maximum)</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleRunWhatIf}
                disabled={running}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-500/20 px-5 py-2.5 font-[Orbitron] text-xs font-bold uppercase tracking-wider text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                {running ? 'PROPAGATING...' : 'RUN WHAT-IF'}
              </button>
            </div>
          </div>

          {runError && (
            <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-300">
              {runError}
            </div>
          )}

          {/* SIMULATION RESULTS VIEW */}
          {whatIfResult && (
            <div className="mt-6 space-y-5 rounded-2xl border border-cyan-400/30 bg-slate-950/80 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em] text-cyan-200/60">
                    Intervention Evaluated
                  </div>
                  <h4 className="font-[Orbitron] text-lg font-bold text-white">
                    {intervention === 'timing'
                      ? `Maneuver Advanced by +${interventionValue} Hours`
                      : `Delta-V Scaled by ${interventionValue}x`}
                  </h4>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-lg border px-3 py-1 font-mono text-xs font-bold uppercase ${
                      whatIfResult.counterfactual_admissible
                        ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200'
                        : 'border-rose-400/40 bg-rose-500/20 text-rose-200'
                    }`}
                  >
                    {whatIfResult.counterfactual_admissible ? 'ADMISSIBLE (PASS)' : 'SHIELD VIOLATION'}
                  </span>

                  <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-white/80">
                    STATUS: {whatIfResult.operational_status || 'NOMINAL'}
                  </span>
                </div>
              </div>

              {/* FACTUAL VS WHAT-IF SIDE-BY-SIDE COMPARISON */}
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wider text-white/50">
                    <tr>
                      <th className="px-4 py-3">Variable</th>
                      <th className="px-4 py-3 text-cyan-200">Factual State</th>
                      <th className="px-4 py-3 text-amber-300">Counterfactual (What-If)</th>
                      <th className="px-4 py-3 text-purple-300">Delta (&Delta;)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {comparisonRows.map((row) => (
                      <tr key={row.label} className="hover:bg-white/5">
                        <td className="px-4 py-3 font-medium text-white/80">{row.label}</td>
                        <td className="px-4 py-3 font-mono text-cyan-200">{row.factual}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-white">{row.whatIf}</td>
                        <td className="px-4 py-3 font-mono text-purple-300">{row.delta}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* STRUCTURED CAUSAL MECHANISM ANALYSIS */}
              {whatIfResult.deterministic_explanation && (
                <div className="mt-4">
                  <StructuredExplanationCard
                    explanation={whatIfResult.deterministic_explanation}
                    eventId={activeEventId}
                    title="Causal Mechanics & What-If Sensitivity Analysis"
                  />
                </div>
              )}
            </div>
          )}
        </GlassPanel>

        {/* HISTORICAL ARTIFACT SCENARIOS TABLE */}
        <div className="grid gap-6 xl:grid-cols-2">
          {/* PRECOMPUTED BENCHMARK SCENARIOS */}
          <GlassPanel className="p-6">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-cyan-300" />
              <div>
                <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Precomputed Scenarios</div>
                <h3 className="font-[Orbitron] text-lg tracking-[0.08em] text-white">
                  Validated Sensitivity Scenarios
                </h3>
              </div>
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto rounded-xl border border-white/8">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-900 text-[10px] uppercase tracking-wider text-white/50">
                  <tr>
                    <th className="px-3 py-2.5">Intervention</th>
                    <th className="px-3 py-2.5">Factual PoC</th>
                    <th className="px-3 py-2.5">What-If PoC</th>
                    <th className="px-3 py-2.5">&Delta; PoC</th>
                    <th className="px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {scenarios.map((s, idx) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="px-3 py-2 font-mono text-white/80">{s.intervention_type}</td>
                      <td className="px-3 py-2 font-mono text-cyan-200">{formatScientific(s.factual_poc)}</td>
                      <td className="px-3 py-2 font-mono text-white">{formatScientific(s.counterfactual_poc)}</td>
                      <td className="px-3 py-2 font-mono text-purple-300">{formatScientific(s.delta_poc)}</td>
                      <td className="px-3 py-2">
                        {s.is_physically_admissible ? (
                          <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                            PASS
                          </span>
                        ) : (
                          <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                            FAIL
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!scenarios.length && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-white/40">
                        No precomputed sensitivity scenarios loaded for Event #{activeEventId}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassPanel>

          {/* 6-MODEL SENSITIVITY RESPONSES */}
          <GlassPanel className="p-6">
            <div className="flex items-center gap-3">
              <BrainCircuit className="h-5 w-5 text-cyan-300" />
              <div>
                <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Model Sensitivity</div>
                <h3 className="font-[Orbitron] text-lg tracking-[0.08em] text-white">
                  6-Model Response to Counterfactuals
                </h3>
              </div>
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto rounded-xl border border-white/8">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-900 text-[10px] uppercase tracking-wider text-white/50">
                  <tr>
                    <th className="px-3 py-2.5">Model</th>
                    <th className="px-3 py-2.5">Intervention</th>
                    <th className="px-3 py-2.5">Factual P(C)</th>
                    <th className="px-3 py-2.5">What-If P(C)</th>
                    <th className="px-3 py-2.5">Shifted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {modelResponses.map((m, idx) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="px-3 py-2 font-[Orbitron] font-bold text-white">{m.model}</td>
                      <td className="px-3 py-2 font-mono text-white/70">{m.intervention_type}</td>
                      <td className="px-3 py-2 font-mono text-cyan-200">{formatPercent(m.factual_prob_commit, 1)}</td>
                      <td className="px-3 py-2 font-mono text-white">{formatPercent(m.counterfactual_prob_commit, 1)}</td>
                      <td className="px-3 py-2">
                        {m.prediction_changed ? (
                          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                            YES
                          </span>
                        ) : (
                          <span className="text-white/40">NO</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!modelResponses.length && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-white/40">
                        Run interactive What-If above to observe multi-model sensitivity shifts.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassPanel>
        </div>
      </div>
    </MissionShell>
  );
}
