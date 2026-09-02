import { ORBIT_PRESETS } from '../services/orbitMath';
import styles from '../styles/LeftPanel.module.css';

const orbitLabelMap = {
  iss: 'ISS (LEO)',
  elliptical: 'Elliptical',
  molniya: 'Molniya',
  geo: 'GEO',
  custom: 'Custom TLE'
};

const burnButtons = [
  { type: 'prograde', label: 'Prograde', symbol: '▲', tone: 'prograde' },
  { type: 'retrograde', label: 'Retrograde', symbol: '▼', tone: 'retrograde' },
  { type: 'left', label: 'Left', symbol: '◀', tone: 'radial' },
  { type: 'right', label: 'Right', symbol: '▶', tone: 'radial' },
  { type: 'radial_out', label: 'Radial Out', symbol: '↗', fullRow: true },
  { type: 'radial_in', label: 'Radial In', symbol: '↙', fullRow: true }
];

function LeftPanel({
  controls,
  onSetOrbit,
  onApplyBurn,
  onSetThrust,
  onLoadWaitScenario,
  onLoadCommitScenario,
  onLoadScenario,
  onRunAI,
  loading,
  currentStep,
  hasScenario,
  selectedScenario,
  selectedEventId,
  eventsList = []
}) {
  return (
    <aside className={styles.leftPanel}>
      <div className={styles.panelTitle}>Burn Controls</div>

      <div className={styles.orbitSelectWrap}>
        <select value={controls.orbitKey} className={styles.orbitSelect} onChange={(event) => onSetOrbit(event.target.value)}>
          {Object.keys(ORBIT_PRESETS).map((key) => (
            <option key={key} value={key}>
              {orbitLabelMap[key]}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.burnSection}>
        <div className={styles.burnLabel}>Directional Burns</div>
        <div className={styles.burnGrid}>
          {burnButtons.map((button) => (
            <button
              key={button.type}
              type="button"
              className={`${styles.burnBtn} ${button.tone ? styles[button.tone] : ''} ${button.fullRow ? styles.fullRow : ''}`}
              onClick={() => onApplyBurn(button.type)}
            >
              {button.symbol} {button.label}
            </button>
          ))}
        </div>

        <div className={styles.thrustWrap}>
          <div className={styles.sliderLabel}>
            <span>THRUST</span>
            <span>{controls.thrustPct}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={controls.thrustPct}
            className={styles.thrustSlider}
            onChange={(event) => onSetThrust(Number(event.target.value))}
          />
          <div className={styles.thrustValue}>{controls.thrustPct}%</div>
        </div>

        <div className={styles.aiControls}>
          <div className={styles.burnLabel} style={{ marginTop: '8px', marginBottom: '4px' }}>
            Dataset Events (400 Loaded)
          </div>

          {eventsList.length > 0 && (
            <div className={styles.orbitSelectWrap} style={{ marginBottom: '8px' }}>
              <select
                value={selectedEventId || ''}
                className={styles.orbitSelect}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val) onLoadScenario(val);
                }}
                disabled={loading}
              >
                <option value="">-- Select Event from Dataset --</option>
                {eventsList.slice(0, 100).map((ev) => (
                  <option key={ev.event_id || ev.id} value={ev.event_id || ev.id}>
                    Event #{ev.event_id || ev.id} [{ev.riskLevel || 'LOW'}] - {ev.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            className={`${styles.aiButton} ${styles.aiButtonWait}`}
            onClick={onLoadWaitScenario}
            disabled={loading}
          >
            {loading && selectedScenario === 'WAIT' ? 'Loading...' : 'Load WAIT Scenario'}
          </button>
          <button
            type="button"
            className={`${styles.aiButton} ${styles.aiButtonCommit}`}
            onClick={onLoadCommitScenario}
            disabled={loading}
          >
            {loading && selectedScenario === 'COMMIT' ? 'Loading...' : 'Load COMMIT Scenario'}
          </button>
          <button
            type="button"
            className={styles.aiButton}
            onClick={() => onLoadScenario()}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load Random Scenario'}
          </button>
          <button
            type="button"
            className={`${styles.aiButton} ${styles.aiButtonRun}`}
            onClick={onRunAI}
            disabled={loading || !hasScenario}
          >
            {loading ? 'Running...' : 'Run 6-Model AI'}
          </button>
          <p className={styles.scenarioStatus}>
            {hasScenario
              ? `Event #${selectedEventId ?? '—'} | Step: ${currentStep}${selectedScenario ? ` | Target: ${selectedScenario}` : ''}`
              : 'No scenario loaded'}
          </p>
        </div>
      </div>
    </aside>
  );
}

export default LeftPanel;
