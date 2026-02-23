import { Schema, model } from 'mongoose';

interface IDatosHorarios {
    fecha: Date;
    temperatura: number;
    humedad: number;
    presion: number;
    velocidadViento: number;
    direccionViento: string;
    precipitacion: number;
    radiacionSolar: number;
}

const datosHorariosSchema = new Schema<IDatosHorarios>({
    fecha: { type: Date, required: true },
    temperatura: { type: Number, required: true },
    humedad: { type: Number, required: true },
    presion: { type: Number, required: true },
    velocidadViento: { type: Number, required: true },
    direccionViento: { type: String, required: true },
    precipitacion: { type: Number, required: true },
    radiacionSolar: { type: Number, required: true }
}, {
    timestamps: true
});

export const DatosHorariosModel = model<IDatosHorarios>('DatosHorarios', datosHorariosSchema);