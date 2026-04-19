import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  HStack,
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
  FiDroplet,
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
        case 'Humedad Relativa':
            iconComponent = FiDroplet;
            color = value > 85 ? 'blue.400' : value > 60 ? 'cyan.400' : 'green.400';
            break;
        case 'Radiación Solar':
            iconComponent = FiSun;
            color = value > 700 ? 'yellow.300' : value > 300 ? 'yellow.500' : 'gray.400';
            break;
        default: return null;
    }
    return <Icon as={iconComponent} color={color} w={6} h={6} />;
};

// --- Componente DataCard rediseñado ---
const DataCard = ({ title, value, unit, icon, delay = 0 }: { title: string; value: string | number; unit: string; icon: React.ReactNode; delay?: number }) => (
  <Box
    p="1px"
    borderRadius="2xl"
    bgGradient="linear(135deg, rgba(232, 114, 42, 0.28) 0%, rgba(255, 255, 255, 0.05) 100%)"
    transition="transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.35s ease"
    sx={{ animation: `cardReveal 0.55s ease ${delay}ms both` }}
    _hover={{
      transform: 'translateY(-6px)',
      boxShadow: '0 24px 48px rgba(232, 114, 42, 0.12), 0 0 0 1px rgba(232, 114, 42, 0.18)',
    }}
  >
    <Box
      bg="rgba(13, 13, 13, 0.98)"
      p={6}
      borderRadius="2xl"
      h="200px"
      position="relative"
      overflow="hidden"
      sx={{
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          pointerEvents: 'none',
        },
      }}
    >
      <VStack h="100%" align="start" justify="space-between" position="relative" zIndex={1}>
        <HStack w="full" justify="space-between" align="center">
          <Text
            fontSize="10px"
            fontWeight="700"
            letterSpacing="0.14em"
            color="rgba(255,255,255,0.28)"
            textTransform="uppercase"
          >
            {title}
          </Text>
          <Box opacity={0.4}>{icon}</Box>
        </HStack>

        <VStack align="start" spacing={0}>
          <Heading
            as="h3"
            fontFamily="'JetBrains Mono', monospace"
            fontSize="5xl"
            fontWeight="700"
            lineHeight="1"
            bgGradient="linear(to-br, #ffbc86, #e8722a)"
            bgClip="text"
            letterSpacing="-0.03em"
          >
            {typeof value === 'number' ? value.toFixed(1) : value}
          </Heading>
          <Text
            fontFamily="'JetBrains Mono', monospace"
            fontSize="xs"
            color="rgba(255,255,255,0.22)"
            letterSpacing="0.06em"
            mt={1}
          >
            {unit}
          </Text>
        </VStack>
      </VStack>
    </Box>
  </Box>
);

export const WeatherDashboard = () => {
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [radiation, setRadiation] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [currentData, hourlyDataResponse, radiationData] = await Promise.all([
          weatherService.getCurrentWeather(),
          weatherService.getHourlyWeather(1),
          weatherService.getCurrentRadiation(),
        ]);
        setCurrentWeather(currentData);
        setHourlyData(hourlyDataResponse);
        setRadiation(radiationData);
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
        <HStack justify="center" mb={3} spacing={2}>
          <Box
            w="7px"
            h="7px"
            borderRadius="full"
            bg="#48c78e"
            flexShrink={0}
            sx={{ animation: 'livePulse 2.2s ease-in-out infinite' }}
          />
          <Text
            fontSize="10px"
            fontWeight="700"
            letterSpacing="0.15em"
            fontFamily="'JetBrains Mono', monospace"
            color="rgba(255,255,255,0.28)"
            textTransform="uppercase"
          >
            Datos en vivo
          </Text>
        </HStack>
        <Heading
          as="h1"
          fontSize={{ base: "4xl", md: "6xl" }}
          fontWeight="300"
          lineHeight="1.1"
          letterSpacing="-0.03em"
          color="white"
          mb={4}
        >
          Dashboard{' '}
          <Text as="span" fontStyle="italic" bgGradient="linear(to-r, #ffbc86, #e8722a)" bgClip="text">
            Meteorológico
          </Text>
        </Heading>
      </Box>

      <SimpleGrid
        columns={{ base: 1, sm: 2, lg: 3 }}
        spacing={8}
        maxW="container.lg"
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
              delay={0}
            />
            <DataCard
              title="Lluvia Actual"
              value={hourlyData[0].Lluvia}
              unit="mm"
              icon={getWeatherIcon("Lluvia Hoy", hourlyData[0].Lluvia)}
              delay={100}
            />
            {radiation !== null && (
              <DataCard
                title="Radiación Solar"
                value={radiation}
                unit="W/m²"
                icon={getWeatherIcon("Radiación Solar", radiation)}
                delay={200}
              />
            )}
          </>
        )}
        <DataCard
          title="Temperatura Máxima"
          value={currentWeather.Tmax}
          unit="°C"
          icon={getWeatherIcon("Temp. Máxima", currentWeather.Tmax)}
          delay={300}
        />
        <DataCard
          title="Temperatura Mínima"
          value={currentWeather.Tmin}
          unit="°C"
          icon={getWeatherIcon("Temp. Mínima", currentWeather.Tmin)}
          delay={400}
        />
        {currentWeather.HR !== undefined && (
          <DataCard
            title="Humedad Relativa"
            value={currentWeather.HR}
            unit="%"
            icon={getWeatherIcon("Humedad Relativa", currentWeather.HR)}
            delay={500}
          />
        )}
      </SimpleGrid>
    </VStack>
  );
};