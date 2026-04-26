import type {
  DecisionOption,
  MissionDecision,
  MissionEvent,
  MissionScenario,
  MissionTelemetry,
  MissionTelemetrySample,
  MissionValidation,
  ValidationMetric,
} from '../../types/mission';

const baseTimestamp = '2026-03-24T15:06:17.000Z';

type SeedEvent = Omit<MissionEvent, 'trend'> & {
  riskLevel: MissionEvent['riskLevel'];
  timelineBias: number;
};

const eventSeeds: SeedEvent[] = [
  {
    id: 'EVT-2080',
    eventId: 'EVT-2080',
    name: 'STARLINK-1234 / FRA-3247',
    satelliteName: 'STARLINK-1234',
    debrisName: 'FRA-3247',
    riskLevel: 'CRITICAL',
    probabilityOfCollision: 0.562,
    timeToTcaMinutes: 12,
    closestApproachKm: 7.2,
    relativeVelocityKmS: 12.5,
    deltaVKmS: 2.3,
    fuelRemainingPct: 36,
    status: 'Immediate Maneuver',
    location: 'LEO-512',
    updatedAt: baseTimestamp,
    inclinationDeg: 97.5,
    altitudeKm: 532,
    longitudeDeg: 124.1,
    tags: ['Critical', 'Converging', 'Feasible'],
    timelineBias: 1.6,
  },
  {
    id: 'EVT-2042',
    eventId: 'EVT-2042',
    name: 'LUX-ORB-91 / DEB-118',
    satelliteName: 'LUX-ORB-91',
    debrisName: 'DEB-118',
    riskLevel: 'CRITICAL',
    probabilityOfCollision: 0.072,
    timeToTcaMinutes: 132,
    closestApproachKm: 24.5,
    relativeVelocityKmS: 14.8,
    deltaVKmS: 2.8,
    fuelRemainingPct: 44,
    status: 'Monitoring',
    location: 'MEO-212',
    updatedAt: baseTimestamp,
    inclinationDeg: 56.2,
    altitudeKm: 1180,
    longitudeDeg: 74.3,
    tags: ['Critical', 'Surveillance'],
    timelineBias: 1.2,
  },
  {
    id: 'EVT-2055',
    eventId: 'EVT-2055',
    name: 'ORBITA-12 / SHARD-03',
    satelliteName: 'ORBITA-12',
    debrisName: 'SHARD-03',
    riskLevel: 'HIGH',
    probabilityOfCollision: 0.045,
    timeToTcaMinutes: 364,
    closestApproachKm: 48.2,
    relativeVelocityKmS: 10.2,
    deltaVKmS: 1.6,
    fuelRemainingPct: 61,
    status: 'Watch',
    location: 'SSO-337',
    updatedAt: baseTimestamp,
    inclinationDeg: 98.6,
    altitudeKm: 720,
    longitudeDeg: 19.4,
    tags: ['High', 'Observation'],
    timelineBias: 1.1,
  },
  {
    id: 'EVT-1974',
    eventId: 'EVT-1974',
    name: 'POLAR-EDGE / FRAG-41',
    satelliteName: 'POLAR-EDGE',
    debrisName: 'FRAG-41',
    riskLevel: 'HIGH',
    probabilityOfCollision: 0.034,
    timeToTcaMinutes: 742,
    closestApproachKm: 72.8,
    relativeVelocityKmS: 9.6,
    deltaVKmS: 1.2,
    fuelRemainingPct: 74,
    status: 'Watch',
    location: 'LEO-221',
    updatedAt: baseTimestamp,
    inclinationDeg: 67.1,
    altitudeKm: 640,
    longitudeDeg: 151.7,
    tags: ['High', 'Low Latitude'],
    timelineBias: 0.92,
  },
  {
    id: 'EVT-2001',
    eventId: 'EVT-2001',
    name: 'ATLAS-REV / SHARD-19',
    satelliteName: 'ATLAS-REV',
    debrisName: 'SHARD-19',
    riskLevel: 'LOW',
    probabilityOfCollision: 0.01,
    timeToTcaMinutes: 1091,
    closestApproachKm: 120.6,
    relativeVelocityKmS: 7.1,
    deltaVKmS: 0.7,
    fuelRemainingPct: 83,
    status: 'Nominal',
    location: 'GEO-101',
    updatedAt: baseTimestamp,
    inclinationDeg: 0.2,
    altitudeKm: 35786,
    longitudeDeg: -44.8,
    tags: ['Low', 'Stable'],
    timelineBias: 0.55,
  },
  {
    id: 'EVT-2083',
    eventId: 'EVT-2083',
    name: 'ARES-8 / DEB-054',
    satelliteName: 'ARES-8',
    debrisName: 'DEB-054',
    riskLevel: 'MEDIUM',
    probabilityOfCollision: 0.026,
    timeToTcaMinutes: 448,
    closestApproachKm: 56.2,
    relativeVelocityKmS: 8.9,
    deltaVKmS: 1.1,
    fuelRemainingPct: 68,
    status: 'Monitoring',
    location: 'LEO-619',
    updatedAt: baseTimestamp,
    inclinationDeg: 52.0,
    altitudeKm: 560,
    longitudeDeg: 100.1,
    tags: ['Medium', 'Queued'],
    timelineBias: 0.84,
  },
  {
    id: 'EVT-1235',
    eventId: 'EVT-1235',
    name: 'NOVA-PRIME / DEB-220',
    satelliteName: 'NOVA-PRIME',
    debrisName: 'DEB-220',
    riskLevel: 'CRITICAL',
    probabilityOfCollision: 0.068,
    timeToTcaMinutes: 182,
    closestApproachKm: 50.7,
    relativeVelocityKmS: 11.9,
    deltaVKmS: 2.6,
    fuelRemainingPct: 41,
    status: 'Action Required',
    location: 'SSO-432',
    updatedAt: baseTimestamp,
    inclinationDeg: 97.2,
    altitudeKm: 705,
    longitudeDeg: 5.4,
    tags: ['Critical', 'Burn Window'],
    timelineBias: 1.45,
  },
  {
    id: 'EVT-3080',
    eventId: 'EVT-3080',
    name: 'ORION-LINK / FRAG-77',
    satelliteName: 'ORION-LINK',
    debrisName: 'FRAG-77',
    riskLevel: 'MEDIUM',
    probabilityOfCollision: 0.04,
    timeToTcaMinutes: 288,
    closestApproachKm: 73.1,
    relativeVelocityKmS: 9.8,
    deltaVKmS: 1.4,
    fuelRemainingPct: 57,
    status: 'Review',
    location: 'LEO-781',
    updatedAt: baseTimestamp,
    inclinationDeg: 42.1,
    altitudeKm: 610,
    longitudeDeg: -23.8,
    tags: ['Medium', 'Review'],
    timelineBias: 0.98,
  },
];

