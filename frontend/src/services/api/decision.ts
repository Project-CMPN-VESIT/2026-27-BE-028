import type { MissionDecision, MissionEvent, MissionValidation } from '../../types/mission';
import { requestJsonWithFallback } from './client';
import { buildMockDecision, buildMockValidation, getMockEventById } from './mockData';
import { normalizeDecision, normalizeEvent, normalizeValidation } from '../adapters/missionAdapters';

export async function fetchMissionDecision(eventId: string, event?: MissionEvent): Promise<MissionDecision> {
  const resolvedEvent = event ?? getMockEventById(eventId);

  return requestJsonWithFallback(
    async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/evaluate/${eventId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Decision endpoint unavailable');
      }

      const payload = await response.json();
      return normalizeDecision(payload, resolvedEvent);
    },
    async () => buildMockDecision(resolvedEvent),
  );
}

export async function fetchMissionValidation(eventId: string, event?: MissionEvent): Promise<MissionValidation> {
  const resolvedEvent = event ?? getMockEventById(eventId);

  return requestJsonWithFallback(
    async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/events/${eventId}`);
      if (!response.ok) {
        throw new Error('Validation endpoint unavailable');
      }

      const payload = await response.json();
      return normalizeValidation(payload, normalizeEvent(payload ?? resolvedEvent));
    },
    async () => buildMockValidation(resolvedEvent),
  );
}

export async function fetchModelComparison(): Promise<any> {
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/models/comparison`);
  if (!response.ok) {
    const fallbackResp = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/analytics/models`);
    if (!fallbackResp.ok) {
      throw new Error('Model comparison endpoint unavailable');
    }
    return await fallbackResp.json();
  }
  return await response.json();
}

