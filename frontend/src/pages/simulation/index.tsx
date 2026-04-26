import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MissionShell } from '../../components/layout/MissionShell';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { OrbitalScene } from '../../components/three/OrbitalScene';
import { TelemetryOverview } from '../../modules/telemetry/TelemetryOverview';
import { DecisionWorkbench } from '../../modules/decision/DecisionWorkbench';
import { OrbitControlPanel } from '../../modules/visualization/OrbitControlPanel';
import { useMissionStore } from '../../store/missionStore';
import { StatusPill } from '../../components/ui/StatusPill';
import { formatPercent } from '../../utils/format';

export default function SimulationPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const {
    events,
    selectedEvent,
    telemetry,
    decision,
    loading,
    timelineCursor,
    isPlaying,
    criticalMode,
    loadEvents,
    selectEvent,
    setTimelineCursor,
    togglePlayback,
    triggerCriticalMode,
    clearCriticalMode,
  } = useMissionStore();

  useEffect(() => {
    if (!events.length) {
      void loadEvents();
    }
  }, [events.length, loadEvents]);

  useEffect(() => {
    const targetId = eventId ?? selectedEvent?.id ?? events[0]?.id;
    if (targetId) {
      void selectEvent(targetId);
    }
  }, [eventId, events, selectedEvent?.id, selectEvent]);

  useEffect(() => {
    if (!isPlaying) return undefined;

    const interval = window.setInterval(() => {
      setTimelineCursor((timelineCursor + 3) % 101);
    }, 350);

    return () => window.clearInterval(interval);
  }, [isPlaying, setTimelineCursor, timelineCursor]);

  useEffect(() => {
    if (selectedEvent?.riskLevel === 'CRITICAL') {
      triggerCriticalMode();
    }
  }, [selectedEvent?.riskLevel, triggerCriticalMode]);

  return (
    <MissionShell title="Simulation" subtitle="Event-driven orbital maneuver simulation">
      <div className="space-y-6">
        <div className="grid gap-5 xl:grid-cols-[1.28fr_0.72fr]">
          <GlassPanel className="min-h-[700px] p-4">
            <div className="flex flex-wrap items-center justify-between gap-4 px-2 py-1">
              <div>
                <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Orbit visualization</div>
                <h3 className="mt-2 font-[Orbitron] text-2xl tracking-[0.1em] text-white">Satellite, debris, and collision path</h3>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill risk={selectedEvent?.riskLevel ?? 'LOW'} />
                <button
                  type="button"
                  onClick={() => navigate('/critical')}
                  className="rounded-full border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-rose-100 transition hover:bg-rose-400/18"
                >
                  Critical mode
                </button>
              </div>
            </div>

            <div className="mt-4 h-[560px] overflow-hidden rounded-[26px] border border-white/8 bg-black/35">
              <OrbitalScene event={selectedEvent} riskLevel={selectedEvent?.riskLevel ?? 'LOW'} />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <GlassPanel className="p-4">
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Probability of collision</div>
                <div className="mt-3 font-[Orbitron] text-4xl text-white">{formatPercent(selectedEvent?.probabilityOfCollision ?? 0, 2)}</div>
              </GlassPanel>
              <GlassPanel className="p-4">
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Closest approach</div>
                <div className="mt-3 font-[Orbitron] text-4xl text-white">{selectedEvent?.closestApproachKm.toFixed(1) ?? '—'} km</div>
              </GlassPanel>
              <GlassPanel className="p-4">
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Remaining fuel</div>
                <div className="mt-3 font-[Orbitron] text-4xl text-white">{selectedEvent?.fuelRemainingPct.toFixed(0) ?? '—'}%</div>
              </GlassPanel>
            </div>
          </GlassPanel>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="space-y-5">
            <OrbitControlPanel
              event={selectedEvent}
              isPlaying={isPlaying}
              timelineCursor={timelineCursor}
              onTimelineChange={setTimelineCursor}
              onTogglePlay={togglePlayback}
            />
            <TelemetryOverview event={selectedEvent} telemetry={telemetry} cursor={timelineCursor} />
            <DecisionWorkbench event={selectedEvent} decision={decision} critical={criticalMode} />
          </motion.div>
        </div>
      </div>
      {loading.scenario ? <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/65 text-white/80 backdrop-blur-sm">Loading mission scenario…</div> : null}
    </MissionShell>
  );
}
