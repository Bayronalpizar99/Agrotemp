import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Spinner,
  Icon,
} from '@chakra-ui/react';
import { MapContainer, TileLayer, ImageOverlay, useMapEvents, useMap } from 'react-leaflet';
import { FiAlertCircle } from 'react-icons/fi';
import type { LatLngBoundsExpression } from 'leaflet';
import { satelliteService } from '../services/satellite.service';
import type { NDVIResult } from '../services/satellite.service';
import { NDVISection } from './NDVISection';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const ITCR_CENTER: [number, number] = [10.364214, -84.507275];
const CAMPUS_BBOX = [-84.5220, 10.3550, -84.5050, 10.3720];

type LayerMode = 'ndvi' | 'true-color';

function bboxToBounds(bbox: number[]): LatLngBoundsExpression {
  return [[bbox[1], bbox[0]], [bbox[3], bbox[2]]];
}

const NDVI_LEGEND = [
  { color: '#6495ed', label: 'Agua / nube' },
  { color: '#a1887f', label: 'Suelo desnudo' },
  { color: '#e6a23c', label: 'Veg. escasa' },
  { color: '#8bc34a', label: 'Veg. moderada' },
  { color: '#43a047', label: 'Veg. densa' },
  { color: '#1b5e20', label: 'Veg. muy densa' },
];

function MapResizer({ isActive }: { isActive: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (isActive) {
      setTimeout(() => map.invalidateSize(), 100);
    }
  }, [isActive, map]);
  return null;
}

function MapEventHandler({ onViewportChange }: { onViewportChange: (bbox: number[]) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useMapEvents({
    moveend: (e) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const b = e.target.getBounds();
        onViewportChange([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      }, 700);
    },
  });
  return null;
}

