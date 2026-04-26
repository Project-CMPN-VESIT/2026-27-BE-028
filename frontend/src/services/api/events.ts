import type { MissionEvent, MissionScenario } from '../../types/mission';
import { requestJsonWithFallback } from './client';
import { buildMockScenario, getMockEventById, mockMissionEvents } from './mockData';
import { normalizeEvent } from '../adapters/missionAdapters';
import { fetchMissionDecision, fetchMissionValidation } from './decision';
import { fetchMissionTelemetry } from './telemetry';

export async function fetchMissionEvents(): Promise<MissionEvent[]> {
  return requestJsonWithFallback(
    async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/events`);
      if (!response.ok) {
        throw new Error('Events endpoint unavailable');
      }

      const payload = await response.json();
      if (!Array.isArray(payload) || payload.length === 0) {
        throw new Error('Invalid events payload');
      }

      return payload.map(normalizeEvent);
    },
    async () => mockMissionEvents,
  );
}

export async function fetchMissionEvent(eventId: string): Promise<MissionEvent> {
  return requestJsonWithFallback(
    async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/events/${eventId}`);
      if (!response.ok) {
        throw new Error('Event endpoint unavailable');
      }

      return normalizeEvent(await response.json());
    },
    async () => getMockEventById(eventId),
  );
}

export async function fetchMissionScenario(eventId: string): Promise<MissionScenario> {
  const event = await fetchMissionEvent(eventId);
  const [telemetry, decision, validation] = await Promise.all([
    fetchMissionTelemetry(eventId, event),
    fetchMissionDecision(eventId, event),
    fetchMissionValidation(eventId, event),
  ]);

  return {
    event,
    telemetry,
    decision,
    validation,
  };
}

export async function fetchMockMissionScenario(eventId: string): Promise<MissionScenario> {
  return buildMockScenario(eventId);
}
