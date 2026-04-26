/**
 * BurnControls Component
 * 
 * Left panel with burn maneuver controls
 */

import { useState } from 'react';

const BurnControls = ({ onBurn, currentOrbit, onOrbitChange }) => {
  const [thrustPercent, setThrustPercent] = useState(50);

  const orbits = {
    iss: { name: 'ISS (LEO)', alt: '400 km' },
    elliptical: { name: 'Elliptical', alt: '7,500 km' },
    molniya: { name: 'Molniya', alt: '5,141 km' },
    geo: { name: 'Geostationary', alt: '35,786 km' },
    custom: { name: 'Custom Ellipse', alt: '17,238 km' }
  };

  const handleBurn = (type) => {
    onBurn(type, thrustPercent);
  };

  return (
    <div id="leftPanel" className="simulator-panel left-panel">
      <div className="panel-title">
        <span>MANEUVER CONTROL</span>
      </div>

      {/* Burn Direction Buttons */}
      <div className="burn-section">
        <div className="burn-label">BURN DIRECTION</div>
        <div className="burn-grid">
          <button
            className="burn-btn prograde"
            onClick={() => handleBurn('prograde')}
            title="Prograde burn - accelerate along velocity"
          >
            PRO
          </button>
          <button
            className="burn-btn retrograde"
            onClick={() => handleBurn('retrograde')}
            title="Retrograde burn - decelerate"
          >
            RETRO
          </button>
          <button
            className="burn-btn radial"
            onClick={() => handleBurn('radial')}
            title="Radial burn - change orbit plane"
          >
            RADIAL
          </button>
        </div>
      </div>

      {/* Thrust Control */}
      <div className="thrust-wrap">
        <label htmlFor="thrustSlider" className="slider-label">THRUST %</label>
        <input
          id="thrustSlider"
          type="range"
          min="0"
          max="100"
          value={thrustPercent}
          onChange={(e) => setThrustPercent(parseInt(e.target.value))}
          className="thrust-slider"
        />
        <span className="thrust-pct">{thrustPercent}%</span>
      </div>

      {/* Orbit Type Selector */}
      <div className="orbit-select-wrap">
        <label htmlFor="orbitType" className="slider-label">ORBIT TYPE</label>
        <select
          id="orbitType"
          value={currentOrbit}
          onChange={(e) => onOrbitChange(e.target.value)}
          className="orbit-select"
        >
          {Object.entries(orbits).map(([key, { name, alt }]) => (
            <option key={key} value={key}>
              {name} ({alt})
            </option>
          ))}
        </select>
      </div>

      {/* Decision Inline Badge */}
      <div id="decisionInline" className="decision-inline">
        <div className="panel-title mt-4">DECISION</div>
        <div className="decision-badge commit">
          <span className="status-led"></span>
          COMMIT TO BURN
        </div>
        <p className="metric-val" style={{ marginTop: '8px', fontSize: '12px' }}>
          Confidence: <span className="metric-val cyan">87.3%</span>
        </p>
      </div>
    </div>
  );
};

export default BurnControls;
