// src/components/Header.tsx
import {
  Flex,
  Heading,
  HStack,
  Link,
  Box,
  Text,
  Button,
  IconButton,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  VStack,
  FormLabel,
  Menu,
  MenuButton,
  MenuList,
  MenuItem
} from '@chakra-ui/react';
import { weatherService } from '../services/weather.service';
import { useState } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import "../styles/datepicker.css";
import { FiDownload, FiMenu } from 'react-icons/fi';


interface HeaderProps { 
    isVisible: boolean; 
    activePage: string; 
    setActivePage: (page: string) => void; 
    isScrolled: boolean;
}

// ✅ MEJORA: Componente NavLink actualizado con el nuevo estilo para el estado activo (borde degradado)
const NavLink = ({ name, activePage, setActivePage }: { name: string; activePage: string; setActivePage: (page: string) => void; }) => {
    const isActive = name === activePage;
    if (isActive) {
        return (
          // Contenedor exterior para el borde degradado
          <Box
            p="1px" // Grosor del borde
            borderRadius="lg" // El radio del borde del contenedor exterior
            bgGradient="linear(to-b, rgba(255, 129, 68, 0.4), rgba(255, 255, 255, 0.1))"
            // Hacemos el Box exterior clickeable para todo el área del botón
            onClick={() => setActivePage(name)} 
            cursor="pointer"
            transition="all 0.2s ease-in-out" // Transición para el hover
            _hover={{
              transform: 'translateY(-2px)', // Un ligero levantamiento al hacer hover
              boxShadow: 'glow', // Opcional: añade el efecto de sombra que ya tienes en otros componentes
            }}
          >
            {/* Contenedor interior con el color de fondo sólido */}
            <Box 
              bg="#2f231c" // ✅ Fondo sólido con el color especificado
              px={6} // Padding horizontal
              py={2}   // Padding vertical
              borderRadius="lg" // El radio del borde del contenedor interior debe coincidir
              display="flex" // Para centrar el texto si fuera necesario
              alignItems="center" // Para centrar el texto verticalmente
              justifyContent="center" // Para centrar el texto horizontalmente
            >
              {/* ✅ Color de texto blanco */}
              <Text color="white" fontSize="md" fontWeight="medium">{name}</Text>
            </Box>
          </Box>
        );
      }
      return (
        <Link 
          px={6} // Consistencia en el padding para que no cambie al activarse
          py={2}   // Consistencia en el padding
          color="rgba(255, 255, 255, 0.8)" 
          fontSize="md" // Consistencia en el tamaño de fuente
          fontWeight="medium" 
          _hover={{ color: 'white', textDecoration: 'none' }} 
          onClick={() => setActivePage(name)}
          borderRadius="lg" // También para los inactivos, para que la transición sea suave
          transition="all 0.2s ease-in-out" // Transición para el hover
        >
          {name}
        </Link>
      );
};


