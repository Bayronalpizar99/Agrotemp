// src/services/agro-analytics.service.ts
const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/agro-analytics`;

export interface AgroReportParams {
  startDate: string;
  endDate: string;
  cropBaseTemp: number;
  cropMaxTemp: number;
}

type StressHours = {
  heatStressHours: number;
  coldStressHours: number;
  optimalSprayHours?: number;
};

type WaterBalance = {
  totalInput: number;
  totalOutput: number;
  balance: number;
};

type ChartPoint = {
  date: string;
  gdd: number;
  rainfall: number;
  tMax: number;
  tMin: number;
};

// Definición de tipos para la respuesta del reporte
export type AgroReportResult = {
  period: {
    startDate: string;
    endDate: string;
  };
  dataPoints: number;
  metrics: {
    gdd: number;
    stressHours: StressHours;
    optimalWindows?: {
      optimalSprayHours: number;
    };
    waterBalance: WaterBalance;
    diseaseRisk: string;
    eto?: number;
  };
  chartData: ChartPoint[];
  aiAnalysis: string;
};

export const agroAnalyticsService = {
  getReport: async (params: AgroReportParams): Promise<AgroReportResult> => {
    // Convertir parámetros a query string para GET
    const queryParams = new URLSearchParams({
        startDate: params.startDate,
        endDate: params.endDate,
        cropBaseTemp: params.cropBaseTemp.toString(),
        cropMaxTemp: params.cropMaxTemp.toString()
    });

    const response = await fetch(`${API_URL}/report?${queryParams.toString()}`);

    if (!response.ok) {
        let errorMessage = 'Error al obtener el reporte';
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
        } catch (e) {}
        throw new Error(errorMessage);
    }

    const json = await response.json();
    return json.data;
  },

  chatWithReport: async (question: string, reportContext: any): Promise<string> => {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ question, reportContext })
    });

    if (!response.ok) {
      throw new Error('Error al consultar con la IA');
    }

    const json = await response.json();
    return json.answer;
  }
};
