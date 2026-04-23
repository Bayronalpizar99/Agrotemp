import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { CurrentWeatherData } from './interfaces/current-weather.interface';
import { HourlyWeatherData } from './interfaces/hourly-weather.interface';

@Injectable()
export class WeatherService {
    constructor(
        @Inject('FIRESTORE') private readonly firestore: Firestore
    ) {}

    private parseDateOnlyParts(dateStr?: string): { year: number; month: number; day: number } | null {
        if (typeof dateStr !== 'string') return null;
        const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return null;

        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        if ([year, month, day].some((value) => Number.isNaN(value))) return null;

        return { year, month, day };
    }

    private buildLocalRangeLimits(startDate: string, endDate: string): { startLimit: number; endLimit: number } {
        const startParts = this.parseDateOnlyParts(startDate);
        const endParts = this.parseDateOnlyParts(endDate);
        if (!startParts || !endParts) {
            throw new Error('Formato de fecha inválido. Usa YYYY-MM-DD.');
        }

        const startLimit = new Date(
            startParts.year,
            startParts.month - 1,
            startParts.day,
            0,
            0,
            0,
            0
        ).getTime();
        const endLimit = new Date(
            endParts.year,
            endParts.month - 1,
            endParts.day,
            23,
            59,
            59,
            999
        ).getTime();

        return { startLimit, endLimit };
    }

    private buildCostaRicaUtcRange(startDate: string, endDate: string): { startUTC: Date; endUTC: Date } {
        const startParts = this.parseDateOnlyParts(startDate);
        const endParts = this.parseDateOnlyParts(endDate);
        if (!startParts || !endParts) {
            throw new Error('Formato de fecha inválido. Usa YYYY-MM-DD.');
        }

        // Costa Rica (UTC-6) sin DST:
        // 00:00 CR = 06:00 UTC
        const startUTC = new Date(
            Date.UTC(startParts.year, startParts.month - 1, startParts.day, 6, 0, 0, 0)
        );
        // 23:59:59.999 CR = (día siguiente 05:59:59.999 UTC)
        const endUTC = new Date(
            Date.UTC(endParts.year, endParts.month - 1, endParts.day + 1, 6, 0, 0, 0) - 1
        );

        return { startUTC, endUTC };
    }

    private parseFechaIMN(dateStr?: string): Date | null {
        if (typeof dateStr !== 'string') return null;

        const rawValue = dateStr.replace(/"/g, '').trim();
        if (!rawValue) return null;

        // Formato esperado: "DD/MM/YYYY HH:mm a.m./p.m." con variaciones
        const cleanDate = rawValue.replace(/\./g, '').toLowerCase();
        const parts = cleanDate.split(/\s+/).filter(Boolean);
        if (parts.length === 0) return null;

        const datePart = parts[0];
        const dateMatch = datePart.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!dateMatch) {
            const fallback = new Date(rawValue);
            return Number.isNaN(fallback.getTime()) ? null : fallback;
        }

        const day = Number(dateMatch[1]);
        const month = Number(dateMatch[2]);
        const year = Number(dateMatch[3]);

        let hours = 0;
        let minutes = 0;

        const timePartRaw = parts[1] ?? '';
        const periodRaw = parts.slice(2).join('');
        let timePart = timePartRaw;
        let period = periodRaw;

        if (timePart.includes('pm')) {
            period = 'pm';
            timePart = timePart.replace('pm', '');
        }
        if (timePart.includes('am')) {
            period = 'am';
            timePart = timePart.replace('am', '');
        }

        const sanitizedTime = timePart.replace(/[^\d:]/g, '');
        if (sanitizedTime) {
            const [parsedHours, parsedMinutes] = sanitizedTime.split(':').map(Number);
            if (!Number.isNaN(parsedHours)) hours = parsedHours;
            if (!Number.isNaN(parsedMinutes)) minutes = parsedMinutes;
        }

        if (period === 'pm' && hours !== 12) hours += 12;
        if (period === 'am' && hours === 12) hours = 0;

        const parsedDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
        return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
    }

