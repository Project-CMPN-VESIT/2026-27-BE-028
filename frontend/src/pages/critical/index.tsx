import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MissionShell } from '../../components/layout/MissionShell';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { DecisionWorkbench } from '../../modules/decision/DecisionWorkbench';
import { useMissionStore } from '../../store/missionStore';
import { formatMinutes, formatPercent } from '../../utils/format';

export default function CriticalModePage() {
  const navigate = useNavigate();
  const { events, selectedEvent, decision, loadEvents, acknowledgeAlert } = useMissionStore();

  useEffect(() => {
    if (!events.length) {
      void loadEvents();
    }
  }, [events.length, loadEvents]);

  return (
    <MissionShell title="Critical Mode" subtitle="Immediate maneuver alert state" tone="critical">
      <div className="space-y-6">
        <GlassPanel className="border-rose-400/30 bg-rose-500/10 p-6">
          <div className="text-center">
            <div className="text-[11px] uppercase tracking-[0.44em] text-rose-200/70">High collision risk detected</div>
            <div className="mt-4 font-[Orbitron] text-5xl tracking-[0.16em] text-white md:text-6xl">COMMIT</div>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-8 text-white/75">
              The current conjunction is in the critical zone. Execute a maneuver before the burn window closes and the miss distance collapses below the safety threshold.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/simulation')}
                className="rounded-full border border-cyan-300/30 bg-cyan-400/12 px-5 py-3 text-sm uppercase tracking-[0.24em] text-cyan-100 transition hover:bg-cyan-400/18"
              >
                Review simulation
              </button>
              <button
                type="button"
                onClick={acknowledgeAlert}
                className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm uppercase tracking-[0.24em] text-white transition hover:bg-white/10"
              >
                Acknowledge alert
              </button>
            </div>
          </div>
        </GlassPanel>

        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <GlassPanel className="p-5">
            <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Active alerts</div>
            <div className="mt-4 space-y-3 text-sm text-white/75">
              <div className="rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4">• Probability of collision rising faster than expected.</div>
              <div className="rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4">• Time to TCA collapsing below the safe maneuver horizon.</div>
              <div className="rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4">• Immediate action advised to preserve mission continuity.</div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-5">
            <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">System status</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Current event</div>
                <div className="mt-2 font-[Orbitron] text-2xl text-white">{selectedEvent?.eventId ?? '—'}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Confidence</div>
                <div className="mt-2 font-[Orbitron] text-2xl text-white">{decision ? formatPercent(decision.confidencePct / 100, 0) : '—'}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Burn window</div>
                <div className="mt-2 font-[Orbitron] text-2xl text-white">{decision ? formatMinutes(decision.burnWindowMinutes) : '—'}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Risk level</div>
                <div className="mt-2 font-[Orbitron] text-2xl text-rose-200">CRITICAL</div>
              </div>
            </div>
          </GlassPanel>
        </div>

        <DecisionWorkbench event={selectedEvent} decision={decision} critical />
      </div>
    </MissionShell>
  );
}
