import DecisionPanel from './DecisionPanel';
import styles from '../styles/RightPanel.module.css';

const telemetryCells = [
  { label: 'Altitude', key: 'altitudeKm', unit: 'km', tone: 'cyan' },
  { label: 'Velocity', key: 'velocityMs', unit: 'm/s' },
  { label: 'Perigee', key: 'periKm', unit: 'km', tone: 'green' },
  { label: 'Apogee', key: 'apoKm', unit: 'km', tone: 'orange' },
  { label: 'Inclination', key: 'inclinationDeg', unit: '°' },
  { label: 'Semi-Major Axis', key: 'semiMajorAxisKm', unit: 'km', tone: 'cyan' },
  { label: 'Eccentricity', key: 'eccentricity', unit: '', digits: 3 },
  { label: 'Orbital Period', key: 'periodSec', unit: 's' },
  { label: 'RAAN', key: 'raanDeg', unit: '°' },
  { label: 'Probability Pc', key: 'poc', unit: '', digits: 4, format: 'exp', tone: 'orange' }
];

const cameraModes = ['track', 'free', 'earth'];

function formatTelemetry(cell, telemetry) {
  const value = telemetry[cell.key];
  if (cell.format === 'exp') {
    return Number(value).toExponential(2);
  }
  if (typeof cell.digits === 'number') {
    return Number(value).toFixed(cell.digits);
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  return Number(value).toFixed(2);
}

function RightPanel({ telemetry, result, sequence, currentStep, loading, scenarioInfo, notice, error, controls, onSetCameraMode }) {
  return (
    <aside className={styles.rightPanel}>
      <header className={styles.panelTitle}>
        Telemetry
        <span className={styles.statusLed} />
      </header>

      <section className={styles.telemetryGrid}>
        {telemetryCells.map((cell) => (
          <article key={cell.label} className={styles.telemetryCell}>
            <span className={styles.telemetryLabel}>{cell.label}</span>
            <span className={`${styles.telemetryValue} ${cell.tone ? styles[cell.tone] : ''}`}>
              {formatTelemetry(cell, telemetry)}
              {cell.unit ? ` ${cell.unit}` : ''}
            </span>
          </article>
        ))}
      </section>

      <div className={styles.cameraControls}>
        {cameraModes.map((mode) => (
          <button
            key={mode}
            type="button"
            className={`${styles.cameraButton} ${controls.camMode === mode ? styles.cameraButtonActive : ''}`}
            onClick={() => onSetCameraMode(mode)}
          >
            {mode.toUpperCase()} CAM
          </button>
        ))}
      </div>

      <div className={styles.panelTitle}>AI Decision</div>
      <div className={styles.decisionWrap}>
        <DecisionPanel
          result={result}
          sequence={sequence}
          currentStep={currentStep}
          loading={loading}
          scenarioInfo={scenarioInfo}
          notice={notice}
          error={error}
        />
      </div>
    </aside>
  );
}

export default RightPanel;
