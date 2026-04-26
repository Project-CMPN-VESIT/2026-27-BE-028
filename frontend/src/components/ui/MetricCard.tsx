import clsx from 'clsx';
import { AnimatedNumber } from './AnimatedNumber';

interface MetricCardProps {
  label: string;
  value: number;
  suffix?: string;
  tone?: 'cyan' | 'amber' | 'rose' | 'emerald';
  digits?: number;
  note?: string;
}

const toneClasses: Record<NonNullable<MetricCardProps['tone']>, string> = {
  cyan: 'from-cyan-400/20 to-blue-500/10 text-cyan-100',
  amber: 'from-amber-400/20 to-orange-500/10 text-amber-100',
  rose: 'from-rose-400/20 to-red-500/10 text-rose-100',
  emerald: 'from-emerald-400/20 to-teal-500/10 text-emerald-100',
};

export function MetricCard({ label, value, suffix, tone = 'cyan', digits = 0, note }: MetricCardProps) {
  return (
    <div className={clsx('rounded-[22px] border border-white/10 bg-white/6 p-4 backdrop-blur-xl', toneClasses[tone])}>
      <div className="text-[11px] uppercase tracking-[0.28em] text-white/50">{label}</div>
      <div className="mt-3 flex items-end gap-2">
        <AnimatedNumber value={value} digits={digits} suffix={suffix} className="font-[Orbitron] text-3xl leading-none text-white" />
      </div>
      {note ? <div className="mt-3 text-sm text-white/70">{note}</div> : null}
    </div>
  );
}
