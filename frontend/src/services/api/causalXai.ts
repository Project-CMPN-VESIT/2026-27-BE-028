import { requestJson, requestJsonWithFallback } from './client';

export interface CausalEffect {
  treatment: string;
  outcome: string;
  estimated_ate: number;
  std_error: number;
  p_value: number;
  ci_lower_95: number;
  ci_upper_95: number;
  adjustment_set: string;
  robustness_status: string;
}

export interface CausalGraph {
  nodes: Array<{ id: string; label?: string }>;
  edges: Array<{ from: string; to: string }>;
}

export interface CausalSummaryData {
  analysis_type: string;
  disclaimer: string;
  effects: CausalEffect[] | null;
  refutation: any[] | null;
  assumptions: string | null;
  dag: CausalGraph | null;
  available: boolean;
}

export interface WhatIfScenarioItem {
  scenario_type?: string;
  scenario_category?: string;
  intervention_type: string;
  factual_poc: number;
  counterfactual_poc: number;
  delta_poc: number;
  is_physically_admissible: boolean;
  operational_status?: string;
}

export interface WhatIfModelResponse {
  model: string;
  intervention_type: string;
  factual_prob_commit: number;
  counterfactual_prob_commit: number;
  prob_commit_change: number;
  prediction_changed: boolean;
}

export interface CounterfactualData {
  available: boolean;
  analysis_type: string;
  disclaimer: string;
  scenarios: WhatIfScenarioItem[];
  model_responses: WhatIfModelResponse[];
  model_response_available: boolean;
}

export interface WhatIfResult {
  analysis_type: string;
  disclaimer: string;
  event_id: number;
  target_step_index: number;
  is_pre_tca_actionable: boolean;
  factual: Record<string, any>;
  counterfactual: Record<string, any>;
  deltas: Record<string, any>;
  counterfactual_admissible: boolean;
  operational_status: string;
  decision: {
    current: string;
    what_if: string;
    changed: boolean;
    current_operational_status?: string;
    what_if_operational_status?: string;
  };
  deterministic_explanation?: {
    explanation: string;
    disclaimer?: string;
  };
}

export interface XaiGlobalItem {
  model: string;
  feature: string;
  importance: number;
}

export interface XaiEventItem {
  model: string;
  feature: string;
  attribution: number;
  abs_attribution: number;
}

export interface PhysicsCheckItem {
  label: string;
  passed: boolean;
}

export interface PhysicsData {
  event_id: number;
  decision_epoch_step: number;
  operational_status: string;
  operational_reason: string;
  checks: PhysicsCheckItem[];
  values: Record<string, any>;
  analyzer?: any;
}

export async function fetchCausalSummary(): Promise<CausalSummaryData> {
  return requestJson<CausalSummaryData>('/causal/summary');
}

export async function fetchWhatIfScenarios(eventId: string | number): Promise<CounterfactualData> {
  return requestJson<CounterfactualData>(`/counterfactuals/${eventId}`);
}

export async function runInteractiveWhatIf(
  eventId: string | number,
  body: { intervention: 'timing' | 'delta_v'; delta_t_adv?: number; scale_factor?: number }
): Promise<WhatIfResult> {
  return requestJson<WhatIfResult>(`/events/${eventId}/what-if`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function fetchGlobalXai(): Promise<{ available: boolean; data: XaiGlobalItem[] | null }> {
  return requestJson<{ available: boolean; data: XaiGlobalItem[] | null }>('/xai/global');
}

export async function fetchEventXai(eventId: string | number): Promise<{ available: boolean; data: XaiEventItem[] | null }> {
  return requestJson<{ available: boolean; data: XaiEventItem[] | null }>(`/xai/event/${eventId}`);
}

export async function requestXaiExplanation(eventId: string | number): Promise<any> {
  return requestJson<any>(`/events/${eventId}/xai-explanation`, {
    method: 'POST',
  });
}

export async function fetchPhysicsChecks(eventId: string | number): Promise<PhysicsData> {
  return requestJson<PhysicsData>(`/physics/${eventId}`);
}

export async function fetchEventAnalysis(eventId: string | number): Promise<any> {
  return requestJson<any>(`/events/${eventId}/analysis`);
}

export async function fetchResearchOverview(): Promise<any> {
  return requestJson<any>('/overview');
}
