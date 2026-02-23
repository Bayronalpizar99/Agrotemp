export interface HourlyWeatherData {
    fecha: Date;  // Cambio de Fecha a fecha para coincidir con la estructura en Firestore
    Lluvia: number;
    Precip?: number;
    Temp: number;
    Rad_max?: number;
    timestamp_extraccion_lote?: Date;  // Campo opcional para compatibilidad
}
