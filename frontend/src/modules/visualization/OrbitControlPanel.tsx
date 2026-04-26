import { GlassPanel } from '../../components/ui/GlassPanel';
import type { MissionEvent } from '../../types/mission';
import { formatMinutes } from '../../utils/format';

interface OrbitControlPanelProps {
  event?: MissionEvent | null;
  isPlaying: boolean;
  timelineCursor: number;
  onTimelineChange: (value: number) => void;
  onTogglePlay: () => void;
}

export function OrbitControlPanel({ event, isPlaying, timelineCursor, onTimelineChange, onTogglePlay }: OrbitControlPanelProps) {
  const projectedMinutes = event ? Math.max(0, Math.round(event.timeToTcaMinutes * (1 - timelineCursor / 100))) : 0;

  return (
    <GlassPanel className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">Mission timeline</div>
          <h3 className="mt-2 font-[Orbitron] text-2xl tracking-[0.1em] text-white">Scrub the encounter window</h3>
        </div>
        <button
          type="button"
          onClick={onTogglePlay}
          className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm uppercase tracking-[0.24em] text-cyan-100 transition hover:-translate-y-0.5 hover:bg-cyan-400/18"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>

      <div className="mt-5 rounded-[22px] border border-white/10 bg-slate-950/25 p-4">
        <input
          type="range"
          min={0}
          max={100}
          value={timelineCursor}
          onChange={(event) => onTimelineChange(Number(event.target.value))}
          className="timeline-slider"
        />
        <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.28em] text-white/45">
          <span>Event start</span>
          <span>Current</span>
          <span>TCA</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
            <div className="text-[10px] uppercase tracking-[0.28em] text-white/45">Cursor</div>
            <div className="mt-2 font-[Orbitron] text-2xl text-white">{timelineCursor}%</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
            <div className="text-[10px] uppercase tracking-[0.28em] text-white/45">Remaining</div>
            <div className="mt-2 font-[Orbitron] text-2xl text-white">{event ? formatMinutes(projectedMinutes) : '—'}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
            <div className="text-[10px] uppercase tracking-[0.28em] text-white/45">Mode</div>
            <div className="mt-2 font-[Orbitron] text-2xl text-white">{isPlaying ? 'Live' : 'Hold'}</div>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}
