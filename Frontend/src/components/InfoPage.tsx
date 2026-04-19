// src/components/InfoPage.tsx
import { useRef, useEffect, useState } from 'react';
import {
  Box,
  Heading,
  VStack,
  HStack,
  Text,
  Link,
  Icon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  SimpleGrid
} from '@chakra-ui/react';
import { FiExternalLink, FiAlertTriangle } from 'react-icons/fi';

const TechItem = ({ name, url }: { name: string; url: string }) => (
  <Link href={url} isExternal>
    <HStack spacing={1}>
      <Text color="brand.subtext" fontSize="sm" _hover={{ color: 'white' }} transition="color 0.2s">{name}</Text>
      <Icon as={FiExternalLink} color="rgba(255,129,68,0.4)" boxSize={3} />
    </HStack>
  </Link>
);

// --- Timeline Item with scroll-triggered animation ---
const TimelineItem = ({
  number,
  title,
  isLeft,
  index,
  children,
}: {
  number: string;
  title: string;
  isLeft: boolean;
  index: number;
  children: React.ReactNode;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.12 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const delay = `${index * 0.08}s`;

  return (
    <Box ref={ref} position="relative" mb={{ base: 8, md: 14 }}>
      {/* Node — desktop (centered on the vertical line at 50%) */}
      <Box
        display={{ base: 'none', md: 'flex' }}
        position="absolute"
        left="calc(50% - 22px)"
        top="18px"
        w="44px"
        h="44px"
        borderRadius="full"
        bg="#171717"
        border="1.5px solid"
        borderColor={visible ? 'rgba(255,129,68,0.7)' : 'rgba(255,129,68,0.2)'}
        alignItems="center"
        justifyContent="center"
        zIndex={2}
        boxShadow={visible ? '0 0 22px rgba(255,129,68,0.3), inset 0 0 10px rgba(255,129,68,0.05)' : 'none'}
        style={{
          transition: `border-color 0.6s ${delay}, box-shadow 0.6s ${delay}, opacity 0.5s ${delay}, transform 0.5s ${delay}`,
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.5)',
        }}
      >
        <Text
          fontFamily="'JetBrains Mono', monospace"
          fontSize="10px"
          fontWeight="700"
          color="rgba(255,129,68,0.85)"
          letterSpacing="0.05em"
        >
          {number}
        </Text>
      </Box>

      {/* Node — mobile (on left line at ~15px) */}
      <Box
        display={{ base: 'flex', md: 'none' }}
        position="absolute"
        left="0"
        top="12px"
        w="30px"
        h="30px"
        borderRadius="full"
        bg="#171717"
        border="1px solid rgba(255,129,68,0.6)"
        alignItems="center"
        justifyContent="center"
        zIndex={2}
        boxShadow={visible ? '0 0 12px rgba(255,129,68,0.25)' : 'none'}
        style={{
          transition: `opacity 0.5s ${delay}, box-shadow 0.5s ${delay}`,
          opacity: visible ? 1 : 0,
        }}
      >
        <Text fontFamily="'JetBrains Mono', monospace" fontSize="8px" fontWeight="700" color="rgba(255,129,68,0.85)">
          {number}
        </Text>
      </Box>

      {/* Connector dot — subtle horizontal tick on desktop */}
      <Box
        display={{ base: 'none', md: 'block' }}
        position="absolute"
        top="39px"
        left={isLeft ? 'calc(50% + 22px)' : undefined}
        right={isLeft ? undefined : 'calc(50% + 22px)'}
        w="28px"
        h="1px"
        bg="rgba(255,129,68,0.25)"
        zIndex={1}
        style={{
          transition: `opacity 0.5s ${delay}`,
          opacity: visible ? 1 : 0,
        }}
      />

      {/* Card */}
      <Box
        ml={{ base: '46px', md: isLeft ? '0' : 'calc(50% + 54px)' }}
        mr={{ base: '0', md: isLeft ? 'calc(50% + 54px)' : '0' }}
        style={{
          transition: `opacity 0.65s ${delay}, transform 0.65s ${delay}`,
          opacity: visible ? 1 : 0,
          transform: visible
            ? 'translateX(0)'
            : `translateX(${isLeft ? '-28px' : '28px'})`,
        }}
      >
        <Box
          p="1px"
          borderRadius="xl"
          bgGradient="linear(to-br, rgba(255,129,68,0.35), rgba(255,255,255,0.06))"
          _hover={{ boxShadow: '0 0 24px rgba(255,129,68,0.12)' }}
          transition="box-shadow 0.3s ease"
        >
          <Box bg="#1A1A1A" borderRadius="xl" p={{ base: 4, md: 6 }}>
            {/* Number label (visible on mobile where node is tiny) */}
            <Text
              display={{ base: 'block', md: 'none' }}
              fontFamily="'JetBrains Mono', monospace"
              fontSize="9px"
              fontWeight="700"
              color="rgba(255,129,68,0.4)"
              letterSpacing="0.1em"
              mb={1}
            >
              {number}
            </Text>
            <Heading
              fontSize={{ base: 'md', md: 'lg' }}
              fontWeight="600"
              color="white"
              mb={3}
              letterSpacing="-0.01em"
            >
              {title}
            </Heading>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

// --- Page ---
export const InfoPage = () => {
  return (
    <VStack spacing={0} align="stretch">
      {/* Header */}
      <Box textAlign="center" mb={{ base: 12, md: 20 }}>
        <Heading
          as="h1"
          fontSize={{ base: '4xl', md: '6xl' }}
          fontWeight="300"
          letterSpacing="-0.03em"
          color="white"
        >
          Acerca de{' '}
          <Text as="span" fontStyle="italic" bgGradient="linear(to-r, #ffbc86, #e8722a)" bgClip="text">
            Agrotemp
          </Text>
        </Heading>
        <Text color="brand.subtext" fontSize="lg" mt={2}>
          Información detallada sobre el proyecto, su tecnología y fuentes.
        </Text>
      </Box>

      {/* Timeline */}
      <Box position="relative" maxW="900px" mx="auto" w="full" px={{ base: 0, md: 4 }}>

        {/* Vertical line */}
        <Box
          position="absolute"
          left={{ base: '14px', md: '50%' }}
          top="0"
          bottom="0"
          w={{ base: '1px', md: '2px' }}
          bgGradient="linear(to-b, transparent 0%, rgba(255,129,68,0.5) 8%, rgba(255,129,68,0.25) 88%, transparent 100%)"
          transform={{ base: 'none', md: 'translateX(-50%)' }}
          zIndex={0}
        />

        {/* 01 — El Proyecto */}
        <TimelineItem number="01" title="El Proyecto" isLeft={true} index={0}>
          <Text color="brand.subtext" lineHeight="1.8" mb={3} fontSize="sm">
            <Text as="span" color="white" fontWeight="500">Agrotemp</Text> surge para resolver una problemática común en la carrera de Agronomía: la recolección manual de datos meteorológicos. Anteriormente, los estudiantes debían transcribir información repetitiva desde el sitio web de la estación Santa Clara del IMN, un proceso tedioso y propenso a errores.
          </Text>
          <Text color="brand.subtext" lineHeight="1.8" fontSize="sm">
            Esta aplicación automatiza dicha tarea, ofreciendo una plataforma visual e interactiva para consultar condiciones actuales, analizar tendencias históricas y exportar datos.
          </Text>
        </TimelineItem>

        {/* 02 — Fuente de los Datos */}
        <TimelineItem number="02" title="Fuente de los Datos" isLeft={false} index={1}>
          <Text color="brand.subtext" lineHeight="1.8" fontSize="sm">
            La información proviene de un <Text as="span" color="white" fontWeight="500">Web Scraper</Text> especializado que monitorea continuamente la página del <Text as="span" color="white" fontWeight="500">Instituto Meteorológico Nacional (IMN)</Text>, específicamente la Estación Automática del TEC. Los datos son procesados y almacenados en <Text as="span" color="white" fontWeight="500">Firebase Firestore</Text>, convirtiendo una página estática en una API dinámica accesible en tiempo real.
          </Text>
        </TimelineItem>

        {/* 03 — Tecnología */}
        <TimelineItem number="03" title="Tecnología Utilizada" isLeft={true} index={2}>
          <HStack align="start" spacing={8} flexWrap="wrap">
            <VStack align="start" spacing={2}>
              <Text fontFamily="'JetBrains Mono', monospace" fontSize="9px" fontWeight="700" color="rgba(255,129,68,0.6)" letterSpacing="0.12em" textTransform="uppercase">Frontend</Text>
              <TechItem name="React" url="https://react.dev/" />
              <TechItem name="Vite" url="https://vitejs.dev/" />
              <TechItem name="Chakra UI" url="https://chakra-ui.com/" />
              <TechItem name="Recharts" url="https://recharts.org/" />
            </VStack>
            <VStack align="start" spacing={2}>
              <Text fontFamily="'JetBrains Mono', monospace" fontSize="9px" fontWeight="700" color="rgba(255,129,68,0.6)" letterSpacing="0.12em" textTransform="uppercase">Backend & Servicios</Text>
              <TechItem name="NestJS" url="https://nestjs.com/" />
              <TechItem name="Google Gemini AI" url="https://deepmind.google/technologies/gemini/" />
              <TechItem name="Firebase Firestore" url="https://firebase.google.com/" />
              <TechItem name="Puppeteer" url="https://pptr.dev/" />
            </VStack>
          </HStack>
        </TimelineItem>

        {/* 04 — Cómo usar */}
        <TimelineItem number="04" title="Cómo usar la aplicación" isLeft={false} index={3}>
          <VStack align="start" spacing={4}>
            <Box>
              <Text fontFamily="'JetBrains Mono', monospace" fontSize="9px" fontWeight="700" color="rgba(255,129,68,0.6)" letterSpacing="0.12em" textTransform="uppercase" mb={1}>Dashboard</Text>
              <Text color="brand.subtext" lineHeight="1.8" fontSize="sm">
                Muestra las condiciones meteorológicas actuales: temperatura, humedad, presión, viento y lluvia. Se actualiza automáticamente cada 5 minutos con el historial de las últimas horas.
              </Text>
            </Box>
            <Box>
              <Text fontFamily="'JetBrains Mono', monospace" fontSize="9px" fontWeight="700" color="rgba(255,129,68,0.6)" letterSpacing="0.12em" textTransform="uppercase" mb={2}>Reporte IA — paso a paso</Text>
              <VStack align="start" spacing={1.5}>
                {[
                  'Selecciona un cultivo de referencia (o personalizado).',
                  'Elige el rango de fechas a analizar.',
                  'Presiona "Generar Reporte" y espera el análisis.',
                  'Consulta métricas, gráficas y el análisis narrativo.',
                  'Usa el chat para preguntas de seguimiento.',
                ].map((step, i) => (
                  <HStack key={i} align="start" spacing={2}>
                    <Text fontFamily="'JetBrains Mono', monospace" fontSize="9px" color="rgba(255,129,68,0.5)" mt="3px" flexShrink={0}>{String(i + 1).padStart(2, '0')}</Text>
                    <Text color="brand.subtext" fontSize="sm" lineHeight="1.7">{step}</Text>
                  </HStack>
                ))}
              </VStack>
            </Box>
            <Box>
              <Text fontFamily="'JetBrains Mono', monospace" fontSize="9px" fontWeight="700" color="rgba(255,129,68,0.6)" letterSpacing="0.12em" textTransform="uppercase" mb={1}>Exportar Excel</Text>
              <Text color="brand.subtext" lineHeight="1.8" fontSize="sm">
                Desde el botón "Exportar" en la barra superior descarga un <Text as="span" color="white" fontWeight="500">.xlsx</Text> con datos horarios de cualquier rango de fechas.
              </Text>
            </Box>
          </VStack>
        </TimelineItem>

        {/* 05 — Métricas */}
        <TimelineItem number="05" title="Métricas del Reporte explicadas" isLeft={true} index={4}>
          <VStack align="start" spacing={3}>
            {[
              {
                label: 'GDD — Grados Día de Desarrollo',
                text: 'Energía térmica acumulada en el periodo. Se calcula como la diferencia entre la temperatura media diaria y la temperatura base del cultivo. No indica etapa fenológica sin conocer la fecha de siembra.',
              },
              {
                label: 'ETo — Evapotranspiración',
                text: 'Estimación del agua que suelo y plantas devuelven a la atmósfera. Calculada con Hargreaves-Samani a partir de temperaturas y radiación solar.',
              },
              {
                label: 'Balance Hídrico',
                text: 'Lluvia acumulada menos ETo del periodo. Negativo = déficit hídrico (posible necesidad de riego). Positivo = excedente.',
              },
              {
                label: 'Riesgo Fúngico',
                text: 'BAJO / MEDIO / ALTO según la proporción de días con lluvia y temperatura entre 18–25°C, condiciones ideales para hongos patógenos.',
              },
              {
                label: 'Estrés Térmico',
                text: 'Horas en que la temperatura superó el máximo óptimo (calor) o cayó por debajo de la base (frío) del cultivo seleccionado.',
              },
              {
                label: 'Ventana de Pulverización',
                text: 'Horas con viento < 10 km/h y sin precipitación: condiciones ideales para aplicar agroquímicos con mínima deriva.',
              },
            ].map((m, i) => (
              <Box key={i} pl={3} borderLeft="1px solid rgba(255,129,68,0.2)">
                <Text fontSize="xs" fontWeight="600" color="rgba(255,129,68,0.8)" mb={0.5}>{m.label}</Text>
                <Text color="brand.subtext" fontSize="sm" lineHeight="1.7">{m.text}</Text>
              </Box>
            ))}
          </VStack>
        </TimelineItem>

        {/* 06 — Cómo funciona la IA */}
        <TimelineItem number="06" title="Cómo funciona el Reporte IA" isLeft={false} index={5}>
          <VStack align="start" spacing={3}>
            <Text color="brand.subtext" lineHeight="1.8" fontSize="sm">
              Combina dos capas: <Text as="span" color="white" fontWeight="500">cálculo matemático</Text> con datos reales de la estación y <Text as="span" color="white" fontWeight="500">análisis narrativo</Text> generado por Google Gemini 2.5 Flash.
            </Text>
            <Text color="brand.subtext" lineHeight="1.8" fontSize="sm">
              El backend calcula GDD, ETo, balance hídrico, riesgo fúngico, horas de estrés y ventanas de pulverización. Esas métricas se envían a Gemini con un prompt especializado para obtener una interpretación en lenguaje natural.
            </Text>
            <Box w="full" bg="rgba(255,129,68,0.05)" border="1px solid rgba(255,129,68,0.18)" borderRadius="lg" p={4}>
              <HStack mb={3}>
                <Icon as={FiAlertTriangle} color="rgba(255,129,68,0.7)" boxSize={3.5} />
                <Text fontFamily="'JetBrains Mono', monospace" fontSize="9px" fontWeight="700" color="rgba(255,129,68,0.6)" letterSpacing="0.12em" textTransform="uppercase">Limitaciones del análisis</Text>
              </HStack>
              <VStack align="start" spacing={2}>
                {[
                  'La IA no conoce la fecha de siembra ni la variedad, por lo que no afirma la etapa fenológica.',
                  'Los GDD son referencia térmica del periodo, no indicador del estado del cultivo.',
                  'Solo considera datos climáticos. No incluye tipo de suelo, pendiente ni historial fitosanitario.',
                  'El chat recuerda el hilo de conversación actual, pero se reinicia con un nuevo reporte.',
                ].map((item, i) => (
                  <HStack key={i} align="start" spacing={2}>
                    <Box w="3px" h="3px" borderRadius="full" bg="rgba(255,129,68,0.5)" mt="6px" flexShrink={0} />
                    <Text color="brand.subtext" fontSize="sm" lineHeight="1.7">{item}</Text>
                  </HStack>
                ))}
              </VStack>
            </Box>
          </VStack>
        </TimelineItem>

        {/* 07 — Cultivos */}
        <TimelineItem number="07" title="Cultivos disponibles y parámetros" isLeft={true} index={6}>
          <VStack align="start" spacing={3}>
            <Text color="brand.subtext" fontSize="sm" lineHeight="1.7">
              Temperaturas base y máxima ampliamente aceptadas en agronomía. La opción <Text as="span" color="white" fontWeight="500">"Personalizado"</Text> permite usar los valores propios de cualquier cultivo.
            </Text>
            <Box overflowX="auto" w="full">
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th color="rgba(255,129,68,0.7)" borderColor="rgba(255,255,255,0.06)" fontSize="xs" fontFamily="'JetBrains Mono', monospace" letterSpacing="0.08em">Cultivo</Th>
                    <Th color="rgba(255,129,68,0.7)" borderColor="rgba(255,255,255,0.06)" isNumeric fontSize="xs" fontFamily="'JetBrains Mono', monospace" letterSpacing="0.08em">Base (°C)</Th>
                    <Th color="rgba(255,129,68,0.7)" borderColor="rgba(255,255,255,0.06)" isNumeric fontSize="xs" fontFamily="'JetBrains Mono', monospace" letterSpacing="0.08em">Máx. Óptima (°C)</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {[
                    { name: 'Maíz', base: 10, max: 30 },
                    { name: 'Trigo', base: 5, max: 25 },
                    { name: 'Soya', base: 10, max: 30 },
                    { name: 'Tomate', base: 10, max: 28 },
                    { name: 'Papa', base: 7, max: 25 },
                    { name: 'Arroz', base: 10, max: 35 },
                    { name: 'Café', base: 18, max: 25 },
                    { name: 'Frijol', base: 10, max: 28 },
                  ].map(c => (
                    <Tr key={c.name} _hover={{ bg: 'rgba(255,255,255,0.03)' }} transition="background 0.15s">
                      <Td color="brand.subtext" borderColor="rgba(255,255,255,0.05)" fontSize="sm">{c.name}</Td>
                      <Td color="brand.subtext" borderColor="rgba(255,255,255,0.05)" isNumeric fontSize="sm">{c.base}</Td>
                      <Td color="brand.subtext" borderColor="rgba(255,255,255,0.05)" isNumeric fontSize="sm">{c.max}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </VStack>
        </TimelineItem>

        {/* 08 — FAQ */}
        <TimelineItem number="08" title="Preguntas frecuentes" isLeft={false} index={7}>
          <VStack align="start" spacing={4}>
            {[
              {
                q: '¿Con qué frecuencia se actualizan los datos?',
                a: 'El Dashboard se actualiza cada 5 minutos. Los datos de la estación son recolectados por el scraper con frecuencia horaria.',
              },
              {
                q: '¿Los datos son en tiempo real?',
                a: 'Casi en tiempo real. Hay un desfase de ~1 hora entre la medición en la estación física y su publicación en el IMN.',
              },
              {
                q: '¿Qué hago si no aparecen datos en una fecha?',
                a: 'Puede deberse a una interrupción de la estación o el scraper. Si persiste más de 24 h, la estación pudo estar fuera de servicio.',
              },
              {
                q: '¿El Reporte IA reemplaza a un agrónomo?',
                a: 'No. Es una herramienta de apoyo basada en datos climáticos. No sustituye el criterio profesional ni el conocimiento del cultivo en campo.',
              },
              {
                q: '¿Puedo usar la app para cultivos no listados?',
                a: 'Sí. La opción "Personalizado" permite ingresar manualmente la temperatura base y máxima de cualquier cultivo.',
              },
            ].map((item, i) => (
              <Box key={i}>
                <Text fontSize="sm" fontWeight="600" color="white" mb={1}>{item.q}</Text>
                <Text color="brand.subtext" fontSize="sm" lineHeight="1.8">{item.a}</Text>
              </Box>
            ))}
          </VStack>
        </TimelineItem>

        {/* 09 — Limitaciones */}
        <TimelineItem number="09" title="Limitaciones conocidas" isLeft={true} index={8}>
          <VStack align="start" spacing={3}>
            <Text color="brand.subtext" fontSize="sm" lineHeight="1.7">
              Agrotemp es un proyecto en desarrollo activo. Limitaciones a tener en cuenta:
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2.5} w="full">
              {[
                'Una sola estación. No representa variabilidad espacial del lote.',
                'ETo con Hargreaves-Samani simplificado. Penman-Monteith daría mayor precisión.',
                'Riesgo fúngico sin humedad relativa ni horas de mojado foliar.',
                'Ventana de pulverización sin HR ni temperatura de inversión.',
                'Sin soporte multi-parcela ni multi-usuario por el momento.',
                'El análisis IA puede variar entre consultas por la naturaleza generativa del modelo.',
              ].map((text, i) => (
                <HStack
                  key={i}
                  align="start"
                  spacing={2.5}
                  bg="rgba(255,129,68,0.04)"
                  border="1px solid rgba(255,129,68,0.1)"
                  borderRadius="lg"
                  p={3}
                >
                  <Icon as={FiAlertTriangle} color="rgba(255,129,68,0.45)" boxSize={3.5} mt={0.5} flexShrink={0} />
                  <Text color="brand.subtext" fontSize="sm" lineHeight="1.6">{text}</Text>
                </HStack>
              ))}
            </SimpleGrid>
          </VStack>
        </TimelineItem>

        {/* 10 — Desarrollado por */}
        <TimelineItem number="10" title="Desarrollado por" isLeft={false} index={9}>
          <Text color="brand.subtext" lineHeight="1.8" fontSize="sm">
            Este proyecto fue creado con dedicación por{' '}
            <Text as="span" color="white" fontWeight="500">Bayron Alpízar</Text>.
            Puedes encontrar más de mi trabajo y contactarme a través de mis perfiles profesionales.
          </Text>
          <Link
            href="https://bayronaq.org/"
            isExternal
            display="inline-flex"
            alignItems="center"
            gap={2}
            mt={3}
            px={4}
            py={2}
            borderRadius="full"
            border="1px solid rgba(255,129,68,0.35)"
            color="#ff8a50"
            fontSize="sm"
            fontWeight="medium"
            _hover={{ bg: 'rgba(255,129,68,0.08)', borderColor: 'rgba(255,129,68,0.6)', textDecoration: 'none' }}
            transition="all 0.2s ease"
          >
            <Icon as={FiExternalLink} boxSize={3.5} />
            bayronaq.org
          </Link>
        </TimelineItem>

      </Box>
    </VStack>
  );
};
