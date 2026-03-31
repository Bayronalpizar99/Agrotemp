export interface NDVITimePoint {
  date: string;
  mean: number;
  min: number;
  max: number;
  stDev: number;
  noDataPercent: number;
}

export interface NDVIResult {
  bbox: number[];
  period: { from: string; to: string };
  timeSeries: NDVITimePoint[];
  summary: {
    avgNDVI: number;
    minNDVI: number;
    maxNDVI: number;
    classification: string;
    trend: 'subiendo' | 'bajando' | 'estable';
  };
}
