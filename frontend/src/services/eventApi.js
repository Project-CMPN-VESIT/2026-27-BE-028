import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const DEMO_EVENTS = [
  {
    id: 2080,
    event_id: 2080,
    primary_object: 'STARLINK-1234',
    secondary_object: 'FRA-3047',
    time_to_tca: 0.2,
    tca_minutes: 12,
    probability_of_collision: 0.056,
    collision_probability: 0.056,
    miss_distance: 7.2,
    relative_velocity: 10.8,
    delta_v_required: 2.3,
    risk_level: 'CRITICAL'
  },
  {
    id: 2081,
    event_id: 2081,
    primary_object: 'NOAA-19',
    secondary_object: 'DEB-5521',
    time_to_tca: 0.46,
    tca_minutes: 28,
    probability_of_collision: 0.028,
    collision_probability: 0.028,
    miss_distance: 12.4,
    relative_velocity: 8.7,
    delta_v_required: 1.7,
    risk_level: 'HIGH'
  },
  {
    id: 2082,
    event_id: 2082,
    primary_object: 'FENGYUN-1C',
    secondary_object: 'DEB-1184',
    time_to_tca: 0.81,
    tca_minutes: 49,
    probability_of_collision: 0.012,
    collision_probability: 0.012,
    miss_distance: 24.8,
    relative_velocity: 7.9,
    delta_v_required: 1.2,
    risk_level: 'MEDIUM'
  },
  {
    id: 2083,
    event_id: 2083,
    primary_object: 'HST',
    secondary_object: 'DEB-9091',
    time_to_tca: 1.34,
    tca_minutes: 81,
    probability_of_collision: 0.004,
    collision_probability: 0.004,
    miss_distance: 41.6,
    relative_velocity: 6.1,
    delta_v_required: 0.8,
    risk_level: 'LOW'
  }
];

const DEMO_DECISIONS = {
  2080: {
    decision: 'COMMIT',
    confidence: 0.91,
    cost_act: 2.34,
    cost_wait: 4.71,
    fuel_required: 185,
    time_to_burn: 12,
    success_rate: 94.2
  },
  2081: {
    decision: 'COMMIT',
    confidence: 0.84,
    cost_act: 1.91,
    cost_wait: 3.58,
    fuel_required: 162,
    time_to_burn: 18,
    success_rate: 89.7
  },
  2082: {
    decision: 'WAIT',
    confidence: 0.67,
    cost_act: 1.42,
    cost_wait: 1.18,
    fuel_required: 126,
    time_to_burn: 34,
    success_rate: 71.5
  },
  2083: {
    decision: 'WAIT',
    confidence: 0.61,
    cost_act: 0.95,
    cost_wait: 0.72,
    fuel_required: 94,
    time_to_burn: 52,
    success_rate: 63.1
  }
};

const isNetworkError = (error) =>
  error?.code === 'ECONNABORTED' ||
  error?.code === 'ERR_NETWORK' ||
  error?.message?.includes('ERR_CONNECTION_REFUSED') ||
  error?.message?.includes('Network Error');

const clone = (value) => JSON.parse(JSON.stringify(value));

const fallbackEventById = (id) => {
  const numericId = Number(id);
  const base = DEMO_EVENTS.find((event) => event.id === numericId) ?? DEMO_EVENTS[0];
  return {
    ...clone(base),
    id: numericId || base.id,
    event_id: numericId || base.event_id,
    tca_minutes: base.tca_minutes,
    collision_probability: base.collision_probability,
    miss_distance: base.miss_distance,
    relative_velocity: base.relative_velocity,
    risk_level: base.risk_level
  };
};

const eventApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

export const getEvents = async () => {
  try {
    const response = await eventApi.get('/events');
    return response.data;
  } catch (error) {
    if (isNetworkError(error)) {
      return clone(DEMO_EVENTS);
    }
    throw error;
  }
};

export const getEventById = async (id) => {
  try {
    const response = await eventApi.get(`/events/${id}`);
    return response.data;
  } catch (error) {
    if (isNetworkError(error)) {
      return fallbackEventById(id);
    }
    throw error;
  }
};

export const getDecisionOutput = async (eventId) => {
  try {
    const response = await eventApi.post(`/evaluate/${eventId}`);
    return response.data;
  } catch (error) {
    if (isNetworkError(error)) {
      const fallback = DEMO_DECISIONS[Number(eventId)] ?? DEMO_DECISIONS[2080];
      return clone(fallback);
    }
    throw error;
  }
};

export default {
  getEvents,
  getEventById,
  getDecisionOutput
};