import type { PropsWithChildren } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { APP_NAME, NAV_ITEMS } from '../../constants/navigation';
import { useMissionStore } from '../../store/missionStore';
import { formatTimestamp } from '../../utils/format';
import { StatusPill } from '../ui/StatusPill';

interface MissionShellProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  tone?: 'normal' | 'critical';
  className?: string;
}

export function MissionShell({ title, subtitle, tone = 'normal', className, children }: MissionShellProps) {
  const location = useLocation();
  const selectedEvent = useMissionStore((state) => state.selectedEvent);
  const lastSyncedAt = useMissionStore((state) => state.lastSyncedAt);

  return (
    <div className={clsx('relative min-h-screen overflow-hidden text-slate-50', tone === 'critical' ? 'bg-[#02040b]' : 'bg-[#020617]', className)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.20),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.14),transparent_22%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.12),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 orbital-starfield opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20" />

      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="sticky top-0 z-50 border-b border-white/8 bg-slate-950/40 backdrop-blur-2xl"
      >
        <div className="mx-auto flex max-w-[1600px] items-center gap-6 px-5 py-4 lg:px-8">
          <div className="flex items-center gap-4">
            <div>
              <div className="font-[Orbitron] text-2xl tracking-[0.18em] text-white">{APP_NAME}</div>
              <div className="text-[11px] uppercase tracking-[0.35em] text-cyan-200/60">Mission Command</div>
            </div>
          </div>

          <nav className="hidden flex-1 items-center justify-center gap-2 md:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => clsx(
                  'relative rounded-full px-4 py-2 text-sm uppercase tracking-[0.22em] transition duration-200',
                  isActive || location.pathname === item.path
                    ? 'text-white'
                    : 'text-white/55 hover:text-white',
                )}
              >
                {({ isActive }) => (
                  <span>
                    {item.label}
                    <span
                      className={clsx(
                        'absolute inset-x-3 -bottom-1 h-px rounded-full bg-gradient-to-r from-cyan-300 to-fuchsia-400 transition-opacity duration-300',
                        isActive ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-right md:block">
              <div className="text-[10px] uppercase tracking-[0.34em] text-white/45">Current event</div>
              <div className="font-[Orbitron] text-sm tracking-[0.18em] text-white">{selectedEvent?.eventId ?? 'No event selected'}</div>
            </div>
            <StatusPill risk={selectedEvent?.riskLevel ?? 'LOW'} />
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-right">
              <div className="text-[10px] uppercase tracking-[0.34em] text-white/45">Synced</div>
              <div className="font-[Orbitron] text-xs tracking-[0.16em] text-cyan-200">
                {lastSyncedAt ? formatTimestamp(lastSyncedAt) : 'Waiting for telemetry'}
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="relative mx-auto max-w-[1600px] px-5 pb-12 pt-8 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.38em] text-cyan-200/55">{title}</div>
            {subtitle ? <h1 className="mt-2 font-[Orbitron] text-4xl tracking-[0.06em] text-white md:text-5xl">{subtitle}</h1> : null}
          </div>
          <div className="text-sm text-white/50">{location.pathname}</div>
        </div>

        {children}
      </main>
    </div>
  );
}
