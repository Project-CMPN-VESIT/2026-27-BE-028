import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MissionShell } from '../../components/layout/MissionShell';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { useMissionStore } from '../../store/missionStore';
import { formatPercent } from '../../utils/format';

const riskFilterOptions = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

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
    () => events.filter((event) => {
      const matchesQuery = !query || event.eventId.toLowerCase().includes(query.toLowerCase()) || event.name.toLowerCase().includes(query.toLowerCase());
      const matchesRisk = riskFilter === 'ALL' || event.riskLevel === riskFilter;
      return matchesQuery && matchesRisk;
    }),
    [events, query, riskFilter],
  );

  return (
    <MissionShell title="Data Explorer" subtitle="Interactive event catalog and simulation launchpad">
      <div className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
        <GlassPanel className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Event library</div>
              <h3 className="mt-2 font-[Orbitron] text-2xl tracking-[0.1em] text-white">Conjunction table</h3>
            </div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search event or object"
              className="min-w-[280px] rounded-full border border-white/10 bg-slate-950/35 px-5 py-3 text-sm text-white placeholder:text-white/35 focus:border-cyan-400/40 focus:outline-none"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {riskFilterOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRiskFilter(option)}
                className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.24em] transition ${riskFilter === option ? 'bg-cyan-400/18 text-cyan-100' : 'bg-white/6 text-white/60 hover:bg-white/10 hover:text-white'}`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="mt-5 overflow-hidden rounded-[24px] border border-white/8">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-white/8 text-[11px] uppercase tracking-[0.28em] text-white/45">
                <tr>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">PoC</th>
                  <th className="px-4 py-3">TCA</th>
                  <th className="px-4 py-3">Miss</th>
                  <th className="px-4 py-3">Risk</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <tr
                    key={event.id}
                    onClick={() => {
                      void selectEvent(event.id);
                      navigate(`/simulation/${event.id}`);
                    }}
                    className={`cursor-pointer border-t border-white/6 transition hover:bg-white/6 ${selectedEvent?.id === event.id ? 'bg-cyan-400/8' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <div className="font-[Orbitron] text-base tracking-[0.08em] text-white">{event.eventId}</div>
                      <div className="mt-1 text-xs text-white/50">{event.name}</div>
                    </td>
                    <td className="px-4 py-4 text-white/80">{formatPercent(event.probabilityOfCollision, 2)}</td>
                    <td className="px-4 py-4 text-white/80">{event.timeToTcaMinutes} min</td>
                    <td className="px-4 py-4 text-white/80">{event.closestApproachKm} km</td>
                    <td className="px-4 py-4"><StatusPill risk={event.riskLevel} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Selected preview</div>
          <h3 className="mt-2 font-[Orbitron] text-2xl tracking-[0.1em] text-white">{selectedEvent?.eventId ?? 'Select an event'}</h3>
          <div className="mt-5 space-y-4 text-sm text-white/70">
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">Risk level: {selectedEvent?.riskLevel ?? '—'}</div>
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">PoC: {selectedEvent ? formatPercent(selectedEvent.probabilityOfCollision, 2) : '—'}</div>
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">Relative velocity: {selectedEvent?.relativeVelocityKmS ?? '—'} km/s</div>
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">Status: {selectedEvent?.status ?? '—'}</div>
          </div>

          <div className="mt-5 rounded-[24px] border border-white/8 bg-slate-950/25 p-4 text-sm leading-7 text-white/65">
            Click any row to push the event into the simulation surface. The dataset layer is asynchronous and can be swapped with a real backend without changing the page structure.
          </div>
        </GlassPanel>
      </div>
    </MissionShell>
  );
}