const generateTrend = (seed: SeedEvent): MissionTelemetrySample[] => {
  const minutes = [60, 45, 30, 20, 10, 5, 0];
  const baseProbability = seed.probabilityOfCollision;
  const finalProbability = Math.min(0.96, baseProbability * 1.35 + seed.timelineBias * 0.12);

  return minutes.map((minute, index) => {
    const progress = index / (minutes.length - 1);
    const probability = baseProbability + (finalProbability - baseProbability) * Math.pow(progress, 1.3);
    const distance = Math.max(3, seed.closestApproachKm + (1 - progress) * seed.timelineBias * 22);
    const fuel = Math.max(0, seed.fuelRemainingPct - progress * (6 + seed.deltaVKmS * 4));
    const confidence = Math.min(98, 58 + progress * 30 + seed.timelineBias * 6);

    return {
      minute,
      probabilityOfCollision: Number(probability.toFixed(4)),
      closestApproachKm: Number(distance.toFixed(1)),
      fuelRemainingPct: Number(fuel.toFixed(1)),
      relativeVelocityKmS: Number((seed.relativeVelocityKmS - progress * 1.3).toFixed(1)),
      confidencePct: Number(confidence.toFixed(1)),
    };
  });
};

export const mockMissionEvents: MissionEvent[] = eventSeeds.map((seed) => {
  const trend = generateTrend(seed);

  return {
    ...seed,
    trend,
  };
});

export const getMockEventById = (eventId: string): MissionEvent => {
  const normalized = String(eventId);
  const seed = mockMissionEvents.find((event) => event.id === normalized || event.eventId === normalized);
  return seed ?? mockMissionEvents[0];
};

