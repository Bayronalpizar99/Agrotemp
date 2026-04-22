import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Workbook } from 'exceljs';
import { getFirestore } from 'firebase-admin/firestore';
import { DownloadExcelQueryDto } from './dto/download-excel-query.dto';

const STATION_LAT = 10.364214;
const STATION_LNG = -84.507275;

const toDateOnly = (raw: string): string => {
    const value = (raw ?? '').trim();
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : value;
};

@Controller('excel')
export class ExcelController {
    private readonly logger = new Logger(ExcelController.name);

    @Get('download')
    async downloadExcel(
        @Query() queryDto: DownloadExcelQueryDto,
        @Res() res: Response
    ) {
        try {
            const { startDate, endDate } = queryDto;
            const startDateOnly = toDateOnly(startDate);
            const endDateOnly = toDateOnly(endDate);

            const start = new Date(startDateOnly);
            const end = new Date(endDateOnly);
            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                return res.status(400).json({ message: 'Formato de fecha inválido. Usa YYYY-MM-DD.' });
            }
            const db = getFirestore();

           // Consulta inicial: traer últimos registros (límite de seguridad para no explotar memoria)
            const datosSnapshot = await db.collection('datos_horarios')
                 .orderBy('timestamp_extraccion_lote', 'desc')
                 .limit(1000) 
                 .get();

            if (datosSnapshot.empty) {
                // Fallback: intentar traer sin orden si el índice no existe
                 const fallbackSnapshot = await db.collection('datos_horarios').limit(1000).get();
                 if (fallbackSnapshot.empty) {
                    return res.status(404).json({ message: 'No se encontraron datos en la base de datos' });
                 }
                 // Usar fallback
            }

            // Usar snapshot correcto
            const docs = datosSnapshot.empty ? (await db.collection('datos_horarios').limit(1000).get()).docs : datosSnapshot.docs;
            const radiationByHour = await this.fetchOpenMeteoRadiationByHour(startDateOnly, endDateOnly);

            // Helper de fecha
            const parseCustomDate = (dateStr: string) => {
                 if (!dateStr) return { timestamp: 0, hourKey: null };
                 try {
                     const cleanDate = dateStr.replace(/\./g, '').toLowerCase().trim();
                     const parts = cleanDate.split(/\s+/);
                     if (parts.length < 2) return { timestamp: 0, hourKey: null };
     
                     const datePart = parts[0]; 
                     let timePart = parts[1];
                     let period = parts.length > 2 ? parts[2] : '';
                     
                     if (timePart.includes('pm')) { period = 'pm'; timePart = timePart.replace('pm', ''); }
                     if (timePart.includes('am')) { period = 'am'; timePart = timePart.replace('am', ''); }
     
                     const [day, month, year] = datePart.split('/').map(Number);
                     let [hours, minutes] = timePart.split(':').map(Number);
                     if ([day, month, year, hours, minutes].some((n) => Number.isNaN(n))) {
                        return { timestamp: 0, hourKey: null };
                     }
                     
                     if (period === 'pm' && hours !== 12) hours += 12;
                     if (period === 'am' && hours === 12) hours = 0;
                     
                     return {
                        timestamp: new Date(year, month - 1, day, hours, minutes).getTime(),
                        hourKey:
                            `${year}-` +
                            `${String(month).padStart(2, '0')}-` +
                            `${String(day).padStart(2, '0')}T` +
                            `${String(hours).padStart(2, '0')}:00`,
                    };
                 } catch {
                     return { timestamp: 0, hourKey: null };
                 }
             };

            const startTime = start.getTime();

            // Ajuste de endTime para incluir todo el día si viene como "00:00"
            const adjustedEndTime = new Date(end).setHours(23, 59, 59, 999);

            const datos = docs.map(doc => {
                const data = doc.data();
                const parsedDate = parseCustomDate(data.Fecha);
                return {
                    Fecha: data.Fecha,
                    Temp: typeof data.Temp === 'number' ? data.Temp : parseFloat(data.Temp),
                    Lluvia: typeof data.Lluvia === 'number' ? parseFloat((data.Lluvia / 100).toFixed(2)) : parseFloat(data.Lluvia) / 100,
                    Radiacion: parsedDate.hourKey ? (radiationByHour.get(parsedDate.hourKey) ?? null) : null,
                    // Campo auxiliar para ordenar/filtrar
                    _timestamp: parsedDate.timestamp
                };
            })
            .filter(d => d._timestamp >= startTime && d._timestamp <= adjustedEndTime)
            .sort((a, b) => b._timestamp - a._timestamp);

            if (datos.length === 0) {
                 return res.status(404).json({ message: 'No hay datos en el rango seleccionado' });
            }

            // Generar Excel
            this.logger.log(`Generando archivo Excel con ${datos.length} registros...`);

            // Crear un nuevo libro de Excel
            const workbook = new Workbook();
            const worksheet = workbook.addWorksheet('Datos Horarios');
            
            this.logger.log('Configurando hoja de cálculo...');

            // Definir las columnas
            worksheet.columns = [
                { header: 'Fecha', key: 'Fecha', width: 25 },
                { header: 'Temperatura (°C)', key: 'Temp', width: 15 },
                { header: 'Lluvia (mm)', key: 'Lluvia', width: 15 },
                { header: 'Radiación (W/m²)', key: 'Radiacion', width: 20 }
            ];
            
            // Agregar filas
            worksheet.addRows(datos);
            
            // Dar formato a las celdas del encabezado
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

            // Centrar todas las celdas excepto la fecha
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) { // Skip header row
                    row.eachCell((cell, colNumber) => {
                        if (colNumber > 1) { // Skip date column
                            cell.alignment = { horizontal: 'center' };
                        }
                    });
                }
            });

            // Configurar la respuesta
            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                `attachment; filename=datos_horarios.xlsx`
            );

            this.logger.log('Guardando archivo Excel...');
            
            // Enviar el archivo
            await workbook.xlsx.write(res);
            res.end();
            
            this.logger.log('Archivo Excel generado y enviado correctamente');
        } catch (error) {
            this.logger.error(
                `Error al generar Excel: ${error instanceof Error ? error.message : String(error)}`
            );
            if (!res.headersSent) {
                res.status(500).json({ message: 'Error interno al generar el archivo Excel' });
            }
        }
    }

    private async fetchOpenMeteoRadiationByHour(
        startDate: string,
        endDate: string,
    ): Promise<Map<string, number>> {
        const radiationByHour = new Map<string, number>();
        try {
            this.logger.log(`Consultando radiación Open-Meteo (${startDate} -> ${endDate})`);
            const url = new URL('https://archive-api.open-meteo.com/v1/archive');
            url.searchParams.set('latitude', String(STATION_LAT));
            url.searchParams.set('longitude', String(STATION_LNG));
            url.searchParams.set('start_date', startDate);
            url.searchParams.set('end_date', endDate);
            url.searchParams.set('hourly', 'shortwave_radiation');
            url.searchParams.set('timezone', 'America/Costa_Rica');

            const response = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
            if (!response.ok) {
                this.logger.warn(`Open-Meteo radiación respondió con status ${response.status}`);
                return radiationByHour;
            }

            const data = (await response.json()) as {
                hourly?: {
                    time?: string[];
                    shortwave_radiation?: number[];
                };
            };

            const times = Array.isArray(data?.hourly?.time) ? data.hourly.time : [];
            const values = Array.isArray(data?.hourly?.shortwave_radiation)
                ? data.hourly.shortwave_radiation
                : [];
            const size = Math.min(times.length, values.length);

            for (let i = 0; i < size; i += 1) {
                const value = values[i];
                if (typeof value === 'number' && Number.isFinite(value)) {
                    radiationByHour.set(times[i], Number(value.toFixed(2)));
                }
            }

            this.logger.log(`Open-Meteo radiación: ${radiationByHour.size} horas mapeadas`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`No se pudo obtener radiación horaria desde Open-Meteo: ${message}`);
        }

        return radiationByHour;
    }
}
