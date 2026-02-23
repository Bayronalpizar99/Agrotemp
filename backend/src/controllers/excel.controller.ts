import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { DatosHorariosModel } from '../models/datosHorarios.model';

export const downloadExcel = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Las fechas son requeridas' });
        }

        // Convertir las fechas de string a Date
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);

        // Obtener los datos del rango de fechas
        const datos = await DatosHorariosModel.find({
            fecha: {
                $gte: start,
                $lte: end
            }
        }).sort({ fecha: 1 });

        // Crear un nuevo libro de Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Datos Horarios');

        // Definir las columnas
        worksheet.columns = [
            { header: 'Fecha', key: 'fecha', width: 20 },
            { header: 'Temperatura (°C)', key: 'temperatura', width: 15 },
            { header: 'Humedad (%)', key: 'humedad', width: 15 },
            { header: 'Presión (hPa)', key: 'presion', width: 15 },
            { header: 'Velocidad del Viento (m/s)', key: 'velocidadViento', width: 20 },
            { header: 'Dirección del Viento', key: 'direccionViento', width: 20 },
            { header: 'Precipitación (mm)', key: 'precipitacion', width: 15 },
            { header: 'Radiación Solar (W/m²)', key: 'radiacionSolar', width: 20 }
        ];

        // Dar formato a las celdas del encabezado
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Agregar los datos
        datos.forEach(dato => {
            worksheet.addRow({
                fecha: dato.fecha.toLocaleString(),
                temperatura: dato.temperatura,
                humedad: dato.humedad,
                presion: dato.presion,
                velocidadViento: dato.velocidadViento,
                direccionViento: dato.direccionViento,
                precipitacion: dato.precipitacion,
                radiacionSolar: dato.radiacionSolar
            });
        });

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
            `attachment; filename=datos_horarios_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.xlsx`
        );

        // Enviar el archivo
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error al generar el archivo Excel:', error);
        res.status(500).json({ message: 'Error al generar el archivo Excel' });
    }
};