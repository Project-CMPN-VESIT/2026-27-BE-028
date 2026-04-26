import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ValidationMetric } from '../../types/mission';

interface ComparisonChartProps {
  metrics: ValidationMetric[];
}

export function ComparisonChart({ metrics }: ComparisonChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={metrics} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
        <XAxis dataKey="label" tick={{ fill: '#d1d5db', fontSize: 11 }} stroke="rgba(255,255,255,0.12)" />
        <YAxis tick={{ fill: '#d1d5db', fontSize: 11 }} stroke="rgba(255,255,255,0.12)" />
        <Tooltip
          contentStyle={{
            background: 'rgba(2, 6, 23, 0.92)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '16px',
            color: '#fff',
          }}
        />
        <Bar dataKey="aiValue" name="AI" fill="#22d3ee" radius={[10, 10, 0, 0]} />
        <Bar dataKey="physicsValue" name="Physics" fill="#a855f7" radius={[10, 10, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
