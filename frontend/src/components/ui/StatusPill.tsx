import clsx from 'clsx';
import type { MissionRiskLevel } from '../../types/mission';

interface StatusPillProps {
  risk: MissionRiskLevel | string;
  className?: string;
}

const toneByRisk: Record<string, string> = {
  LOW: 'bg-emerald-500/18 text-emerald-200 ring-emerald-400/35',
  MEDIUM: 'bg-amber-500/18 text-amber-100 ring-amber-400/35',
  HIGH: 'bg-orange-500/18 text-orange-100 ring-orange-400/35',
  CRITICAL: 'bg-rose-500/18 text-rose-100 ring-rose-400/45',
};

export function StatusPill({ risk, className }: StatusPillProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ring-1 backdrop-blur-md',
        toneByRisk[risk] ?? 'bg-white/10 text-white/70 ring-white/10',
        className,
      )}
    >
      <span className="h-2 w-2 rounded-full bg-current shadow-[0_0_18px_currentColor]" />
      {risk}
    </span>
  );
}
