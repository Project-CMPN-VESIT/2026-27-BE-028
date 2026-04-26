import { GlassPanel } from '../../components/ui/GlassPanel';
import { StatusPill } from '../../components/ui/StatusPill';
import type { MissionDecision, MissionEvent } from '../../types/mission';
import { formatDeltaV, formatMinutes, formatPercent } from '../../utils/format';

interface DecisionWorkbenchProps {
  event?: MissionEvent | null;
  decision?: MissionDecision | null;
  critical?: boolean;
}

export function DecisionWorkbench({ event, decision, critical }: DecisionWorkbenchProps) {
  return (
    <GlassPanel className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">AI decision layer</div>
          <h3 className="mt-2 font-[Orbitron] text-2xl tracking-[0.1em] text-white">{event?.eventId ?? 'No event selected'}</h3>
        </div>
        {decision ? <StatusPill risk={decision.status === 'FORCE_COMMIT' || critical ? 'CRITICAL' : decision.status === 'COMMIT' ? 'HIGH' : 'LOW'} /> : null}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[22px] border border-white/10 bg-slate-950/25 p-4">
          <div className="text-[11px] uppercase tracking-[0.3em] text-white/45">Recommendation</div>
          <div className="mt-3 font-[Orbitron] text-3xl tracking-[0.12em] text-white">{decision?.recommendation ?? 'Awaiting analysis'}</div>
          <div className="mt-3 text-sm leading-7 text-white/65">{decision?.reason ?? 'Decision output will appear once the event scenario has loaded.'}</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Confidence</div>
              <div className="mt-2 font-[Orbitron] text-2xl text-cyan-100">{decision ? formatPercent(decision.confidencePct / 100, 0) : '—'}</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Burn window</div>
              <div className="mt-2 font-[Orbitron] text-2xl text-cyan-100">{decision ? formatMinutes(decision.burnWindowMinutes) : '—'}</div>
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-slate-950/25 p-4">
          <div className="text-[11px] uppercase tracking-[0.3em] text-white/45">Maneuver options</div>
          <div className="mt-4 space-y-3">
            {decision?.options?.length ? decision.options.map((option) => (
              <div
                key={option.label}
                className={`rounded-2xl border p-3 ${option.recommended ? 'border-cyan-400/40 bg-cyan-400/10' : 'border-white/8 bg-white/5'}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="font-[Orbitron] text-lg tracking-[0.08em] text-white">{option.label}</div>
                  {option.recommended ? <span className="text-xs uppercase tracking-[0.3em] text-cyan-200">recommended</span> : null}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm text-white/65">
                  <div><span className="block text-white/40">ΔV</span>{formatDeltaV(option.deltaVKmS)}</div>
                  <div><span className="block text-white/40">Fuel</span>{formatPercent(option.fuelUsePct / 100, 1)}</div>
                  <div><span className="block text-white/40">Risk cut</span>{formatPercent(option.riskReductionPct / 100, 0)}</div>
                </div>
              </div>
            )) : <div className="text-sm text-white/55">No maneuver options loaded yet.</div>}
          </div>
        </div>
      </div>

      {decision?.alerts?.length ? (
        <div className={`mt-4 rounded-[22px] border p-4 ${critical ? 'border-rose-400/40 bg-rose-400/10' : 'border-amber-400/30 bg-amber-400/10'}`}>
          <div className="text-[11px] uppercase tracking-[0.3em] text-white/45">System alerts</div>
          <div className="mt-3 grid gap-2 text-sm text-white/75 md:grid-cols-2">
            {decision.alerts.map((alert) => <div key={alert}>• {alert}</div>)}
          </div>
        </div>
      ) : null}
    </GlassPanel>
  );
}
