import type {
  MissionDecision,
  MissionEvent,
  MissionTelemetry,
  MissionValidation,
  MissionRiskLevel,
} from '../../types/mission';
import { clamp } from '../../utils/format';
import { getMockEventById } from '../api/mockData';

const riskFromProbability = (probability: number): MissionRiskLevel => {
  if (probability >= 0.05) return 'CRITICAL';
  if (probability >= 0.02) return 'HIGH';
  if (probability >= 0.005) return 'MEDIUM';
  return 'LOW';
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const normalizeEvent = (value: unknown): MissionEvent => {
  if (!value || typeof value !== 'object') {
    return getMockEventById('EVT-2080');
  }

  const candidate = value as Record<string, unknown>;
  const eventId = String(candidate.event_id ?? candidate.id ?? 'EVT-2080');
  const fallback = getMockEventById(eventId);
  const probability = toNumber(candidate.probability_of_collision ?? candidate.collision_probability ?? fallback.probabilityOfCollision);
  const closestApproachKm = toNumber(candidate.closest_approach_km ?? candidate.miss_distance ?? fallback.closestApproachKm);
  const timeToTcaMinutes = toNumber(candidate.time_to_tca_minutes ?? candidate.tca_minutes ?? fallback.timeToTcaMinutes);

  return {
    ...fallback,
    id: eventId,
    eventId,
    name: String(candidate.name ?? candidate.title ?? fallback.name),
    satelliteName: String(candidate.satellite_name ?? candidate.primary_object ?? fallback.satelliteName),
    debrisName: String(candidate.debris_name ?? candidate.secondary_object ?? fallback.debrisName),
    riskLevel: riskFromProbability(probability),
    probabilityOfCollision: probability,
    timeToTcaMinutes,
    closestApproachKm,
    relativeVelocityKmS: toNumber(candidate.relative_velocity_km_s ?? candidate.relative_velocity ?? fallback.relativeVelocityKmS),
    deltaVKmS: toNumber(candidate.delta_v_km_s ?? candidate.delta_v_required ?? fallback.deltaVKmS),
    fuelRemainingPct: clamp(toNumber(candidate.fuel_remaining_pct ?? candidate.fuel_remaining ?? fallback.fuelRemainingPct), 0, 100),
    status: String(candidate.status ?? fallback.status),
    location: String(candidate.location ?? fallback.location),
    updatedAt: String(candidate.updated_at ?? fallback.updatedAt),
    inclinationDeg: toNumber(candidate.inclination_deg ?? fallback.inclinationDeg),
    altitudeKm: toNumber(candidate.altitude_km ?? fallback.altitudeKm),
    longitudeDeg: toNumber(candidate.longitude_deg ?? fallback.longitudeDeg),
    tags: Array.isArray(candidate.tags) ? candidate.tags.map(String) : fallback.tags,
    trend: fallback.trend,
  };
};

export const normalizeTelemetry = (value: unknown, event: MissionEvent): MissionTelemetry => {
  if (!value || typeof value !== 'object') {
    return {
      eventId: event.eventId,
      current: event.trend[event.trend.length - 1],
      peakProbabilityOfCollision: Math.max(...event.trend.map((sample) => sample.probabilityOfCollision)),
      samples: event.trend,
    };
  }

  return {
    eventId: event.eventId,
    current: event.trend[event.trend.length - 1],
    peakProbabilityOfCollision: Math.max(...event.trend.map((sample) => sample.probabilityOfCollision)),
    samples: event.trend,
  };
};

export const normalizeDecision = (value: unknown, event: MissionEvent): MissionDecision => {
  if (!value || typeof value !== 'object') {
    return {
      eventId: event.eventId,
      status: event.riskLevel === 'CRITICAL' ? 'FORCE_COMMIT' : event.riskLevel === 'HIGH' ? 'COMMIT' : 'WAIT',
      recommendation: event.riskLevel === 'CRITICAL' ? 'Immediate maneuver required' : 'Commit to optimized maneuver',
      confidencePct: event.riskLevel === 'CRITICAL' ? 78 : 91,
      costIfAct: Number((event.deltaVKmS * 1.2).toFixed(2)),
      costIfWait: Number((event.deltaVKmS * 1.9).toFixed(2)),
      burnWindowMinutes: event.riskLevel === 'CRITICAL' ? 30 : 120,
      reason: 'Mock fallback decision generated from current event risk.',
      options: [],
      alerts: [],
    };
  }

  const candidate = value as Record<string, unknown>;
  const modelsMap = candidate.models as MissionDecision['models'] | undefined;
  const allModelsList = (Array.isArray(candidate.all_models)
    ? candidate.all_models
    : modelsMap ? Object.values(modelsMap) : []) as MissionDecision['all_models'];

  return {
    eventId: event.eventId,
    status: (candidate.status as MissionDecision['status']) ?? 'WAIT',
    recommendation: String(candidate.recommendation ?? candidate.reason ?? 'Commit to optimized maneuver'),
    confidencePct: toNumber(candidate.confidencePct ?? candidate.confidence_pct ?? candidate.confidence ?? 0),
    costIfAct: toNumber(candidate.costIfAct ?? candidate.cost_if_act ?? candidate.cost_act ?? 0),
    costIfWait: toNumber(candidate.costIfWait ?? candidate.cost_if_wait ?? candidate.cost_wait ?? 0),
    burnWindowMinutes: toNumber(candidate.burnWindowMinutes ?? candidate.burn_window_minutes ?? 0),
    reason: String(candidate.reason ?? ''),
    options: Array.isArray(candidate.options) ? candidate.options as MissionDecision['options'] : [],
    alerts: Array.isArray(candidate.alerts) ? candidate.alerts.map(String) : [],
    models: modelsMap,
    all_models: allModelsList,
  };
};

export const normalizeValidation = (value: unknown, event: MissionEvent): MissionValidation => {
  if (!value || typeof value !== 'object') {
    return {
      eventId: event.eventId,
      aiRiskLevel: event.riskLevel,
      physicsRiskLevel: event.riskLevel,
      agreementScorePct: 90,
      consensus: 'Mock validation consensus',
      conflictSummary: [],
      metrics: [],
    };
  }

  return {
    eventId: event.eventId,
    aiRiskLevel: event.riskLevel,
    physicsRiskLevel: event.riskLevel,
    agreementScorePct: 90,
    consensus: 'Mock validation consensus',
    conflictSummary: [],
    metrics: [],
  };
};
