import {
  Box,
  VStack,
  HStack,
  Text,
  Textarea,
  Select,
  Button,
  Icon,
  IconButton,
} from '@chakra-ui/react';
import { useState } from 'react';
import { FiMessageSquare, FiX, FiStar, FiCheckCircle } from 'react-icons/fi';
import { feedbackService } from '../services/feedback.service';

const CATEGORIES = ['Sugerencia', 'Error o problema', 'Consulta', 'Otro'];

export function FeedbackWidget({ activePage }: { activePage: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState('Sugerencia');
  const [comment, setComment] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim() || rating === 0) return;
    setIsSending(true);
    try {
      await feedbackService.submit({ rating, category, comment: comment.trim() });
      setIsDone(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsDone(false);
        setRating(0);
        setCategory('Sugerencia');
        setComment('');
      }, 2500);
    } catch {
      // silently ignore — user stays on form to retry
    } finally {
      setIsSending(false);
    }
  };

  const canSubmit = comment.trim().length > 0 && rating > 0;

  return (
    <>
      {/* ── Floating tab — desktop right edge ── */}
      <Box
        display={{ base: activePage === 'Reporte IA' ? 'flex' : 'none', md: 'flex' }}
        position="fixed"
        right={0}
        top="50%"
        transform="translateY(-50%)"
        zIndex={900}
        cursor="pointer"
        onClick={() => !isOpen && setIsOpen(true)}
        sx={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        alignItems="center"
        gap={2}
        px={2}
        py={4}
        bg="#1A1A1A"
        borderLeft="1px solid rgba(255,129,68,0.35)"
        borderTop="1px solid rgba(255,129,68,0.35)"
        borderBottom="1px solid rgba(255,129,68,0.35)"
        borderTopLeftRadius="lg"
        borderBottomLeftRadius="lg"
        transition="all 0.2s ease"
        _hover={{ bg: 'rgba(255,129,68,0.08)', borderColor: 'rgba(255,129,68,0.6)' }}
        opacity={isOpen ? 0 : 1}
        pointerEvents={isOpen ? 'none' : 'auto'}
      >
        <Icon as={FiMessageSquare} color="#ff8a50" boxSize={4} sx={{ writingMode: 'horizontal-tb' }} />
        <Text
          fontSize="xs"
          fontWeight="semibold"
          letterSpacing="widest"
          textTransform="uppercase"
          color="#ff8a50"
        >
          Comentarios
        </Text>
      </Box>

      {/* ── FAB — mobile ── */}
      <IconButton
        display={{ base: activePage === 'Reporte IA' ? 'none' : 'flex', md: 'none' }}
        position="fixed"
        bottom="80px"
        right="16px"
        zIndex={900}
        aria-label="Comentarios"
        icon={<FiMessageSquare />}
        size="lg"
        borderRadius="full"
        bg="linear-gradient(135deg, #ff8a50, #ff6b35)"
        color="white"
        boxShadow="0 4px 20px rgba(255,107,53,0.4)"
        onClick={() => setIsOpen(true)}
        opacity={isOpen ? 0 : 1}
        pointerEvents={isOpen ? 'none' : 'auto'}
        transition="opacity 0.2s ease"
        _hover={{ transform: 'scale(1.08)' }}
      />

      {/* ── Slide-out panel ── */}
      <Box
        position="fixed"
        right={0}
        top={0}
        sx={{ height: '100dvh' }}
        w={{ base: '100vw', sm: '340px' }}
        zIndex={901}
        transform={isOpen ? 'translateX(0)' : 'translateX(100%)'}
        transition="transform 0.3s ease-in-out"
        display="flex"
        flexDir="column"
        bg="#111111"
        borderLeft="1px solid rgba(255,129,68,0.25)"
        boxShadow="-8px 0 40px rgba(0,0,0,0.6)"
      >
        {/* Header */}
        <HStack
          justify="space-between"
          px={5}
          py={4}
          borderBottom="1px solid rgba(255,255,255,0.07)"
          flexShrink={0}
        >
          <HStack spacing={2}>
            <Icon as={FiMessageSquare} color="#ff8a50" boxSize={4} />
            <Text fontWeight="semibold" fontSize="sm" color="white" letterSpacing="wide">
              Deja tu comentario
            </Text>
          </HStack>
          <IconButton
            aria-label="Cerrar"
            icon={<FiX />}
            variant="ghost"
            size="sm"
            color="rgba(255,255,255,0.5)"
            _hover={{ color: 'white', bg: 'rgba(255,255,255,0.07)' }}
            onClick={() => setIsOpen(false)}
          />
        </HStack>

        {/* Body */}
        {isDone ? (
          <VStack flex={1} justify="center" spacing={4} px={5}>
            <Icon as={FiCheckCircle} color="#ff8a50" boxSize={10} />
            <Text fontWeight="semibold" color="white" textAlign="center">
              Gracias por tu comentario
            </Text>
            <Text fontSize="sm" color="rgba(255,255,255,0.5)" textAlign="center">
              Tu opinión nos ayuda a mejorar la plataforma.
            </Text>
          </VStack>
        ) : (
          <VStack flex={1} overflowY="auto" px={5} py={6} spacing={5} align="stretch">
            {/* Calificación */}
            <VStack align="start" spacing={2}>
              <Text fontSize="xs" fontWeight="semibold" color="rgba(255,255,255,0.55)" letterSpacing="wider" textTransform="uppercase">
                Calificación
              </Text>
              <HStack spacing={1}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Icon
                    key={star}
                    as={FiStar}
                    boxSize={6}
                    cursor="pointer"
                    color={(hoverRating || rating) >= star ? '#ff8a50' : 'rgba(255,255,255,0.2)'}
                    fill={(hoverRating || rating) >= star ? '#ff8a50' : 'transparent'}
                    transition="color 0.15s ease, fill 0.15s ease"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                  />
                ))}
              </HStack>
            </VStack>

            {/* Categoría */}
            <VStack align="start" spacing={2}>
              <Text fontSize="xs" fontWeight="semibold" color="rgba(255,255,255,0.55)" letterSpacing="wider" textTransform="uppercase">
                Categoría
              </Text>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                size="sm"
                bg="rgba(255,255,255,0.04)"
                border="1px solid rgba(255,255,255,0.1)"
                borderRadius="lg"
                color="white"
                _hover={{ borderColor: 'rgba(255,129,68,0.4)' }}
                _focus={{ borderColor: '#ff8a50', boxShadow: 'none' }}
                sx={{ option: { bg: '#1a1a1a', color: 'white' } }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </VStack>

            {/* Comentario */}
            <VStack align="start" spacing={2} flex={1}>
              <HStack justify="space-between" w="full">
                <Text fontSize="xs" fontWeight="semibold" color="rgba(255,255,255,0.55)" letterSpacing="wider" textTransform="uppercase">
                  Comentario
                </Text>
                <Text fontSize="xs" color="rgba(255,255,255,0.3)">
                  {comment.length}/500
                </Text>
              </HStack>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 500))}
                placeholder="Escribe tu comentario aquí..."
                size="sm"
                rows={4}
                resize="none"
                bg="rgba(255,255,255,0.04)"
                border="1px solid rgba(255,255,255,0.1)"
                borderRadius="lg"
                color="white"
                _placeholder={{ color: 'rgba(255,255,255,0.25)' }}
                _hover={{ borderColor: 'rgba(255,129,68,0.4)' }}
                _focus={{ borderColor: '#ff8a50', boxShadow: 'none' }}
              />
            </VStack>
          </VStack>
        )}

        {/* Footer — send button */}
        {!isDone && (
          <Box px={5} py={4} borderTop="1px solid rgba(255,255,255,0.07)" flexShrink={0}>
            <Button
              w="full"
              size="sm"
              bgGradient="linear(to-r, #ff8a50, #ff6b35)"
              color="white"
              borderRadius="full"
              fontWeight="semibold"
              isDisabled={!canSubmit}
              isLoading={isSending}
              loadingText="Enviando..."
              onClick={handleSubmit}
              _hover={{ bgGradient: 'linear(to-r, #ff7a40, #ff5b25)', transform: 'translateY(-1px)' }}
              _disabled={{ opacity: 0.35, cursor: 'not-allowed', transform: 'none' }}
            >
              Enviar comentario
            </Button>
          </Box>
        )}
      </Box>

      {/* ── Backdrop (mobile) ── */}
      {isOpen && (
        <Box
          display={{ base: 'block', sm: 'none' }}
          position="fixed"
          inset={0}
          zIndex={900}
          bg="rgba(0,0,0,0.6)"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