export function ParcelasPage({ isActive = false }: { isActive?: boolean }) {
  const today = new Date();
  const defaultTo = today.toISOString().split('T')[0];
  const defaultFrom = new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [layerMode, setLayerMode] = useState<LayerMode>('true-color');
  const [opacity, setOpacity] = useState(0.85);
  const [overlayUrl, setOverlayUrl] = useState<string>('');
  const [overlayBounds, setOverlayBounds] = useState<number[]>(CAMPUS_BBOX);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const [ndviStats, setNdviStats] = useState<NDVIResult | null>(null);
  const [ndviStatsLoading, setNdviStatsLoading] = useState(false);

  const fromRef = useRef(from);
  const toRef = useRef(to);
  const layerModeRef = useRef(layerMode);
  const prevBlobRef = useRef<string>('');

  useEffect(() => { fromRef.current = from; }, [from]);
  useEffect(() => { toRef.current = to; }, [to]);
  useEffect(() => { layerModeRef.current = layerMode; }, [layerMode]);

  const fetchOverlay = useCallback(async (bbox: number[]) => {
    if (layerModeRef.current !== 'ndvi') return;
    setImageLoading(true);
    setImageError(false);
    const url = `${API_BASE}/satellite/ndvi-image?bbox=${bbox.map((v) => v.toFixed(6)).join(',')}&from=${fromRef.current}&to=${toRef.current}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      if (prevBlobRef.current.startsWith('blob:')) {
        const urlToRevoke = prevBlobRef.current;
        setTimeout(() => URL.revokeObjectURL(urlToRevoke), 200);
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

  useEffect(() => {
    fetchOverlay(CAMPUS_BBOX);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (layerMode !== 'ndvi') return;
    setNdviStatsLoading(true);
    satelliteService.getNDVI(CAMPUS_BBOX, from, to)
      .then((result) => { setNdviStats(result); })
      .catch(() => { setNdviStats(null); })
      .finally(() => { setNdviStatsLoading(false); });
  }, [layerMode, from, to]);

  const handleViewportChange = useCallback((bbox: number[]) => {
    fetchOverlay(bbox);
  }, [fetchOverlay]);

  const handleApply = useCallback(() => {
    fetchOverlay(overlayBounds);
  }, [fetchOverlay, overlayBounds]);

  const handleLayerChange = (mode: LayerMode) => {
    layerModeRef.current = mode;
    setLayerMode(mode);
    if (mode === 'ndvi') {
      fetchOverlay(overlayBounds);
    } else {
      setOverlayUrl('');
      setImageLoading(false);
      setImageError(false);
    }
  };

  const isNdvi = layerMode === 'ndvi';

  return (
    <Box>
      {/* ── Page header ─────────────────────────────── */}
      <HStack spacing={3} mb={4} align="center">
        <Box
          w="3px" h="28px" borderRadius="full"
          bgGradient="linear(to-b, #ff8a50, #ff6b35)"
          flexShrink={0}
        />
        <Box>
          <Text
            fontSize="xs" fontWeight="700"
            textTransform="uppercase" letterSpacing="0.12em"
            bgGradient="linear(to-r, #ffb347, #ff6b35)"
            bgClip="text"
          >
            Parcelas ITCR Sede San Carlos
          </Text>
          <Text fontSize="10px" color="rgba(255,255,255,0.22)" letterSpacing="0.05em">
            Santa Clara, Alajuela · 10°21′N 84°30′W
          </Text>
        </Box>
      </HStack>

      {/* ── Map wrapper ─────────────────────────────── */}
      <Box
        borderRadius="2xl"
        overflow="hidden"
        position="relative"
        border="1px solid rgba(255,255,255,0.07)"
        boxShadow="0 0 0 1px rgba(255,255,255,0.02), 0 24px 64px rgba(0,0,0,0.6)"
      >

        {/* ── Floating control panel ───────────────── */}
        <Box
          position="absolute"
          left={3} top={3}
          zIndex={1000}
          w="176px"
          sx={{ '& *': { userSelect: 'none' } }}
        >
          <Box
            bg="rgba(6, 6, 6, 0.88)"
            backdropFilter="blur(18px)"
            borderRadius="xl"
            border="1px solid rgba(255,255,255,0.09)"
            overflow="hidden"
          >
            {/* Panel title */}
            <Box px={3} pt={2.5} pb={2} borderBottom="1px solid rgba(255,255,255,0.05)">
              <HStack spacing={1.5}>
                <Box
                  w="5px" h="5px" borderRadius="full" flexShrink={0}
                  bg={isNdvi ? '#ff8a50' : '#0288d1'}
                  boxShadow={isNdvi ? '0 0 6px rgba(255,138,80,0.8)' : '0 0 6px rgba(2,136,209,0.8)'}
                  sx={{ animation: 'livePulse 2.2s ease-in-out infinite' }}
                />
                <Text fontSize="9px" color="rgba(255,255,255,0.3)" letterSpacing="0.12em" textTransform="uppercase">
                  {isNdvi ? 'Análisis NDVI' : 'Color Real'}
                </Text>
              </HStack>
            </Box>

            {/* Layer toggle */}
            <Box px={3} py={3}>
              <Text fontSize="9px" color="rgba(255,255,255,0.2)" textTransform="uppercase" letterSpacing="0.1em" mb={2}>
                Modo de vista
              </Text>
              <HStack spacing={1.5}>
                <Box
                  flex={1} textAlign="center" py={1.5} borderRadius="md"
                  bg={isNdvi ? 'rgba(255,138,80,0.18)' : 'rgba(255,255,255,0.04)'}
                  border="1px solid"
                  borderColor={isNdvi ? 'rgba(255,138,80,0.45)' : 'rgba(255,255,255,0.07)'}
                  cursor="pointer"
                  onClick={() => handleLayerChange('ndvi')}
                  transition="all 0.18s"
                  _hover={!isNdvi ? { bg: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.14)' } : {}}
                >
                  <Text fontSize="10px" fontWeight="600" color={isNdvi ? '#ff8a50' : 'rgba(255,255,255,0.35)'}>
                    NDVI
                  </Text>
                </Box>
                <Box
                  flex={1} textAlign="center" py={1.5} borderRadius="md"
                  bg={!isNdvi ? 'rgba(2,136,209,0.18)' : 'rgba(255,255,255,0.04)'}
                  border="1px solid"
                  borderColor={!isNdvi ? 'rgba(2,136,209,0.45)' : 'rgba(255,255,255,0.07)'}
                  cursor="pointer"
                  onClick={() => handleLayerChange('true-color')}
                  transition="all 0.18s"
                  _hover={isNdvi ? { bg: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.14)' } : {}}
                >
                  <Text fontSize="10px" fontWeight="600" color={!isNdvi ? '#4fc3f7' : 'rgba(255,255,255,0.35)'}>
                    RGB
                  </Text>
                </Box>
              </HStack>
            </Box>

            {/* NDVI controls */}
            {isNdvi && (
              <>
                <Box borderTop="1px solid rgba(255,255,255,0.05)" px={3} py={3}>
                  <VStack spacing={3} align="stretch">
                    {/* Period */}
                    <Box>
                      <Text fontSize="9px" color="rgba(255,255,255,0.2)" textTransform="uppercase" letterSpacing="0.1em" mb={1.5}>
                        Periodo
                      </Text>
                      <VStack spacing={1.5} align="stretch">
                        <Box>
                          <Text fontSize="8px" color="rgba(255,255,255,0.18)" mb={0.5} letterSpacing="0.06em">DESDE</Text>
                          <input
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            style={{
                              width: '100%',
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.09)',
                              borderRadius: '6px',
                              color: 'rgba(255,255,255,0.65)',
                              padding: '4px 8px',
                              fontSize: '11px',
                              colorScheme: 'dark',
                              outline: 'none',
                            }}
                          />
                        </Box>
                        <Box>
                          <Text fontSize="8px" color="rgba(255,255,255,0.18)" mb={0.5} letterSpacing="0.06em">HASTA</Text>
                          <input
                            type="date"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            style={{
                              width: '100%',
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.09)',
                              borderRadius: '6px',
                              color: 'rgba(255,255,255,0.65)',
                              padding: '4px 8px',
                              fontSize: '11px',
                              colorScheme: 'dark',
                              outline: 'none',
                            }}
                          />
                        </Box>
                      </VStack>
                    </Box>

                    {/* Opacity */}
                    <Box>
                      <HStack justify="space-between" mb={1.5}>
                        <Text fontSize="9px" color="rgba(255,255,255,0.2)" textTransform="uppercase" letterSpacing="0.1em">
                          Opacidad
                        </Text>
                        <Text fontSize="9px" color="rgba(255,255,255,0.4)" fontVariantNumeric="tabular-nums">
                          {Math.round(opacity * 100)}%
                        </Text>
                      </HStack>
                      <Slider value={opacity} min={0.1} max={1} step={0.05} onChange={(v) => setOpacity(v)}>
                        <SliderTrack h="2px" bg="rgba(255,255,255,0.08)" borderRadius="full">
                          <SliderFilledTrack borderRadius="full" bgGradient="linear(to-r, #ff6b35, #ff8a50)" />
                        </SliderTrack>
                        <SliderThumb
                          boxSize={3} bg="white"
                          boxShadow="0 0 0 2px rgba(255,138,80,0.5)"
                        />
                      </Slider>
                    </Box>

                    {/* Update button */}
                    <Box
                      as="button"
                      w="full"
                      py={1.5}
                      borderRadius="md"
                      bg={imageLoading ? 'rgba(255,138,80,0.1)' : 'rgba(255,138,80,0.18)'}
                      border="1px solid rgba(255,138,80,0.35)"
                      color="#ff8a50"
                      fontSize="10px"
                      fontWeight="700"
                      letterSpacing="0.1em"
                      textTransform="uppercase"
                      cursor={imageLoading ? 'not-allowed' : 'pointer'}
                      onClick={!imageLoading ? handleApply : undefined}
                      transition="all 0.15s"
                      _hover={{ bg: 'rgba(255,138,80,0.28)', borderColor: 'rgba(255,138,80,0.55)' }}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      gap="6px"
                    >
                      {imageLoading
                        ? <><Spinner size="xs" color="#ff8a50" /><span>Cargando</span></>
                        : 'Actualizar'}
                    </Box>
                  </VStack>
                </Box>

                {/* NDVI Legend */}
                <Box borderTop="1px solid rgba(255,255,255,0.05)" px={3} py={2.5}>
                  <Text fontSize="9px" color="rgba(255,255,255,0.2)" textTransform="uppercase" letterSpacing="0.1em" mb={2}>
                    Escala
                  </Text>
                  <VStack spacing={1} align="stretch">
                    {NDVI_LEGEND.map(item => (
                      <HStack key={item.label} spacing={2}>
                        <Box w="8px" h="8px" borderRadius="2px" bg={item.color} flexShrink={0} />
                        <Text fontSize="9px" color="rgba(255,255,255,0.38)">{item.label}</Text>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              </>
            )}
          </Box>
        </Box>

        {/* ── Loading overlay ──────────────────────── */}
        {imageLoading && (
          <Box
            position="absolute" inset={0} zIndex={999}
            bg="rgba(0,0,0,0.38)"
            display="flex" alignItems="center" justifyContent="center"
          >
            <VStack spacing={2}>
              <Spinner size="md" color="#ff8a50" thickness="2px" speed="0.9s" />
              <Text fontSize="9px" color="rgba(255,255,255,0.4)" textTransform="uppercase" letterSpacing="0.12em">
                Procesando imagen
              </Text>
            </VStack>
          </Box>
        )}

        {/* ── Error banner ─────────────────────────── */}
        {imageError && !imageLoading && (
          <Box
            position="absolute" top={3} left="50%" transform="translateX(-50%)"
            zIndex={1000} bg="rgba(220,38,38,0.88)"
            backdropFilter="blur(8px)"
            px={4} py={2} borderRadius="lg"
            border="1px solid rgba(255,100,100,0.3)"
          >
            <HStack spacing={2}>
              <Icon as={FiAlertCircle} color="white" boxSize={3} />
              <Text fontSize="11px" color="white">Sin imagen disponible para este periodo.</Text>
            </HStack>
          </Box>
        )}

        {/* ── Map ─────────────────────────────────── */}
        <MapContainer
          center={ITCR_CENTER}
          zoom={18}
          maxZoom={22}
          zoomControl={false}
          style={{ height: '76vh', width: '100%', background: '#080808' }}
        >
          <MapResizer isActive={isActive} />
          <MapEventHandler onViewportChange={handleViewportChange} />

          <TileLayer
            url={`https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`}
            attribution='&copy; <a href="https://www.mapbox.com/">Mapbox</a>'
            tileSize={512}
            zoomOffset={-1}
            maxNativeZoom={22}
            maxZoom={22}
            opacity={isNdvi ? 0.45 : 1}
          />

          {isNdvi && (
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              opacity={0.22}
            />
          )}

          {overlayUrl && (
            <ImageOverlay
              key={overlayUrl}
              url={overlayUrl}
              bounds={bboxToBounds(overlayBounds)}
              opacity={opacity}
            />
          )}
        </MapContainer>

        {/* ── Status bar ───────────────────────────── */}
        <Box
          position="absolute" bottom={0} left={0} right={0}
          bg="rgba(0,0,0,0.72)" backdropFilter="blur(10px)"
          px={4} py={1.5} zIndex={1000}
          borderTop="1px solid rgba(255,255,255,0.05)"
        >
          <HStack justify="space-between">
            <Text fontSize="9px" color="rgba(255,255,255,0.28)" letterSpacing="0.05em">
              {isNdvi
                ? `Sentinel-2 L2A · NDVI · ${from} → ${to} · Zoom adaptativo`
                : 'Mapbox Satellite v9 · Alta resolución comercial'}
            </Text>
            <Text fontSize="9px" color="rgba(255,255,255,0.18)" letterSpacing="0.05em">
              ITCR Sede San Carlos · 10°21′N 84°30′W
            </Text>
          </HStack>
        </Box>

      </Box>

      {/* ── NDVI Statistics Section ─────────────────── */}
      {isNdvi && (
        <Box mt={6}>
          {ndviStatsLoading && (
            <HStack spacing={3} justify="center" py={8}>
              <Spinner size="sm" color="#ff8a50" />
              <Text fontSize="sm" color="rgba(255,255,255,0.4)">Cargando estadísticas NDVI…</Text>
            </HStack>
          )}
          {!ndviStatsLoading && ndviStats && (
            <NDVISection data={ndviStats} hideImageToggle />
          )}
          {!ndviStatsLoading && !ndviStats && (
            <HStack spacing={2} justify="center" py={6}>
              <Icon as={FiAlertCircle} color="rgba(255,138,80,0.6)" boxSize={4} />
              <Text fontSize="sm" color="rgba(255,255,255,0.3)">No hay estadísticas NDVI disponibles para este periodo.</Text>
            </HStack>
          )}
        </Box>
      )}
    </Box>
  );
}
