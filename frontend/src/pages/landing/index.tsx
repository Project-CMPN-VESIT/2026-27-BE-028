import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MissionShell } from '../../components/layout/MissionShell';
import { OrbitalScene } from '../../components/three/OrbitalScene';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { MissionSummary } from '../../modules/mission/MissionSummary';
import { useMissionStore } from '../../store/missionStore';

export default function LandingPage() {
  const { events, selectedEvent, loading, loadEvents } = useMissionStore();

  useEffect(() => {
    if (!events.length) {
      void loadEvents();
    }
  }, [events.length, loadEvents]);

  return (
    <MissionShell title="Landing" subtitle="Mission Control for AI orbital collision avoidance">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <GlassPanel className="min-h-[700px] overflow-hidden p-0 xl:min-h-[760px]">
          <div className="grid h-full gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col justify-between p-6 lg:p-10">
              <div>
                <div className="text-[11px] uppercase tracking-[0.38em] text-cyan-200/55">Space Mission Control</div>
                <h2 className="mt-4 max-w-xl font-[Orbitron] text-5xl leading-tight tracking-[0.08em] text-white md:text-6xl">
                  Predict. Compare. Commit.
                </h2>
                <p className="mt-5 max-w-lg text-base leading-8 text-white/65">
                  OrbitalX unifies AI risk scoring, orbital telemetry, and maneuver execution into one cinematic control surface for collision avoidance.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                <Link to="/dashboard" className="rounded-full border border-cyan-400/30 bg-cyan-400/12 px-5 py-4 text-center text-sm uppercase tracking-[0.25em] text-cyan-100 transition hover:-translate-y-0.5 hover:bg-cyan-400/18">
                  Enter dashboard
                </Link>
                <Link to="/simulation" className="rounded-full border border-white/10 bg-white/6 px-5 py-4 text-center text-sm uppercase tracking-[0.25em] text-white transition hover:-translate-y-0.5 hover:bg-white/10">
                  Open simulation
                </Link>
              </div>
            </div>

            <div className="relative min-h-[420px] lg:min-h-full">
              <OrbitalScene event={selectedEvent} riskLevel={selectedEvent?.riskLevel ?? 'LOW'} />
              <div className="pointer-events-none absolute inset-x-4 bottom-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 backdrop-blur-xl">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Live catalog</div>
                  <div className="mt-2 font-[Orbitron] text-xl text-white">{loading ? 'Syncing' : `${events.length} events`}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 backdrop-blur-xl">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Selected event</div>
                  <div className="mt-2 font-[Orbitron] text-xl text-white">{selectedEvent?.eventId ?? 'Pending'}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 backdrop-blur-xl">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Risk level</div>
                  <div className="mt-2 font-[Orbitron] text-xl text-white">{selectedEvent?.riskLevel ?? 'LOW'}</div>
                </div>
              </div>
            </div>
          </div>
        </GlassPanel>

        <motion.div initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }} className="space-y-6">
          <GlassPanel className="p-6">
            <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Mission sequence</div>
            <div className="mt-3 space-y-3 text-sm text-white/70">
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">1. Event ingestion and telemetry normalization</div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">2. AI vs physics decision evaluation</div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">3. Maneuver planning and critical alert mode</div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">4. Validation and data exploration</div>
            </div>
          </GlassPanel>

          <MissionSummary events={events} selectedEvent={selectedEvent} loading={loading.events} />
        </motion.div>
      </div>
    </MissionShell>
  );
}
