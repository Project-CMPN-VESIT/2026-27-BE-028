import clsx from 'clsx';
import { motion } from 'framer-motion';
import type { MissionEvent, MissionRiskLevel } from '../../types/mission';

interface OrbitalSceneProps {
  event?: MissionEvent | null;
  riskLevel?: MissionRiskLevel;
  compact?: boolean;
}

const ringClasses = [
  'border-cyan-300/35',
  'border-violet-300/28',
  'border-amber-300/24',
  'border-rose-300/24',
];

export function OrbitalScene({ event, riskLevel = event?.riskLevel ?? 'LOW', compact = false }: OrbitalSceneProps) {
  const accentClass = riskLevel === 'CRITICAL'
    ? 'from-rose-500/35 via-orange-400/15 to-transparent'
    : riskLevel === 'HIGH'
      ? 'from-orange-500/30 via-amber-400/14 to-transparent'
      : 'from-cyan-400/30 via-violet-400/14 to-transparent';

  const orbitScale = compact ? 'scale-[0.86]' : 'scale-100';

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent_48%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(3,7,20,0.94))]">
      <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.14),transparent_2px),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.12),transparent_2px),radial-gradient(circle_at_55%_75%,rgba(255,255,255,0.1),transparent_2px)] bg-[size:220px_220px]" />
      <div className="absolute inset-0 bg-[linear-gradient(transparent_49.5%,rgba(255,255,255,0.05)_50%,transparent_50.5%),linear-gradient(90deg,transparent_49.5%,rgba(255,255,255,0.05)_50%,transparent_50.5%)] bg-[size:100%_100%,100%_100%] opacity-12" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className={clsx('relative h-[78%] w-[78%] max-w-[760px] max-h-[760px]', orbitScale)}>
          <div className={clsx('absolute inset-1/2 h-[190px] w-[190px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-cyan-300/50 via-blue-400/18 to-transparent blur-2xl', accentClass)} />
          <div className="absolute inset-1/2 h-[120px] w-[120px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-cyan-200/90 via-blue-200/40 to-slate-950 shadow-[0_0_80px_rgba(34,211,238,0.28)]" />
          <div className="absolute inset-1/2 h-[92px] w-[92px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.92),rgba(59,130,246,0.45)_42%,rgba(15,23,42,0.95)_72%)]" />

          {[220, 310, 400, 490].map((size, index) => (
            <div
              key={size}
              className={clsx(
                'absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border opacity-80 shadow-[0_0_24px_rgba(34,211,238,0.08)]',
                ringClasses[index],
              )}
              style={{ width: size, height: size }}
            />
          ))}

          {[
            { size: 220, duration: 26, delay: 0, dot: 'bg-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.75)]' },
            { size: 310, duration: 32, delay: 4, dot: 'bg-violet-300 shadow-[0_0_24px_rgba(168,85,247,0.65)]' },
            { size: 400, duration: 38, delay: 8, dot: 'bg-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.6)]' },
            { size: 490, duration: 44, delay: 2, dot: 'bg-rose-300 shadow-[0_0_24px_rgba(244,63,94,0.6)]' },
          ].map((orbit, index) => (
            <motion.div
              key={`${orbit.size}-${index}`}
              className="absolute inset-1/2"
              style={{ width: orbit.size, height: orbit.size, marginLeft: -(orbit.size / 2), marginTop: -(orbit.size / 2) }}
              animate={{ rotate: 360 }}
              transition={{ duration: orbit.duration, repeat: Infinity, ease: 'linear', delay: orbit.delay }}
            >
              <div className="absolute left-1/2 top-0 h-full w-full">
                <div className={clsx('absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full', orbit.dot)} />
              </div>
            </motion.div>
          ))}

          <motion.div
            className="absolute inset-1/2 h-[110px] w-[110px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/5"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
            <div className="rounded-full border border-white/12 bg-slate-950/70 px-4 py-2 text-[10px] uppercase tracking-[0.34em] text-white/60">
              {event ? event.eventId : 'Orbital view'}
            </div>
            <div className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-1 text-xs uppercase tracking-[0.28em] text-cyan-100/80">
              {riskLevel} posture
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-4 bottom-4 flex flex-wrap gap-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 backdrop-blur-xl">
          <div className="text-[10px] uppercase tracking-[0.28em] text-white/45">Satellite</div>
          <div className="mt-1 text-sm text-white/85">{event?.satelliteName ?? 'Awaiting selection'}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 backdrop-blur-xl">
          <div className="text-[10px] uppercase tracking-[0.28em] text-white/45">Debris</div>
          <div className="mt-1 text-sm text-white/85">{event?.debrisName ?? 'Unknown object'}</div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent" />
    </div>
  );
}