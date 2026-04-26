import type { MissionRiskLevel } from '../types/mission';

export const RISK_ORDER: MissionRiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const RISK_THEME: Record<MissionRiskLevel, { label: string; accent: string; glow: string }> = {
  LOW: {
    label: 'Low Risk',
    accent: 'from-emerald-400 to-cyan-400',
    glow: 'shadow-[0_0_60px_rgba(16,185,129,0.22)]',
  },
  MEDIUM: {
    label: 'Medium Risk',
    accent: 'from-amber-300 to-orange-400',
    glow: 'shadow-[0_0_60px_rgba(251,191,36,0.24)]',
  },
  HIGH: {
    label: 'High Risk',
    accent: 'from-orange-400 to-rose-500',
    glow: 'shadow-[0_0_60px_rgba(249,115,22,0.28)]',
  },
  CRITICAL: {
    label: 'Critical',
    accent: 'from-rose-500 to-red-600',
    glow: 'shadow-[0_0_80px_rgba(239,68,68,0.34)]',
  },
};
