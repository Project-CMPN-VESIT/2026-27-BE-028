/**
 * TopBar Component
 * 
 * Top navigation bar with time scale control and basic buttons
 */

import { useState } from 'react';

const TopBar = ({ timeScale, onTimeScaleChange, paused, onPauseToggle, showTrajectory, onTrajectoryToggle, showApoPeri, onApoPeriToggle }) => {
  return (
    <div className="simulator-topbar">
      {/* Logo */}
      <div className="logo">
        <span className="logo-text">OrbitalX</span>
        <span className="logo-dot"></span>
      </div>

      {/* Nav Tabs */}
      <div className="nav-tabs">
        <div className="nav-tab active">Dashboard</div>
        <div className="nav-tab">Analysis</div>
      </div>

      {/* Top Right Controls */}
      <div className="top-right-controls">
        {/* Time Scale */}
        <div className="time-scale-wrap">
          <label htmlFor="timeSlider" className="slider-label">TIME SCALE</label>
          <input
            id="timeSlider"
            type="range"
            min="1"
            max="500"
            value={timeScale}
            onChange={(e) => onTimeScaleChange(parseInt(e.target.value))}
            className="time-scale-wrap-input"
          />
          <span className="time-val">{timeScale}x</span>
        </div>

        {/* Control Buttons */}
        <button 
          className={`btn-topbar ${paused ? 'active' : ''}`}
          onClick={onPauseToggle}
          title="Pause/Resume simulation"
        >
          {paused ? '▶' : '⏸'}
        </button>

        <button
          className={`btn-topbar ${showTrajectory ? 'active' : ''}`}
          onClick={onTrajectoryToggle}
          title="Toggle trajectory display"
        >
          🛰
        </button>

        <button
          className={`btn-topbar ${showApoPeri ? 'active' : ''}`}
          onClick={onApoPeriToggle}
          title="Toggle apogee/perigee markers"
        >
          ◉
        </button>

        <span className="sync-time">SYNC</span>
      </div>
    </div>
  );
};

export default TopBar;
