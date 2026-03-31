const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/satellite`;

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

export const satelliteService = {
  getNDVI: async (bbox: number[], from: string, to: string): Promise<NDVIResult> => {
    const params = new URLSearchParams({
      bbox: bbox.join(','),
      from,
      to,
    });

    const response = await fetch(`${API_URL}/ndvi?${params}`);

    if (!response.ok) {
      let errorMessage = 'Error al obtener datos NDVI';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {}
      throw new Error(errorMessage);
    }

    const json = await response.json();
    return json.data;
  },
};
