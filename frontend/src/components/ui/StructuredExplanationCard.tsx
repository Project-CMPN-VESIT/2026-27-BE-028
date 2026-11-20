import React from 'react';
import { Sparkles, Shield, Orbit, BrainCircuit, AlertTriangle, CheckCircle, Info, ChevronRight, Activity } from 'lucide-react';
import type { StructuredExplanation, StructuredSection } from '../../services/api/causalXai';

interface StructuredExplanationCardProps {
  explanation: StructuredExplanation;
  eventId?: string | number;
  title?: string;
}

export const StructuredExplanationCard: React.FC<StructuredExplanationCardProps> = ({
  explanation,
  eventId,
  title = 'Autonomous Flight Debrief & Rationale',
}) => {
  const isGemini = explanation.provider?.toLowerCase().includes('gemini');
  const sections = explanation.sections && explanation.sections.length > 0 ? explanation.sections : parseFallbackSections(explanation.explanation);

  const getToneClasses = (tone?: string) => {
    switch (tone) {
      case 'critical':
      case 'rose':
        return {
          border: 'border-rose-400/40',
          bg: 'bg-rose-950/20',
          badge: 'border-rose-400/40 bg-rose-500/20 text-rose-200',
          iconColor: 'text-rose-400',
          bulletDot: 'bg-rose-400',
        };
      case 'warning':
      case 'amber':
        return {
          border: 'border-amber-400/40',
          bg: 'bg-amber-950/20',
          badge: 'border-amber-400/40 bg-amber-500/20 text-amber-200',
          iconColor: 'text-amber-400',
          bulletDot: 'bg-amber-400',
        };
      case 'success':
      case 'emerald':
        return {
          border: 'border-emerald-400/40',
          bg: 'bg-emerald-950/20',
          badge: 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200',
          iconColor: 'text-emerald-400',
          bulletDot: 'bg-emerald-400',
        };
      case 'purple':
        return {
          border: 'border-purple-400/40',
          bg: 'bg-purple-950/20',
          badge: 'border-purple-400/40 bg-purple-500/20 text-purple-200',
          iconColor: 'text-purple-400',
          bulletDot: 'bg-purple-400',
        };
      case 'info':
      case 'cyan':
      default:
        return {
          border: 'border-cyan-400/40',
          bg: 'bg-cyan-950/20',
          badge: 'border-cyan-400/40 bg-cyan-500/20 text-cyan-200',
          iconColor: 'text-cyan-400',
          bulletDot: 'bg-cyan-400',
        };
    }
  };

  const getSectionIcon = (id: string, index: number) => {
    const key = id.toLowerCase();
    if (key.includes('decision') || key.includes('consensus')) return BrainCircuit;
    if (key.includes('causal') || key.includes('kinematic') || key.includes('astrodynamic')) return Orbit;
    if (key.includes('xai') || key.includes('factor') || key.includes('attribution')) return Sparkles;
    if (key.includes('what_if') || key.includes('counterfactual') || key.includes('sensitivity')) return Activity;
    if (key.includes('directive') || key.includes('shield') || key.includes('safety')) return Shield;
    return [BrainCircuit, Orbit, Sparkles, Activity, Shield][index % 5];
  };

  return (
    <div className="space-y-4 rounded-2xl border border-cyan-400/30 bg-slate-950/70 p-5 sm:p-6 backdrop-blur-xl shadow-2xl">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-2.5 text-cyan-300">
            {isGemini ? <Sparkles className="h-5 w-5 text-cyan-300 animate-pulse" /> : <Shield className="h-5 w-5 text-emerald-300" />}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-cyan-300/70">
              {isGemini ? 'Gemini 2.5 Flash Grounded AI' : 'Deterministic Astrodynamics Engine'}
            </div>
            <h4 className="font-[Orbitron] text-lg font-bold tracking-wide text-white">
              {title}
            </h4>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {eventId && (
            <span className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 font-mono text-xs font-semibold text-white/80">
              EVENT #{eventId}
            </span>
          )}
          <span className={`rounded-lg border px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider ${
            isGemini ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-200' : 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
          }`}>
            {explanation.status === 'success' ? 'AI SYNTHESIZED' : 'VERIFIED ENGINE'}
          </span>
        </div>
      </div>

      {/* EXECUTIVE HEADLINE */}
      {explanation.headline && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 text-sm font-medium text-white/90">
          <span className="font-[Orbitron] text-xs font-bold uppercase tracking-wider text-cyan-300 mr-2">
            Executive Summary:
          </span>
          {explanation.headline}
        </div>
      )}

      {/* STRUCTURED SECTIONS */}
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section, idx) => {
          const styles = getToneClasses(section.tone);
          const Icon = getSectionIcon(section.id, idx);
          const isWide = sections.length % 2 !== 0 && idx === sections.length - 1;

          return (
            <div
              key={section.id || idx}
              className={`rounded-xl border ${styles.border} ${styles.bg} p-4 transition-all hover:bg-white/[0.04] ${
                isWide ? 'md:col-span-2' : ''
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${styles.iconColor}`} />
                  <h5 className="font-[Orbitron] text-xs font-bold tracking-wider text-white">
                    {section.title}
                  </h5>
                </div>
                {section.badge && (
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase ${styles.badge}`}>
                    {section.badge}
                  </span>
                )}
              </div>

              {/* BULLETS */}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-xs text-white/85">
                  {section.bullets.map((bullet, bIdx) => {
                    const colonIdx = bullet.indexOf(':');
                    const hasKey = colonIdx > 0 && colonIdx < 35;
                    const keyPart = hasKey ? bullet.slice(0, colonIdx) : null;
                    const valPart = hasKey ? bullet.slice(colonIdx + 1) : bullet;

                    return (
                      <li key={bIdx} className="flex items-start gap-2">
                        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${styles.bulletDot}`} />
                        <span className="leading-relaxed">
                          {keyPart && <strong className="font-semibold text-white">{keyPart}: </strong>}
                          <span className="text-white/80">{valPart.trim()}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* NARRATIVE TEXT */}
              {section.text && (
                <p className="mt-2.5 border-t border-white/5 pt-2 text-xs leading-relaxed text-white/70">
                  {section.text}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* DISCLAIMER FOOTER */}
      <div className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-slate-900/60 px-3.5 py-2 text-[11px] text-white/50">
        <Info className="h-3.5 w-3.5 shrink-0 text-cyan-400/70" />
        <span>
          {explanation.disclaimer ||
            'Quantitative telemetry and Type-A astrodynamic safety shield constraints remain authoritative over natural-language interpretations.'}
        </span>
      </div>
    </div>
  );
};

// Fallback parser if plain markdown text is provided
function parseFallbackSections(markdownText: string): StructuredSection[] {
  if (!markdownText) return [];
  const parts = markdownText.split(/(?=###\s+)/g);
  const result: StructuredSection[] = [];

  for (const part of parts) {
    const lines = part.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    const titleLine = lines[0].startsWith('###') ? lines[0].replace('###', '').trim() : 'Flight Analysis';
    const bullets: string[] = [];
    const textLines: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('-') || line.startsWith('*')) {
        bullets.push(line.replace(/^[-*]\s*/, '').trim());
      } else {
        textLines.push(line);
      }
    }

    result.push({
      id: `sec_${result.length}`,
      title: titleLine,
      badge: 'FLIGHT METRICS',
      tone: result.length === 0 ? 'critical' : result.length === 1 ? 'info' : 'purple',
      bullets,
      text: textLines.join(' '),
    });
  }

  return result;
}
