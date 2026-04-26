export type MissionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface MissionEvent {
  id: string;
  eventId: string;
  name: string;
  satelliteName: string;
  debrisName: string;
  riskLevel: MissionRiskLevel;
  probabilityOfCollision: number;
  timeToTcaMinutes: number;
  closestApproachKm: number;
  relativeVelocityKmS: number;
  deltaVKmS: number;
  fuelRemainingPct: number;
  status: string;
  location: string;
  updatedAt: string;
  inclinationDeg: number;
  altitudeKm: number;
  longitudeDeg: number;
  tags: string[];
  trend: MissionTelemetrySample[];
}

export interface MissionTelemetrySample {
  minute: number;
  probabilityOfCollision: number;
  closestApproachKm: number;
  fuelRemainingPct: number;
  relativeVelocityKmS: number;
  confidencePct: number;
}

export interface MissionTelemetry {
  eventId: string;
  current: MissionTelemetrySample;
  peakProbabilityOfCollision: number;
  samples: MissionTelemetrySample[];
}

export interface DecisionOption {
  label: string;
  deltaVKmS: number;
  fuelUsePct: number;
  riskReductionPct: number;
  recommended?: boolean;
}

export interface MissionDecision {
  eventId: string;
  status: 'WAIT' | 'COMMIT' | 'FORCE_COMMIT';
  recommendation: string;
  confidencePct: number;
  costIfAct: number;
  costIfWait: number;
  burnWindowMinutes: number;
  reason: string;
  options: DecisionOption[];
  alerts: string[];
}

export interface ValidationMetric {
  label: string;
  aiValue: number;
  physicsValue: number;
  agreementPct: number;
}

export interface MissionValidation {
  eventId: string;
  aiRiskLevel: MissionRiskLevel;
  physicsRiskLevel: MissionRiskLevel;
  agreementScorePct: number;
  consensus: string;
  conflictSummary: string[];
  metrics: ValidationMetric[];
}

export interface MissionScenario {
  event: MissionEvent;
  telemetry: MissionTelemetry;
  decision: MissionDecision;
  validation: MissionValidation;
}
