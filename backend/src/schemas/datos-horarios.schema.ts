import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class DatosHorarios extends Document {
    @Prop({ required: true })
    fecha: Date;

    @Prop({ required: true })
    temperatura: number;

    @Prop({ required: true })
    humedad: number;

    @Prop({ required: true })
    presion: number;

    @Prop({ required: true })
    velocidadViento: number;

    @Prop({ required: true })
    direccionViento: string;

    @Prop({ required: true })
    precipitacion: number;

    @Prop({ required: true })
    radiacionSolar: number;
}

export const DatosHorariosSchema = SchemaFactory.createForClass(DatosHorarios);