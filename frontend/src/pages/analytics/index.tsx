import { useEffect } from 'react';
import { MissionShell } from '../../components/layout/MissionShell';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { ComparisonChart } from '../../components/charts/ComparisonChart';
import { RiskTrendChart } from '../../components/charts/RiskTrendChart';
import { useMissionStore } from '../../store/missionStore';
import { formatPercent } from '../../utils/format';

export default function AnalyticsPage() {
  const { events, selectedEvent, telemetry, validation, loadEvents } = useMissionStore();

  useEffect(() => {
    if (!events.length) {
      void loadEvents();
    }
  }, [events.length, loadEvents]);

  return (
    <MissionShell title="Analytics" subtitle="Comparative mission analysis and insight generation">
      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <GlassPanel className="min-h-[560px] p-5">
          <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Telemetry trend</div>
          <h3 className="mt-2 font-[Orbitron] text-2xl tracking-[0.1em] text-white">Probability curve</h3>
          <div className="mt-5 h-[470px]">
            {telemetry ? <RiskTrendChart samples={telemetry.samples} /> : null}
          </div>
        </GlassPanel>

        <GlassPanel className="min-h-[560px] p-5">
          <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Validation comparison</div>
          <h3 className="mt-2 font-[Orbitron] text-2xl tracking-[0.1em] text-white">AI vs physics signals</h3>
          <div className="mt-5 h-[470px]">
            {validation ? <ComparisonChart metrics={validation.metrics} /> : null}
          </div>
        </GlassPanel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <GlassPanel className="p-5">
          <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Mission health</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Events loaded</div>
              <div className="mt-2 font-[Orbitron] text-3xl text-white">{events.length}</div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Current risk</div>
              <div className="mt-2 font-[Orbitron] text-3xl text-white">{selectedEvent?.riskLevel ?? 'LOW'}</div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Agreement score</div>
              <div className="mt-2 font-[Orbitron] text-3xl text-white">{validation ? formatPercent(validation.agreementScorePct / 100, 0) : '—'}</div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">AI consensus</div>
              <div className="mt-2 font-[Orbitron] text-3xl text-white">{validation?.aiRiskLevel ?? '—'}</div>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Insights</div>
          <div className="mt-4 space-y-3 text-sm leading-7 text-white/70">
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">• Live telemetry trends are rising in the lead-up to TCA.</div>
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">• Validation output shows close agreement between AI and physics estimates.</div>
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">• Event comparisons can be used to tune alert thresholds and burn timing.</div>
          </div>
        </GlassPanel>
      </div>
    </MissionShell>
  );
}
