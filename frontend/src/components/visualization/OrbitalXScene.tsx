import { useMemo } from 'react';

interface OrbitalXSceneProps {
  timestep: number;
  eventName: string;
  maneuver?: {
    direction: string;
    executionTimestep: number;
    deltaV: number;
  };
}

function pointOnEllipse(
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  angle: number,
) {
  return {
    x: centerX + radiusX * Math.cos(angle),
    y: centerY + radiusY * Math.sin(angle),
  };
}

export function OrbitalXScene({ timestep, eventName, maneuver }: OrbitalXSceneProps) {
  const progress = Math.max(0, Math.min(1, timestep / 19));
  const geometry = useMemo(() => {
    const satelliteAngle = -2.35 + progress * 2.45;
    const objectAngle = 0.96 - progress * 2.05;
    return {
      satellite: pointOnEllipse(380, 215, 250, 112, satelliteAngle),
      object: pointOnEllipse(380, 215, 220, 160, objectAngle),
      approach: pointOnEllipse(380, 215, 225, 133, 0.2 + progress * 0.1),
    };
  }, [progress]);

  return (
    <figure className="m-0 overflow-hidden rounded-2xl border border-cyan-300/15 bg-[#030914]/85">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-4 py-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-200/55">Encounter geometry</div>
          <div className="mt-1 text-sm font-semibold text-slate-100">{eventName}</div>
        </div>
        <span className="rounded-full border border-amber-300/25 bg-amber-300/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-100/80">
          Illustrative · not propagated
        </span>
      </div>

      <svg
        className="block h-auto w-full"
        viewBox="0 0 760 430"
        role="img"
        aria-label={`Illustrative Earth-centered orbit diagram for ${eventName}, observation ${timestep + 1} of 20`}
      >
        <defs>
          <radialGradient id="orbitalx-earth" cx="34%" cy="28%" r="75%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="45%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#071329" />
          </radialGradient>
          <radialGradient id="orbitalx-glow">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>
          <filter id="orbitalx-soft-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="orbitalx-maneuver-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L7,3 z" fill="#a78bfa" />
          </marker>
        </defs>

        <rect width="760" height="430" fill="#030914" />
        <g fill="#dbeafe" opacity="0.45">
          <circle cx="68" cy="57" r="1.5" />
          <circle cx="145" cy="135" r="1" />
          <circle cx="231" cy="48" r="1.3" />
          <circle cx="328" cy="93" r="1" />
          <circle cx="630" cy="75" r="1.5" />
          <circle cx="696" cy="158" r="1" />
          <circle cx="88" cy="318" r="1.2" />
          <circle cx="191" cy="382" r="1" />
          <circle cx="619" cy="354" r="1.2" />
          <circle cx="718" cy="281" r="1" />
        </g>

        <circle cx="380" cy="215" r="182" fill="url(#orbitalx-glow)" />
        <ellipse cx="380" cy="215" rx="250" ry="112" fill="none" stroke="#22d3ee" strokeOpacity="0.42" strokeWidth="1.4" />
        <ellipse cx="380" cy="215" rx="220" ry="160" fill="none" stroke="#f59e0b" strokeOpacity="0.35" strokeWidth="1.3" strokeDasharray="5 7" />
        <path d="M92 207 C 201 104, 546 67, 670 195" fill="none" stroke="#38bdf8" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="3 8" />

        <circle cx="380" cy="215" r="75" fill="url(#orbitalx-earth)" stroke="#7dd3fc" strokeOpacity="0.55" strokeWidth="1.5" />
        <path d="M332 175 C 346 164, 358 172, 360 183 C 369 190, 362 199, 354 202 C 346 213, 337 204, 330 198 Z" fill="#a7f3d0" fillOpacity="0.58" />
        <path d="M392 159 C 404 166, 411 177, 404 187 C 417 196, 408 204, 398 210 C 390 221, 378 211, 382 201 C 371 194, 383 185, 378 178 Z" fill="#a7f3d0" fillOpacity="0.45" />
        <path d="M420 226 C 434 229, 437 241, 426 248 C 417 258, 403 250, 405 241 Z" fill="#a7f3d0" fillOpacity="0.45" />
        <path d="M318 225 C 337 216, 350 226, 346 239 C 338 250, 326 248, 318 241 Z" fill="#a7f3d0" fillOpacity="0.35" />
        <text x="380" y="221" textAnchor="middle" fill="#e0f2fe" fontSize="10" fontFamily="sans-serif" letterSpacing="2">EARTH</text>

        <circle cx={geometry.approach.x} cy={geometry.approach.y} r="23" fill="#fb7185" fillOpacity="0.06" stroke="#fb7185" strokeOpacity="0.7" strokeDasharray="3 4" />
        <circle cx={geometry.approach.x} cy={geometry.approach.y} r="5" fill="#fb7185" fillOpacity="0.8" filter="url(#orbitalx-soft-glow)" />
        <text x={geometry.approach.x + 14} y={geometry.approach.y - 14} fill="#fda4af" fontSize="9" fontFamily="sans-serif">APPROACH REGION</text>

        <g transform={`translate(${geometry.satellite.x} ${geometry.satellite.y})`} filter="url(#orbitalx-soft-glow)">
          <rect x="-7" y="-3" width="14" height="6" rx="1" fill="#dbeafe" />
          <path d="M-7 -2 L-19 -9 L-19 9 L-7 2 M7 -2 L19 -9 L19 9 L7 2" fill="#22d3ee" fillOpacity="0.8" stroke="#a5f3fc" strokeWidth="0.8" />
        </g>
        <text x={geometry.satellite.x + 24} y={geometry.satellite.y + 4} fill="#a5f3fc" fontSize="10" fontFamily="sans-serif">PLAYER SATELLITE</text>

        {maneuver ? (
          <g>
            <line
              x1={geometry.satellite.x}
              y1={geometry.satellite.y}
              x2={geometry.satellite.x + (maneuver.direction === 'RADIAL' ? 0 : maneuver.direction === 'ALONG_TRACK' ? 42 : 30)}
              y2={geometry.satellite.y + (maneuver.direction === 'RADIAL' ? -42 : maneuver.direction === 'ALONG_TRACK' ? 0 : -30)}
              stroke="#a78bfa"
              strokeWidth="2"
              strokeDasharray="4 3"
              markerEnd="url(#orbitalx-maneuver-arrow)"
            />
            <text x={geometry.satellite.x + 4} y={geometry.satellite.y - 48} fill="#c4b5fd" fontSize="9" fontFamily="sans-serif">
              PLANNED BURN · STEP {maneuver.executionTimestep} · Δv {maneuver.deltaV.toFixed(3)}
            </text>
          </g>
        ) : null}

        <g transform={`translate(${geometry.object.x} ${geometry.object.y})`} filter="url(#orbitalx-soft-glow)">
          <path d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z" fill="#fbbf24" />
        </g>
        <text x={geometry.object.x + 13} y={geometry.object.y + 5} fill="#fde68a" fontSize="10" fontFamily="sans-serif">APPROACHING OBJECT</text>

        <g transform="translate(24 394)" fontFamily="sans-serif" fontSize="10">
          <circle cx="0" cy="0" r="4" fill="#22d3ee" />
          <text x="10" y="4" fill="#bae6fd">Satellite path</text>
          <circle cx="119" cy="0" r="4" fill="#fbbf24" />
          <text x="129" y="4" fill="#fde68a">Object path</text>
          <circle cx="232" cy="0" r="4" fill="#fb7185" />
          <text x="242" y="4" fill="#fecdd3">Predicted approach region</text>
        </g>
      </svg>
      <figcaption className="border-t border-white/8 px-4 py-2 text-xs text-slate-400">
        Positions move to reflect the selected observation only. Curves and closest-approach marker are illustrative and are not real orbital propagation.
      </figcaption>
    </figure>
  );
}
