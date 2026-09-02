import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface ComparisonChartProps {
  data?: any[];
  metrics?: any[];
  metricKey?: 'accuracy' | 'f1Score' | 'macroF1' | 'precision' | 'recall' | 'rocAuc' | 'all';
}

export function ComparisonChart({ data, metrics, metricKey = 'all' }: ComparisonChartProps) {
  if (data && data.length > 0) {
    if (metricKey === 'all') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="label" tick={{ fill: '#d1d5db', fontSize: 11 }} stroke="rgba(255,255,255,0.12)" />
            <YAxis domain={[0, 100]} tick={{ fill: '#d1d5db', fontSize: 11 }} stroke="rgba(255,255,255,0.12)" unit="%" />
            <Tooltip
              contentStyle={{
                background: 'rgba(2, 6, 23, 0.95)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '16px',
                color: '#fff',
              }}
              formatter={(value: any) => [`${value}%`, '']}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            <Bar dataKey="accuracy" name="Accuracy" fill="#22d3ee" radius={[6, 6, 0, 0]} />
            <Bar dataKey="macroF1" name="Macro-F1" fill="#38bdf8" radius={[6, 6, 0, 0]} />
            <Bar dataKey="rocAuc" name="ROC-AUC" fill="#a855f7" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    const keyNameMap: Record<string, string> = {
      accuracy: 'Accuracy',
      f1Score: 'F1 Score',
      macroF1: 'Macro-F1',
      precision: 'Precision',
      recall: 'Recall',
      rocAuc: 'ROC-AUC',
    };

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="label" tick={{ fill: '#d1d5db', fontSize: 11 }} stroke="rgba(255,255,255,0.12)" />
          <YAxis domain={[0, 100]} tick={{ fill: '#d1d5db', fontSize: 11 }} stroke="rgba(255,255,255,0.12)" unit="%" />
          <Tooltip
            contentStyle={{
              background: 'rgba(2, 6, 23, 0.95)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '16px',
              color: '#fff',
            }}
            formatter={(value: any) => [`${value}%`, keyNameMap[metricKey] || metricKey]}
          />
          <Bar dataKey={metricKey} name={keyNameMap[metricKey] || metricKey} fill="#22d3ee" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const displayMetrics = metrics || [];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={displayMetrics} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
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
