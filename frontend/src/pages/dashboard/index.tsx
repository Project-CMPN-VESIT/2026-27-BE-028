import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Orbit, ShieldCheck, Sparkles, BrainCircuit, GitBranch, Workflow, Target } from 'lucide-react';
import { MissionShell } from '../../components/layout/MissionShell';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { OrbitalScene } from '../../components/three/OrbitalScene';
import { MissionSummary } from '../../modules/mission/MissionSummary';
import { useMissionStore } from '../../store/missionStore';
import { formatPercent } from '../../utils/format';
import { StatusPill } from '../../components/ui/StatusPill';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { events, selectedEvent, selectEvent, loadEvents } = useMissionStore();

  useEffect(() => {
    if (!events.length) {
      void loadEvents();
    }
  }, [events.length, loadEvents]);

  const activeEvents = events.slice(0, 5);

  const handleSelectPreset = (id: string | number) => {
    const strId = String(id);
    void selectEvent(strId);
    navigate(`/simulation/${strId}`);
  };

  return (
    <MissionShell title="Overview & Dashboard" subtitle="Mission Command, Orbital Telemetry, and Causal-XAI Decision Center">
      <div className="space-y-6">
        {/* TOP METRICS STRIP (INTEGRATED FROM CAUSAL-XAI & MISSION TELEMETRY) */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <GlassPanel className="p-5">
            <div className="text-[11px] uppercase tracking-[0.3em] text-white/45">Conjunction Dataset</div>
            <div className="mt-2 font-[Orbitron] text-3xl font-bold text-cyan-200">
              {events.length > 0 ? `${events.length}+` : '3,000'}
            </div>
            <div className="mt-2 text-xs text-white/50">60,000 observations / 20 steps per event</div>
          </GlassPanel>

          <GlassPanel className="p-5">
            <div className="text-[11px] uppercase tracking-[0.3em] text-white/45">Held-Out Test Set</div>
            <div className="mt-2 font-[Orbitron] text-3xl font-bold text-purple-300">400</div>
            <div className="mt-2 text-xs text-white/50">Strict event-level cluster isolation</div>
          </GlassPanel>

          <GlassPanel className="p-5">
            <div className="text-[11px] uppercase tracking-[0.3em] text-white/45">Model Fleet</div>
            <div className="mt-2 font-[Orbitron] text-3xl font-bold text-emerald-300">06</div>
            <div className="mt-2 text-xs text-white/50">GRU, LSTM, TCN, Transf, PatchTST, XGBoost</div>
          </GlassPanel>

          <GlassPanel className="p-5">
            <div className="text-[11px] uppercase tracking-[0.3em] text-white/45">Neuro-Symbolic Shield</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-[Orbitron] text-3xl font-bold text-emerald-400">ACTIVE</span>
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="mt-2 text-xs text-emerald-300/70">Hard physical constraint enforcement</div>
          </GlassPanel>
        </div>

        {/* RESEARCH PIPELINE STRIP (FROM CAUSAL-XAI) */}
        <GlassPanel className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Operational Workflow</div>
              <h3 className="font-[Orbitron] text-lg tracking-[0.08em] text-white">
                From Raw Telemetry Observation to Maneuver Commitment
              </h3>
            </div>
            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 font-mono text-xs text-emerald-300">
              ALL SERVICES CONNECTED
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 overflow-x-auto py-1">
            {[
              { num: '01', label: 'EVENT INGESTION', icon: Orbit, path: '/data-explorer' },
              { num: '02', label: '6-MODEL FLEET', icon: BrainCircuit, path: '/analytics' },
              { num: '03', label: 'XAI ATTRIBUTION', icon: Sparkles, path: '/xai' },
              { num: '04', label: 'CAUSAL DAG', icon: GitBranch, path: '/causal' },
              { num: '05', label: 'WHAT-IF SCM', icon: Workflow, path: '/what-if' },
              { num: '06', label: 'SAFETY SHIELD', icon: ShieldCheck, path: '/analytics' },
              { num: '07', label: 'MANEUVER COMMIT', icon: Target, path: '/simulation' },
            ].map((node, index) => {
              const Icon = node.icon;
              return (
                <div key={node.label} className="flex items-center gap-2">
                  <Link
                    to={node.path}
                    className="group flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/5 px-3 py-2 transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
                  >
                    <span className="font-mono text-xs text-white/40 group-hover:text-cyan-300">{node.num}</span>
                    <Icon className="h-4 w-4 text-cyan-400" />
                    <strong className="text-xs font-semibold tracking-wider text-white group-hover:text-cyan-100">
                      {node.label}
                    </strong>
                  </Link>
                  {index < 6 && <ChevronRight className="h-4 w-4 text-white/20" />}
                </div>
              );
            })}
          </div>
        </GlassPanel>

        {/* MISSION SUMMARY CARDS */}
        <MissionSummary events={events} selectedEvent={selectedEvent} />

        {/* ACTIVE QUEUE & 3D GLOBE */}
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <GlassPanel className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Active Conjunctions</div>
                <h3 className="mt-2 font-[Orbitron] text-2xl tracking-[0.1em] text-white">Mission Board</h3>
              </div>

              {/* QUICK BENCHMARK PRESETS (FROM CAUSAL-XAI) */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-white/40">Presets:</span>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(1)}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/70 hover:border-cyan-400/40 hover:text-white"
                >
                  #1 (Wait)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(2594)}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/70 hover:border-cyan-400/40 hover:text-white"
                >
                  #2594 (Commit)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(6003)}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/70 hover:border-cyan-400/40 hover:text-white"
                >
                  #6003 (Med PoC)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(2)}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/70 hover:border-cyan-400/40 hover:text-white"
                >
                  #2 (Post-TCA)
                </button>
                <Link
                  to="/data-explorer"
                  className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 font-semibold uppercase tracking-wider text-cyan-200 hover:bg-cyan-400/20"
                >
                  Full Catalog &rarr;
                </Link>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {activeEvents.map((event) => (
                <Link
                  key={event.id}
                  to={`/simulation/${event.id}`}
                  className="block rounded-[22px] border border-white/8 bg-slate-950/25 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-400/25 hover:bg-slate-900/35"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="font-[Orbitron] text-lg tracking-[0.1em] text-white">{event.eventId}</div>
                      <div className="mt-1 text-sm text-white/60">{event.name}</div>
                    </div>
                    <StatusPill risk={event.riskLevel} />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-4 text-sm text-white/65">
                    <div>
                      <span className="block text-white/40">PoC</span>
                      <span className="font-mono text-cyan-200">{formatPercent(event.probabilityOfCollision, 2)}</span>
                    </div>
                    <div>
                      <span className="block text-white/40">TCA</span>
                      <span className="font-mono text-white">{event.timeToTcaMinutes} min</span>
                    </div>
                    <div>
                      <span className="block text-white/40">Miss</span>
                      <span className="font-mono text-white">{event.closestApproachKm} km</span>
                    </div>
                    <div>
                      <span className="block text-white/40">&Delta;V</span>
                      <span className="font-mono text-emerald-300">{event.deltaVKmS} m/s</span>
                    </div>
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
