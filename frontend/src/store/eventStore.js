import { create } from 'zustand';
import { getEvents, getEventById, getDecisionOutput } from '../services/eventApi';

const createTimelineFromEvent = (event) => {
  const tca = Number(event?.tca_minutes ?? 0);
  const poc = Number(event?.collision_probability ?? 0);
  const distance = Number(event?.miss_distance ?? 0);

  return Array.from({ length: 60 }, (_, index) => {
    const progress = index / 59;
    const minutesLeft = Math.max(0, tca - index);
    const probability = Math.min(1, poc + progress * (0.18 + poc * 0.8));
    const missDistance = Math.max(1, distance - progress * (distance * 0.72));
    const fuel = Math.max(0, 100 - progress * 28 - progress * progress * 8);

    return {
      minute: minutesLeft,
      collision_probability: Number(probability.toFixed(4)),
      miss_distance: Number(missDistance.toFixed(1)),
      fuel_remaining: Number(fuel.toFixed(1))
    };
  });
};

const updateEventFrame = (event, simulationTime) => {
  if (!event) return event;

  const minuteStep = simulationTime / 60;
  const tcaMinutes = Math.max(0, Number(event.base_tca_minutes ?? event.tca_minutes ?? 0) - minuteStep);
  const probabilityBase = Number(event.base_collision_probability ?? event.collision_probability ?? 0);
  const probability = Math.min(1, probabilityBase + minuteStep * 0.0007 + simulationTime * 0.00002);
  const distanceBase = Number(event.base_miss_distance ?? event.miss_distance ?? 0);
  const missDistance = Math.max(1, distanceBase - minuteStep * 12.5 - simulationTime * 0.2);

  return {
    ...event,
    tca_minutes: Number(tcaMinutes.toFixed(1)),
    collision_probability: Number(probability.toFixed(4)),
    miss_distance: Number(missDistance.toFixed(1))
  };
};

const classifyRiskLevel = (probability) => {
  if (probability >= 0.05) return 'CRITICAL';
  if (probability >= 0.02) return 'HIGH';
  if (probability >= 0.005) return 'MEDIUM';
  return 'LOW';
};

const normalizeEventDetails = (eventDetails) => {
  const timeToTcaHours = Number(eventDetails?.time_to_tca ?? eventDetails?.timeToTca ?? 0);
  const collisionProbability = Number(eventDetails?.probability_of_collision ?? eventDetails?.collision_probability ?? 0);
  const missDistanceMeters = Number(eventDetails?.miss_distance ?? 0);
  const deltaV = Number(eventDetails?.delta_v_required ?? eventDetails?.deltaVRequired ?? 0);

  return {
    ...eventDetails,
    id: eventDetails?.event_id ?? eventDetails?.id,
    tca_hours: timeToTcaHours,
    tca_minutes: Number((timeToTcaHours * 60).toFixed(1)),
    collision_probability: collisionProbability,
    miss_distance: Number((missDistanceMeters / 1000).toFixed(3)),
    relative_velocity: Number(eventDetails?.relative_velocity ?? 0),
    delta_v_required: deltaV,
    risk_level: classifyRiskLevel(collisionProbability),
    base_tca_minutes: Number((timeToTcaHours * 60).toFixed(1)),
    base_collision_probability: collisionProbability,
    base_miss_distance: Number((missDistanceMeters / 1000).toFixed(3))
  };
};

const normalizeDecisionOutput = (decisionOutput) => {
  if (!decisionOutput) return null;

  const decisionCosts = decisionOutput.costs ?? {};

  return {
    ...decisionOutput,
    decision: decisionOutput.decision,
    confidence: decisionOutput.confidence,
    cost_act: decisionCosts.total_act_cost ?? decisionOutput.cost_act ?? decisionOutput.costCurrent,
    cost_wait: decisionCosts.total_wait_cost ?? decisionOutput.cost_wait ?? decisionOutput.costIfWait,
    fuel_required: decisionCosts.fuel_cost,
    time_to_burn: decisionOutput.recommended_action_time ?? decisionOutput.time_to_burn,
    success_rate: decisionOutput.causal_analysis?.recommendation_strength != null
      ? Number((decisionOutput.causal_analysis.recommendation_strength * 100).toFixed(1))
      : decisionOutput.success_rate,
    metrics: {
      fuelRequired: decisionCosts.fuel_cost,
      timeToBurn: decisionOutput.recommended_action_time ?? 0,
      successRate: decisionOutput.causal_analysis?.recommendation_strength != null
        ? Number((decisionOutput.causal_analysis.recommendation_strength * 100).toFixed(1))
        : 0
    }
  };
};

const useEventStore = create((set, get) => ({
  events: [],
  selectedEvent: null,
  selectedEventDetails: null,
  selectedDecision: null,
  eventTimelineData: [],
  simulationTime: 0,
  loading: false,
  error: null,

  loadEvents: async () => {
    set({ loading: true, error: null });
    try {
      const events = await getEvents();
      const normalizedEvents = Array.isArray(events)
        ? events.map((event) => {
            if (typeof event === 'number') {
              return { id: event };
            }

            if (event && typeof event === 'object') {
              return {
                ...event,
                id: event.id ?? event.event_id,
                base_tca_minutes: event.tca_minutes,
                base_collision_probability: event.collision_probability,
                base_miss_distance: event.miss_distance
              };
            }

            return null;
          }).filter(Boolean)
        : [];

      set((state) => ({
        events: normalizedEvents,
        selectedEvent: state.selectedEvent || normalizedEvents[0] || null,
        error: null,
        loading: false
      }));

      const firstEventId = normalizedEvents[0]?.id;
      if (firstEventId != null) {
        await get().selectEvent(firstEventId);
      }
    } catch (error) {
      set({ error: error.message || 'Failed to load events', loading: false });
    }
  },

  selectEvent: async (eventId) => {
    if (eventId == null) {
      set({ error: 'No event selected', loading: false });
      return;
    }

    set({ loading: true, error: null, simulationTime: 0 });
    try {
      const eventDetails = await getEventById(eventId);
      const decision = await getDecisionOutput(eventId).catch(() => null);
      const selectedEvent = normalizeEventDetails(eventDetails);

      set({
        selectedEvent,
        selectedEventDetails: eventDetails,
        selectedDecision: normalizeDecisionOutput(decision),
        eventTimelineData: createTimelineFromEvent(selectedEvent),
        loading: false,
        error: null
      });
    } catch (error) {
      set({ error: error.message || 'Failed to load event details', loading: false });
    }
  },

  tickSimulation: () => {
    const { selectedEvent, simulationTime } = get();
    if (!selectedEvent) return;

    const nextSimulationTime = simulationTime + 1;
    const nextEvent = updateEventFrame(selectedEvent, nextSimulationTime);
    const tcaMinutes = nextEvent.tca_minutes;
    const probability = nextEvent.collision_probability;
    const distance = nextEvent.miss_distance;

    set({
      simulationTime: nextSimulationTime,
      selectedEvent: nextEvent,
      eventTimelineData: createTimelineFromEvent({
        ...nextEvent,
        tca_minutes: tcaMinutes,
        collision_probability: probability,
        miss_distance: distance
      })
    });
  },

  resetSimulation: () => set({ simulationTime: 0 }),

  setSelectedEventById: async (eventId) => {
    await get().selectEvent(eventId);
  }
}));

export default useEventStore;