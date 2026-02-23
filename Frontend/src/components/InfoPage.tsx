// src/components/InfoPage.tsx
import {
  Box,
  Heading,
  VStack,
  Text,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  HStack,
  Link,
  Icon
} from '@chakra-ui/react';
import { FiExternalLink } from 'react-icons/fi';

// Componente para un ítem de tecnología (sin cambios)
const TechItem = ({ name, url }: { name: string; url: string }) => (
  <Link href={url} isExternal>
    <HStack>
      <Text color="brand.subtext" _hover={{ color: 'brand.text' }}>{name}</Text>
      <Icon as={FiExternalLink} color="brand.mutedText" />
    </HStack>
  </Link>
);

// --- Componente StyledAccordionItem para replicar el estilo de las tarjetas ---
const StyledAccordionItem = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box
    p="1px" // Borde con gradiente
    borderRadius="xl"
    bgGradient="linear(to-b, rgba(255, 129, 68, 0.4), rgba(255, 255, 255, 0.1))"
    transition="all 0.3s ease-in-out"
    _hover={{
      boxShadow: 'glow', // Glow sutil al hacer hover
    }}
  >
     <AccordionItem border="none" bg="#1A1A1A" borderRadius="xl">
      <h2>
        <AccordionButton 
            _expanded={{ bg: 'rgba(255, 129, 68, 0.1)', color: 'brand.orangeLight' }} 
            borderRadius="xl"
            _hover={{ bg: 'rgba(255, 255, 255, 0.05)' }}
        >
          <Box as="span" flex='1' textAlign='left' fontWeight="bold" fontSize="lg">
            {title}
          </Box>
          <AccordionIcon />
        </AccordionButton>
      </h2>
      <AccordionPanel pb={4}>
        {children}
      </AccordionPanel>
    </AccordionItem>
  </Box>
);

export const InfoPage = () => {
  return (
    <VStack spacing={8} align="stretch">
      <Box textAlign="center">
        <Heading as="h1" fontSize={{ base: "4xl", md: "6xl" }} bgGradient="linear(to-r, #ff9a56, #ff6b35, #e55a2b)" bgClip="text">
          Acerca de Agrotemp
        </Heading>
        <Text color="brand.subtext" fontSize="lg" mt={2}>
          Información detallada sobre el proyecto, su tecnología y fuentes.
        </Text>
      </Box>

      <Box maxW="800px" mx="auto" w="full">
        <Accordion allowToggle defaultIndex={[0]} display="flex" flexDirection="column" gap={4}>
          
          <StyledAccordionItem title="El Proyecto">
            <Text color="brand.subtext" lineHeight="1.7" mb={4}>
              <b>Agrotemp</b> surge para resolver una problemática común en la carrera de Agronomía: la recolección manual de datos meteorológicos. Anteriormente, los estudiantes debían transcribir información repetitiva desde el sitio web de la estación Santa Clara del IMN, un proceso tedioso y propenso a errores.
            </Text>
            <Text color="brand.subtext" lineHeight="1.7">
              Esta aplicación automatiza dicha tarea, ofreciendo una plataforma visual e interactiva que permite consultar condiciones actuales, analizar tendencias históricas y exportar datos, liberando a los usuarios para que se enfoquen en el análisis y no en la recolección.
            </Text>
          </StyledAccordionItem>

          <StyledAccordionItem title="Fuente de los Datos">
            <Text color="brand.subtext" lineHeight="1.7">
              La información proviene de un <b>Web Scraper</b> especializado que actúa como puente entre la fuente original y esta aplicación. Este microservicio monitorea continuamente la página del <b>Instituto Meteorológico Nacional (IMN)</b>, especificamente la Estación Automática del TEC, de esta forma se procesan las tablas de datos climática de la estación y las almacena de forma estructurada en una base de datos en la nube (<b>Firebase Firestore</b>). Esto convierte una página web estática en una API dinámica y accesible para el consumo de datos en tiempo real.
            </Text>
          </StyledAccordionItem>

          <StyledAccordionItem title="Tecnología Utilizada">
            <VStack align="start" spacing={2}>
              <Text fontWeight="bold" color="brand.orangeLight" fontSize="sm">Frontend</Text>
              <TechItem name="React" url="https://react.dev/" />
              <TechItem name="Vite" url="https://vitejs.dev/" />
              <TechItem name="Chakra UI" url="https://chakra-ui.com/" />
              <TechItem name="Chart.js" url="https://www.chartjs.org/" />
              
              <Text fontWeight="bold" color="brand.orangeLight" fontSize="sm" mt={2}>Backend & Servicios</Text>
              <TechItem name="NestJS" url="https://nestjs.com/" />
              <TechItem name="Google Cloud Platform" url="https://cloud.google.com/" />
              <TechItem name="Firebase" url="https://firebase.google.com/" />
              <TechItem name="Puppeteer (Web Scraping)" url="https://pptr.dev/" />
            </VStack>
          </StyledAccordionItem>

          <StyledAccordionItem title="Desarrollado por">
            <Text color="brand.subtext" lineHeight="1.7">
              Este proyecto fue creado con dedicación por <b>Bayron Alpízar</b>. Puedes encontrar más de mi trabajo y contactarme a través de mis perfiles profesionales.
            </Text>
          </StyledAccordionItem>

        </Accordion>
      </Box>
    </VStack>
  );
};