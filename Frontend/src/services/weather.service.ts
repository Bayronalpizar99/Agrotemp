const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Definiendo los tipos
export type WeatherData = {
    Fecha: string;
    Tmax: number;
    Tmin: number;
    SUM_lluv: number;
    Vmax: number;
    timestamp_extraccion: string;
};

export type HourlyWeatherData = {
    Fecha: string;
    Lluvia: number;
    Temp: number;
};

const weatherService = {
    getCurrentWeather: async (): Promise<WeatherData> => {
        try {
            const response = await fetch(`${API_BASE_URL}/weather/current`);
            if (!response.ok) {
                throw new Error('Error al obtener datos del clima');
            }
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    },

    getHourlyWeather: async (limit: number = 24): Promise<HourlyWeatherData[]> => {
        try {
            const response = await fetch(`${API_BASE_URL}/weather/hourly?limit=${limit}`);
            if (!response.ok) {
                throw new Error('Error al obtener datos horarios');
            }
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    },

    getWeatherStats: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/weather/stats`);
            if (!response.ok) {
                throw new Error('Error al obtener estadísticas');
            }
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    },

    downloadHourlyData: async (startDate: string, endDate: string) => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/excel/download?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
                {
                    headers: {
                        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error('Error al descargar datos');
            }
            
            const blob = await response.blob();
            
            // Verificar si el blob está vacío o es demasiado pequeño
            if (blob.size < 100) { // Un archivo Excel válido debería ser más grande que esto
                throw new Error('El archivo descargado está vacío o es inválido');
            }
            
            const fileName = `datos_horarios_${startDate.split('T')[0]}_${endDate.split('T')[0]}.xlsx`;
            
            // Crear un enlace temporal para descargar el archivo
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            
            // Limpiar después de un pequeño retraso para asegurar que la descarga comience
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(link);
            }, 100);
            
            return { success: true };
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }
};

export { weatherService };