export const Header = ({ isVisible, activePage, setActivePage }: HeaderProps) => {
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const handleDateSelect = (date: Date | null) => {
    if (!startDate) {
      setStartDate(date);
    } else if (!endDate && date && date > startDate) {
      setEndDate(date);
    } else {
      setStartDate(date);
      setEndDate(null);
    }
  };

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Por favor seleccione ambas fechas",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      // Asegurarnos de que las fechas estén en el formato correcto y ajustadas a la zona horaria local
      const startDateStr = startDate.toISOString().split('T')[0] + 'T00:00:00.000Z';
      const endDateStr = endDate.toISOString().split('T')[0] + 'T23:59:59.999Z';

      // Llamar al servicio de descarga
      const result = await weatherService.downloadHourlyData(
        startDateStr,
        endDateStr
      );

      if (result.success) {
        toast({
          title: "Éxito",
          description: "Los datos se han descargado correctamente",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        onClose();
      }
    } catch (error) {
      console.error('Error al descargar datos:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron descargar los datos",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
  <Flex
    as="header"
    w="100%"
    py={{ base: 3, md: 6 }}
    px={{ base: 4, md: 12 }}
    justifyContent="center"
    alignItems="center"
    bg="transparent"
    position="fixed"
    top={{ base: 1, md: 4 }}
    left="50%"
    transform="translateX(-50%)"
    zIndex={1000}
    opacity={isVisible ? 1 : 0}
    transition="opacity 0.3s ease-in-out"
  >
    <Flex
      py={{ base: 2, md: 3 }}
      px={{ base: 3, md: 6 }}
      w={{ base: "100%", md: "800px" }}
      bg="rgba(41, 41, 41, 0.8)"
      backdropFilter="blur(10px)"
      border="1px solid rgba(255, 255, 255, 0.1)"
      borderRadius="xl"
      alignItems="center"
      justifyContent="space-between"
      boxShadow="glow"
      transition="all 0.4s ease-in-out" 
    >
      {/* Logo */}
      <Flex alignItems="center" gap={2}>
         <Box 
          bg="linear-gradient(135deg, #ff8a50, #ff6b35)"
          p={1.5}
          borderRadius="md"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Box color="white" fontSize="sm" fontWeight="bold">🌦️</Box>
        </Box>
        <Heading size="sm" color="white" fontWeight="semibold" whiteSpace="nowrap">
          Agrotemp
        </Heading>
      </Flex>

      {/* Navegación desktop */}
      <HStack spacing={4} display={{ base: "none", md: "flex" }}>
        <NavLink name="Reporte IA" activePage={activePage} setActivePage={setActivePage} />
        <NavLink name="Dashboard" activePage={activePage} setActivePage={setActivePage} />
        <NavLink name="Info" activePage={activePage} setActivePage={setActivePage} />
        
        <Button
            variant="outline"
            size="sm"
            leftIcon={<FiDownload />}
            onClick={onOpen}
        >
            Descargar Datos
        </Button>
      </HStack>

      {/* Navegación móvil */}
      <HStack spacing={2} display={{ base: "flex", md: "none" }}>
        <IconButton
          aria-label="Descargar datos"
          icon={<FiDownload />}
          variant="outline"
          size="sm"
          onClick={onOpen}
        />

        <Menu>
          <MenuButton
            as={IconButton}
            aria-label="Abrir menú"
            icon={<FiMenu />}
            size="sm"
            variant="outline"
          />
          <MenuList bg="#1A1A1A" borderColor="rgba(255, 255, 255, 0.15)" minW="180px">
            <MenuItem
              bg="transparent"
              color="white"
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={() => setActivePage('Reporte IA')}
            >
              Reporte IA
            </MenuItem>
            <MenuItem
              bg="transparent"
              color="white"
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={() => setActivePage('Dashboard')}
            >
              Dashboard
            </MenuItem>
            <MenuItem
              bg="transparent"
              color="white"
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={() => setActivePage('Info')}
            >
              Info
            </MenuItem>
          </MenuList>
        </Menu>
      </HStack>
    </Flex>

    {/* Modal de selección de fechas */}
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent bg="gray.800" mx={4}>
        <ModalHeader color="white">Seleccionar rango de fechas</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <Box w="full">
              <FormLabel color="white">Fecha inicial</FormLabel>
              <DatePicker
                selected={startDate}
                onChange={handleDateSelect}
                dateFormat="dd/MM/yyyy"
                placeholderText="Seleccione fecha inicial"
                maxDate={new Date()}
                className="date-picker"
              />
            </Box>
            <Box w="full">
              <FormLabel color="white">Fecha final</FormLabel>
              <DatePicker
                selected={endDate}
                onChange={handleDateSelect}
                dateFormat="dd/MM/yyyy"
                placeholderText="Seleccione fecha final"
                minDate={startDate || undefined}
                maxDate={new Date()}
                className="date-picker"
              />
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleExport}
            isLoading={isLoading}
            loadingText="Descargando..."
          >
            Descargar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  </Flex>
)};
