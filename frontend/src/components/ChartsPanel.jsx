/**
 * ChartsPanel Component
 * 
 * Bottom panel with three charts: PoC, Fuel, Distance
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';

const ChartsPanel = ({ timelineData }) => {
  const chartPoints = useMemo(() => {
    if (Array.isArray(timelineData) && timelineData.length) {
      return timelineData.map((point, index) => ({
        time: `${Math.max(0, point.minute ?? 60 - index)}m`,
        poc: Number(point.collision_probability ?? point.value ?? 0),
        fuel: Number(point.fuel_remaining ?? 100),
        distance: Number(point.miss_distance ?? 0)
      }));
    }

    return Array.from({ length: 60 }, (_, i) => ({
      time: `${60 - i}m`,
      poc: Math.max(0, 0.02 + i * 0.0025),
      fuel: 100 - i * 0.5,
      distance: 500 + i * 2
    }));
  }, [timelineData]);

  const pocData = chartPoints.map((point) => ({ time: point.time, value: point.poc }));
  const fuelData = chartPoints.map((point) => ({ time: point.time, value: point.fuel }));
  const distanceData = chartPoints.map((point) => ({ time: point.time, value: point.distance }));

  return (
    <div id="bottomBar" className="simulator-bottom-bar">
      {/* PoC Chart */}
      <div className="chart-cell">
        <div className="chart-label">COLLISION PROBABILITY (%)</div>
        <div className="chart-canvas-wrap">
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={pocData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#00ffff" opacity={0.1} />
              <XAxis 
                dataKey="time" 
                interval={9}
                tick={{ fontSize: 10, fill: '#22d3ee' }}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#22d3ee' }}
                width={30}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#040a14', 
                  border: '1px solid #00ffff',
                  borderRadius: '4px'
                }}
                labelStyle={{ color: '#00ffff' }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#ff2d55" 
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fuel Chart */}
      <div className="chart-cell">
        <div className="chart-label">FUEL REMAINING (%)</div>
        <div className="chart-canvas-wrap">
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={fuelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#00ff88" opacity={0.1} />
              <XAxis 
                dataKey="time" 
                interval={9}
                tick={{ fontSize: 10, fill: '#00ff88' }}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#00ff88' }}
                width={30}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#040a14', 
                  border: '1px solid #00ff88',
                  borderRadius: '4px'
                }}
                labelStyle={{ color: '#00ff88' }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#00ff88" 
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distance Chart */}
      <div className="chart-cell">
        <div className="chart-label">SEPARATION DISTANCE (km)</div>
        <div className="chart-canvas-wrap">
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={distanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#00d9ff" opacity={0.1} />
              <XAxis 
                dataKey="time" 
                interval={9}
                tick={{ fontSize: 10, fill: '#00d9ff' }}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#00d9ff' }}
                width={40}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#040a14', 
                  border: '1px solid #00d9ff',
                  borderRadius: '4px'
                }}
                labelStyle={{ color: '#00d9ff' }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#00d9ff" 
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ChartsPanel;
