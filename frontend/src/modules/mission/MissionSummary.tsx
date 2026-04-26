import { GlassPanel } from '../../components/ui/GlassPanel';
import { MetricCard } from '../../components/ui/MetricCard';
import { StatusPill } from '../../components/ui/StatusPill';
import { formatDeltaV, formatKm, formatMinutes, formatPercent } from '../../utils/format';
import type { MissionEvent } from '../../types/mission';

interface MissionSummaryProps {
  events: MissionEvent[];
  selectedEvent?: MissionEvent | null;
  loading?: boolean;
}

export function MissionSummary({ events, selectedEvent, loading }: MissionSummaryProps) {
  const criticalCount = events.filter((event) => event.riskLevel === 'CRITICAL').length;
  const averagePoC = events.length === 0 ? 0 : events.reduce((sum, event) => sum + event.probabilityOfCollision, 0) / events.length;
  const averageDistance = events.length === 0 ? 0 : events.reduce((sum, event) => sum + event.closestApproachKm, 0) / events.length;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
      <GlassPanel className="p-6 xl:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Mission Overview</div>
            <h2 className="mt-3 font-[Orbitron] text-3xl tracking-[0.12em] text-white">Live conjunction summary</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
              Mission telemetry is streamed as an asynchronous service, with selected events driving the dashboard, simulation, analytics, and validation surfaces.
            </p>
          </div>
          <StatusPill risk={selectedEvent?.riskLevel ?? 'LOW'} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total events" value={events.length} tone="cyan" note={loading ? 'Syncing data...' : 'Mission catalog online'} />
          <MetricCard label="Critical events" value={criticalCount} tone="rose" note="Requires active monitoring" />
          <MetricCard label="Average PoC" value={averagePoC} digits={2} suffix="" tone="amber" note={formatPercent(averagePoC, 1)} />
          <MetricCard label="Average miss distance" value={averageDistance} digits={1} suffix=" km" tone="emerald" note={formatKm(averageDistance, 1)} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/45">Active event</div>
            <div className="mt-2 font-[Orbitron] text-2xl tracking-[0.08em] text-white">{selectedEvent?.eventId ?? '—'}</div>
            <div className="mt-3 text-sm text-white/70">{selectedEvent?.name ?? 'Select an event to begin.'}</div>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/45">Time to TCA</div>
            <div className="mt-2 font-[Orbitron] text-2xl tracking-[0.08em] text-white">{selectedEvent ? formatMinutes(selectedEvent.timeToTcaMinutes) : '—'}</div>
            <div className="mt-3 text-sm text-white/70">Feasibility window is actively recalculated.</div>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/45">Recommended ΔV</div>
            <div className="mt-2 font-[Orbitron] text-2xl tracking-[0.08em] text-white">{selectedEvent ? formatDeltaV(selectedEvent.deltaVKmS) : '—'}</div>
            <div className="mt-3 text-sm text-white/70">Optimized maneuver window is ready.</div>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="p-6 xl:p-7">
        <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Active Conjunctions</div>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <h3 className="font-[Orbitron] text-2xl tracking-[0.1em] text-white">Event pulse feed</h3>
            <p className="mt-2 text-sm text-white/60">High-risk encounters stay pinned to the top of the board.</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {events.slice(0, 4).map((event) => (
            <div key={event.id} className="rounded-[20px] border border-white/8 bg-slate-950/25 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-400/30 hover:bg-slate-900/35">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-[Orbitron] text-base tracking-[0.12em] text-white">{event.eventId}</div>
                  <div className="mt-1 text-sm text-white/60">{event.name}</div>
                </div>
                <StatusPill risk={event.riskLevel} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm text-white/70">
                <div>
                  <div className="text-white/40">PoC</div>
                  <div className="mt-1 font-[Orbitron] text-lg text-white">{formatPercent(event.probabilityOfCollision, 2)}</div>
                </div>
                <div>
                  <div className="text-white/40">TCA</div>
                  <div className="mt-1 font-[Orbitron] text-lg text-white">{formatMinutes(event.timeToTcaMinutes)}</div>
                </div>
                <div>
                  <div className="text-white/40">Miss</div>
                  <div className="mt-1 font-[Orbitron] text-lg text-white">{formatKm(event.closestApproachKm, 1)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