    // Obtener datos actuales
    async getCurrentWeather(): Promise<CurrentWeatherData> {
        try {
            console.log('Consultando datos actuales...');
            const snapshot = await this.firestore
                .collection('datos_actuales')
                .orderBy('timestamp_extraccion', 'desc')
                .limit(1)
                .get();

            if (snapshot.empty) {
                throw new Error('No hay datos actuales disponibles');
            }

            const rawData = snapshot.docs[0].data();
            
            // Convertir los datos aplicando la división por 100 para los valores de temperatura
            const formattedData = {
                ...rawData,
                Tmax: rawData.Tmax / 100,
                Tmin: rawData.Tmin / 100,
                Vmax: rawData.Vmax / 100,
                timestamp_extraccion: rawData.timestamp_extraccion,
                SUM_lluv: rawData.SUM_lluv,
                Fecha: rawData.Fecha
            };

            return formattedData as CurrentWeatherData;
        } catch (error) {
            throw new Error(`Error al obtener datos actuales: ${error.message}`);
        }
    }

    private sortDocsByCustomDate(docs: any[]): any[] {
        return [...docs].sort((a, b) => {
            const bTimestamp = this.parseFechaIMN(b.Fecha)?.getTime() ?? 0;
            const aTimestamp = this.parseFechaIMN(a.Fecha)?.getTime() ?? 0;
            return bTimestamp - aTimestamp;
        });
    }

    // Obtener datos horarios más recientes
    async getHourlyWeather(): Promise<HourlyWeatherData[]> {
        try {
            // Obtenemos un bloque reciente de datos (los últimos 24 por si acaso)
            // Se usa timestamp_extraccion_lote solo para traer "lo último que entró", 
            // pero el orden real lo daremos por el campo 'Fecha'
            const snapshot = await this.firestore
                .collection('datos_horarios')
                .orderBy('timestamp_extraccion_lote', 'desc')
                .limit(48)
                .get();

            if (snapshot.empty) {
                // Si falla por timestamp_extraccion_lote, intentamos traer cualquiera
                 const snapshotFallback = await this.firestore
                    .collection('datos_horarios')
                    .limit(48)
                    .get();
                
                 if (snapshotFallback.empty) throw new Error('No hay datos horarios disponibles');
                 
                 const docs = snapshotFallback.docs.map(doc => doc.data());
                 const sortedDocs = this.sortDocsByCustomDate(docs);
                 return this.mapDataToWeather([sortedDocs[0]]);
            }

            const docs = snapshot.docs.map(doc => doc.data());
            
            // Ordenamos en memoria usando nuestra función helper
            const sortedDocs = this.sortDocsByCustomDate(docs);

            // Devolvemos el más reciente (posición 0 después del sort descendente)
            const mostRecentData = sortedDocs[0];

            return this.mapDataToWeather([mostRecentData]);

        } catch (error) {
            throw new Error(`Error al obtener datos horarios: ${error.message}`);
        }
    }

    private mapDataToWeather(dataList: any[]): HourlyWeatherData[] {
        return dataList.map(data => {
            // La fecha climática (campo "Fecha") tiene prioridad para el reporte.
            let fecha: Date;

            const parsedFecha = this.parseFechaIMN(data.Fecha);
            if (parsedFecha) {
                fecha = parsedFecha;
            } else if (
                data.timestamp_extraccion_lote &&
                typeof data.timestamp_extraccion_lote.toDate === 'function'
            ) {
                // Respaldo si "Fecha" viene vacía o malformada.
                fecha = data.timestamp_extraccion_lote.toDate();
            } else {
                fecha = new Date();
            }

            return {
                ...data,
                Temp: typeof data.Temp === 'number' ? parseFloat(data.Temp.toFixed(2)) : data.Temp,
                Lluvia: parseFloat(((typeof data.Lluvia === 'number' ? data.Lluvia : parseFloat(data.Lluvia) || 0) / 100).toFixed(2)),
                fecha: fecha,
                timestamp_extraccion_lote: data.timestamp_extraccion_lote // Mantener referencia original
            } as HourlyWeatherData;
        });
    }

    private mapSnapshotToWeather(snapshot: any): HourlyWeatherData[] {
        return this.mapDataToWeather(snapshot.docs.map(doc => doc.data()));
    }

