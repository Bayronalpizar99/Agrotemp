import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  Icon,
  Button,
  ButtonGroup,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Spinner,
  Badge,
  Tooltip,
} from '@chakra-ui/react';
import { MapContainer, TileLayer, ImageOverlay, Rectangle, Tooltip as LeafletTooltip, useMapEvents } from 'react-leaflet';
import { FiMap, FiLayers, FiEye, FiCalendar, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import type { LatLngBoundsExpression } from 'leaflet';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ITCR_CENTER: [number, number] = [10.3635, -84.5135];

const PARCELAS = [
  {
    id: 'parcela-norte',
    nombre: 'Zona Norte — Cultivos Experimentales',
    descripcion: 'Área de ensayos con cultivos anuales',
    bbox: [-84.5180, 10.3670, -84.5080, 10.3720] as [number, number, number, number],
    color: '#43a047',
  },
  {
    id: 'parcela-central',
    nombre: 'Zona Central — Invernaderos y Viveros',
    descripcion: 'Módulos de producción controlada',
    bbox: [-84.5180, 10.3610, -84.5080, 10.3670] as [number, number, number, number],
    color: '#8bc34a',
  },
  {
    id: 'parcela-sur',
    nombre: 'Zona Sur — Pastos y Forrajes',
    descripcion: 'Áreas de ganadería y pastos mejorados',
    bbox: [-84.5180, 10.3550, -84.5080, 10.3610] as [number, number, number, number],
    color: '#e6a23c',
  },
  {
    id: 'parcela-este',
    nombre: 'Zona Este — Frutales y Café',
    descripcion: 'Plantaciones de cítricos y café',
    bbox: [-84.5080, 10.3580, -84.5050, 10.3700] as [number, number, number, number],
    color: '#1b5e20',
  },
  {
    id: 'parcela-oeste',
    nombre: 'Zona Oeste — Bosque y Reserva',
    descripcion: 'Área de conservación y biodiversidad',
    bbox: [-84.5220, 10.3580, -84.5180, 10.3700] as [number, number, number, number],
    color: '#0288d1',
  },
];

const CAMPUS_BBOX = [-84.5220, 10.3550, -84.5050, 10.3720];

type LayerMode = 'ndvi' | 'true-color';

function bboxToBounds(bbox: number[]): LatLngBoundsExpression {
  return [[bbox[1], bbox[0]], [bbox[3], bbox[2]]];
}

function bboxToRectangle(bbox: [number, number, number, number]): LatLngBoundsExpression {
  return [[bbox[1], bbox[0]], [bbox[3], bbox[2]]];
}

const NDVI_LEGEND = [
  { color: '#6495ed', label: 'Agua / nube' },
  { color: '#a1887f', label: 'Suelo' },
  { color: '#e6a23c', label: 'Veg. escasa' },
  { color: '#8bc34a', label: 'Veg. moderada' },
  { color: '#43a047', label: 'Veg. densa' },
  { color: '#1b5e20', label: 'Veg. muy densa' },
];

// ─── Subcomponente que vive dentro del MapContainer ────────────────────────────
// Detecta moveend/zoomend y llama onViewportChange con el nuevo bbox visible
function MapEventHandler({ onViewportChange }: { onViewportChange: (bbox: number[]) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useMapEvents({
    moveend: (e) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const b = e.target.getBounds();
        onViewportChange([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      }, 700); // debounce: espera 700ms después de que el usuario para
    },
  });

  return null;
}

// ─── Componente principal ──────────────────────────────────────────────────────
export function ParcelasPage() {
  const today = new Date();
  const defaultTo = today.toISOString().split('T')[0];
  const defaultFrom = new Date(today.getFullYear(), today.getMonth() - 2, 1).toISOString().split('T')[0];

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [layerMode, setLayerMode] = useState<LayerMode>('ndvi');
  const [opacity, setOpacity] = useState(0.85);
  const [selectedParcela, setSelectedParcela] = useState<string | null>(null);

  // Overlay state — URL del blob y bounds actuales de la imagen mostrada
  const [overlayUrl, setOverlayUrl] = useState<string>('');
  const [overlayBounds, setOverlayBounds] = useState<number[]>(CAMPUS_BBOX);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Refs para evitar closures stale
  const fromRef = useRef(from);
  const toRef = useRef(to);
  const layerModeRef = useRef(layerMode);
  const prevBlobRef = useRef<string>('');

  useEffect(() => { fromRef.current = from; }, [from]);
  useEffect(() => { toRef.current = to; }, [to]);
  useEffect(() => { layerModeRef.current = layerMode; }, [layerMode]);

  // Función central: pide la imagen al backend para el bbox dado y actualiza el overlay
  const fetchOverlay = useCallback(async (bbox: number[]) => {
    setImageLoading(true);
    setImageError(false);

    const endpoint = layerModeRef.current === 'ndvi' ? 'ndvi-image' : 'true-color-image';
    const url = `${API_BASE}/satellite/${endpoint}?bbox=${bbox.map((v) => v.toFixed(6)).join(',')}&from=${fromRef.current}&to=${toRef.current}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Libera el blob anterior para evitar memory leaks
      if (prevBlobRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(prevBlobRef.current);
      }
      prevBlobRef.current = blobUrl;

      setOverlayUrl(blobUrl);
      setOverlayBounds(bbox);
      setImageLoading(false);
    } catch {
      setImageLoading(false);
      setImageError(true);
    }
  }, []);

  // Carga inicial al montar el componente
  useEffect(() => {
    fetchOverlay(CAMPUS_BBOX);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuando el viewport cambia (pan/zoom), re-fetcha para esa área
  const handleViewportChange = useCallback((bbox: number[]) => {
    fetchOverlay(bbox);
  }, [fetchOverlay]);

  // Botón "Actualizar imagen" — refetch con los parámetros actuales y el último viewport
  const handleApply = useCallback(() => {
    fetchOverlay(overlayBounds);
  }, [fetchOverlay, overlayBounds]);

  const handleLayerChange = (mode: LayerMode) => {
    layerModeRef.current = mode;
    setLayerMode(mode);
    fetchOverlay(overlayBounds);
  };

  const selectedParcelaData = PARCELAS.find((p) => p.id === selectedParcela);

  return (
    <VStack spacing={4} align="stretch" w="full">
      {/* Header */}
      <HStack spacing={2}>
        <Icon as={FiMap} color="#43a047" boxSize={5} />
        <Box>
          <Text
            fontSize="sm"
            fontWeight="bold"
            textTransform="uppercase"
            letterSpacing="wider"
            bgGradient="linear(to-r, #8bc34a, #43a047)"
            bgClip="text"
          >
            Parcelas ITCR Sede San Carlos
          </Text>
          <Text fontSize="xs" color="gray.500">
            Santa Clara, Alajuela · Imágenes Sentinel-2 / Copernicus Data Space
          </Text>
        </Box>
      </HStack>

      {/* Controls */}
      <Box p="1px" borderRadius="xl" bgGradient="linear(to-b, rgba(67,160,71,0.3), rgba(255,255,255,0.06))">
        <Box bg="#1A1A1A" p={4} borderRadius="xl">
          <HStack spacing={4} wrap="wrap" gap={3} align="flex-end">
            <VStack align="start" spacing={1}>
              <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase">
                <Icon as={FiCalendar} mr={1} />Desde
              </Text>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                style={{
                  background: '#2A2A2A',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  color: 'white',
                  padding: '6px 10px',
                  fontSize: '13px',
                  colorScheme: 'dark',
                }}
              />
            </VStack>
            <VStack align="start" spacing={1}>
              <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase">
                Hasta
              </Text>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                style={{
                  background: '#2A2A2A',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  color: 'white',
                  padding: '6px 10px',
                  fontSize: '13px',
                  colorScheme: 'dark',
                }}
              />
            </VStack>

            <VStack align="start" spacing={1}>
              <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase">
                <Icon as={FiLayers} mr={1} />Capa
              </Text>
              <ButtonGroup size="sm" isAttached>
                <Button
                  onClick={() => handleLayerChange('ndvi')}
                  bg={layerMode === 'ndvi' ? '#43a047' : '#2A2A2A'}
                  color={layerMode === 'ndvi' ? 'white' : 'gray.400'}
                  border="1px solid"
                  borderColor={layerMode === 'ndvi' ? '#43a047' : 'rgba(255,255,255,0.15)'}
                  _hover={{ bg: layerMode === 'ndvi' ? '#388e3c' : '#333' }}
                >
                  NDVI
                </Button>
                <Button
                  onClick={() => handleLayerChange('true-color')}
                  bg={layerMode === 'true-color' ? '#0288d1' : '#2A2A2A'}
                  color={layerMode === 'true-color' ? 'white' : 'gray.400'}
                  border="1px solid"
                  borderColor={layerMode === 'true-color' ? '#0288d1' : 'rgba(255,255,255,0.15)'}
                  _hover={{ bg: layerMode === 'true-color' ? '#0277bd' : '#333' }}
                >
                  Color Real
                </Button>
              </ButtonGroup>
            </VStack>

            <VStack align="start" spacing={1} minW="140px">
              <HStack>
                <Icon as={FiEye} color="gray.500" boxSize={3} />
                <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase">
                  Opacidad {Math.round(opacity * 100)}%
                </Text>
              </HStack>
              <Slider value={opacity} min={0.1} max={1} step={0.05} onChange={(v) => setOpacity(v)} w="140px">
                <SliderTrack bg="rgba(255,255,255,0.1)">
                  <SliderFilledTrack bg="#43a047" />
                </SliderTrack>
                <SliderThumb boxSize={4} bg="#43a047" />
              </Slider>
            </VStack>

            <Button
              size="sm"
              bg="#43a047"
              color="white"
              _hover={{ bg: '#388e3c' }}
              onClick={handleApply}
              isLoading={imageLoading}
              loadingText="Cargando"
              flexShrink={0}
            >
              Actualizar imagen
            </Button>
          </HStack>
        </Box>
      </Box>

      {/* Map + sidebar */}
      <Box display="flex" flexDirection={{ base: 'column', lg: 'row' }} gap={3} alignItems="flex-start">
        {/* Sidebar */}
        <VStack spacing={2} align="stretch" flexShrink={0} w={{ base: 'full', lg: '240px' }}>
          <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase" mb={1}>
            Zonas del campus
          </Text>
          {PARCELAS.map((p) => (
            <Box
              key={p.id}
              p={3}
              borderRadius="lg"
              bg={selectedParcela === p.id ? 'rgba(67,160,71,0.12)' : '#1A1A1A'}
              border="1px solid"
              borderColor={selectedParcela === p.id ? '#43a047' : 'rgba(255,255,255,0.08)'}
              cursor="pointer"
              onClick={() => setSelectedParcela(selectedParcela === p.id ? null : p.id)}
              transition="all 0.2s"
              _hover={{ borderColor: 'rgba(67,160,71,0.5)', bg: 'rgba(67,160,71,0.06)' }}
            >
              <HStack spacing={2} mb={1}>
                <Box w={2.5} h={2.5} borderRadius="sm" bg={p.color} flexShrink={0} />
                <Text fontSize="xs" fontWeight="bold" color="white" lineHeight={1.3}>{p.nombre}</Text>
              </HStack>
              <Text fontSize="10px" color="gray.500" lineHeight={1.4}>{p.descripcion}</Text>
            </Box>
          ))}

          {layerMode === 'ndvi' && (
            <Box mt={2} p={3} bg="#1A1A1A" borderRadius="lg" border="1px solid rgba(255,255,255,0.08)">
              <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase" mb={2}>
                Escala NDVI
              </Text>
              <VStack spacing={1} align="stretch">
                {NDVI_LEGEND.map((item) => (
                  <HStack key={item.label} spacing={2}>
                    <Box w={3} h={3} borderRadius="2px" bg={item.color} flexShrink={0} />
                    <Text fontSize="10px" color="gray.400">{item.label}</Text>
                  </HStack>
                ))}
              </VStack>
            </Box>
          )}
        </VStack>

        {/* Map */}
        <Box flex={1} minW={0}>
          <Box p="1px" borderRadius="xl" bgGradient="linear(to-b, rgba(67,160,71,0.25), rgba(255,255,255,0.05))">
            <Box bg="#1A1A1A" borderRadius="xl" overflow="hidden" position="relative">
              {/* Loading overlay */}
              {imageLoading && (
                <Box
                  position="absolute" top={0} left={0} right={0} bottom={0}
                  zIndex={1000} bg="rgba(0,0,0,0.45)"
                  display="flex" alignItems="center" justifyContent="center"
                  borderRadius="xl"
                >
                  <VStack spacing={2}>
                    <Spinner size="md" color="#43a047" thickness="3px" />
                    <Text fontSize="xs" color="gray.300">Actualizando imagen...</Text>
                  </VStack>
                </Box>
              )}

              {/* Error banner */}
              {imageError && !imageLoading && (
                <Box
                  position="absolute" top={3} left="50%" transform="translateX(-50%)"
                  zIndex={1000} bg="rgba(229,62,62,0.9)" px={4} py={2} borderRadius="lg"
                >
                  <HStack spacing={2}>
                    <Icon as={FiAlertCircle} color="white" boxSize={3.5} />
                    <Text fontSize="xs" color="white">Sin imagen disponible para este periodo.</Text>
                  </HStack>
                </Box>
              )}

              {/* Badge */}
              {!imageLoading && !imageError && overlayUrl && (
                <Box position="absolute" top={3} right={3} zIndex={1000}>
                  <Badge
                    bg={layerMode === 'ndvi' ? 'rgba(67,160,71,0.85)' : 'rgba(2,136,209,0.85)'}
                    color="white" fontSize="10px" px={2} py={1}
                    borderRadius="md" backdropFilter="blur(4px)"
                  >
                    <HStack spacing={1}>
                      <Icon as={FiCheckCircle} boxSize={3} />
                      <Text>Sentinel-2 · {layerMode === 'ndvi' ? 'NDVI' : 'Color Real'}</Text>
                    </HStack>
                  </Badge>
                </Box>
              )}

              <MapContainer
                center={ITCR_CENTER}
                zoom={14}
                style={{ height: '540px', width: '100%', background: '#111' }}
              >
                {/* Event handler para re-fetch en zoom/pan */}
                <MapEventHandler onViewportChange={handleViewportChange} />

                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  opacity={layerMode === 'true-color' ? 0 : 0.3}
                />

                {/* Overlay dinámico: key cambia cuando overlayUrl cambia, forzando remount con nuevos bounds */}
                {overlayUrl && (
                  <ImageOverlay
                    key={overlayUrl}
                    url={overlayUrl}
                    bounds={bboxToBounds(overlayBounds)}
                    opacity={opacity}
                  />
                )}

                {PARCELAS.map((p) => (
                  <Rectangle
                    key={p.id}
                    bounds={bboxToRectangle(p.bbox)}
                    pathOptions={{
                      color: p.color,
                      weight: selectedParcela === p.id ? 2.5 : 1.5,
                      fillOpacity: selectedParcela === p.id ? 0.08 : 0,
                      dashArray: selectedParcela === p.id ? undefined : '6 4',
                    }}
                    eventHandlers={{
                      click: () => setSelectedParcela(selectedParcela === p.id ? null : p.id),
                    }}
                  >
                    <LeafletTooltip sticky>
                      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{p.nombre}</span>
                      <br />
                      <span style={{ fontSize: '11px', color: '#666' }}>{p.descripcion}</span>
                    </LeafletTooltip>
                  </Rectangle>
                ))}
              </MapContainer>

              <Box px={4} py={2} borderTop="1px solid rgba(255,255,255,0.06)">
                <HStack justify="space-between" wrap="wrap" gap={1}>
                  <Text fontSize="10px" color="gray.600">
                    {from} → {to} · Imagen actualizada al hacer zoom · Copernicus Data Space
                  </Text>
                  <Tooltip label="La imagen se actualiza automáticamente al hacer zoom o desplazar el mapa" fontSize="xs">
                    <Text fontSize="10px" color="gray.600" cursor="help">
                      ℹ Zoom adaptativo
                    </Text>
                  </Tooltip>
                </HStack>
              </Box>
            </Box>
          </Box>

          {selectedParcelaData && (
            <Box mt={3} p={4} bg="#1A1A1A" borderRadius="xl" border="1px solid" borderColor={selectedParcelaData.color}>
              <HStack spacing={2} mb={1}>
                <Box w={3} h={3} borderRadius="sm" bg={selectedParcelaData.color} />
                <Text fontSize="sm" fontWeight="bold" color="white">{selectedParcelaData.nombre}</Text>
              </HStack>
              <Text fontSize="xs" color="gray.400">{selectedParcelaData.descripcion}</Text>
              <Text fontSize="10px" color="gray.600" mt={1}>
                Coordenadas: {selectedParcelaData.bbox.join(', ')}
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    </VStack>
  );
}
