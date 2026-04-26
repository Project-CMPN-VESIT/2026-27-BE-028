import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MissionShell } from '../../components/layout/MissionShell';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { OrbitalScene } from '../../components/three/OrbitalScene';
import { MissionSummary } from '../../modules/mission/MissionSummary';
import { useMissionStore } from '../../store/missionStore';
import { formatPercent } from '../../utils/format';
import { StatusPill } from '../../components/ui/StatusPill';

export default function DashboardPage() {
  const { events, selectedEvent, loadEvents } = useMissionStore();

  useEffect(() => {
    if (!events.length) {
      void loadEvents();
    }
  }, [events.length, loadEvents]);

  const activeEvents = events.slice(0, 5);

  return (
    <MissionShell title="Dashboard" subtitle="Command overview and live event posture">
      <div className="space-y-6">
        <MissionSummary events={events} selectedEvent={selectedEvent} />

        <div className="grid gap-6 xl:grid-cols-[1fr_0.82fr]">
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Active event queue</div>
                <h3 className="mt-2 font-[Orbitron] text-2xl tracking-[0.1em] text-white">Mission board</h3>
              </div>
              <Link to="/data-explorer" className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm uppercase tracking-[0.22em] text-white transition hover:-translate-y-0.5 hover:bg-white/10">
                Explore data
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {activeEvents.map((event) => (
                <Link key={event.id} to={`/simulation/${event.id}`} className="block rounded-[22px] border border-white/8 bg-slate-950/25 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-400/25 hover:bg-slate-900/35">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="font-[Orbitron] text-lg tracking-[0.1em] text-white">{event.eventId}</div>
                      <div className="mt-1 text-sm text-white/60">{event.name}</div>
                    </div>
                    <StatusPill risk={event.riskLevel} />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-4 text-sm text-white/65">
                    <div><span className="block text-white/40">PoC</span>{formatPercent(event.probabilityOfCollision, 2)}</div>
                    <div><span className="block text-white/40">TCA</span>{event.timeToTcaMinutes} min</div>
                    <div><span className="block text-white/40">Miss</span>{event.closestApproachKm} km</div>
                    <div><span className="block text-white/40">ΔV</span>{event.deltaVKmS} m/s</div>
                  </div>
                </Link>
              ))}
            </div>
          </GlassPanel>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <GlassPanel className="h-full min-h-[500px] p-4">
              <OrbitalScene event={selectedEvent} riskLevel={selectedEvent?.riskLevel ?? 'LOW'} compact />
            </GlassPanel>
          </motion.div>
        </div>
      </div>
    </MissionShell>
  );
}
