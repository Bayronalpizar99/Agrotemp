import {
  Box,
  Button,
  Heading,
  HStack,
  Text,
  VStack
} from '@chakra-ui/react';

export const Hero = () => (
  <VStack spacing={8} py={32} textAlign="center" position="relative">
    {/* Badge "AI Solution" */}
    <Box 
      bg="rgba(139, 69, 19, 0.3)"
      border="1px solid rgba(139, 69, 19, 0.5)"
      px={4} 
      py={2} 
      borderRadius="full"
    >
      <Text color="#D2B48C" fontSize="sm" fontWeight="medium">AI Solution</Text>
    </Box>

    {/* Título principal con gradiente naranja */}
    <Heading
      as="h1"
      fontSize={{ base: "4xl", md: "6xl", lg: "7xl" }}
      fontWeight="bold"
      lineHeight="1.1"
      bgGradient="linear(to-r, #ff9a56, #ff6b35, #e55a2b)"
      bgClip="text"
      letterSpacing="-0.02em"
    >
      Meet your AI Agent
    </Heading>

    {/* Subtítulo */}
    <Text 
      fontSize="xl" 
      color="rgba(255, 255, 255, 0.7)" 
      maxW="2xl"
      lineHeight="1.6"
    >
      Redefining possibilities, join the forefront of innovation.
    </Text>

    {/* Botones */}
    <HStack spacing={4} pt={8}>
      <Button 
        size="lg"
        bg="linear-gradient(135deg, #ff8a50, #ff6b35)"
        color="white"
        borderRadius="full"
        px={8}
        py={6}
        fontSize="md"
        fontWeight="semibold"
        _hover={{
          bg: "linear-gradient(135deg, #ff7a40, #ff5b25)",
          transform: "translateY(-1px)",
        }}
        transition="all 0.2s ease"
      >
        Try for Free
      </Button>
      <Button 
        size="lg" 
        variant="ghost"
        color="rgba(255, 255, 255, 0.8)"
        borderRadius="full"
        px={8}
        py={6}
        fontSize="md"
        fontWeight="semibold"
        _hover={{
          color: 'white',
          bg: 'rgba(255, 255, 255, 0.05)',
        }}
      >
        Log In
      </Button>
    </HStack>
  </VStack>
);