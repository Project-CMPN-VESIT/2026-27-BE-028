import styles from '../styles/TopBar.module.css';

const tabs = ['Dashboard', 'Events', 'Visualization', 'Decision', 'Prediction'];

function TopBar({ controls, syncAge, onTogglePause, onToggleTrajectory, onToggleApoPeri, onTimeScaleChange }) {
  return (
    <div className={styles.topBar}>
      <div className={styles.logoWrap}>
        <span className={styles.logoDot} />
        <span className={styles.logoText}>ORBITALX</span>
      </div>

      <div className={styles.navTabs}>
        {tabs.map((tab, index) => (
          <button key={tab} type="button" className={`${styles.navTab} ${index === 0 ? styles.activeTab : ''}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className={styles.controls}>
        <span className={styles.syncText}>SYNCED: {syncAge}s AGO</span>

        <label className={styles.scaleWrap} htmlFor="timeScale">
          <span>TIME SCALE</span>
          <input
            id="timeScale"
            type="range"
            min="1"
            max="200"
            value={controls.timeScale}
            onChange={(event) => onTimeScaleChange(Number(event.target.value))}
          />
          <span className={styles.scaleValue}>{controls.timeScale}x</span>
        </label>

        <button type="button" className={`${styles.topButton} ${!controls.paused ? styles.topButtonActive : ''}`} onClick={onTogglePause}>
          {controls.paused ? 'RESUME' : 'PAUSE'}
        </button>
        <button
          type="button"
          className={`${styles.topButton} ${controls.showTrajectory ? styles.topButtonActive : ''}`}
          onClick={onToggleTrajectory}
        >
          TRAJECTORY
        </button>
        <button
          type="button"
          className={`${styles.topButton} ${controls.showApoPeri ? styles.topButtonActive : ''}`}
          onClick={onToggleApoPeri}
        >
          APO/PERI
        </button>
      </div>
    </div>
  );
}

export default TopBar;
