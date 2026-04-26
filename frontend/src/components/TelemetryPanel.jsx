/**
 * TelemetryPanel Component
 * 
 * Right panel displaying satellite telemetry data
 */

import { useEffect, useMemo, useState } from 'react';

const TelemetryPanel = ({ telemetry, cameraMode, onCameraChange }) => {
  const [telemetryData, setTelemetryData] = useState({
    altitude: 7500,
    velocity: 6098,
    distance: 450,
    timeToClosestApproach: 45,
    collisionProbability: 0.032,
    apogee: 20131,
    perigee: 6939,
    eccentricity: 0.331,
    inclination: 90,
    period: 27966
  });

  const mergedTelemetry = useMemo(() => {
    if (!telemetry) return telemetryData;

    return {
      ...telemetryData,
      altitude: telemetry.altitude ?? telemetryData.altitude,
      velocity: telemetry.velocity ?? telemetryData.velocity,
      distance: telemetry.distance ?? telemetryData.distance,
      timeToClosestApproach: telemetry.tca_minutes ?? telemetry.timeToClosestApproach ?? telemetryData.timeToClosestApproach,
      collisionProbability: telemetry.collision_probability ?? telemetryData.collisionProbability,
      apogee: telemetry.apogee ?? telemetryData.apogee,
      perigee: telemetry.perigee ?? telemetryData.perigee,
      eccentricity: telemetry.eccentricity ?? telemetryData.eccentricity,
      inclination: telemetry.inclination ?? telemetryData.inclination,
      period: telemetry.period ?? telemetryData.period
    };
  }, [telemetry, telemetryData]);

  // Dummy data that changes every second for realism
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetryData(prev => ({
        ...prev,
        distance: prev.distance - Math.random() * 10 + 3,
        collisionProbability: Math.max(0, prev.collisionProbability - Math.random() * 0.001),
        altitude: prev.altitude + (Math.random() - 0.5) * 5
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="rightPanel" className="simulator-panel right-panel">
      <div className="panel-title">
        <span>TELEMETRY & STATUS</span>
      </div>

      {/* Telemetry Grid */}
      <div className="telemetry-grid">
        <div className="telem-cell">
          <div className="telem-cell-key">ALT</div>
          <div className="telem-cell-val cyan">{Math.round(mergedTelemetry.altitude)} km</div>
        </div>
        <div className="telem-cell">
          <div className="telem-cell-key">VEL</div>
          <div className="telem-cell-val">{Math.round(mergedTelemetry.velocity)} m/s</div>
        </div>
        <div className="telem-cell">
          <div className="telem-cell-key">DIST</div>
          <div className="telem-cell-val">{Math.round(mergedTelemetry.distance)} km</div>
        </div>
        <div className="telem-cell">
          <div className="telem-cell-key">TCA</div>
          <div className="telem-cell-val">{mergedTelemetry.timeToClosestApproach} min</div>
        </div>
        <div className="telem-cell">
          <div className="telem-cell-key">PoC</div>
          <div className="telem-cell-val" style={{ color: '#ff2d55' }}>
            {(mergedTelemetry.collisionProbability * 100).toFixed(2)}%
          </div>
        </div>
        <div className="telem-cell">
          <div className="telem-cell-key">APO</div>
          <div className="telem-cell-val apo">{Math.round(mergedTelemetry.apogee)} km</div>
        </div>
        <div className="telem-cell">
          <div className="telem-cell-key">PERI</div>
          <div className="telem-cell-val peri">{Math.round(mergedTelemetry.perigee)} km</div>
        </div>
        <div className="telem-cell">
          <div className="telem-cell-key">ECC</div>
          <div className="telem-cell-val">{mergedTelemetry.eccentricity.toFixed(3)}</div>
        </div>
        <div className="telem-cell">
          <div className="telem-cell-key">INCL</div>
          <div className="telem-cell-val">{mergedTelemetry.inclination}°</div>
        </div>
        <div className="telem-cell">
          <div className="telem-cell-key">PERIOD</div>
          <div className="telem-cell-val">{Math.round(mergedTelemetry.period)} sec</div>
        </div>
      </div>

      {/* Camera Controls */}
      <div className="cam-controls">
        <div className="panel-title mt-4">CAMERA</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
          <button
            className={`cam-btn ${cameraMode === 'free' ? 'active' : ''}`}
            onClick={() => onCameraChange('free')}
          >
            FREE
          </button>
          <button
            className={`cam-btn ${cameraMode === 'satellite' ? 'active' : ''}`}
            onClick={() => onCameraChange('satellite')}
          >
            SAT
          </button>
          <button
            className={`cam-btn ${cameraMode === 'top' ? 'active' : ''}`}
            onClick={() => onCameraChange('top')}
          >
            TOP
          </button>
          <button
            className={`cam-btn ${cameraMode === 'nadir' ? 'active' : ''}`}
            onClick={() => onCameraChange('nadir')}
          >
            NADIR
          </button>
        </div>
      </div>
    </div>
  );
};

export default TelemetryPanel;
