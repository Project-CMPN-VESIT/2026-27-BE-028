/**
 * DecisionPanel Component
 * 
 * Displays decision engine results
 */

import { useMemo } from 'react';

const DecisionPanel = ({ decision }) => {
  const activeDecision = useMemo(() => {
    if (decision) {
      return {
        recommendation: decision.decision || decision.recommendation || 'WAIT',
        confidence: Number.isFinite(decision.confidence)
          ? decision.confidence > 1
            ? decision.confidence
            : decision.confidence * 100
          : 0,
        costCurrent: decision.cost_act ?? decision.costCurrent ?? 0,
        costIfWait: decision.cost_wait ?? decision.costIfWait ?? 0,
        metrics: {
          fuelRequired: decision.fuel_required ?? decision.metrics?.fuelRequired ?? 0,
          timeToBurn: decision.time_to_burn ?? decision.metrics?.timeToBurn ?? 0,
          successRate: decision.success_rate ?? decision.metrics?.successRate ?? 0
        }
      };
    }

    return {
      recommendation: 'COMMIT',
      confidence: 87.3,
      costCurrent: 245,
      costIfWait: 312,
      metrics: {
        fuelRequired: 185,
        timeToBurn: 12,
        successRate: 94.2
      }
    };
  }, [decision]);

  return (
    <div id="decisionPanel" className="simulator-panel decision-panel">
      <div className="panel-title">
        <span>DECISION ENGINE</span>
      </div>

      {/* Main Decision Badge */}
      <div className="decision-badge-large" style={{ marginTop: '12px' }}>
        <div className={`decision-badge ${activeDecision.recommendation.toLowerCase()}`}>
          <span className="status-led"></span>
          {activeDecision.recommendation}
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="metric-row" style={{ marginTop: '16px' }}>
        <div className="metric-key">Confidence</div>
        <div className="metric-val cyan">{activeDecision.confidence.toFixed(1)}%</div>
      </div>
      <div className="conf-bar-wrap">
        <div className="conf-bar-bg">
          <div 
            className="conf-bar-fill" 
            style={{ width: `${Math.min(100, activeDecision.confidence)}%` }}
          ></div>
        </div>
      </div>

      {/* Cost Comparison */}
      <div className="metric-row" style={{ marginTop: '16px' }}>
        <div className="metric-key">Cost Analysis</div>
      </div>
      <div className="cost-compare">
        <div className="cost-card">
          <div className="cost-card-label">NOW</div>
          <div className="cost-card-val green">{activeDecision.costCurrent} m/s</div>
        </div>
        <div className="cost-card">
          <div className="cost-card-label">IF WAIT</div>
          <div className="cost-card-val orange">{activeDecision.costIfWait} m/s</div>
        </div>
      </div>

      {/* Key Metrics */}
      <div style={{ marginTop: '16px' }}>
        <div className="metric-row">
          <div className="metric-key">Fuel Req.</div>
          <div className="metric-val">{activeDecision.metrics.fuelRequired} kg</div>
        </div>
        <div className="metric-row">
          <div className="metric-key">Time to Burn</div>
          <div className="metric-val">{activeDecision.metrics.timeToBurn} min</div>
        </div>
        <div className="metric-row">
          <div className="metric-key">Success Rate</div>
          <div className="metric-val green">{activeDecision.metrics.successRate}%</div>
        </div>
      </div>
    </div>
  );
};

export default DecisionPanel;
