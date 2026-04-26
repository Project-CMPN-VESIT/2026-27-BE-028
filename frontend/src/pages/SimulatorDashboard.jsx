/**
 * SimulatorDashboard Page
 * 
 * Main satellite simulator dashboard combining all components
 * UI-only version with static data
 */

import { useState, useEffect } from 'react';
import EarthScene from '../components/EarthScene';
import TopBar from '../components/TopBar';
import BurnControls from '../components/BurnControls';
import TelemetryPanel from '../components/TelemetryPanel';
import DecisionPanel from '../components/DecisionPanel';
import ChartsPanel from '../components/ChartsPanel';
import ExplanationPanel from '../components/ExplanationPanel';
import './SimulatorDashboard.css';

const SimulatorDashboard = () => {
  const [timeScale, setTimeScale] = useState(50);
  const [paused, setPaused] = useState(false);
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [showApoPeri, setShowApoPeri] = useState(true);
  const [currentOrbit, setCurrentOrbit] = useState('elliptical');
  const [cameraMode, setCameraMode] = useState('free');
  const [burnLog, setBurnLog] = useState([]);

  // Handle time scale changes
  const handleTimeScaleChange = (newScale) => {
    setTimeScale(newScale);
  };

  // Handle pause/resume
  const handlePauseToggle = () => {
    setPaused(!paused);
  };

  // Handle trajectory toggle
  const handleTrajectoryToggle = () => {
    setShowTrajectory(!showTrajectory);
  };

  // Handle apogee/perigee toggle
  const handleApoPeriToggle = () => {
    setShowApoPeri(!showApoPeri);
  };

  // Handle burn maneuver
  const handleBurn = (type, thrustPercent) => {
    const burnEvent = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      thrust: thrustPercent
    };
    setBurnLog([...burnLog, burnEvent]);
    console.log('Burn executed:', burnEvent);
  };

  // Handle orbit change
  const handleOrbitChange = (orbit) => {
    setCurrentOrbit(orbit);
    console.log('Orbit changed to:', orbit);
  };

  // Handle camera mode change
  const handleCameraChange = (mode) => {
    setCameraMode(mode);
    console.log('Camera mode changed to:', mode);
  };

  return (
    <div className="simulator-dashboard">
      {/* Background canvas (3D Earth scene) */}
      <div className="simulator-canvas-container">
        <EarthScene cameraMode={cameraMode} />
      </div>

      {/* Scanline overlay effect */}
      <div id="scanGrid" className="scan-grid"></div>

      {/* Main UI overlay */}
      <div id="ui" className="simulator-ui">
        {/* Top Bar */}
        <TopBar
          timeScale={timeScale}
          onTimeScaleChange={handleTimeScaleChange}
          paused={paused}
          onPauseToggle={handlePauseToggle}
          showTrajectory={showTrajectory}
          onTrajectoryToggle={handleTrajectoryToggle}
          showApoPeri={showApoPeri}
          onApoPeriToggle={handleApoPeriToggle}
        />

        {/* Left Panel - Burn Controls */}
        <BurnControls
          onBurn={handleBurn}
          currentOrbit={currentOrbit}
          onOrbitChange={handleOrbitChange}
        />

        {/* Center Overlay - Explanation & Telemetry */}
        <div id="centerTop" className="center-overlay">
          <ExplanationPanel />
        </div>

        {/* Right Panel - Telemetry & Camera Controls */}
        <TelemetryPanel
          cameraMode={cameraMode}
          onCameraChange={handleCameraChange}
        />

        {/* Bottom Bar - Charts */}
        <ChartsPanel />

        {/* Decision Panel (Right side, middle) */}
        <DecisionPanel />
      </div>

      {/* Debug Info */}
      <div className="debug-info">
        <div>Time Scale: {timeScale}x</div>
        <div>Paused: {paused ? 'YES' : 'NO'}</div>
        <div>Camera: {cameraMode.toUpperCase()}</div>
        <div>Orbit: {currentOrbit}</div>
        <div>Burns: {burnLog.length}</div>
      </div>
    </div>
  );
};

export default SimulatorDashboard;
