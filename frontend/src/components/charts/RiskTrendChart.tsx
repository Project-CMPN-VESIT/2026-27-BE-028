import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MissionTelemetrySample } from '../../types/mission';

interface RiskTrendChartProps {
  samples: MissionTelemetrySample[];
}

export function RiskTrendChart({ samples }: RiskTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={samples} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
        <XAxis dataKey="minute" tick={{ fill: '#d1d5db', fontSize: 11 }} stroke="rgba(255,255,255,0.12)" />
        <YAxis tick={{ fill: '#d1d5db', fontSize: 11 }} stroke="rgba(255,255,255,0.12)" />
        <Tooltip
          contentStyle={{
            background: 'rgba(2, 6, 23, 0.92)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '16px',
            color: '#fff',
          }}
        />
        <Area
          type="monotone"
          dataKey="probabilityOfCollision"
          stroke="#22d3ee"
          fill="url(#riskFill)"
          strokeWidth={2.4}
          dot={{ r: 2.5, fill: '#67e8f9', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
