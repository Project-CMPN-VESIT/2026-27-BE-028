import { useState } from 'react';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { StatusPill } from '../../components/ui/StatusPill';
import type { MissionDecision, MissionEvent, ModelPredictionResult } from '../../types/mission';
import { formatDeltaV, formatMinutes, formatPercent } from '../../utils/format';

interface DecisionWorkbenchProps {
  event?: MissionEvent | null;
  decision?: MissionDecision | null;
  critical?: boolean;
}

const DEFAULT_MODELS = ['LSTM', 'GRU', 'TCN', 'Transformer', 'PatchTST', 'XGBoost'];

export function DecisionWorkbench({ event, decision, critical }: DecisionWorkbenchProps) {
  const [selectedModelName, setSelectedModelName] = useState<string>('LSTM');

  // Build list of models from decision or defaults
  const modelsMap = decision?.models || {};
  const modelList: ModelPredictionResult[] = DEFAULT_MODELS.map((name) => {
    if (modelsMap[name]) {
      return modelsMap[name];
    }
    return {
      model_name: name,
      available: false,
      error: 'Model artifact not loaded',
      raw_prediction: 'N/A',
      raw_prediction_int: 0,
      commit_probability: 0.0,
      wait_probability: 1.0,
      symbolic_correction: false,
      symbolic_reason: 'Artifact not found in model_files/',
      final_prediction: 'WAIT',
      final_prediction_int: 0,
      forecast: 'Awaiting model inference',
      timesteps: [],
    };
  });

  const activeModel = modelList.find((m) => m.model_name === selectedModelName) || modelList[0];

  return (
    <div className="space-y-5">
      <GlassPanel className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">AI Decision Layer</div>
            <h3 className="mt-2 font-[Orbitron] text-2xl tracking-[0.1em] text-white">
              {event?.eventId ? `Event #${event.eventId}` : 'No event selected'}
            </h3>
          </div>
          {decision ? (
            <StatusPill risk={decision.status === 'FORCE_COMMIT' || critical ? 'CRITICAL' : decision.status === 'COMMIT' ? 'HIGH' : 'LOW'} />
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[22px] border border-white/10 bg-slate-950/25 p-4">
            <div className="text-[11px] uppercase tracking-[0.3em] text-white/45">Ensemble Consensus</div>
            <div className="mt-3 font-[Orbitron] text-3xl tracking-[0.12em] text-white">
              {decision?.recommendation ?? 'Awaiting analysis'}
            </div>
            <div className="mt-3 text-sm leading-7 text-white/65">
              {decision?.reason ?? 'Decision output will appear once the event scenario has loaded.'}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Confidence</div>
                <div className="mt-2 font-[Orbitron] text-2xl text-cyan-100">
                  {decision ? formatPercent(decision.confidencePct / 100, 0) : '—'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Burn Window</div>
                <div className="mt-2 font-[Orbitron] text-2xl text-cyan-100">
                  {decision ? formatMinutes(decision.burnWindowMinutes) : '—'}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-slate-950/25 p-4">
            <div className="text-[11px] uppercase tracking-[0.3em] text-white/45">Maneuver Options</div>
            <div className="mt-4 space-y-3">
              {decision?.options?.length ? (
                decision.options.map((option) => (
                  <div
                    key={option.label}
                    className={`rounded-2xl border p-3 ${
                      option.recommended ? 'border-cyan-400/40 bg-cyan-400/10' : 'border-white/8 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="font-[Orbitron] text-lg tracking-[0.08em] text-white">{option.label}</div>
                      {option.recommended ? (
                        <span className="text-xs uppercase tracking-[0.3em] text-cyan-200">recommended</span>
                      ) : null}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-sm text-white/65">
                      <div>
                        <span className="block text-white/40">ΔV</span>
                        {formatDeltaV(option.deltaVKmS)}
                      </div>
                      <div>
                        <span className="block text-white/40">Fuel</span>
                        {formatPercent(option.fuelUsePct / 100, 1)}
                      </div>
                      <div>
                        <span className="block text-white/40">Risk cut</span>
                        {formatPercent(option.riskReductionPct / 100, 0)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-white/55">No maneuver options loaded yet.</div>
              )}
            </div>
          </div>
        </div>

        {decision?.alerts?.length ? (
          <div
            className={`mt-4 rounded-[22px] border p-4 ${
              critical ? 'border-rose-400/40 bg-rose-400/10' : 'border-amber-400/30 bg-amber-400/10'
            }`}
          >
            <div className="text-[11px] uppercase tracking-[0.3em] text-white/45">System Alerts</div>
            <div className="mt-3 grid gap-2 text-sm text-white/75 md:grid-cols-2">
              {decision.alerts.map((alert) => (
                <div key={alert}>• {alert}</div>
              ))}
            </div>
          </div>
        ) : null}
      </GlassPanel>

      {/* 6-MODEL INFERENCE & SYMBOLIC SAFETY MATRIX */}
      <GlassPanel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Multi-Model Inference</div>
            <h3 className="mt-2 font-[Orbitron] text-xl tracking-[0.1em] text-white">6-Model Decision Matrix</h3>
          </div>
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-300/70">
            Raw Model Output vs Symbolic Safety Shield
          </div>
        </div>

        {/* Model Cards Grid */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modelList.map((m) => {
            const isSelected = selectedModelName === m.model_name;
            const isCommitRaw = m.raw_prediction === 'COMMIT';
            const isCommitFinal = m.final_prediction === 'COMMIT';
            const wasShielded = m.symbolic_correction;

            return (
              <div
                key={m.model_name}
                onClick={() => setSelectedModelName(m.model_name)}
                className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/40 shadow-lg shadow-cyan-950/50'
                    : 'border-white/10 bg-slate-950/30 hover:border-white/20 hover:bg-slate-900/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-[Orbitron] text-base font-bold tracking-wider text-white">
                    {m.model_name}
                  </span>
                  {m.available ? (
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                      UNAVAILABLE
                    </span>
                  )}
                </div>

                {m.available ? (
                  <div className="mt-3 space-y-2 text-xs">
                    {/* Raw Prediction */}
                    <div className="flex items-center justify-between rounded-lg bg-black/30 px-2.5 py-1.5">
                      <span className="text-white/50">Raw Model:</span>
                      <span
                        className={`font-semibold tracking-wider ${
                          isCommitRaw ? 'text-amber-300 font-bold' : 'text-cyan-300'
                        }`}
                      >
                        {m.raw_prediction} ({formatPercent(m.commit_probability, 1)})
                      </span>
                    </div>

                    {/* Symbolic Layer Shield */}
                    <div className="flex items-center justify-between rounded-lg bg-black/30 px-2.5 py-1.5">
                      <span className="text-white/50">Symbolic Shield:</span>
                      {wasShielded ? (
                        <span className="font-bold text-rose-400 uppercase tracking-wider">
                          SHIELD OVERRIDE
                        </span>
                      ) : (
                        <span className="text-emerald-400">PASSED</span>
                      )}
                    </div>

                    {/* Final Decision */}
                    <div className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5 border border-white/10">
                      <span className="text-white/70 font-medium">Final Decision:</span>
                      <span
                        className={`font-[Orbitron] font-bold tracking-widest text-sm ${
                          isCommitFinal ? 'text-emerald-400' : 'text-cyan-200'
                        }`}
                      >
                        {m.final_prediction}
                      </span>
                    </div>

                    {/* Reason if overridden */}
                    {wasShielded && (
                      <div className="mt-1 text-[11px] text-rose-300/90 leading-tight">
                        Reason: {m.symbolic_reason}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg bg-rose-950/20 p-2 text-xs text-rose-300/80">
                    {m.error || 'Model artifact not found in model_files/'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Model Detailed Inspector */}
        {activeModel && activeModel.available && activeModel.timesteps && activeModel.timesteps.length > 0 && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold tracking-wider text-cyan-200">
                {activeModel.model_name} — 20-Timestep Temporal Progression
              </div>
              <div className="text-xs text-white/50">{activeModel.forecast}</div>
            </div>

            <div className="mt-3 max-h-52 overflow-x-auto overflow-y-auto rounded-xl border border-white/8">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-900 text-[10px] uppercase tracking-wider text-white/50">
                  <tr>
                    <th className="px-3 py-2">Step</th>
                    <th className="px-3 py-2">TCA (hr)</th>
                    <th className="px-3 py-2">Feasible</th>
                    <th className="px-3 py-2">P(Commit)</th>
                    <th className="px-3 py-2">Raw Pred</th>
                    <th className="px-3 py-2">Shield Status</th>
                    <th className="px-3 py-2">Final Pred</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {activeModel.timesteps.map((t) => (
                    <tr key={t.timestep} className="hover:bg-white/5">
                      <td className="px-3 py-1.5 font-mono text-white/70">t={t.timestep}</td>
                      <td className="px-3 py-1.5 text-white/60">{t.time_to_tca.toFixed(1)}</td>
                      <td className="px-3 py-1.5">
                        {t.feasibility_flag === 1 ? (
                          <span className="text-emerald-400">Yes</span>
                        ) : (
                          <span className="text-rose-400">No</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-cyan-200">{(t.commit_prob * 100).toFixed(1)}%</td>
                      <td className="px-3 py-1.5">
                        <span
                          className={`font-semibold ${
                            t.raw_prediction === 'COMMIT' ? 'text-amber-300' : 'text-cyan-300'
                          }`}
                        >
                          {t.raw_prediction}
                        </span>
                      </td>
                      <td className="px-3 py-1.5">
                        {t.symbolic_correction ? (
                          <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-300">
                            Override: {t.symbolic_reason}
                          </span>
                        ) : (
                          <span className="text-white/40">Clean</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        <span
                          className={`font-bold font-[Orbitron] ${
                            t.final_prediction === 'COMMIT' ? 'text-emerald-400' : 'text-cyan-100'
                          }`}
                        >
                          {t.final_prediction}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
