import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react';
import { FiCheckCircle } from 'react-icons/fi';

const RELEASE_NOTES_COOKIE = 'smartview_release_notes_seen';
const RELEASE_NOTES_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

const updates = [
  {
    title: 'Excel ahora también exporta radiación',
  },
  {
    title: 'Humedad relativa añadida',
  },
  {
    title: 'Punto de rocío añadido',
  },
  {
    title: 'Mejoras en el reporte especializado',
  },
];

const hasSeenReleaseNotes = (): boolean =>
  document.cookie
    .split(';')
    .map((item) => item.trim())
    .some((cookie) => cookie.startsWith(`${RELEASE_NOTES_COOKIE}=`));

const markReleaseNotesAsSeen = (): void => {
  document.cookie = `${RELEASE_NOTES_COOKIE}=1; Max-Age=${RELEASE_NOTES_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
};

export function ReleaseNotesModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasSeenReleaseNotes()) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    markReleaseNotesAsSeen();
    setIsOpen(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered size={{ base: 'full', md: 'lg' }}>
      <ModalOverlay backdropFilter="blur(5px)" bg="blackAlpha.700" />
      <ModalContent
        bg="#1A1A1A"
        border="1px solid rgba(255, 255, 255, 0.08)"
        borderRadius="2xl"
        mx={{ base: 0, md: 4 }}
      >
        <ModalHeader color="white" borderBottom="1px solid rgba(255, 255, 255, 0.06)">
          Novedades recientes
        </ModalHeader>
        <ModalCloseButton color="gray.300" mt={1} />
        <ModalBody py={6}>
          <VStack spacing={3} align="stretch">
            {updates.map((item) => (
              <Box
                key={item.title}
                border="1px solid rgba(255,255,255,0.08)"
                borderRadius="lg"
                p={3}
                bg="rgba(255,255,255,0.02)"
              >
                <Text color="white" fontWeight="600" fontSize="sm">
                  <Box as={FiCheckCircle} color="#ff8a50" display="inline-block" mr={2} />
                  {item.title}
                </Text>
              </Box>
            ))}
          </VStack>
        </ModalBody>
        <ModalFooter borderTop="1px solid rgba(255, 255, 255, 0.06)">
          <Button
            onClick={handleClose}
            bgGradient="linear(to-r, #ff8a50, #ff6b35)"
            color="white"
            _hover={{ bgGradient: 'linear(to-r, #ff6b35, #ff8a50)' }}
          >
            Entendido
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
