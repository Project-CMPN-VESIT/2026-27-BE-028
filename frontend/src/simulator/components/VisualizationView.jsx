import { ORBIT_PRESETS } from '../services/orbitMath';
import styles from '../styles/SimulatorTabs.module.css';

const orbitLabelMap = {
  iss: 'ISS (Low Earth Orbit)',
  elliptical: 'Elliptical Conjunction',
  molniya: 'Molniya High Inclination',
  geo: 'Geostationary (GEO)',
  custom: 'Custom Radar TLE'
};

const burnButtons = [
  { type: 'prograde', label: 'Prograde', symbol: '▲', desc: 'Raises Apogee' },
  { type: 'retrograde', label: 'Retrograde', symbol: '▼', desc: 'Lowers Perigee' },
  { type: 'radial_out', label: 'Radial Out', symbol: '↗', desc: 'Rotates Apsides' },
  { type: 'radial_in', label: 'Radial In', symbol: '↙', desc: 'Rotates Apsides' },
  { type: 'left', label: 'Normal Left', symbol: '◀', desc: 'Changes Inclination' },
  { type: 'right', label: 'Normal Right', symbol: '▶', desc: 'Changes Inclination' }
];

export default function VisualizationView({
  controls,
  setPaused,
  setTimeScale,
  setShowTrajectory,
  setShowApoPeri,
  setCamMode,
  setThrustPct,
  setOrbitKey,
  applyBurn,
  telemetry,
  fuelRemaining,
  selectedEventId,
  eventMeta,
  onSwitchTab
}) {
  return (
    <div className={styles.vizOverlayContainer}>
      {/* HUD LEFT: ORBIT & CAMERA CONTROL */}
      <aside className={styles.vizFloatingPanel} style={{ gridRow: '1 / span 2' }}>
        <div className={styles.vizPanelTitle}>
          <span>Orbit Mechanics Deck</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--cyan)' }}>LIVE</span>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontFamily: 'var(--mono-font)', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            ORBIT REGIME
          </label>
          <select
            value={controls.orbitKey}
            className={styles.selectInput}
            style={{ width: '100%' }}
            onChange={(e) => setOrbitKey(e.target.value)}
          >
            {Object.keys(ORBIT_PRESETS).map((key) => (
              <option key={key} value={key}>
                {orbitLabelMap[key]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontFamily: 'var(--mono-font)', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            CAMERA PERSPECTIVE
          </label>
          <div className={styles.controlGrid}>
            {['track', 'free', 'earth'].map((mode) => (
              <button
                key={mode}
                type="button"
                className={`${styles.controlBtn} ${controls.camMode === mode ? styles.controlBtnActive : ''}`}
                onClick={() => setCamMode(mode)}
              >
                {mode.toUpperCase()} CAM
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontFamily: 'var(--mono-font)', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            OVERLAYS & MARKERS
          </label>
          <div className={styles.controlGrid}>
            <button
              type="button"
              className={`${styles.controlBtn} ${controls.showTrajectory ? styles.controlBtnActive : ''}`}
              onClick={() => setShowTrajectory((v) => !v)}
            >
              TRAJECTORY {controls.showTrajectory ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              className={`${styles.controlBtn} ${controls.showApoPeri ? styles.controlBtnActive : ''}`}
              onClick={() => setShowApoPeri((v) => !v)}
            >
              APO/PERI {controls.showApoPeri ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono-font)', fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
            <span>SIMULATION TIME WARP</span>
            <span style={{ color: 'var(--cyan)' }}>{controls.timeScale}x</span>
          </label>
          <input
            type="range"
            min="1"
            max="200"
            value={controls.timeScale}
            onChange={(e) => setTimeScale(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--cyan)' }}
          />
        </div>

        <button
          type="button"
          className={`${styles.actionButton} ${!controls.paused ? styles.actionButtonPrimary : ''}`}
          style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}
          onClick={() => setPaused((v) => !v)}
        >
          {controls.paused ? '▶ RESUME SIMULATION' : '❚❚ PAUSE SIMULATION'}
        </button>
      </aside>

      {/* CENTER HUD: EVENT HEADER OVERLAY */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' }}>
        <div style={{ background: 'rgba(6,16,32,0.7)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px 20px', width: 'fit-content', backdropFilter: 'blur(8px)', pointerEvents: 'auto' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--display-font)', fontSize: '1.2rem', color: '#fff' }}>
            {eventMeta?.title || 'ORBITAL 3D CONJUNCTION VIEW'}
          </h2>
          <p style={{ margin: '4px 0 0', fontFamily: 'var(--mono-font)', fontSize: '0.72rem', color: 'var(--cyan)', letterSpacing: '0.14em' }}>
            {eventMeta?.subtitle || 'Skyfield Linearized Dynamics & Relative Conjunction Geometry'}
          </p>
        </div>
      </div>

      {/* HUD RIGHT: LIVE TELEMETRY TELEGRAPH */}
      <aside className={styles.vizFloatingPanel}>
        <div className={styles.vizPanelTitle}>
          <span>Real-time Telemetry</span>
          <span style={{ color: 'var(--green)' }}>● ACTIVE</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          <div style={{ background: 'rgba(4,10,20,0.7)', padding: '10px', borderRadius: '4px', border: '1px solid rgba(0,180,255,0.1)' }}>
            <div className={styles.statLabel}>ALTITUDE</div>
            <div style={{ fontFamily: 'var(--mono-font)', fontSize: '1rem', color: 'var(--cyan)' }}>
              {telemetry?.altitudeKm != null ? telemetry.altitudeKm.toFixed(1) : '500.0'} km
            </div>
          </div>
          <div style={{ background: 'rgba(4,10,20,0.7)', padding: '10px', borderRadius: '4px', border: '1px solid rgba(0,180,255,0.1)' }}>
            <div className={styles.statLabel}>VELOCITY</div>
            <div style={{ fontFamily: 'var(--mono-font)', fontSize: '1rem', color: '#fff' }}>
              {telemetry?.velocityMs != null ? telemetry.velocityMs.toFixed(1) : '7600.0'} m/s
            </div>
          </div>
          <div style={{ background: 'rgba(4,10,20,0.7)', padding: '10px', borderRadius: '4px', border: '1px solid rgba(0,180,255,0.1)' }}>
            <div className={styles.statLabel}>PERIGEE</div>
            <div style={{ fontFamily: 'var(--mono-font)', fontSize: '1rem', color: 'var(--green)' }}>
              {telemetry?.periKm != null ? telemetry.periKm.toFixed(0) : '480'} km
            </div>
          </div>
          <div style={{ background: 'rgba(4,10,20,0.7)', padding: '10px', borderRadius: '4px', border: '1px solid rgba(0,180,255,0.1)' }}>
            <div className={styles.statLabel}>APOGEE</div>
            <div style={{ fontFamily: 'var(--mono-font)', fontSize: '1rem', color: 'var(--orange)' }}>
              {telemetry?.apoKm != null ? telemetry.apoKm.toFixed(0) : '520'} km
            </div>
          </div>
          <div style={{ background: 'rgba(4,10,20,0.7)', padding: '10px', borderRadius: '4px', border: '1px solid rgba(0,180,255,0.1)' }}>
            <div className={styles.statLabel}>INCLINATION</div>
            <div style={{ fontFamily: 'var(--mono-font)', fontSize: '1rem', color: '#fff' }}>
              {telemetry?.inclinationDeg != null ? telemetry.inclinationDeg.toFixed(1) : '97.5'}°
            </div>
          </div>
          <div style={{ background: 'rgba(4,10,20,0.7)', padding: '10px', borderRadius: '4px', border: '1px solid rgba(0,180,255,0.1)' }}>
            <div className={styles.statLabel}>ECCENTRICITY</div>
            <div style={{ fontFamily: 'var(--mono-font)', fontSize: '1rem', color: 'var(--cyan)' }}>
              {telemetry?.eccentricity != null ? telemetry.eccentricity.toFixed(4) : '0.0012'}
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(4,10,20,0.7)', padding: '12px', borderRadius: '4px', border: '1px solid rgba(255,107,43,0.3)', marginTop: '8px' }}>
          <div className={styles.statLabel} style={{ color: 'var(--orange)' }}>COLLISION PROBABILITY (PoC)</div>
          <div style={{ fontFamily: 'var(--display-font)', fontSize: '1.2rem', color: 'var(--orange)', marginTop: '2px' }}>
            {telemetry?.poc ? Number(telemetry.poc).toExponential(2) : '3.88e-08'}
          </div>
        </div>
      </aside>

      {/* HUD BOTTOM: INTERACTIVE THRUSTER STATION */}
      <footer className={styles.vizFloatingPanel} style={{ gridColumn: '2 / span 2', marginTop: 'auto' }}>
        <div className={styles.vizPanelTitle}>
          <span>Maneuver Burn & Delta-V Station</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--cyan)' }}>
            AVAILABLE FUEL: <strong>{fuelRemaining != null ? fuelRemaining.toFixed(1) : 36.0} m/s</strong>
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '20px', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono-font)', fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
              <span>THRUST IMPULSE LEVEL</span>
              <span style={{ color: 'var(--cyan)' }}>{controls.thrustPct}%</span>
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={controls.thrustPct}
              onChange={(e) => setThrustPct(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--cyan)' }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button
                type="button"
                className={styles.actionButton}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => onSwitchTab?.('Decision')}
              >
                Inspect AI Decision
              </button>
              <button
                type="button"
                className={styles.actionButton}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => onSwitchTab?.('Prediction')}
              >
                Inspect Probability Chart
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {burnButtons.map((btn) => (
              <button
                key={btn.type}
                type="button"
                className={styles.controlBtn}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '6px' }}
                onClick={() => applyBurn(btn.type)}
              >
                <span style={{ fontSize: '0.9rem', color: 'var(--cyan)' }}>{btn.symbol} {btn.label}</span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>{btn.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
