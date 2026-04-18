// src/components/Header.tsx
import {
  Box,
  VStack,
  Text,
  Heading,
  Button,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  FormLabel,
  HStack,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerBody,
  DrawerCloseButton,
  IconButton,
} from '@chakra-ui/react';
import { weatherService } from '../services/weather.service';
import { useState } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import "../styles/datepicker.css";
import { FiDownload, FiActivity, FiMenu } from 'react-icons/fi';

interface HeaderProps {
  isVisible: boolean;
  activePage: string;
  setActivePage: (page: string) => void;
  isScrolled: boolean;
}

const NAV_ITEMS = [
  { name: 'Reporte IA', label: 'Reporte IA' },
  { name: 'Dashboard', label: 'Dashboard' },
  { name: 'Parcelas', label: 'Parcelas' },
  { name: 'Info', label: 'Info' },
];

export const Header = ({ activePage, setActivePage }: HeaderProps) => {
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isMobileOpen, onOpen: onMobileOpen, onClose: onMobileClose } = useDisclosure();
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
      toast({ title: 'Error', description: 'Por favor seleccione ambas fechas', status: 'error', duration: 3000, isClosable: true });
      return;
    }
    setIsLoading(true);
    try {
      const startDateStr = startDate.toISOString().split('T')[0] + 'T00:00:00.000Z';
      const endDateStr = endDate.toISOString().split('T')[0] + 'T23:59:59.999Z';
      const result = await weatherService.downloadHourlyData(startDateStr, endDateStr);
      if (result.success) {
        toast({ title: 'Éxito', description: 'Los datos se han descargado correctamente', status: 'success', duration: 3000, isClosable: true });
        onClose();
      }
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'No se pudieron descargar los datos', status: 'error', duration: 3000, isClosable: true });
    } finally {
      setIsLoading(false);
    }
  };

  const NavItems = ({ onNavigate }: { onNavigate?: () => void }) => (
    <VStack spacing={0.5} align="stretch" px={3} flex={1}>
      {NAV_ITEMS.map(({ name, label }) => {
        const isActive = name === activePage;
        return (
          <Box
            key={name}
            position="relative"
            onClick={() => { setActivePage(name); onNavigate?.(); }}
            cursor="pointer"
            role="group"
          >
            {isActive && (
              <Box
                position="absolute"
                left={0}
                top="50%"
                transform="translateY(-50%)"
                w="2px"
                h="60%"
                borderRadius="full"
                bg="linear-gradient(to bottom, #ff8a50, #ff6b35)"
                boxShadow="0 0 8px rgba(255,107,53,0.7)"
              />
            )}
            <Box
              pl={isActive ? 5 : 4}
              pr={4}
              py={2.5}
              borderRadius="lg"
              bg={isActive ? 'rgba(255,138,80,0.08)' : 'transparent'}
              border="1px solid"
              borderColor={isActive ? 'rgba(255,138,80,0.18)' : 'transparent'}
              transition="all 0.15s ease"
              _groupHover={!isActive ? { bg: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.06)' } : {}}
            >
              <Text
                fontSize="sm"
                fontWeight={isActive ? '500' : '400'}
                color={isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)'}
                transition="color 0.15s"
                _groupHover={!isActive ? { color: 'rgba(255,255,255,0.75)' } : {}}
                letterSpacing="-0.01em"
              >
                {label}
              </Text>
            </Box>
          </Box>
        );
      })}
    </VStack>
  );

  return (
    <>
      {/* ── Barra superior móvil ─────────────────────── */}
      <Box
        display={{ base: 'flex', md: 'none' }}
        position="fixed"
        top={0}
        left={0}
        right={0}
        h="56px"
        zIndex={1000}
        bg="rgba(15, 15, 15, 0.97)"
        borderBottom="1px solid rgba(255, 255, 255, 0.06)"
        alignItems="center"
        justifyContent="space-between"
        px={4}
      >
        <HStack spacing={2.5} align="center">
          <Box
            bg="linear-gradient(135deg, #ff8a50, #ff6b35)"
            p={1.5}
            borderRadius="8px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            boxShadow="0 0 12px rgba(255,107,53,0.35)"
          >
            <Box color="white" fontSize="13px">🌦️</Box>
          </Box>
          <Heading
            size="sm"
            color="white"
            fontFamily="'Fraunces', serif"
            fontWeight="500"
            letterSpacing="-0.02em"
          >
            Agrotemp
          </Heading>
        </HStack>
        <IconButton
          aria-label="Abrir menú"
          icon={<FiMenu />}
          variant="ghost"
          color="rgba(255,255,255,0.6)"
          _hover={{ bg: 'rgba(255,255,255,0.08)', color: 'white' }}
          onClick={onMobileOpen}
          size="sm"
        />
      </Box>

      {/* ── Drawer móvil ─────────────────────────────── */}
      <Drawer isOpen={isMobileOpen} placement="left" onClose={onMobileClose} size="xs">
        <DrawerOverlay backdropFilter="blur(4px)" bg="blackAlpha.600" />
        <DrawerContent bg="rgba(15, 15, 15, 0.99)" borderRight="1px solid rgba(255,255,255,0.06)" maxW="220px">
          <DrawerCloseButton color="rgba(255,255,255,0.5)" mt={1} />
          <DrawerBody px={0} pt={12} pb={6} display="flex" flexDirection="column">
            <Box mx={5} mb={5} h="1px" bg="rgba(255,255,255,0.06)" />
            <Box px={3} mb={2}>
              <Text fontSize="9px" color="rgba(255,255,255,0.2)" letterSpacing="0.12em" textTransform="uppercase" px={2} mb={1}>
                Navegación
              </Text>
            </Box>
            <NavItems onNavigate={onMobileClose} />
            <Box px={4} pt={4}>
              <Box h="1px" bg="rgba(255,255,255,0.06)" mb={4} />
              <Button
                size="sm"
                leftIcon={<FiDownload size={12} />}
                onClick={() => { onMobileClose(); onOpen(); }}
                w="full"
                bg="rgba(255,255,255,0.05)"
                color="rgba(255,255,255,0.55)"
                border="1px solid rgba(255,255,255,0.08)"
                borderRadius="lg"
                fontSize="xs"
                fontWeight="400"
                _hover={{ bg: 'rgba(255,138,80,0.1)', borderColor: 'rgba(255,138,80,0.3)', color: 'rgba(255,255,255,0.85)' }}
              >
                Descargar datos
              </Button>
            </Box>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* ── Sidebar desktop ──────────────────────────── */}
      <Box
        as="aside"
        position="fixed"
        left={0}
        top={0}
        h="100vh"
        w="210px"
        zIndex={1000}
        display={{ base: 'none', md: 'flex' }}
        flexDirection="column"
        // Fondo con sutil ruido/textura via gradientes apilados
        bg="rgba(15, 15, 15, 0.97)"
        borderRight="1px solid rgba(255, 255, 255, 0.06)"
        // Línea decorativa naranja muy sutil en el borde derecho superior
        _before={{
          content: '""',
          position: 'absolute',
          top: 0,
          right: '-1px',
          w: '1px',
          h: '80px',
          bgGradient: 'linear(to-b, transparent, rgba(255,138,80,0.6), transparent)',
          zIndex: 1,
        }}
      >
        {/* ── Logo ───────────────────────────────── */}
        <Box px={5} pt={7} pb={6}>
          <HStack spacing={2.5} align="center">
            <Box
              bg="linear-gradient(135deg, #ff8a50, #ff6b35)"
              p={1.5}
              borderRadius="8px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexShrink={0}
              boxShadow="0 0 12px rgba(255,107,53,0.35)"
            >
              <Box color="white" fontSize="13px">🌦️</Box>
            </Box>
            <Box>
              <Heading
                size="sm"
                color="white"
                fontFamily="'Fraunces', serif"
                fontWeight="500"
                letterSpacing="-0.02em"
                lineHeight={1}
              >
                Agrotemp
              </Heading>
              <HStack spacing={1.5} mt={0.5}>
                <Box
                  w="5px"
                  h="5px"
                  borderRadius="full"
                  bg="#48c78e"
                  flexShrink={0}
                  sx={{ animation: 'livePulse 2.2s ease-in-out infinite' }}
                />
                <Text fontSize="9px" color="rgba(255,255,255,0.3)" letterSpacing="0.08em" textTransform="uppercase">
                  En vivo
                </Text>
              </HStack>
            </Box>
          </HStack>
        </Box>

        {/* ── Separador ──────────────────────────── */}
        <Box mx={5} mb={5} h="1px" bg="rgba(255,255,255,0.06)" />

        {/* ── Sección nav ────────────────────────── */}
        <Box px={3} mb={2}>
          <Text fontSize="9px" color="rgba(255,255,255,0.2)" letterSpacing="0.12em" textTransform="uppercase" px={2} mb={1}>
            Navegación
          </Text>
        </Box>

        {/* ── Nav items ──────────────────────────── */}
        <NavItems />

        {/* ── Fondo degradado inferior ────────────── */}
        <Box px={4} pb={6} pt={4}>
          <Box h="1px" bg="rgba(255,255,255,0.06)" mb={4} />

          {/* Indicador de estado */}
          <HStack spacing={2} mb={4} px={1}>
            <Box as={FiActivity} color="rgba(72,199,142,0.7)" boxSize={3} />
            <Text fontSize="10px" color="rgba(255,255,255,0.25)" letterSpacing="0.04em">
              Estación activa
            </Text>
          </HStack>

          <Button
            size="sm"
            leftIcon={<FiDownload size={12} />}
            onClick={onOpen}
            w="full"
            bg="rgba(255,255,255,0.05)"
            color="rgba(255,255,255,0.55)"
            border="1px solid rgba(255,255,255,0.08)"
            borderRadius="lg"
            fontSize="xs"
            fontWeight="400"
            _hover={{
              bg: 'rgba(255,138,80,0.1)',
              borderColor: 'rgba(255,138,80,0.3)',
              color: 'rgba(255,255,255,0.85)',
            }}
            transition="all 0.2s"
          >
            Descargar datos
          </Button>
        </Box>
      </Box>

      {/* ── Modal ───────────────────────────────────── */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay backdropFilter="blur(5px)" bg="blackAlpha.700" />
        <ModalContent
          bg="#1A1A1A"
          mx={4}
          border="1px solid rgba(255, 255, 255, 0.1)"
          borderRadius="xl"
          boxShadow="0 10px 40px rgba(0, 0, 0, 0.5)"
        >
          <ModalHeader color="white" borderBottom="1px solid rgba(255, 255, 255, 0.05)">
            Descargar Datos Históricos
          </ModalHeader>
          <ModalCloseButton color="white" mt={1} />
          <ModalBody py={6}>
            <VStack spacing={5}>
              <Box w="full">
                <FormLabel color="gray.300" fontSize="sm">Fecha inicial</FormLabel>
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
                <FormLabel color="gray.300" fontSize="sm">Fecha final</FormLabel>
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
          <ModalFooter borderTop="1px solid rgba(255, 255, 255, 0.05)">
            <Button variant="ghost" mr={3} onClick={onClose} color="gray.300" _hover={{ bg: 'whiteAlpha.100', color: 'white' }}>
              Cancelar
            </Button>
            <Button
              bgGradient="linear(to-r, #ff8a50, #ff6b35)"
              color="white"
              _hover={{ bgGradient: 'linear(to-r, #ff6b35, #ff8a50)', transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(255, 138, 80, 0.3)' }}
              _active={{ transform: 'translateY(0)' }}
              onClick={handleExport}
              isLoading={isLoading}
              loadingText="Descargando..."
            >
              Descargar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