    // Obtener datos horarios por rango de fechas (Optimizado: Filtro en Memoria igual que Excel)
    async getHourlyWeatherByDateRange(startDate: string, endDate: string): Promise<HourlyWeatherData[]> {
        try {
            console.log('Consultando datos horarios:', { startDate, endDate });
            const { startLimit, endLimit } = this.buildLocalRangeLimits(startDate, endDate);

            console.log(`[WeatherService] Consultando rango: ${new Date(startLimit).toISOString()} - ${new Date(endLimit).toISOString()}`);

            // Estrategia: Traer los últimos X registros y filtrar en memoria
            // Esto evita los problemas con índices compuestos o formatos de fecha personalizados en Firebase
            const snapshot = await this.firestore
                .collection('datos_horarios')
                .orderBy('timestamp_extraccion_lote', 'desc') // Traer los más recientes primero
                .limit(2000) // Límite generoso para cubrir varios días/semanas
                .get();
            
            console.log(`[WeatherService] Documentos recuperados de BD: ${snapshot.size}`);

            const allData = this.mapSnapshotToWeather(snapshot);

            // Filtrado manual en memoria
            const filteredData = allData.filter(d => {
                if (!d.fecha) return false;
                const recordTime = d.fecha.getTime();
                return recordTime >= startLimit && recordTime <= endLimit;
            });

            console.log(`[WeatherService] Registros válidos tras filtrado: ${filteredData.length}`);

            return filteredData.sort((a, b) => a.fecha.getTime() - b.fecha.getTime()); // Orden cronológico ascendente
            
        } catch (error) {
            console.error('[WeatherService] Error detallado:', error);
            throw new Error(`Error al obtener datos por rango de fechas: ${error.message}`);
        }
    }

    // Obtener estadísticas diarias
    async getDailyStats(): Promise<any> {
        try {
            const currentData = await this.getCurrentWeather();
            const hourlyData = await this.getHourlyWeather();

            return {
                current: currentData,
                maxTemp24h: Math.max(...hourlyData.map(data => data.Temp)),
                minTemp24h: Math.min(...hourlyData.map(data => data.Temp)),
                totalRain24h: hourlyData.reduce((sum, data) => sum + data.Lluvia, 0),
                maxRadiation24h: Math.max(...hourlyData.map(data => data.Rad_max || 0))
            };
        } catch (error) {
            throw new Error(`Error al obtener estadísticas diarias: ${error.message}`);
        }
    }

