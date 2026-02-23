import { Box, HStack, Text, VStack } from '@chakra-ui/react';

// Logos exactos como aparecen en la imagen
const logos = ["nAI", "ANTHROPIC", "🦄 anima", "⚡ replit", "bolt", "🔄 OpenAI"];

export const TrustedBy = () => (
  <VStack spacing={12} py={20} w="100%">
    <Text color="rgba(255, 255, 255, 0.6)" fontSize="sm" fontWeight="medium">
      Helping ambitious teams achieve more
    </Text>
    
    {/* Contenedor principal que aplica el efecto de desvanecimiento en los bordes */}
    <Box 
      w="100%" 
      overflow="hidden"
      position="relative"
      _before={{
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100px',
        height: '100%',
        background: 'linear-gradient(to right, #171717, transparent)',
        zIndex: 1,
      }}
      _after={{
        content: '""',
        position: 'absolute',
        top: 0,
        right: 0,
        width: '100px',
        height: '100%',
        background: 'linear-gradient(to left, #171717, transparent)',
        zIndex: 1,
      }}
    >
      {/* Contenedor interno que se anima */}
      <HStack 
        spacing={16}
        animation="scroll 30s linear infinite"
        css={{
          '@keyframes scroll': {
            '0%': { transform: 'translateX(0)' },
            '100%': { transform: 'translateX(-50%)' }
          }
        }}
      >
        {/* Renderizamos la lista de logos dos veces para el bucle infinito */}
        {[...logos, ...logos].map((logo, index) => (
          <Text 
            key={index}
            color="rgba(255, 255, 255, 0.4)"
            fontSize="lg"
            fontWeight="semibold"
            whiteSpace="nowrap"
            minW="max-content"
          >
            {logo}
          </Text>
        ))}
      </HStack>
    </Box>
  </VStack>
);