import { useEffect, useState } from 'react';
import { Sparkles, Target, HelpCircle, Activity, BrainCircuit } from 'lucide-react';
import { MissionShell } from '../../components/layout/MissionShell';
import { GlassPanel } from '../../components/ui/GlassPanel';
import {
  fetchGlobalXai,
  fetchEventXai,
  requestXaiExplanation,
  type XaiGlobalItem,
  type XaiEventItem,
  type StructuredExplanation,
} from '../../services/api/causalXai';
import { useMissionStore } from '../../store/missionStore';
import { StructuredExplanationCard } from '../../components/ui/StructuredExplanationCard';

export default function XaiPage() {
  const { events, selectedEvent, selectEvent, loadEvents } = useMissionStore();
  const [activeEventId, setActiveEventId] = useState<string>('1');
  const [eventInput, setEventInput] = useState<string>('1');
  const [globalData, setGlobalData] = useState<XaiGlobalItem[]>([]);
  const [eventXaiData, setEventXaiData] = useState<XaiEventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Explanation request state
  const [explanation, setExplanation] = useState<StructuredExplanation | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanationError, setExplanationError] = useState<string | null>(null);

  useEffect(() => {
    if (!events.length) {
      void loadEvents();
    }
  }, [events.length, loadEvents]);

  useEffect(() => {
    if (selectedEvent?.id) {
      const clean = String(selectedEvent.id).replace(/^EVT-/i, '').replace(/^#/i, '').trim();
      setActiveEventId(clean);
      setEventInput(clean);
    }
  }, [selectedEvent?.id]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setExplanation(null);
    setExplanationError(null);

    Promise.all([fetchGlobalXai(), fetchEventXai(activeEventId)])
      .then(([gRes, eRes]) => {
        if (!active) return;
        setGlobalData(gRes?.data || []);
        setEventXaiData(eRes?.data || []);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeEventId]);

  const handleSelectEvent = (id: string | number) => {
    const raw = String(id).replace(/^EVT-/i, '').replace(/^#/i, '').trim();
    const num = Math.max(1, Math.min(6150, parseInt(raw, 10) || 1));
    const strId = String(num);
    setActiveEventId(strId);
    setEventInput(strId);
    void selectEvent(strId);
  };

  const handleRequestExplanation = async () => {
    setExplanationLoading(true);
    setExplanationError(null);
    try {
      const res = await requestXaiExplanation(activeEventId);
      setExplanation(res);
    } catch (err) {
      setExplanationError(err instanceof Error ? err.message : 'Failed to generate explanation');
    } finally {
      setExplanationLoading(false);
    }
  };

  // Group global features by model (top 5 each)
  const groupedGlobal = globalData.reduce<Record<string, XaiGlobalItem[]>>((acc, row) => {
    if (!acc[row.model]) acc[row.model] = [];
    if (acc[row.model].length < 5) acc[row.model].push(row);
    return acc;
  }, {});

  return (
    <MissionShell
      title="Explainable AI (XAI)"
      subtitle="Model-faithful feature attributions across deep sequential models and tree ensembles"
    >
      <div className="space-y-6">
        {/* EVENT SELECTOR & BENCHMARK PRESETS */}
        <GlassPanel className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wider text-white/50">Target Conjunction:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="6150"
                  value={eventInput}
                  onChange={(e) => setEventInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectEvent(eventInput)}
                  className="w-24 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 font-mono text-sm text-cyan-200 focus:border-cyan-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleSelectEvent(eventInput)}
                  className="rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-1.5 font-mono text-xs text-cyan-200 hover:bg-cyan-500/30"
                >
                  INSPECT
                </button>
              </div>
            </div>

            {/* PRESETS */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-white/40">Presets:</span>
              <button
                type="button"
                onClick={() => handleSelectEvent(1)}
                className={`rounded-full px-3 py-1 transition ${
                  activeEventId === '1'
                    ? 'border border-cyan-400/50 bg-cyan-400/20 text-cyan-200'
                    : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                #1 (Active Wait)
              </button>
              <button
                type="button"
                onClick={() => handleSelectEvent(2080)}
                className={`rounded-full px-3 py-1 transition ${
                  activeEventId === '2080'
                    ? 'border border-cyan-400/50 bg-cyan-400/20 text-cyan-200'
                    : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                #2080 (Operational)
              </button>
              <button
                type="button"
                onClick={() => handleSelectEvent(2594)}
                className={`rounded-full px-3 py-1 transition ${
                  activeEventId === '2594'
                    ? 'border border-cyan-400/50 bg-cyan-400/20 text-cyan-200'
                    : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                #2594 (Active Commit)
              </button>
              <button
                type="button"
                onClick={() => handleSelectEvent(6003)}
                className={`rounded-full px-3 py-1 transition ${
                  activeEventId === '6003'
                    ? 'border border-cyan-400/50 bg-cyan-400/20 text-cyan-200'
                    : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                #6003 (Medium PoC)
              </button>
              <button
                type="button"
                onClick={() => handleSelectEvent(5819)}
                className={`rounded-full px-3 py-1 transition ${
                  activeEventId === '5819'
                    ? 'border border-cyan-400/50 bg-cyan-400/20 text-cyan-200'
                    : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                #5819 (Low PoC)
              </button>
              <button
                type="button"
                onClick={() => handleSelectEvent(2)}
                className={`rounded-full px-3 py-1 transition ${
                  activeEventId === '2'
                    ? 'border border-cyan-400/50 bg-cyan-400/20 text-cyan-200'
                    : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                #2 (Post-TCA)
              </button>
            </div>
          </div>
        </GlassPanel>

        {/* NATURAL LANGUAGE EXPLANATION MODULE */}
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <HelpCircle className="h-5 w-5 text-cyan-300" />
              <div>
                <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Natural Language Reasoning</div>
                <h3 className="font-[Orbitron] text-xl tracking-[0.08em] text-white">
                  Why did the models make this decision?
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRequestExplanation}
              disabled={explanationLoading}
              className="flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/20 px-4 py-2 font-[Orbitron] text-xs font-bold uppercase tracking-wider text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {explanationLoading ? 'GENERATING RATIONALE...' : 'REQUEST EXPLANATION'}
            </button>
          </div>

          <p className="mt-2 text-xs text-white/60">
            Synthesizes factual event telemetry, multi-model consensus, and local attribution rankings into an auditable
            explanation.
          </p>

          {explanationError && (
            <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-300">
              {explanationError}
            </div>
          )}

          {explanation && (
            <div className="mt-5">
              <StructuredExplanationCard
                explanation={explanation}
                eventId={activeEventId}
                title="Explainable AI & Multi-Model Flight Rationale"
              />
            </div>
          )}
        </GlassPanel>

        {/* GLOBAL FEATURE IMPORTANCE & LOCAL ATTRIBUTION */}
        <div className="grid gap-6 xl:grid-cols-2">
          {/* GLOBAL FEATURE IMPORTANCE */}
          <GlassPanel className="p-6">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-cyan-300" />
              <div>
                <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Global Explainability</div>
                <h3 className="font-[Orbitron] text-xl tracking-[0.08em] text-white">
                  Global Feature Attributions (6 Models)
                </h3>
              </div>
            </div>
            <p className="mt-2 text-xs text-white/60">
              Integrated Gradients across neural sequence models and TreeSHAP across XGBoost trees.
            </p>

            <div className="mt-5 space-y-6">
              {Object.entries(groupedGlobal).map(([model, features]) => {
                const maxImp = Math.max(...features.map((f) => Number(f.importance) || 1));
                return (
                  <div key={model} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-[Orbitron] text-sm font-bold tracking-wider text-cyan-200">
                        {model}
                      </span>
                      <span className="text-[10px] uppercase text-white/40">Top Features</span>
                    </div>

                    <div className="space-y-1.5">
                      {features.map((item) => {
                        const pct = Math.min(100, Math.max(5, (Number(item.importance) / maxImp) * 100));
                        return (
                          <div key={item.feature} className="flex items-center gap-3 text-xs">
                            <span className="w-48 truncate font-mono text-white/75">{item.feature}</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-900">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-16 text-right font-mono text-white/50">
                              {Number(item.importance).toFixed(3)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {!Object.keys(groupedGlobal).length && (
                <div className="py-8 text-center text-sm text-white/40">
                  {loading ? 'Loading global XAI artifacts...' : 'Global feature importance artifact unavailable.'}
                </div>
              )}
            </div>
          </GlassPanel>

          {/* LOCAL EVENT-LEVEL ATTRIBUTION */}
          <GlassPanel className="p-6">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-cyan-300" />
              <div>
                <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Local Explainability</div>
                <h3 className="font-[Orbitron] text-xl tracking-[0.08em] text-white">
                  Event #{activeEventId} Attribution Ranking
                </h3>
              </div>
            </div>
            <p className="mt-2 text-xs text-white/60">
              Exact signed attributions directing the model towards WAIT vs COMMIT for this encounter.
            </p>

            <div className="mt-5 max-h-[500px] overflow-y-auto rounded-xl border border-white/8">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-900 text-[10px] uppercase tracking-wider text-white/50">
                  <tr>
                    <th className="px-3 py-2.5">Model</th>
                    <th className="px-3 py-2.5">Feature</th>
                    <th className="px-3 py-2.5 text-right">Attribution</th>
                    <th className="px-3 py-2.5 text-right">Magnitude</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {eventXaiData.slice(0, 25).map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="px-3 py-2 font-[Orbitron] font-bold text-white">{row.model}</td>
                      <td className="px-3 py-2 font-mono text-white/80">{row.feature}</td>
                      <td
                        className={`px-3 py-2 text-right font-mono ${
                          row.attribution > 0 ? 'text-amber-300' : 'text-cyan-300'
                        }`}
                      >
                        {row.attribution > 0 ? `+${row.attribution.toFixed(4)}` : row.attribution.toFixed(4)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-white/50">
                        {row.abs_attribution?.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                  {!eventXaiData.length && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-white/40">
                        {loading
                          ? 'Loading event attributions...'
                          : `Local attribution data currently unavailable for Event #${activeEventId}.`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassPanel>
        </div>
      </div>
    </MissionShell>
  );
}
