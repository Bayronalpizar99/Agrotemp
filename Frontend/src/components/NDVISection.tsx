import { useState } from 'react';
import {
  Box,
  SimpleGrid,
  HStack,
  VStack,
  Text,
  Icon,
  Stat,
  StatNumber,
  StatHelpText,
  StatArrow,
  Button,
  Spinner,
  Image,
} from '@chakra-ui/react';
import { FiActivity, FiTrendingUp, FiTrendingDown, FiMinus, FiLayers, FiMap, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { NDVIResult } from '../services/satellite.service';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const NDVI_ZONES = [
  { max: 0.2, label: 'Suelo', color: '#a1887f' },
  { max: 0.4, label: 'Escasa', color: '#e6a23c' },
  { max: 0.6, label: 'Moderada', color: '#8bc34a' },
  { max: 0.8, label: 'Densa', color: '#43a047' },
  { max: 1.0, label: 'Muy densa', color: '#1b5e20' },
];

// Color legend matching the evalscript palette
const IMAGE_LEGEND = [
  { color: '#6495ed', label: 'Agua / nube' },
  { color: '#a1887f', label: 'Suelo desnudo' },
  { color: '#e6a23c', label: 'Veg. escasa' },
  { color: '#8bc34a', label: 'Veg. moderada' },
  { color: '#43a047', label: 'Veg. densa' },
  { color: '#1b5e20', label: 'Veg. muy densa' },
];

function getClassColor(avgNDVI: number): string {
  if (avgNDVI < 0.2) return '#a1887f';
  if (avgNDVI < 0.4) return '#e6a23c';
  if (avgNDVI < 0.6) return '#8bc34a';
  if (avgNDVI < 0.8) return '#43a047';
  return '#1b5e20';
}

function getTrendIcon(trend: string) {
  if (trend === 'subiendo') return FiTrendingUp;
  if (trend === 'bajando') return FiTrendingDown;
  return FiMinus;
}

function getTrendLabel(trend: string) {
  if (trend === 'subiendo') return 'Tendencia al alza';
  if (trend === 'bajando') return 'Tendencia a la baja';
  return 'Estable';
}

const CardWrapper = ({ children }: { children: React.ReactNode }) => (
  <Box
    p="1px"
    borderRadius="xl"
    bgGradient="linear(to-b, rgba(67, 160, 71, 0.4), rgba(255, 255, 255, 0.1))"
    transition="all 0.3s ease-in-out"
    _hover={{ transform: 'translateY(-2px)', boxShadow: '0 0 12px 1px rgba(67, 160, 71, 0.15)' }}
  >
    <Box bg="#1A1A1A" p={4} borderRadius="xl" h="100%">
      {children}
    </Box>
  </Box>
);

interface NDVISectionProps {
  data: NDVIResult;
}

export function NDVISection({ data }: NDVISectionProps) {
  const { summary, timeSeries, bbox, period } = data;
  const classColor = getClassColor(summary.avgNDVI);

  const [showImage, setShowImage] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const imageUrl = `${API_BASE}/satellite/ndvi-image?bbox=${bbox.join(',')}&from=${period.from}&to=${period.to}`;

  function handleToggleImage() {
    if (!showImage) {
      setImageLoading(true);
      setImageError(false);
    }
    setShowImage((v) => !v);
  }

  return (
    <VStack spacing={4} align="stretch" w="full">
      {/* Header */}
      <HStack spacing={2}>
        <Icon as={FiLayers} color="#43a047" boxSize={4} />
        <Text
          fontSize="sm"
          fontWeight="bold"
          textTransform="uppercase"
          letterSpacing="wider"
          bgGradient="linear(to-r, #8bc34a, #43a047)"
          bgClip="text"
        >
          Índice NDVI — Salud Vegetal
        </Text>
      </HStack>

      {/* Metric cards */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
        <CardWrapper>
          <HStack justify="space-between" mb={2}>
            <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase">
              NDVI Promedio
            </Text>
            <Icon as={FiActivity} color={classColor} w={4} h={4} />
          </HStack>
          <Stat>
            <StatNumber
              fontSize="2xl"
              fontWeight="700"
              fontFamily="'JetBrains Mono', monospace"
              color={classColor}
            >
              {summary.avgNDVI.toFixed(3)}
            </StatNumber>
            <StatHelpText mb={0} fontSize="xs" color="gray.400">
              {summary.classification}
            </StatHelpText>
          </Stat>
        </CardWrapper>

        <CardWrapper>
          <HStack justify="space-between" mb={2}>
            <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase">
              Rango
            </Text>
          </HStack>
          <Stat>
            <StatNumber
              fontSize="2xl"
              fontWeight="700"
              fontFamily="'JetBrains Mono', monospace"
              bgGradient="linear(to-r, #e6a23c, #43a047)"
              bgClip="text"
              color="transparent"
            >
              {summary.minNDVI.toFixed(2)} — {summary.maxNDVI.toFixed(2)}
            </StatNumber>
            <StatHelpText mb={0} fontSize="xs" color="gray.400">
              Mínimo — Máximo
            </StatHelpText>
          </Stat>
        </CardWrapper>

        <CardWrapper>
          <HStack justify="space-between" mb={2}>
            <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase">
              Tendencia
            </Text>
            <Icon as={getTrendIcon(summary.trend)} color={summary.trend === 'subiendo' ? '#43a047' : summary.trend === 'bajando' ? '#e53e3e' : 'gray.400'} w={4} h={4} />
          </HStack>
          <Stat>
            <StatNumber
              fontSize="2xl"
              fontWeight="700"
              fontFamily="'JetBrains Mono', monospace"
              color={summary.trend === 'subiendo' ? '#43a047' : summary.trend === 'bajando' ? '#e53e3e' : 'gray.400'}
              textTransform="capitalize"
            >
              {summary.trend}
            </StatNumber>
            <StatHelpText mb={0} fontSize="xs" color="gray.400">
              <StatArrow type={summary.trend === 'bajando' ? 'decrease' : 'increase'} />
              {getTrendLabel(summary.trend)}
            </StatHelpText>
          </Stat>
        </CardWrapper>
      </SimpleGrid>

      {/* Chart */}
      {timeSeries.length > 0 && (
        <Box
          p="1px"
          borderRadius="xl"
          bgGradient="linear(to-b, rgba(67, 160, 71, 0.25), rgba(255, 255, 255, 0.05))"
        >
          <Box bg="#1A1A1A" p={4} borderRadius="xl">
            <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase" mb={4}>
              Evolución NDVI en el periodo
            </Text>
            <Box h="260px">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ndviGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#43a047" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#43a047" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="date"
                    stroke="#718096"
                    fontSize={11}
                    tickFormatter={(val: string) => val.split('-').slice(1).join('/')}
                  />
                  <YAxis
                    stroke="#718096"
                    fontSize={11}
                    domain={[0, 1]}
                    ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1A1A',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = { mean: 'Promedio', min: 'Mínimo', max: 'Máximo' };
                      return [value.toFixed(3), labels[name] || name];
                    }}
                  />
                  <ReferenceLine y={0.2} stroke="#a1887f" strokeDasharray="3 3" strokeOpacity={0.4} />
                  <ReferenceLine y={0.4} stroke="#e6a23c" strokeDasharray="3 3" strokeOpacity={0.4} />
                  <ReferenceLine y={0.6} stroke="#8bc34a" strokeDasharray="3 3" strokeOpacity={0.4} />
                  <Area
                    type="monotone"
                    dataKey="mean"
                    stroke="#43a047"
                    strokeWidth={2}
                    fill="url(#ndviGradient)"
                    dot={{ r: 3, fill: '#43a047' }}
                    name="mean"
                  />
                  <Area
                    type="monotone"
                    dataKey="max"
                    stroke="rgba(67,160,71,0.3)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    fill="none"
                    name="max"
                  />
                  <Area
                    type="monotone"
                    dataKey="min"
                    stroke="rgba(230,162,60,0.3)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    fill="none"
                    name="min"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>

            {/* Chart legend */}
            <HStack spacing={4} mt={3} justify="center" flexWrap="wrap">
              {NDVI_ZONES.map((zone) => (
                <HStack key={zone.label} spacing={1.5}>
                  <Box w={2.5} h={2.5} borderRadius="sm" bg={zone.color} />
                  <Text fontSize="xs" color="gray.500">
                    {zone.label} (&lt;{zone.max})
                  </Text>
                </HStack>
              ))}
            </HStack>
          </Box>
        </Box>
      )}

      {/* Satellite image toggle */}
      <Box
        p="1px"
        borderRadius="xl"
        bgGradient="linear(to-b, rgba(67, 160, 71, 0.2), rgba(255, 255, 255, 0.05))"
      >
        <Box bg="#1A1A1A" borderRadius="xl" overflow="hidden">
          <Button
            w="full"
            variant="ghost"
            size="sm"
            py={4}
            borderRadius="xl"
            onClick={handleToggleImage}
            leftIcon={<Icon as={FiMap} color="#43a047" />}
            rightIcon={<Icon as={showImage ? FiChevronUp : FiChevronDown} color="gray.500" />}
            justifyContent="space-between"
            _hover={{ bg: 'rgba(67,160,71,0.08)' }}
            color="gray.300"
            fontWeight="bold"
            fontSize="xs"
            textTransform="uppercase"
            letterSpacing="wide"
            px={4}
          >
            Imagen satelital Sentinel-2 — Visualización NDVI
          </Button>

          {showImage && (
            <Box px={4} pb={4}>
              {/* Loading */}
              {imageLoading && !imageError && (
                <HStack justify="center" py={8} spacing={3}>
                  <Spinner size="sm" color="#43a047" />
                  <Text fontSize="xs" color="gray.500">
                    Descargando imagen del satélite...
                  </Text>
                </HStack>
              )}

              {/* Error */}
              {imageError && (
                <Box
                  py={6}
                  textAlign="center"
                  borderRadius="lg"
                  bg="rgba(229,62,62,0.08)"
                  border="1px solid rgba(229,62,62,0.2)"
                >
                  <Text fontSize="xs" color="red.400">
                    No se pudo cargar la imagen. Es posible que no haya imágenes disponibles para este periodo.
                  </Text>
                </Box>
              )}

              {/* Image */}
              <Box position="relative">
                <Image
                  src={imageUrl}
                  alt="Imagen NDVI Sentinel-2"
                  borderRadius="lg"
                  w="full"
                  display={imageLoading || imageError ? 'none' : 'block'}
                  onLoad={() => setImageLoading(false)}
                  onError={() => { setImageLoading(false); setImageError(true); }}
                  style={{ imageRendering: 'pixelated' }}
                />
              </Box>

              {/* Image legend */}
              {!imageLoading && !imageError && (
                <>
                  <HStack spacing={3} mt={3} justify="center" flexWrap="wrap">
                    {IMAGE_LEGEND.map((item) => (
                      <HStack key={item.label} spacing={1.5}>
                        <Box w={2.5} h={2.5} borderRadius="sm" bg={item.color} flexShrink={0} />
                        <Text fontSize="xs" color="gray.500">{item.label}</Text>
                      </HStack>
                    ))}
                  </HStack>
                  <Text fontSize="10px" color="gray.600" textAlign="center" mt={2}>
                    Mosaico de menor nubosidad — {period.from} a {period.to} · Sentinel-2 L2A · Copernicus Data Space
                  </Text>
                </>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </VStack>
  );
}
