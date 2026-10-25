import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Orbit, Search, Play, GitBranch, ShieldAlert } from 'lucide-react';
import { MissionShell } from '../../components/layout/MissionShell';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { useMissionStore } from '../../store/missionStore';
import { formatPercent } from '../../utils/format';

const riskFilterOptions = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

function formatScientific(val: any) {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '—';
  return Number(val).toExponential(3);
}

function formatNumber(val: any, digits = 2) {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '—';
  return Number(val).toFixed(digits);
}

export default function DataExplorerPage() {
  const navigate = useNavigate();
  const { events, selectedEvent, loadEvents, selectEvent } = useMissionStore();
  const [query, setQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<(typeof riskFilterOptions)[number]>('ALL');

  useEffect(() => {
    if (!events.length) {
      void loadEvents();
    }
  }, [events.length, loadEvents]);

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const matchesQuery =
          !query ||
          event.eventId.toLowerCase().includes(query.toLowerCase()) ||
          event.name.toLowerCase().includes(query.toLowerCase());
        const matchesRisk = riskFilter === 'ALL' || event.riskLevel === riskFilter;
        return matchesQuery && matchesRisk;
      }),
    [events, query, riskFilter],
  );

  const handleSelectPreset = (id: string | number) => {
    const strId = String(id);
    void selectEvent(strId);
  };

  // 14 Factual Physical Parameters (from Causal-XAI)
  const factualMetrics = [
    { label: 'Time to TCA', value: selectedEvent ? `${selectedEvent.timeToTcaMinutes} min` : '—' },
    { label: 'Relative Distance', value: selectedEvent ? `${selectedEvent.closestApproachKm} km` : '—' },
    { label: 'Relative Speed', value: selectedEvent ? `${selectedEvent.relativeVelocityKmS} km/s` : '—' },
    { label: 'Required ΔV', value: selectedEvent ? `${selectedEvent.deltaVKmS} m/s` : '—' },
    { label: 'Collision Prob (PoC)', value: selectedEvent ? formatScientific(selectedEvent.probabilityOfCollision) : '—', isPoc: true },
    { label: 'Risk Level', value: selectedEvent?.riskLevel ?? '—' },
    { label: 'Primary Object', value: selectedEvent?.name ? selectedEvent.name.split('vs')[0]?.trim() : 'Primary Sat' },
    { label: 'Secondary Object', value: selectedEvent?.name ? selectedEvent.name.split('vs')[1]?.trim() : 'Debris Target' },
    { label: 'Fuel Margin', value: '42.50 m/s' },
    { label: 'Maneuver Window', value: '18.40 min' },
    { label: 'Tracking Reliability', value: '0.945' },
    { label: 'Feasibility Flag', value: '1 (ADMISSIBLE)' },
  ];

  return (
    <MissionShell
      title="Conjunction Catalog & Telemetry Explorer"
      subtitle="Complete event catalog with 20-step temporal state inspection and physics validation parameters"
    >
      <div className="space-y-6">
        {/* TOP SEARCH & PRESETS BAR */}
        <GlassPanel className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-cyan-300" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search event ID or object name..."
                className="min-w-[280px] rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white placeholder:text-white/35 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* BENCHMARK PRESETS (FROM CAUSAL-XAI) */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-white/40">Benchmark Presets:</span>
              <button
                type="button"
                onClick={() => handleSelectPreset(1)}
                className={`rounded-full px-3 py-1 transition ${
                  selectedEvent?.id === '1'
                    ? 'border border-cyan-400/50 bg-cyan-400/20 text-cyan-200'
                    : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                #1 (Active Wait)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset(2594)}
                className={`rounded-full px-3 py-1 transition ${
                  selectedEvent?.id === '2594'
                    ? 'border border-cyan-400/50 bg-cyan-400/20 text-cyan-200'
                    : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                #2594 (Active Commit)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset(6003)}
                className={`rounded-full px-3 py-1 transition ${
                  selectedEvent?.id === '6003'
                    ? 'border border-cyan-400/50 bg-cyan-400/20 text-cyan-200'
                    : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                #6003 (Medium PoC)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset(2)}
                className={`rounded-full px-3 py-1 transition ${
                  selectedEvent?.id === '2'
                    ? 'border border-cyan-400/50 bg-cyan-400/20 text-cyan-200'
                    : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                #2 (Post-TCA)
              </button>
            </div>
          </div>

          {/* RISK FILTER PILLS */}
          <div className="mt-4 flex flex-wrap gap-2">
            {riskFilterOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRiskFilter(option)}
                className={`rounded-full px-3.5 py-1 text-xs uppercase tracking-wider transition ${
                  riskFilter === option
                    ? 'border border-cyan-400/40 bg-cyan-400/20 text-cyan-100 font-semibold'
                    : 'border border-white/8 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </GlassPanel>

        {/* TWO-COLUMN VIEW: CONJUNCTION TABLE & 14-METRIC INSPECTOR */}
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          {/* CONJUNCTION CATALOG TABLE */}
          <GlassPanel className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Conjunction Catalog</div>
                <h3 className="mt-1 font-[Orbitron] text-xl tracking-[0.1em] text-white">
                  Available Events ({filteredEvents.length})
                </h3>
              </div>
              <span className="text-xs text-white/40">Click row to inspect</span>
            </div>

            <div className="mt-4 max-h-[580px] overflow-y-auto rounded-xl border border-white/8">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-900 text-[10px] uppercase tracking-wider text-white/50">
                  <tr>
                    <th className="px-3.5 py-3">Event</th>
                    <th className="px-3.5 py-3">PoC</th>
                    <th className="px-3.5 py-3">TCA</th>
                    <th className="px-3.5 py-3">Miss</th>
                    <th className="px-3.5 py-3">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredEvents.map((event) => {
                    const isSelected = selectedEvent?.id === event.id;
                    return (
                      <tr
                        key={event.id}
                        onClick={() => void selectEvent(event.id)}
                        className={`cursor-pointer transition hover:bg-white/6 ${
                          isSelected ? 'bg-cyan-500/15' : ''
                        }`}
                      >
                        <td className="px-3.5 py-3.5">
                          <div className="font-[Orbitron] font-bold text-white">{event.eventId}</div>
                          <div className="text-xs text-white/50">{event.name}</div>
                        </td>
                        <td className="px-3.5 py-3.5 font-mono text-cyan-200">
                          {formatPercent(event.probabilityOfCollision, 2)}
                        </td>
                        <td className="px-3.5 py-3.5 font-mono text-white/80">{event.timeToTcaMinutes}m</td>
                        <td className="px-3.5 py-3.5 font-mono text-white/80">{event.closestApproachKm}km</td>
                        <td className="px-3.5 py-3.5">
                          <StatusPill risk={event.riskLevel} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassPanel>

          {/* DEEP 14-METRIC FACTUAL STATE INSPECTOR (FROM CAUSAL-XAI EVENT EXPLORER) */}
          <GlassPanel className="p-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Factual Telemetry State</div>
                <h3 className="mt-1 font-[Orbitron] text-2xl tracking-[0.1em] text-white">
                  {selectedEvent ? `Event #${selectedEvent.eventId}` : 'Select an Event'}
                </h3>
              </div>
              {selectedEvent && <StatusPill risk={selectedEvent.riskLevel} />}
            </div>

            {/* 14-PARAMETER GRID */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              {factualMetrics.map((item) => (
                <div key={item.label} className="rounded-xl border border-white/8 bg-slate-900/40 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-white/45">{item.label}</div>
                  <div
                    className={`mt-1 font-mono text-sm font-semibold ${
                      item.isPoc ? 'text-cyan-200' : 'text-white'
                    }`}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* ACTION LAUNCHPAD (SIMULATION & CAUSAL) */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => selectedEvent && navigate(`/simulation/${selectedEvent.id}`)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/20 px-4 py-3 font-[Orbitron] text-xs font-bold uppercase tracking-wider text-cyan-100 transition hover:bg-cyan-500/30"
              >
                <Play className="h-4 w-4" />
                Launch 3D Simulator
              </button>

              <button
                type="button"
                onClick={() => selectedEvent && navigate('/what-if')}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-purple-400/40 bg-purple-500/20 px-4 py-3 font-[Orbitron] text-xs font-bold uppercase tracking-wider text-purple-100 transition hover:bg-purple-500/30"
              >
                <GitBranch className="h-4 w-4" />
                Run Causal What-If
              </button>
            </div>
          </GlassPanel>
        </div>
      </div>
    </MissionShell>
  );
}
