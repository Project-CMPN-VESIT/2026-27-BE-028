const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function evaluateDecision({ telemetry, fuelRemaining, thrustPct }) {
  const deltaV = 1.6 + telemetry.eccentricity * 2.5 + thrustPct * 0.008;
  const waitPenalty = telemetry.poc * 50 + (100 - fuelRemaining) * 0.1;
  const costAct = deltaV * 0.85 + telemetry.poc * 20;
  const costWait = deltaV * 1.75 + waitPenalty;
  const confidence = clamp(0.58 + Math.abs(costWait - costAct) / 12, 0.58, 0.97);

  const decision = costWait > costAct ? 'COMMIT' : 'WAIT';
  const noReturnMinutes = Math.round(6 + telemetry.poc * 90);
  const riskLevel = telemetry.poc > 0.07 ? 'CRITICAL' : telemetry.poc > 0.04 ? 'HIGH' : telemetry.poc > 0.02 ? 'MEDIUM' : 'LOW';

  const reasoning = decision === 'COMMIT'
    ? 'PoC trend and shrinking feasibility window make immediate action the lower-cost strategy.'
    : 'Current risk trend remains manageable. Holding position preserves fuel while trajectory confidence improves.';

  return {
    decision,
    confidence,
    deltaV,
    fuelRemaining,
    noReturnMinutes,
    costAct,
    costWait,
    missDistanceKm: clamp(9 - telemetry.poc * 55, 2.5, 12),
    riskLevel,
    reasoning
  };
}

export function getDecisionTags(decisionState) {
  const tags = [];

  if (decisionState.riskLevel === 'CRITICAL') {
    tags.push({ label: 'PoC Threshold Exceeded', tone: 'critical' });
  }
  if (decisionState.noReturnMinutes <= 15) {
    tags.push({ label: 'Time Window Compressing', tone: 'warn' });
  }
  if (decisionState.decision === 'COMMIT') {
    tags.push({ label: 'Maneuver Recommended', tone: 'critical' });
  } else {
    tags.push({ label: 'Observe and Re-evaluate', tone: 'ok' });
  }

  return tags;
}
