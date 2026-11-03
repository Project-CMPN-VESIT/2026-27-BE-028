import { requestJson, requestRootJson } from './client';

export interface OrbitalXCatalogEvent {
  id: string;
  name: string;
  riskLevel: string | null;
  probabilityOfCollision: number | null;
  timeToTca: number | null;
  missDistance: number | null;
  relativeVelocity: number | null;
  requiredDeltaV: number | null;
  fuelRemaining: number | null;
}

export interface OrbitalXModelRecommendation {
  model: string;
  raw: string | null;
  final: string | null;
  probabilityOfCommit: number | null;
  symbolicOverride: boolean | null;
  reason: string | null;
}

export interface OrbitalXObservation {
  datasetIndex: number;
  timeToTca: number | null;
  probabilityOfCollision: number | null;
  missDistance: number | null;
  relativeVelocity: number | null;
  fuelRemaining: number | null;
  requiredDeltaV: number | null;
  maxDeltaV: number | null;
  fuelMargin: number | null;
  maneuverFeasible: boolean | null;
  recommendations: OrbitalXModelRecommendation[];
}

export interface OrbitalXScenario {
  event: OrbitalXCatalogEvent;
  observations: OrbitalXObservation[];
  simulationMode?: 'GAME' | 'BACKEND';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function readFirstNumber(source: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = readNumber(source[key]);
    if (value !== null) return value;
  }
  return null;
}

function normalizeCatalogEvent(value: unknown): OrbitalXCatalogEvent | null {
  if (!isRecord(value)) return null;

  const id = readText(value.eventId) ?? readText(value.event_id) ?? readText(value.id);
  if (!id) return null;

  return {
    id,
    name: readText(value.name) ?? `Event ${id}`,
    riskLevel: readText(value.riskLevel) ?? readText(value.risk_level),
    probabilityOfCollision: readFirstNumber(value, 'probabilityOfCollision', 'probability_of_collision', 'collision_probability'),
    timeToTca: readFirstNumber(value, 'timeToTcaMinutes', 'time_to_tca', 'tca_minutes'),
    missDistance: readFirstNumber(value, 'closestApproachKm', 'miss_distance'),
    relativeVelocity: readFirstNumber(value, 'relativeVelocityKmS', 'relative_velocity'),
    requiredDeltaV: readFirstNumber(value, 'deltaVKmS', 'delta_v_required'),
    fuelRemaining: readFirstNumber(value, 'fuelRemainingPct', 'fuel_remaining'),
  };
}

export async function fetchOrbitalXEvents(): Promise<OrbitalXCatalogEvent[]> {
  const payload = await requestJson<unknown>('/events');
  if (!Array.isArray(payload)) {
    throw new Error('The events endpoint returned an unexpected response. Check that the model-serving backend is running.');
  }

  const events = payload.map(normalizeCatalogEvent).filter((event): event is OrbitalXCatalogEvent => event !== null);
  if (events.length === 0) {
    throw new Error('No usable conjunction events were returned by the backend.');
  }
  return events;
}

function readRecommendations(value: unknown): OrbitalXModelRecommendation[] {
  if (!isRecord(value)) return [];

  return Object.entries(value).flatMap(([key, candidate]) => {
    if (!isRecord(candidate)) return [];
    const model = readText(candidate.model_name) ?? key.toUpperCase();
    return [{
      model,
      raw: readText(candidate.raw),
      final: readText(candidate.final),
      probabilityOfCommit: readNumber(candidate.prob_commit),
      symbolicOverride: typeof candidate.override === 'boolean' ? candidate.override : null,
      reason: readText(candidate.reason),
    }];
  });
}

export async function fetchOrbitalXScenario(eventId: string): Promise<OrbitalXScenario> {
  const payload = await requestRootJson<unknown>(`/sample?event_id=${encodeURIComponent(eventId)}`);
  if (!isRecord(payload) || !isRecord(payload.event)) {
    throw new Error('The scenario endpoint returned no event details.');
  }

  const rawEvent = payload.event;
  const responseId = readText(rawEvent.eventId) ?? readText(rawEvent.event_id) ?? readText(rawEvent.id);
  if (responseId !== eventId) {
    throw new Error('The scenario response did not match the selected event.');
  }
  const normalizedEvent = normalizeCatalogEvent(rawEvent);
  if (!normalizedEvent) {
    throw new Error('The scenario response did not contain a valid event summary.');
  }

  const rawTimesteps = payload.timesteps;
  const trend = rawEvent.trend;
  const rawSequence = Array.isArray(payload.raw_sequence) ? payload.raw_sequence : payload.sequence;
  if (
    !Array.isArray(rawTimesteps)
    || rawTimesteps.length !== 20
    || !Array.isArray(trend)
    || trend.length !== 20
    || !Array.isArray(rawSequence)
    || rawSequence.length !== 20
  ) {
    throw new Error('OrbitalX requires the backend event sequence to contain exactly 20 observations.');
  }

  const event: OrbitalXCatalogEvent = normalizedEvent;

  const observations = rawTimesteps.map((value, index): OrbitalXObservation => {
    if (!isRecord(value) || !isRecord(trend[index]) || !Array.isArray(rawSequence[index])) {
      throw new Error(`The backend returned an invalid observation at timestep ${index + 1}.`);
    }

    const step = value;
    const trendPoint = trend[index] as Record<string, unknown>;
    const rawFeatures = rawSequence[index] as unknown[];
    const feasibility = readNumber(step.feasibility_flag);

    return {
      datasetIndex: index,
      timeToTca: readNumber(step.time_to_tca),
      probabilityOfCollision: readNumber(step.poc) ?? readFirstNumber(trendPoint, 'probabilityOfCollision', 'probability_of_collision'),
      missDistance: readFirstNumber(trendPoint, 'closestApproachKm', 'miss_distance'),
      relativeVelocity: readFirstNumber(trendPoint, 'relativeVelocityKmS', 'relative_velocity'),
      fuelRemaining: readFirstNumber(trendPoint, 'fuelRemainingPct', 'fuel_remaining'),
      requiredDeltaV: event.requiredDeltaV,
      maxDeltaV: readNumber(rawFeatures[1]),
      fuelMargin: readNumber(rawFeatures[32]),
      maneuverFeasible: feasibility === null ? null : feasibility > 0,
      recommendations: readRecommendations(step.models),
    };
  });

  return { event, observations };
}
