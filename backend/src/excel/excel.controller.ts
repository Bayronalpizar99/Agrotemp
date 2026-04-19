import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Workbook } from 'exceljs';
import { getFirestore } from 'firebase-admin/firestore';
import { DownloadExcelQueryDto } from './dto/download-excel-query.dto';

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

            const start = new Date(startDate);
            const end = new Date(endDate);
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

            // Helper de fecha
            const parseCustomDate = (dateStr: string) => {
                 if (!dateStr) return 0;
                 try {
                     const cleanDate = dateStr.replace(/\./g, '').toLowerCase().trim();
                     const parts = cleanDate.split(/\s+/);
                     if (parts.length < 2) return 0;
     
                     const datePart = parts[0]; 
                     let timePart = parts[1];
                     let period = parts.length > 2 ? parts[2] : '';
                     
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

            const startTime = start.getTime();

            // Ajuste de endTime para incluir todo el día si viene como "00:00"
            const adjustedEndTime = new Date(end).setHours(23, 59, 59, 999);

            const datos = docs.map(doc => {
                const data = doc.data();
                return {
                    Fecha: data.Fecha,
                    Temp: typeof data.Temp === 'number' ? data.Temp : parseFloat(data.Temp),
                    Lluvia: typeof data.Lluvia === 'number' ? parseFloat((data.Lluvia / 100).toFixed(2)) : parseFloat(data.Lluvia) / 100,
                    Rad_max: data.Rad_max,
                    // Campo auxiliar para ordenar/filtrar
                    _timestamp: parseCustomDate(data.Fecha)
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
                { header: 'Lluvia (mm)', key: 'Lluvia', width: 15 }
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
}
