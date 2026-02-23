import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { CurrentWeatherData } from './interfaces/current-weather.interface';
import { HourlyWeatherData } from './interfaces/hourly-weather.interface';

@Injectable()
export class WeatherService {
    constructor(
        @Inject('FIRESTORE') private readonly firestore: Firestore
    ) {}

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
        // Función helper para parsear la fecha custom
        const parseCustomDate = (dateStr: string) => {
            if (!dateStr) return 0;
            // Formato esperado: "19/02/2026 02:00 p.m." con posibles variaciones de espacios
            try {
                // Eliminar puntos u caracteres extraños y normalizar
                const cleanDate = dateStr.replace(/\./g, '').toLowerCase().trim();
                // Separar fecha (19/02/2026) y hora+periodo (02:00 pm)
                const parts = cleanDate.split(/\s+/);
                
                if (parts.length < 2) return 0;

                const datePart = parts[0]; 
                // Puede que la hora y el am/pm esten juntos o separados
                let timePart = parts[1];
                let period = parts.length > 2 ? parts[2] : '';
                
                // Si timePart contiene 'pm' o 'am'
                if (timePart.includes('pm')) { period = 'pm'; timePart = timePart.replace('pm', ''); }
                if (timePart.includes('am')) { period = 'am'; timePart = timePart.replace('am', ''); }

                const [day, month, year] = datePart.split('/').map(Number);
                let [hours, minutes] = timePart.split(':').map(Number);
                
                if (period === 'pm' && hours !== 12) hours += 12;
                if (period === 'am' && hours === 12) hours = 0;
                
                return new Date(year, month - 1, day, hours, minutes).getTime();
            } catch (e) {
                return 0;
            }
        };

        return [...docs].sort((a, b) => parseCustomDate(b.Fecha) - parseCustomDate(a.Fecha));
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
            // Lógica robusta para extraer la fecha
            let fecha: Date;
            
            // 1. Prioridad: Timestamp de Firestore (objeto con toDate o _seconds)
            if (data.timestamp_extraccion_lote && typeof data.timestamp_extraccion_lote.toDate === 'function') {
                fecha = data.timestamp_extraccion_lote.toDate();
            } 
            // 2. Si es string con formato DD/MM/YYYY
            else if (typeof data.Fecha === 'string') {
                 // Intentar parsear "DD/MM/YYYY HH:mm a.m./p.m." o similar
                 const parts = data.Fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
                 if (parts) {
                     // new Date(y, m-1, d)
                     fecha = new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]));
                 } else {
                     fecha = new Date(data.Fecha); // Intento fallback estandar
                 }
            }
            // 3. Fallback final
            else {
                fecha = new Date();
            }

            return {
                ...data,
                Temp: typeof data.Temp === 'number' ? parseFloat(data.Temp.toFixed(2)) : data.Temp,
                Lluvia: typeof data.Lluvia === 'number' ? parseFloat(data.Lluvia.toFixed(2)) : data.Lluvia,
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

            // Convertir las fechas a límites numéricos (Timestamp)
            const startLimit = new Date(startDate).setHours(0, 0, 0, 0); // Inicio del día
            
            // Fin del día para la fecha final
            const endLimitDate = new Date(endDate);
            // IMPORTANTE: Sumar 1 día para incluir TODO el día final
            // El selector envía YYYY-MM-DD (medianoche), por lo que sumar 1 día
            // nos lleva al inicio del día siguiente, cubriendo así hasta las 23:59:59 del día actual
            endLimitDate.setDate(endLimitDate.getDate() + 1);
            endLimitDate.setMilliseconds(-1); // Retroceder 1ms para quedar en 23:59:59.999
            
            const endLimit = endLimitDate.getTime();

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

    // Método de depuración para ver qué fechas existen realmente en la BD
    async getDebugDates(): Promise<any> {
        try {
            console.log('[DEBUG] Obteniendo muestra de fechas...');
            // Obtenemos CUALQUIER documento para ver la estructura
            const snapshot = await this.firestore
                .collection('datos_horarios')
                .limit(5)
                .get();

            const dates = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    data_raw: data // Devolvemos todo el objeto para ver campos
                };
            });
            
            return {
                count: snapshot.size,
                sample_docs: dates
            };
        } catch (error) {
             throw new Error(`Error debug fechas: ${error.message}`);
        }
    }
}