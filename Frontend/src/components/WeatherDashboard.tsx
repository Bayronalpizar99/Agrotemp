import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  SimpleGrid,
  Text,
  VStack,
  Icon,
  Spinner,
  useToast,
} from '@chakra-ui/react';
import {
  FiThermometer,
  FiSun,
  FiCloudDrizzle,
  FiCloudOff,
  FiWind,
} from 'react-icons/fi';

import { weatherService } from '../services/weather.service';
import type { WeatherData } from '../services/weather.service';

const getWeatherIcon = (title: string, value: number) => {
    let iconComponent, color;
    switch (title) {
        case 'Temperatura': case 'Sensación Térmica': case 'Temp. Máxima': case 'Temp. Mínima':
            iconComponent = FiThermometer;
            if (value > 28) color = 'red.400'; else if (value < 15) color = 'blue.300'; else color = 'gray.400';
            break;
        case 'Lluvia Hoy': case 'Lluvia Acumulada': case 'Lluvia Ayer':
            iconComponent = value > 0 ? FiCloudDrizzle : FiCloudOff;
            color = value > 0 ? 'blue.400' : 'gray.400';
            break;
        case 'Radiación Máxima':
            iconComponent = FiSun;
            color = value > 700 ? 'yellow.400' : 'gray.400';
            break;
        case 'Velocidad Viento':
            iconComponent = FiWind;
            color = value > 20 ? 'cyan.400' : 'gray.400';
            break;
        default: return null;
    }
    return <Icon as={iconComponent} color={color} w={6} h={6} />;
};

// --- Componente DataCard rediseñado ---
const DataCard = ({ title, value, unit, icon }: { title: string; value: string | number; unit: string; icon: React.ReactNode }) => (
  // Contenedor exterior para crear el borde con gradiente
  <Box
    p="1px" // Grosor del borde
    borderRadius="xl"
    // El gradiente va de un naranja semitransparente al borde sutil de tu tema
    bgGradient="linear(to-b, rgba(255, 129, 68, 0.4), rgba(255, 255, 255, 0.1))"
    transition="all 0.3s ease-in-out"
    _hover={{
      transform: 'translateY(-4px)',
      boxShadow: 'glow',
    }}
  >
    {/* Contenedor interior con el contenido de la tarjeta */}
    <Box 
      bg="#1A1A1A" // Un fondo más sólido para que el texto sea legible
      p={5}
      borderRadius="xl"
      h="178px" // Un poco menos que la altura anterior para compensar el borde
      position="relative"
    >
      <VStack h="100%" align="start" justify="space-between">
        {/* Ícono en la esquina superior derecha */}
        <Box alignSelf="flex-end">
          {icon}
        </Box>
        {/* Bloque de texto en la parte inferior izquierda */}
        <VStack align="start" spacing={0}>
          <Heading
            as="h3"
            fontSize="5xl"
            fontWeight="bold"
            lineHeight="1"
            // Gradiente vertical para el texto del valor
            bgGradient="linear(to-b, brand.orangeLight, brand.orange)"
            bgClip="text"
          >
            {typeof value === 'number' ? value.toFixed(2) : value}
            <Text as="span" fontSize="2xl" color="brand.mutedText" ml={1}>{unit}</Text>
          </Heading>
          <Text color="brand.subtext" fontSize="md">{title}</Text>
        </VStack>
      </VStack>
    </Box>
  </Box>
);

export const WeatherDashboard = () => {
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [currentData, hourlyDataResponse] = await Promise.all([
          weatherService.getCurrentWeather(),
          weatherService.getHourlyWeather(1) // Solo el último registro
        ]);
        setCurrentWeather(currentData);
        setHourlyData(hourlyDataResponse);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos del clima',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Actualizar datos cada 5 minutos
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [toast]);

  if (loading) {
    return (
      <VStack spacing={8} align="center" justify="center" h="100vh">
        <Spinner size="xl" color="brand.orange" />
        <Text>Cargando datos del clima...</Text>
      </VStack>
    );
  }

  if (!currentWeather) {
    return (
      <VStack spacing={8} align="center" justify="center">
        <Text>No hay datos disponibles</Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={8} align="stretch">
      <Box textAlign="center">
        <Heading 
          as="h1" 
          fontSize={{ base: "4xl", md: "6xl" }} 
          fontWeight="bold" 
          lineHeight="1.1" 
          bgGradient="linear(to-r, #ff9a56, #ff6b35, #e55a2b)" 
          bgClip="text" 
          letterSpacing="-0.02em"
          mb={4}
        >
          Dashboard Meteorológico
        </Heading>
      </Box>

      <SimpleGrid 
        columns={{ base: 1, md: 2 }} 
        spacing={8} 
        maxW="container.md" 
        mx="auto" 
        w="full"
      >
        {hourlyData.length > 0 && (
          <>
            <DataCard 
              title="Temperatura Actual" 
              value={hourlyData[0].Temp} 
              unit="°C" 
              icon={getWeatherIcon("Temperatura", hourlyData[0].Temp)} 
            />
            <DataCard 
              title="Lluvia Actual" 
              value={hourlyData[0].Lluvia} 
              unit="mm" 
              icon={getWeatherIcon("Lluvia Hoy", hourlyData[0].Lluvia)} 
            />
          </>
        )}
        <DataCard 
          title="Temperatura Máxima" 
          value={currentWeather.Tmax} 
          unit="°C" 
          icon={getWeatherIcon("Temp. Máxima", currentWeather.Tmax)} 
        />
        <DataCard 
          title="Temperatura Mínima" 
          value={currentWeather.Tmin} 
          unit="°C" 
          icon={getWeatherIcon("Temp. Mínima", currentWeather.Tmin)} 
        />
      </SimpleGrid>
    </VStack>
  );
};