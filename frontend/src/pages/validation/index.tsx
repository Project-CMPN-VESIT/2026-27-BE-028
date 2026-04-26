import { useEffect } from 'react';
import { MissionShell } from '../../components/layout/MissionShell';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { ComparisonChart } from '../../components/charts/ComparisonChart';
import { useMissionStore } from '../../store/missionStore';
import { formatPercent } from '../../utils/format';

export default function ValidationPage() {
  const { events, selectedEvent, validation, loadEvents } = useMissionStore();

  useEffect(() => {
    if (!events.length) {
      void loadEvents();
    }
  }, [events.length, loadEvents]);

  return (
    <MissionShell title="Validation" subtitle="AI versus physics model agreement">
      <div className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
        <GlassPanel className="min-h-[560px] p-5">
          <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Agreement view</div>
          <h3 className="mt-2 font-[Orbitron] text-2xl tracking-[0.1em] text-white">Physics and AI output comparison</h3>
          <div className="mt-5 h-[470px]">
            {validation ? <ComparisonChart metrics={validation.metrics} /> : null}
          </div>
        </GlassPanel>

        <GlassPanel className="min-h-[560px] p-5">
          <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Validation summary</div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Event</div>
              <div className="mt-2 font-[Orbitron] text-2xl text-white">{selectedEvent?.eventId ?? '—'}</div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Agreement score</div>
              <div className="mt-2 font-[Orbitron] text-2xl text-white">{validation ? formatPercent(validation.agreementScorePct / 100, 0) : '—'}</div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">AI risk</div>
              <div className="mt-2 font-[Orbitron] text-2xl text-white">{validation?.aiRiskLevel ?? '—'}</div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Physics risk</div>
              <div className="mt-2 font-[Orbitron] text-2xl text-white">{validation?.physicsRiskLevel ?? '—'}</div>
            </div>
          </div>

          <div className="mt-5 rounded-[22px] border border-white/10 bg-slate-950/25 p-4 text-sm leading-7 text-white/70">
            {validation?.consensus ?? 'Select an event to compare AI and physics outputs.'}
          </div>

          <div className="mt-4 space-y-3 text-sm text-white/70">
            {validation?.conflictSummary?.length ? validation.conflictSummary.map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-white/5 p-4">• {item}</div>
            )) : <div className="rounded-2xl border border-white/8 bg-white/5 p-4">No significant conflicts detected.</div>}
          </div>
        </GlassPanel>
      </div>
    </MissionShell>
  );
}
