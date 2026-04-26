import type { MissionEvent, MissionTelemetry } from '../../types/mission';
import { requestJsonWithFallback } from './client';
import { buildMockTelemetry, getMockEventById } from './mockData';
import { normalizeEvent, normalizeTelemetry } from '../adapters/missionAdapters';

export async function fetchMissionTelemetry(eventId: string, event?: MissionEvent): Promise<MissionTelemetry> {
  const resolvedEvent = event ?? getMockEventById(eventId);

  return requestJsonWithFallback(
    async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/events/${eventId}`);
      if (!response.ok) {
        throw new Error('Telemetry endpoint unavailable');
      }

      const payload = await response.json();
      return normalizeTelemetry(payload, normalizeEvent(payload ?? resolvedEvent),);
    },
    async () => buildMockTelemetry(resolvedEvent),
  );
}
