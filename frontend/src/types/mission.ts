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

export interface ModelPredictionResult {
  model_name: string;
  available: boolean;
  error?: string | null;
  raw_prediction: 'COMMIT' | 'WAIT' | 'ERROR' | 'N/A';
  raw_prediction_int: number;
  commit_probability: number;
  wait_probability: number;
  symbolic_correction: boolean;
  symbolic_reason: string;
  final_prediction: 'COMMIT' | 'WAIT';
  final_prediction_int: number;
  forecast?: string;
  has_sequence_correction?: boolean;
  total_corrections_in_event?: number;
  timesteps?: Array<{
    timestep: number;
    time_to_tca: number;
    feasibility_flag: number;
    commit_prob: number;
    wait_prob: number;
    raw_prediction: string;
    symbolic_correction: boolean;
    symbolic_reason: string;
    final_prediction: string;
  }>;
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
  models?: Record<string, ModelPredictionResult>;
  all_models?: ModelPredictionResult[];
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

export interface ModelComparisonItem {
  model_name: string;
  available: boolean;
  error?: string | null;
  raw_accuracy: number;
  shielded_accuracy: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  macro_f1: number;
  roc_auc: number;
  symbolic_corrections: number;
  compliance_rate: number;
  confusion_matrix?: {
    tn: number;
    fp: number;
    fn: number;
    tp: number;
  };
}

export interface AnalyticsComparisonData {
  test_events_count: number;
  test_timesteps_count: number;
  models: Record<string, ModelComparisonItem>;
  models_list: ModelComparisonItem[];
  chart_metrics: Array<{
    label: string;
    accuracy: number;
    f1Score: number;
    macroF1: number;
    precision: number;
    recall: number;
    rocAuc: number;
    corrections: number;
    available: boolean;
  }>;
  best_model: string;
  best_model_details: ModelComparisonItem | null;
  symbolic_compliance: string;
}

export interface MissionScenario {
  event: MissionEvent;
  telemetry: MissionTelemetry;
  decision: MissionDecision;
  validation: MissionValidation;
}