    // Obtener estadísticas de humedad relativa (HR) desde datos_actuales por rango de fechas
    async getActualesHumidityByDateRange(
        startDate: string,
        endDate: string,
    ): Promise<{ avg: number; min: number; max: number; highHoursCount: number } | null> {
        try {
            // Cloud Run almacena en UTC; Costa Rica es UTC-6.
            // "17 abril 00:00 CR" = "17 abril 06:00 UTC"
            // "17 abril 23:59 CR" = "18 abril 05:59 UTC"
            // → sumar 6h a los límites para obtener el equivalente UTC del día CR.
            const CR_OFFSET_MS = 6 * 60 * 60 * 1000;
            const { startUTC, endUTC } = this.buildCostaRicaUtcRange(startDate, endDate);

            const snapshot = await this.firestore
                .collection('datos_actuales')
                .where('timestamp_extraccion', '>=', startUTC)
                .where('timestamp_extraccion', '<=', endUTC)
                .get();

            if (snapshot.empty) return null;

            // Agrupar muestras por hora local CR para evitar sobrecontar highHoursCount
            const hourlyBuckets = new Map<string, number[]>();

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const hr = data.HR;
                if (typeof hr !== 'number' || isNaN(hr)) return;

                const utc: Date = typeof data.timestamp_extraccion?.toDate === 'function'
                    ? data.timestamp_extraccion.toDate()
                    : new Date(data.timestamp_extraccion);

                // Convertir a hora local de Costa Rica (UTC-6) para la clave de agrupado
                const local = new Date(utc.getTime() - CR_OFFSET_MS);
                const hourKey = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}-${String(local.getUTCDate()).padStart(2, '0')} ${String(local.getUTCHours()).padStart(2, '0')}`;
                if (!hourlyBuckets.has(hourKey)) hourlyBuckets.set(hourKey, []);
                hourlyBuckets.get(hourKey)!.push(hr);
            });

            if (hourlyBuckets.size === 0) return null;

            // Promedio de HR por hora
            const hourlyAvgs = Array.from(hourlyBuckets.values()).map(
                vals => vals.reduce((s, v) => s + v, 0) / vals.length,
            );

            return {
                avg: Number((hourlyAvgs.reduce((s, v) => s + v, 0) / hourlyAvgs.length).toFixed(1)),
                min: Number(Math.min(...hourlyAvgs).toFixed(1)),
                max: Number(Math.max(...hourlyAvgs).toFixed(1)),
                highHoursCount: hourlyAvgs.filter(v => v > 85).length,
            };
        } catch (error) {
            console.error('[WeatherService] Error al obtener HR de datos_actuales:', error);
            return null;
        }
    }

    // Obtener datos de viento (Velocidad) y HR desde datos_actuales agrupados por hora
    async getActualesWindDataByDateRange(
        startDate: string,
        endDate: string,
    ): Promise<Record<string, { velocidad: number; hr: number }> | null> {
        try {
            // Cloud Run almacena en UTC; Costa Rica es UTC-6.
            // "17 abril 00:00 CR" = "17 abril 06:00 UTC"
            // → sumar 6h a los límites para obtener el equivalente UTC del día CR.
            const CR_OFFSET_MS = 6 * 60 * 60 * 1000;
            const { startUTC, endUTC } = this.buildCostaRicaUtcRange(startDate, endDate);

            const snapshot = await this.firestore
                .collection('datos_actuales')
                .where('timestamp_extraccion', '>=', startUTC)
                .where('timestamp_extraccion', '<=', endUTC)
                .get();

            if (snapshot.empty) return null;

            // Agrupar Velocidad y HR por hora (YYYY-MM-DD HH)
            const buckets = new Map<string, { velocidades: number[]; hrs: number[] }>();

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                // Velocidad: campo nuevo de la 3ª tabla (ya en km/h)
                // Vmax: campo original de la 1ª tabla (almacenado en centésimas → ÷100)
                const velocidad: number | null =
                    typeof data.Velocidad === 'number' && !isNaN(data.Velocidad)
                        ? data.Velocidad
                        : typeof data.Vmax === 'number' && !isNaN(data.Vmax)
                        ? data.Vmax / 100
                        : null;
                const hr = data.HR;

                // Requiere al menos un campo de velocidad para ser útil
                if (velocidad === null) return;

                const utc: Date = typeof data.timestamp_extraccion?.toDate === 'function'
                    ? data.timestamp_extraccion.toDate()
                    : new Date(data.timestamp_extraccion);

                // Agrupar en hora local Costa Rica (UTC-6)
                const local = new Date(utc.getTime() - CR_OFFSET_MS);
                const hourKey = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}-${String(local.getUTCDate()).padStart(2, '0')} ${String(local.getUTCHours()).padStart(2, '0')}`;

                if (!buckets.has(hourKey)) buckets.set(hourKey, { velocidades: [], hrs: [] });
                buckets.get(hourKey)!.velocidades.push(velocidad);
                if (typeof hr === 'number' && !isNaN(hr)) buckets.get(hourKey)!.hrs.push(hr);
            });

            if (buckets.size === 0) return null;

            const result: Record<string, { velocidad: number; hr: number }> = {};
            buckets.forEach((val, key) => {
                const avgVelocidad = val.velocidades.reduce((s, v) => s + v, 0) / val.velocidades.length;
                const avgHr = val.hrs.length > 0
                    ? val.hrs.reduce((s, v) => s + v, 0) / val.hrs.length
                    : 100; // Si no hay HR, asumir húmedo (conservador)
                result[key] = {
                    velocidad: Number(avgVelocidad.toFixed(1)),
                    hr: Number(avgHr.toFixed(1)),
                };
            });

            return result;
        } catch (error) {
            console.error('[WeatherService] Error al obtener datos de viento de datos_actuales:', error);
            return null;
        }
    }

    // Obtener radiación solar actual desde Open-Meteo forecast (sensor estación dañado)
    async getCurrentRadiation(): Promise<number | null> {
        try {
            const url = new URL('https://api.open-meteo.com/v1/forecast');
            url.searchParams.set('latitude', '10.364214');
            url.searchParams.set('longitude', '-84.507275');
            url.searchParams.set('hourly', 'shortwave_radiation');
            url.searchParams.set('timezone', 'America/Costa_Rica');
            url.searchParams.set('forecast_days', '1');

            const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
            if (!res.ok) return null;

            const data = await res.json();
            const times: string[] = data?.hourly?.time ?? [];
            const radiation: number[] = data?.hourly?.shortwave_radiation ?? [];

            if (times.length === 0 || radiation.length === 0) return null;

            // Hora actual en Costa Rica (UTC-6)
            const CR_OFFSET_MS = 6 * 60 * 60 * 1000;
            const nowCR = new Date(Date.now() - CR_OFFSET_MS);
            const currentHourStr =
                `${nowCR.getUTCFullYear()}-` +
                `${String(nowCR.getUTCMonth() + 1).padStart(2, '0')}-` +
                `${String(nowCR.getUTCDate()).padStart(2, '0')}T` +
                `${String(nowCR.getUTCHours()).padStart(2, '0')}:00`;

            const idx = times.indexOf(currentHourStr);
            if (idx === -1) return null;

            return typeof radiation[idx] === 'number' ? radiation[idx] : null;
        } catch {
            return null;
        }
    }

}
