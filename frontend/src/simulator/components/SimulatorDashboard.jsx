import { useSimulation } from '../hooks/useSimulation';
import ChartsPanel from './ChartsPanel';
import LeftPanel from './LeftPanel';
import RightPanel from './RightPanel';
import ThreeScene from './ThreeScene';
import TopBar from './TopBar';
import styles from '../styles/SimulatorDashboard.module.css';
import '../styles/theme.css';

function formatPoc(value) {
  return Number(value).toExponential(2);
}

function SimulatorDashboard() {
  const {
    controls,
    setPaused,
    setTimeScale,
    setShowTrajectory,
    setShowApoPeri,
    setCamMode,
    setThrustPct,
    setOrbitKey,
    applyBurn,
    loadScenario,
    loadScenarioByDecision,
    runAI,
    updateAngle,
    syncAge,
    orbitParams,
    telemetry,
    sequence,
    currentStep,
    result,
    loading,
    selectedScenario,
    scenarioInfo,
    notice,
    error,
    chartSeries,
    eventMeta,
    hasScenario
  } = useSimulation();

  return (
    <main className={styles.simulatorApp}>
      <ThreeScene controls={controls} orbitParams={orbitParams} onUpdateAngle={updateAngle} />
      <div className={styles.scanGrid} />

      <div className={styles.uiGrid}>
        <TopBar
          controls={controls}
          syncAge={syncAge}
          onTogglePause={() => setPaused((current) => !current)}
          onToggleTrajectory={() => setShowTrajectory((current) => !current)}
          onToggleApoPeri={() => setShowApoPeri((current) => !current)}
          onTimeScaleChange={setTimeScale}
        />

        <LeftPanel
          controls={controls}
          onSetOrbit={setOrbitKey}
          onApplyBurn={applyBurn}
          onSetThrust={setThrustPct}
          onLoadWaitScenario={() => loadScenarioByDecision('WAIT')}
          onLoadCommitScenario={() => loadScenarioByDecision('COMMIT')}
          onLoadScenario={loadScenario}
          onRunAI={runAI}
          loading={loading}
          currentStep={currentStep}
          hasScenario={hasScenario}
          selectedScenario={selectedScenario}
        />

        <section className={styles.centerOverlay}>
          <header className={styles.eventCard}>
            <h1>{eventMeta.title}</h1>
            <p>{eventMeta.subtitle}</p>
          </header>

          <div className={styles.telemetryOverlay}>
            <div className={styles.telemetryGroup}>
              <p>
                <span>Altitude</span>
                <strong>{telemetry.altitudeKm.toFixed(3)} km</strong>
              </p>
              <p>
                <span>Velocity</span>
                <strong>{telemetry.velocityMs.toFixed(2)} m/s</strong>
              </p>
              <p>
                <span>Perigee</span>
                <strong>{telemetry.periKm.toFixed(0)} km</strong>
              </p>
              <p>
                <span>Apogee</span>
                <strong>{telemetry.apoKm.toFixed(0)} km</strong>
              </p>
            </div>

            <div className={styles.telemetryGroup}>
              <p>
                <span>Inclination</span>
                <strong>{telemetry.inclinationDeg.toFixed(0)}°</strong>
              </p>
              <p>
                <span>Semi-Major</span>
                <strong>{telemetry.semiMajorAxisKm.toFixed(0)} km</strong>
              </p>
              <p>
                <span>Eccentricity</span>
                <strong>{telemetry.eccentricity.toFixed(3)}</strong>
              </p>
              <p>
                <span>Pc</span>
                <strong>{formatPoc(telemetry.poc)}</strong>
              </p>
            </div>
          </div>
        </section>

        <RightPanel
          telemetry={telemetry}
          result={result}
          sequence={sequence}
          currentStep={currentStep}
          loading={loading}
          scenarioInfo={scenarioInfo}
          notice={notice}
          error={error}
          controls={controls}
          onSetCameraMode={setCamMode}
        />

        <ChartsPanel chartSeries={chartSeries} result={result} />
      </div>
    </main>
  );
}

export default SimulatorDashboard;
