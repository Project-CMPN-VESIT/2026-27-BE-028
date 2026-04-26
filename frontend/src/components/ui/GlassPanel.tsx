import type { PropsWithChildren } from 'react';
import clsx from 'clsx';

interface GlassPanelProps extends PropsWithChildren {
  className?: string;
  accentClassName?: string;
}

export function GlassPanel({ children, className, accentClassName }: GlassPanelProps) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-[28px] border border-white/10 bg-white/7 backdrop-blur-2xl shadow-[0_24px_120px_rgba(2,8,23,0.45)]',
        className,
      )}
    >
      <div className={clsx('pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-70', accentClassName)} />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
