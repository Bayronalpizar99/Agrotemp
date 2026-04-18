import { Injectable, Logger } from '@nestjs/common';
import { WeatherService } from '../weather/weather.service';
import { HourlyWeatherData } from '../weather/interfaces/hourly-weather.interface';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';

// Coordenadas de la estación meteorológica — ITCR Santa Clara, Alajuela
const STATION_LAT = 10.364214;
const STATION_LNG = -84.507275;

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

    // 1. Obtener datos históricos, ETo de Open-Meteo, HR y viento de la estación en paralelo
    const [rawData, openMeteoEto, stationHumidity, windData] = await Promise.all([
      this.weatherService.getHourlyWeatherByDateRange(startDate, endDate),
      this.fetchOpenMeteoEto(startDate, endDate),
      this.weatherService.getActualesHumidityByDateRange(startDate, endDate),
      this.weatherService.getActualesWindDataByDateRange(startDate, endDate),
    ]);

    if (!rawData || rawData.length === 0) {
      throw new Error(`No se encontraron datos para el rango ${startDate} - ${endDate}`);
    }

    if (openMeteoEto !== null) {
      this.logger.log(`ETo obtenida de Open-Meteo: ${openMeteoEto} mm`);
    } else {
      this.logger.warn('Open-Meteo no disponible, usando fallback Hargreaves-Samani.');
    }
    if (stationHumidity !== null) {
      this.logger.log(`Humedad promedio de la estación: ${stationHumidity.avg}%`);
    } else {
      this.logger.warn('HR de estación no disponible para el rango solicitado.');
    }

    // 2. Calcular Métricas Agronómicas
    const vpd = stationHumidity ? this.calculateVPD(rawData, stationHumidity) : undefined;
    const metrics = {
      gdd: this.calculateGDD(rawData, cropBaseTemp),
      stressHours: this.calculateStressHours(rawData, cropBaseTemp, cropMaxTemp),
      waterBalance: this.calculateWaterBalance(rawData, openMeteoEto ?? undefined),
      eto: openMeteoEto ?? this.calculateEto(rawData),
      humidity: stationHumidity,
      vpd,
      diseaseRisk: this.estimateDiseaseRisk(rawData, stationHumidity ?? undefined, vpd),
      optimalWindows: this.findOptimalWindows(rawData, windData)
    };

    // 3. Generar Datos para Gráficos
    const chartData = this.generateChartData(rawData, cropBaseTemp);

    // 4. Generar Análisis con IA
    const etoSource = openMeteoEto !== null
      ? 'ETo FAO Penman-Monteith vía Open-Meteo'
      : 'ETo estimada (Hargreaves-Samani)';
    const humiditySource = stationHumidity !== null ? ' (estación meteorológica)' : '';
    const aiAnalysis = await this.callGenerativeAI(metrics, params, etoSource, humiditySource);

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
   * Balance Hídrico: Lluvia acumulada vs ETo.
   * Si se provee externalEto (de Open-Meteo), se usa directamente.
   * Si no, hace fallback al cálculo Hargreaves-Samani interno.
   */
  private calculateWaterBalance(data: HourlyWeatherData[], externalEto?: number) {
    const totalRain = data.reduce((sum, d) => {
        const p = d.Precip !== undefined ? d.Precip : (d as any).Lluvia;
        return sum + (typeof p === 'number' ? p : parseFloat(p) || 0);
    }, 0);

    const totalEto = externalEto ?? this.calculateEto(data);

    return {
      totalInput: Number(totalRain.toFixed(2)),
      totalOutput: Number(totalEto.toFixed(2)),
      balance: Number((totalRain - totalEto).toFixed(2))
    };
  }

  /**
   * Obtiene la ETo acumulada del período desde Open-Meteo (FAO Penman-Monteith).
   * Retorna null si la API no está disponible → se activa el fallback Hargreaves-Samani.
   */
  private async fetchOpenMeteoEto(startDate: string, endDate: string): Promise<number | null> {
    try {
      const url = new URL('https://archive-api.open-meteo.com/v1/archive');
      url.searchParams.set('latitude', String(STATION_LAT));
      url.searchParams.set('longitude', String(STATION_LNG));
      url.searchParams.set('start_date', startDate);
      url.searchParams.set('end_date', endDate);
      url.searchParams.set('daily', 'et0_fao_evapotranspiration');
      url.searchParams.set('timezone', 'America/Costa_Rica');

      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        this.logger.warn(`Open-Meteo respondió con status ${res.status}`);
        return null;
      }

      const data = await res.json();
      const etoValues: number[] = data?.daily?.et0_fao_evapotranspiration ?? [];
      return etoValues.length > 0
        ? Number(etoValues.reduce((sum, v) => sum + (v ?? 0), 0).toFixed(2))
        : null;
    } catch (err) {
      this.logger.warn(`Error al consultar Open-Meteo: ${err?.message ?? err}`);
      return null;
    }
  }

  /**
   * Fallback: Estimación de ETo con Hargreaves-Samani.
   * Solo se usa cuando Open-Meteo no está disponible.
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
   * Calcula el VPD (Déficit de Presión de Vapor) en kPa usando la ecuación de Magnus.
   * VPD = es(T) × (1 − HR/100), donde es(T) = 0.6108 × exp(17.27T / (T + 237.3))
   * - VPD promedio: temperatura media del período + HR promedio
   * - VPD máximo: temperatura máxima + HR mínima (peor escenario de estrés)
   */
  private calculateVPD(
    data: HourlyWeatherData[],
    humidity: { avg: number; min: number },
  ): { avg: number; max: number } {
    const satVP = (t: number) => 0.6108 * Math.exp((17.27 * t) / (t + 237.3));

    const temps = data
      .map(d => (d.Temp !== undefined ? d.Temp : (d as any).Temperatura))
      .filter((t): t is number => typeof t === 'number' && !isNaN(t));

    if (temps.length === 0) return { avg: 0, max: 0 };

    const tMean = temps.reduce((s, t) => s + t, 0) / temps.length;
    const vpdAvg = satVP(tMean) * (1 - humidity.avg / 100);

    const tMax = Math.max(...temps);
    const vpdMax = satVP(tMax) * (1 - humidity.min / 100);

    return {
      avg: Number(vpdAvg.toFixed(2)),
      max: Number(vpdMax.toFixed(2)),
    };
  }

  /**
   * Riesgo de enfermedades fúngicas.
   * Si hay VPD, es el indicador principal (más preciso que HR sola).
   * Si solo hay HR, usa conteo de horas con HR alta.
   * Fallback: lógica lluvia + temperatura.
   */
  private estimateDiseaseRisk(
    data: HourlyWeatherData[],
    humidity?: { avg: number; highHoursCount: number },
    vpd?: { avg: number },
  ): string {
    if (vpd) {
      // VPD < 0.5 kPa = atmósfera saturada → condición óptima para hongos
      if (vpd.avg < 0.5) return 'ALTO';
      // VPD entre 0.5 y 1.5 kPa = riesgo moderado si la HR es alta
      if (vpd.avg < 1.5) {
        if (humidity && (humidity.avg > 80 || humidity.highHoursCount > 24)) return 'MEDIO';
        return 'BAJO';
      }
      // VPD > 1.5 kPa = atmósfera seca, hongos no proliferan
      return 'BAJO';
    }

    if (humidity) {
      const highHumRatio = humidity.highHoursCount / (data.length || 1);
      if (humidity.avg > 85 || highHumRatio > 0.5) return 'ALTO';
      if (humidity.avg > 70 || highHumRatio > 0.25) return 'MEDIO';
      return 'BAJO';
    }

    // Fallback: lógica original basada en lluvia y temperatura
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

  /**
   * Calcula ventanas óptimas y aceptables para aplicación de agroquímicos.
   *
   * Si hay datos de viento reales (windData de datos_actuales):
   *   - Óptima: Velocidad < 10 km/h + HR < 85% + sin lluvia (triple condición)
   *   - Aceptable: Velocidad < 10 km/h + sin lluvia
   *
   * Fallback (sin datos de viento): Vmax de datos_horarios + sin lluvia (comportamiento anterior).
   */
  private findOptimalWindows(
    data: HourlyWeatherData[],
    windData?: Record<string, { velocidad: number; hr: number }> | null,
  ): { optimalSprayHours: number; acceptableSprayHours: number; conditionsUsed: 'station' | 'fallback' } {
    const hasStationWind = windData !== null && windData !== undefined && Object.keys(windData).length > 0;
    let optimalSprayHours = 0;
    let acceptableSprayHours = 0;

    data.forEach(d => {
      const p = d.Precip !== undefined ? d.Precip : (d as any).Lluvia;
      const precip = typeof p === 'number' ? p : parseFloat(p) || 0;
      const noRain = precip === 0;

      if (hasStationWind) {
        // Extraer clave de hora desde d.fecha para cruzar con windData
        let hourKey: string | null = null;
        try {
          const t = d.fecha instanceof Date ? d.fecha : new Date(d.fecha);
          hourKey = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}`;
        } catch { /* ignorar registros sin fecha válida */ }

        const stationHour = hourKey ? windData![hourKey] : null;

        if (stationHour) {
          // Hora con datos reales de estación → triple condición
          if (stationHour.velocidad < 10 && noRain) {
            acceptableSprayHours++;
            if (stationHour.hr < 85) optimalSprayHours++;
          }
        } else {
          // Hora sin cobertura de estación (hueco del sensor) → fallback por hora
          const windSpeed = (d as any).Vmax ?? 0;
          if (windSpeed < 10 && noRain) {
            optimalSprayHours++;
            acceptableSprayHours++;
          }
        }
      } else {
        // Fallback: solo Vmax + sin lluvia
        const windSpeed = (d as any).Vmax || 0;
        if (windSpeed < 10 && noRain) {
          optimalSprayHours++;
          acceptableSprayHours++;
        }
      }
    });

    return {
      optimalSprayHours,
      acceptableSprayHours,
      conditionsUsed: hasStationWind ? 'station' : 'fallback',
    };
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
  private async callGenerativeAI(metrics: any, params: AgroReportParams, etoSource = 'ETo estimada', humiditySource = ''): Promise<string> {
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
          - Evapotranspiración (${etoSource}): ${metrics.waterBalance.totalOutput} mm
          - Balance Hídrico (Lluvia − ETo): ${metrics.waterBalance.balance} mm
          ${metrics.humidity ? `- Humedad Relativa Promedio${humiditySource}: ${metrics.humidity.avg}%\n          - Humedad Relativa Mínima / Máxima: ${metrics.humidity.min}% / ${metrics.humidity.max}%\n          - Horas con HR > 85% (humedad alta): ${metrics.humidity.highHoursCount} hrs` : ''}
          ${metrics.vpd ? `- VPD Promedio del período: ${metrics.vpd.avg} kPa  (óptimo: 0.5–1.5 kPa)\n          - VPD Máximo diario: ${metrics.vpd.max} kPa` : ''}
          - Riesgo de Enfermedades Fúngicas: ${metrics.diseaseRisk}
          - Horas óptimas para pulverización (viento <10 km/h, HR <85%, sin lluvia): ${metrics.optimalWindows.optimalSprayHours} hrs
          - Horas aceptables para pulverización (viento <10 km/h, sin lluvia): ${metrics.optimalWindows.acceptableSprayHours} hrs

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
