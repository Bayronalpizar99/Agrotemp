import { Injectable, Logger } from '@nestjs/common';
import { WeatherService } from '../weather/weather.service';
import { HourlyWeatherData } from '../weather/interfaces/hourly-weather.interface';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';

export interface AgroReportParams {
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD
  cropBaseTemp: number; // Temperatura base del cultivo (ej. Maíz = 10°C)
  cropMaxTemp: number;  // Temperatura máxima óptima (ej. Maíz = 30°C)
  cropName?: string;    // Nombre del cultivo (ej. "Maíz", "Café")
}

@Injectable()
export class AgroAnalyticsService {
  private readonly logger = new Logger(AgroAnalyticsService.name);
  private genAI: GoogleGenerativeAI;

  constructor(
    private readonly weatherService: WeatherService,
    private readonly configService: ConfigService
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
        this.logger.warn('GEMINI_API_KEY no configurada. El análisis de IA será simulado.');
    }
  }

  async generateReport(params: AgroReportParams) {
    const { startDate, endDate, cropBaseTemp, cropMaxTemp } = params;

    // 1. Obtener datos históricos
    // Nota: Asumimos que getHourlyWeatherByDateRange devuelve un array de HourlyWeatherData
    // Si la implementación actual en WeatherService falla por formato de fecha, 
    // necesitaremos ajustar ese método primero.
    const rawData = await this.weatherService.getHourlyWeatherByDateRange(startDate, endDate);
    
    if (!rawData || rawData.length === 0) {
      throw new Error(`No se encontraron datos para el rango ${startDate} - ${endDate}`);
    }

    // 2. Calcular Métricas Agronómicas
    const metrics = {
      gdd: this.calculateGDD(rawData, cropBaseTemp),
      stressHours: this.calculateStressHours(rawData, cropBaseTemp, cropMaxTemp),
      waterBalance: this.calculateWaterBalance(rawData),
      eto: this.calculateEto(rawData), // Evapotranspiración simplificada
      diseaseRisk: this.estimateDiseaseRisk(rawData),
      optimalWindows: this.findOptimalWindows(rawData)
    };

    // 3. Generar Datos para Gráficos
    const chartData = this.generateChartData(rawData, cropBaseTemp);

    // 4. Generar Análisis con IA (Integración con Gemini/GPT)
    const aiAnalysis = await this.callGenerativeAI(metrics, params);

    return {
      period: { startDate, endDate },
      dataPoints: rawData.length,
      metrics,
      chartData, // Nuevo campo con datos diarios
      aiAnalysis
    };
  }

  // --- Funciones de Cálculo Matemático ---

  /**
   * Genera el desglose diario para gráficos
   */
  private generateChartData(data: HourlyWeatherData[], baseTemp: number) {
      const dailyData = this.groupByDay(data);
      const chartData: Array<{
        date: string;
        gdd: number;
        rainfall: number;
        tMax: number;
        tMin: number;
      }> = [];

      Object.entries(dailyData).forEach(([date, hours]) => {
          const temps = hours.map(h => {
              const val = h.Temp !== undefined ? h.Temp : (h as any).Temperatura;
              return typeof val === 'number' ? val : parseFloat(val) || 0;
          });
          
          if (temps.length === 0) return;

          const tMax = Math.max(...temps);
          const tMin = Math.min(...temps);
          
          let gdd = ((tMax + tMin) / 2) - baseTemp;
          if (gdd < 0) gdd = 0;

          const rainfall = hours.reduce((sum, h) => {
              const val = h.Precip !== undefined ? h.Precip : ((h as any).Lluvia || 0);
              return sum + (typeof val === 'number' ? val : parseFloat(val) || 0);
          }, 0);
          
          chartData.push({
              date,
              gdd: Number(gdd.toFixed(2)),
              rainfall: Number(rainfall.toFixed(2)),
              tMax,
              tMin
          });
      });

      // Ordenar por fecha
      return chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Calcula los Grados-Día de Desarrollo (GDD)
   * Fórmula: ((Tmax + Tmin) / 2) - Tbase
   * Se acumula diariamente.
   */
  private calculateGDD(data: HourlyWeatherData[], baseTemp: number): number {
    // Agrupar por día primero
    const dailyData = this.groupByDay(data);
    
    let totalGDD = 0;
    Object.values(dailyData).forEach(dayHours => {
      const temps = dayHours.map(d => (d.Temp !== undefined ? d.Temp : (d as any).Temperatura));
      const tMax = Math.max(...temps);
      const tMin = Math.min(...temps);
      
      let dailyGDD = ((tMax + tMin) / 2) - baseTemp;
      if (dailyGDD < 0) dailyGDD = 0; // No se resta desarrollo
      
      totalGDD += dailyGDD;
    });

    return Number(totalGDD.toFixed(2));
  }

  /**
   * Calcula horas de estrés por frío (< base) o calor (> max)
   */
  private calculateStressHours(data: HourlyWeatherData[], min: number, max: number) {
    let heatStress = 0;
    let coldStress = 0;

    data.forEach(d => {
      // Intentar leer 'Temp' o 'Temperatura' o 'temp'
      const t = d.Temp !== undefined ? d.Temp : (d as any).Temperatura;
      if (t > max) heatStress++; 
      if (t < min) coldStress++;
    });

    return { heatStressHours: heatStress, coldStressHours: coldStress };
  }

  /**
   * Balance Hídrico simple: Lluvia acumulada vs ETo acumulada
   */
  private calculateWaterBalance(data: HourlyWeatherData[]) {
    const totalRain = data.reduce((sum, d) => {
        const p = d.Precip !== undefined ? d.Precip : (d as any).Lluvia;
        return sum + (typeof p === 'number' ? p : parseFloat(p) || 0);
    }, 0);

    // ETo simplificada (ver método abajo)
    const totalEto = this.calculateEto(data); 

    return {
      totalInput: Number(totalRain.toFixed(2)),
      totalOutput: Number(totalEto.toFixed(2)),
      balance: Number((totalRain - totalEto).toFixed(2))
    };
  }

  /**
   * Estimación simplificada de Evapotranspiración (Hargreaves-Samani)
   */
  private calculateEto(data: HourlyWeatherData[]): number {
    const dailyData = this.groupByDay(data);
    let totalEto = 0;

    Object.values(dailyData).forEach(dayHours => {
      const temps = dayHours.map(d => {
          const t = d.Temp !== undefined ? d.Temp : (d as any).Temperatura;
          return typeof t === 'number' ? t : parseFloat(t) || 0;
      });

      if (temps.length === 0) return;

      const tMax = Math.max(...temps);
      const tMin = Math.min(...temps);
      const tMean = (tMax + tMin) / 2;
      
      const avgRadW = dayHours.reduce((sum, d) => sum + (d.Rad_max || 0), 0) / dayHours.length;
      let Ra = avgRadW * 0.0864; 
      if (Ra === 0) Ra = 10; 

      const dailyEto = 0.0023 * Ra * (tMean + 17.8) * Math.sqrt(Math.max(0, tMax - tMin));
      if (!isNaN(dailyEto)) {
          totalEto += dailyEto;
      }
    });

    return Number(totalEto.toFixed(2));
  }

  /**
   * Estimación básica de riesgo de enfermedades fúngicas
   */
  private estimateDiseaseRisk(data: HourlyWeatherData[]): string {
    const dailyData = this.groupByDay(data);
    let riskyDays = 0;

    Object.values(dailyData).forEach(dayHours => {
      const temps = dayHours.map(d => {
          const t = d.Temp !== undefined ? d.Temp : (d as any).Temperatura;
          return typeof t === 'number' ? t : parseFloat(t) || 0;
      });
      
      if (temps.length === 0) return;

      const avgTemp = temps.reduce((sum, t) => sum + t, 0) / temps.length;
      
      const totalRain = dayHours.reduce((sum, d) => {
          const p = d.Precip !== undefined ? d.Precip : (d as any).Lluvia;
          return sum + (typeof p === 'number' ? p : parseFloat(p) || 0);
      }, 0);

      if (totalRain > 0.2 && avgTemp >= 18 && avgTemp <= 25) {
        riskyDays++;
      }
    });

    const totalDays = Object.keys(dailyData).length;
    if (totalDays === 0) return 'BAJO';

    const riskPercentage = (riskyDays / totalDays) * 100;

    if (riskPercentage > 50) return 'ALTO';
    if (riskPercentage > 20) return 'MEDIO';
    return 'BAJO';
  }

  private findOptimalWindows(data: HourlyWeatherData[]) {
    // Ejemplo: Ventana de pulverización (Viento < 10 km/h, Sin lluvia)
    let optimalSprayHours = 0;
    data.forEach(d => {
        // Asumiendo que tenemos velocidad del viento (Vmax o similar) en HourlyWeatherData
        // Si no está en la interfaz, usar 0 o checkear propiedad
        const windSpeed = (d as any).Vmax || 0; 
        
        const p = d.Precip !== undefined ? d.Precip : (d as any).Lluvia;
        const precip = typeof p === 'number' ? p : parseFloat(p) || 0;

        if (windSpeed < 10 && precip === 0) {
            optimalSprayHours++;
        }
    });
    return { optimalSprayHours };
  }

  // --- Helper: Agrupar por fecha (YYYY-MM-DD) ---
  private groupByDay(data: HourlyWeatherData[]): Record<string, HourlyWeatherData[]> {
    return data.reduce((acc, curr) => {
      // Asumimos que curr.fecha es string o Date. Normalizar a YYYY-MM-DD
      // En tu servicio actual fecha parece ser Date (timestamp firestore)
      let dateKey = 'unknown';
      try {
          // Primero intentamos con 'fecha' (minúscula) como indica la interfaz
          if (curr.fecha instanceof Date) {
              dateKey = curr.fecha.toISOString().split('T')[0];
          } 
          // Soporte legacy por si acaso viene como string o con mayúscula en algún punto
          else if (typeof curr.fecha === 'string') {
               dateKey = (curr.fecha as string).substring(0, 10);
          }
          // Intento de fallback a 'Fecha' solo si 'fecha' falla (aunque TS se quejará si lo ponemos directo)
          else if ((curr as any).Fecha) {
              const f = (curr as any).Fecha;
               if (f instanceof Date) {
                  dateKey = f.toISOString().split('T')[0];
               } else if (typeof f === 'string') {
                  const match = f.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
                  if (match) {
                     dateKey = `${match[3]}-${match[2]}-${match[1]}`;
                  } else {
                     dateKey = f.substring(0, 10);
                  }
               }
          }
      } catch (e) {}

      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(curr);
      return acc;
    }, {} as Record<string, HourlyWeatherData[]>);
  }

  // --- Integración con Google Gemini ---
  private async callGenerativeAI(metrics: any, params: AgroReportParams): Promise<string> {
    const { cropBaseTemp, cropMaxTemp, cropName } = params;
    const cropLabel = cropName ? `cultivo de referencia: ${cropName}` : 'cultivo no especificado';

    if (!this.genAI) {
         return '[SIMULACIÓN IA] El backend no tiene configurada la API KEY de Gemini en el archivo .env. Por favor, configura GEMINI_API_KEY para recibir análisis real.';
    }

    try {
        // Regresando a "gemini-2.5-flash" tras ajuste de facturación
        const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
          Eres un experto en agrometeorología. Tu tarea es interpretar condiciones climáticas de campo usando datos de una estación meteorológica.

          IMPORTANTE — LIMITACIÓN DE DATOS:
          No conoces la fecha de siembra, la variedad, ni el estado fenológico actual del cultivo.
          Por lo tanto, NUNCA debes afirmar ni inferir en qué etapa de desarrollo se encuentra el cultivo (germinación, floración, madurez, etc.).
          Los GDD son únicamente una referencia de la acumulación térmica del periodo analizado, no una indicación del estado del cultivo.

          PARÁMETROS DE REFERENCIA (${cropLabel}):
          - Temperatura base: ${cropBaseTemp}°C
          - Temperatura máxima óptima: ${cropMaxTemp}°C

          DATOS AGROMETEOROLÓGICOS DEL PERIODO:
          - Grados Día Acumulados (GDD): ${metrics.gdd} — energía térmica disponible en el periodo.
          - Horas con temperatura > ${cropMaxTemp}°C (estrés por calor): ${metrics.stressHours.heatStressHours} hrs
          - Horas con temperatura < ${cropBaseTemp}°C (estrés por frío): ${metrics.stressHours.coldStressHours} hrs
          - Lluvia Total: ${metrics.waterBalance.totalInput} mm
          - Evapotranspiración estimada (ETo): ${metrics.waterBalance.totalOutput} mm
          - Balance Hídrico (Lluvia − ETo): ${metrics.waterBalance.balance} mm
          - Riesgo de Enfermedades Fúngicas: ${metrics.diseaseRisk}
          - Horas favorables para pulverización (viento < 10 km/h, sin lluvia): ${metrics.optimalWindows.optimalSprayHours} hrs

          TAREA:
          Escribe exactamente 3 párrafos en texto plano (sin markdown, sin negritas, sin listas).
          1. Condiciones Térmicas del Periodo: Describe la acumulación térmica (GDD) y las horas de estrés como indicadores del ambiente. No hagas ninguna afirmación sobre el estado o etapa del cultivo.
          2. Condiciones Hídricas y Riesgo Sanitario: Analiza el balance hídrico y el riesgo de enfermedades. ¿Hay déficit o exceso? ¿Es preocupante el riesgo fúngico?
          3. Recomendaciones Operativas: ¿Qué acciones se sugieren dado el clima? (riego, aplicación de fungicida, aprovechar ventanas de pulverización, monitoreo).

          Tono: profesional, directo y accionable para la toma de decisiones en campo.
        `;

        this.logger.log('Enviando prompt a Gemini...');
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();

    } catch (error) {
        this.logger.error('Error llamando a Gemini AI:', error);
        return 'Lo sentimos, hubo un error al generar el análisis inteligente en este momento. Por favor revisa las métricas numéricas.';
    }
  }

  // --- Chat Contextual ---
  async chatWithAI(question: string, context: any, chatHistory: { role: string; content: string }[] = []): Promise<string> {
    if (!this.genAI) return 'IA no configurada.';

    try {
        const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const cropLabel = context.cropName ? `cultivo de referencia: ${context.cropName}` : 'cultivo no especificado';

        const historySection = chatHistory.length > 0
          ? `\nHISTORIAL DE LA CONVERSACIÓN:\n${chatHistory.map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`).join('\n')}\n`
          : '';

        const prompt = `
          Eres un experto en agrometeorología que generó el análisis climático que se muestra a continuación.

          LIMITACIÓN IMPORTANTE:
          No conoces la fecha de siembra, la variedad ni el estado fenológico del cultivo.
          No debes afirmar ni inferir en qué etapa de desarrollo se encuentra el cultivo.
          Solo puedes hablar de condiciones climáticas y su posible impacto general en ${cropLabel}.

          CONTEXTO CLIMÁTICO DEL REPORTE (Periodo: ${context.period?.startDate} a ${context.period?.endDate}):
          - GDD acumulados: ${context.metrics?.gdd}
          - Balance Hídrico: ${context.metrics?.waterBalance?.balance} mm
          - Riesgo de Enfermedad Fúngica: ${context.metrics?.diseaseRisk}

          ANÁLISIS PREVIO GENERADO:
          "${context.aiAnalysis}"
          ${historySection}
          PREGUNTA ACTUAL DEL USUARIO:
          "${question}"

          Responde directamente a la pregunta usando el contexto anterior y el historial de conversación. Sé breve, práctico y técnico. Responde en texto plano, sin markdown, sin negritas, sin asteriscos, sin listas con guiones. Si la pregunta implica conocimiento del estado del cultivo que no tienes (etapa fenológica, fecha de siembra, variedad), indícalo claramente antes de responder con lo que sí puedes inferir del clima.
        `;

        const result = await model.generateContent(prompt);
        return (await result.response).text();

    } catch (error) {
        this.logger.error('Error en chat IA:', error);
        return 'Lo siento, no pude procesar tu pregunta en este momento.';
    }
  }
}
