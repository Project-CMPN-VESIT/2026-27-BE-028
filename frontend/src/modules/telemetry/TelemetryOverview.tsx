import { GlassPanel } from '../../components/ui/GlassPanel';
import { MetricCard } from '../../components/ui/MetricCard';
import { RiskTrendChart } from '../../components/charts/RiskTrendChart';
import type { MissionEvent, MissionTelemetry } from '../../types/mission';
import { formatDeltaV, formatKm, formatPercent } from '../../utils/format';

interface TelemetryOverviewProps {
  event?: MissionEvent | null;
  telemetry?: MissionTelemetry | null;
  cursor?: number;
}

export function TelemetryOverview({ event, telemetry, cursor = 100 }: TelemetryOverviewProps) {
  const current = telemetry?.samples[Math.min(telemetry.samples.length - 1, Math.max(0, Math.round((cursor / 100) * (telemetry.samples.length - 1))))];

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <GlassPanel className="min-h-[420px] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Live telemetry</div>
            <h3 className="mt-2 font-[Orbitron] text-2xl tracking-[0.1em] text-white">Probability of collision curve</h3>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-right">
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Peak PoC</div>
            <div className="font-[Orbitron] text-lg tracking-[0.08em] text-white">{telemetry ? formatPercent(telemetry.peakProbabilityOfCollision, 2) : '—'}</div>
          </div>
        </div>

        <div className="mt-5 h-[320px]">
          {telemetry ? <RiskTrendChart samples={telemetry.samples} /> : null}
        </div>
      </GlassPanel>

      <GlassPanel className="p-5">
        <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Snapshot</div>
        <h3 className="mt-2 font-[Orbitron] text-2xl tracking-[0.1em] text-white">Current telemetry state</h3>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <MetricCard label="Current PoC" value={current?.probabilityOfCollision ?? event?.probabilityOfCollision ?? 0} digits={2} tone="rose" note={event ? event.riskLevel : 'Waiting for event'} />
          <MetricCard label="Closest approach" value={current?.closestApproachKm ?? event?.closestApproachKm ?? 0} digits={1} suffix=" km" tone="cyan" note={event ? event.location : '—'} />
          <MetricCard label="Fuel remaining" value={current?.fuelRemainingPct ?? event?.fuelRemainingPct ?? 0} digits={1} suffix="%" tone="emerald" note="Remaining after maneuver" />
          <MetricCard label="Relative velocity" value={current?.relativeVelocityKmS ?? event?.relativeVelocityKmS ?? 0} digits={1} suffix=" km/s" tone="amber" note={formatDeltaV(event?.deltaVKmS ?? 0)} />
        </div>

        <div className="mt-5 rounded-[22px] border border-white/10 bg-slate-950/25 p-4">
          <div className="text-[11px] uppercase tracking-[0.3em] text-white/45">Trend cursor</div>
          <div className="mt-2 text-sm text-white/65">
            {current ? `At ${current.minute} minutes to TCA the solution holds ${formatPercent(current.confidencePct / 100, 0)} confidence.` : 'Select a scenario to inspect its timeline.'}
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
