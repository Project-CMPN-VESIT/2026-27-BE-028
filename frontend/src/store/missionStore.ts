import { create } from 'zustand';
import { clamp } from '../utils/format';
import type { AnalyticsComparisonData, MissionDecision, MissionEvent, MissionTelemetry, MissionValidation } from '../types/mission';
import { fetchMissionEvents, fetchMissionScenario } from '../services/api/events';
import { fetchModelComparison } from '../services/api/decision';

interface LoadingState {
  events: boolean;
  scenario: boolean;
  comparison: boolean;
}

interface MissionStoreState {
  events: MissionEvent[];
  selectedEventId: string | null;
  selectedEvent: MissionEvent | null;
  telemetry: MissionTelemetry | null;
  decision: MissionDecision | null;
  validation: MissionValidation | null;
  modelComparison: AnalyticsComparisonData | null;
  loading: LoadingState;
  error: string | null;
  timelineCursor: number;
  isPlaying: boolean;
  criticalMode: boolean;
  lastSyncedAt: string | null;
  loadEvents: () => Promise<void>;
  selectEvent: (eventId: string) => Promise<void>;
  loadModelComparison: () => Promise<void>;
  setTimelineCursor: (value: number) => void;
  setPlaying: (value: boolean) => void;
  togglePlayback: () => void;
  triggerCriticalMode: () => void;
  clearCriticalMode: () => void;
  acknowledgeAlert: () => void;
}

export const useMissionStore = create<MissionStoreState>((set, get) => ({
  events: [],
  selectedEventId: null,
  selectedEvent: null,
  telemetry: null,
  decision: null,
  validation: null,
  modelComparison: null,
  loading: {
    events: false,
    scenario: false,
    comparison: false,
  },
  error: null,
  timelineCursor: 100,
  isPlaying: false,
  criticalMode: false,
  lastSyncedAt: null,

  loadEvents: async () => {
    set((state) => ({
      loading: { ...state.loading, events: true },
      error: null,
    }));

    try {
      const events = await fetchMissionEvents();
      const selectedEventId = get().selectedEventId ?? events[0]?.id ?? null;

      set((state) => ({
        events,
        selectedEventId,
        loading: { ...state.loading, events: false },
        error: null,
      }));

      if (selectedEventId) {
        await get().selectEvent(selectedEventId);
      }
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, events: false },
        error: error instanceof Error ? error.message : 'Failed to load events',
      }));
    }
  },

  loadModelComparison: async () => {
    set((state) => ({
      loading: { ...state.loading, comparison: true },
      error: null,
    }));

    try {
      const comparisonData = await fetchModelComparison();
      set((state) => ({
        modelComparison: comparisonData,
        loading: { ...state.loading, comparison: false },
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, comparison: false },
        error: error instanceof Error ? error.message : 'Failed to load model comparison',
      }));
    }
  },

  selectEvent: async (eventId: string) => {
    set((state) => ({
      selectedEventId: eventId,
      loading: { ...state.loading, scenario: true },
      error: null,
      timelineCursor: 100,
    }));

    try {
      const scenario = await fetchMissionScenario(eventId);

      set((state) => ({
        selectedEvent: scenario.event,
        telemetry: scenario.telemetry,
        decision: scenario.decision,
        validation: scenario.validation,
        loading: { ...state.loading, scenario: false },
        criticalMode: scenario.event.riskLevel === 'CRITICAL' || state.criticalMode,
        lastSyncedAt: new Date().toISOString(),
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, scenario: false },
        error: error instanceof Error ? error.message : 'Failed to load event scenario',
      }));
    }
  },

  setTimelineCursor: (value: number) => {
    set({ timelineCursor: clamp(value, 0, 100) });
  },

  setPlaying: (value: boolean) => {
    set({ isPlaying: value });
  },

  togglePlayback: () => {
    set((state) => ({ isPlaying: !state.isPlaying }));
  },

  triggerCriticalMode: () => {
    set({ criticalMode: true });
  },

  clearCriticalMode: () => {
    set({ criticalMode: false });
  },

  acknowledgeAlert: () => {
    set({ criticalMode: false });
  },
}));
