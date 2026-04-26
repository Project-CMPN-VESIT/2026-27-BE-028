export const formatPercent = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;

export const formatPct = (value: number, digits = 1) => `${value.toFixed(digits)}%`;

export const formatKm = (value: number, digits = 1) => `${value.toFixed(digits)} km`;

export const formatMeters = (value: number, digits = 1) => `${value.toFixed(digits)} m`;

export const formatMinutes = (value: number) => `${Math.max(0, Math.round(value))} min`;

export const formatDeltaV = (value: number, digits = 1) => `${value.toFixed(digits)} m/s`;

export const formatTimestamp = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  }).format(new Date(value));

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