export const buildMockTelemetry = (event: MissionEvent): MissionTelemetry => ({
  eventId: event.eventId,
  current: event.trend[event.trend.length - 1],
  peakProbabilityOfCollision: Math.max(...event.trend.map((sample) => sample.probabilityOfCollision)),
  samples: event.trend,
});

export const buildMockDecision = (event: MissionEvent): MissionDecision => {
  const status = event.riskLevel === 'CRITICAL' ? 'FORCE_COMMIT' : event.riskLevel === 'HIGH' ? 'COMMIT' : 'WAIT';

  const options: DecisionOption[] = [
    {
      label: 'Nominal maneuver',
      deltaVKmS: Number((event.deltaVKmS * 0.55).toFixed(1)),
      fuelUsePct: Number((event.fuelRemainingPct * 0.04).toFixed(1)),
      riskReductionPct: 26,
    },
    {
      label: 'Optimized maneuver',
      deltaVKmS: Number(event.deltaVKmS.toFixed(1)),
      fuelUsePct: Number((event.fuelRemainingPct * 0.08).toFixed(1)),
      riskReductionPct: 58,
      recommended: true,
    },
    {
      label: 'Emergency maneuver',
      deltaVKmS: Number((event.deltaVKmS * 1.4).toFixed(1)),
      fuelUsePct: Number((event.fuelRemainingPct * 0.12).toFixed(1)),
      riskReductionPct: 78,
    },
  ];

  return {
    eventId: event.eventId,
    status,
    recommendation: status === 'FORCE_COMMIT' ? 'Immediate maneuver required' : 'Commit to optimized maneuver',
    confidencePct: event.riskLevel === 'CRITICAL' ? 78 : event.riskLevel === 'HIGH' ? 84 : 91,
    costIfAct: Number((event.deltaVKmS * 1.2).toFixed(2)),
    costIfWait: Number((event.deltaVKmS * (event.riskLevel === 'CRITICAL' ? 2.3 : 1.6)).toFixed(2)),
    burnWindowMinutes: event.riskLevel === 'CRITICAL' ? 30 : 120,
    reason: event.riskLevel === 'CRITICAL'
      ? 'Waiting cost exceeds maneuver cost and the burn window is closing.'
      : 'A maneuver is beneficial before the covariance envelope grows further.',
    options,
    alerts: event.riskLevel === 'CRITICAL'
      ? ['Burn window is shrinking rapidly', 'Trajectory convergence has crossed safe threshold']
      : ['Telemetry is stable', 'Monitor for covariance expansion'],
  };
};

export const buildMockValidation = (event: MissionEvent): MissionValidation => {
  const aiRiskLevel = event.riskLevel;
  const physicsRiskLevel = event.riskLevel === 'LOW' ? 'LOW' : event.riskLevel === 'MEDIUM' ? 'MEDIUM' : 'CRITICAL';

  const metrics: ValidationMetric[] = [
    {
      label: 'PoC',
      aiValue: event.probabilityOfCollision,
      physicsValue: Number((event.probabilityOfCollision * 0.92).toFixed(4)),
      agreementPct: event.riskLevel === 'CRITICAL' ? 95 : 88,
    },
    {
      label: 'Miss Distance',
      aiValue: event.closestApproachKm,
      physicsValue: Number((event.closestApproachKm * 1.08).toFixed(1)),
      agreementPct: 89,
    },
    {
      label: 'Required ΔV',
      aiValue: event.deltaVKmS,
      physicsValue: Number((event.deltaVKmS * 1.03).toFixed(1)),
      agreementPct: 93,
    },
  ];

  return {
    eventId: event.eventId,
    aiRiskLevel,
    physicsRiskLevel,
    agreementScorePct: event.riskLevel === 'CRITICAL' ? 84 : 91,
    consensus: event.riskLevel === 'CRITICAL'
      ? 'AI and physics models agree on immediate mitigation.'
      : 'Symbolic and ML forecasts are aligned within acceptable tolerance.',
    conflictSummary: event.riskLevel === 'CRITICAL'
      ? ['AI confidence is slightly more aggressive than the physics baseline.']
      : ['Minor divergence in distance forecast, but not operationally significant.'],
    metrics,
  };
};

export const buildMockScenario = (eventId: string): MissionScenario => {
  const event = getMockEventById(eventId);

  return {
    event,
    telemetry: buildMockTelemetry(event),
    decision: buildMockDecision(event),
    validation: buildMockValidation(event),
  };
};
