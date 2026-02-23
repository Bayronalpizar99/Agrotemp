import {
  Box,
  Card,
  CardBody,
  Flex,
  Heading,
  Text,
  VStack
} from '@chakra-ui/react';

export const Features = () => (
  <Box py={20}>
    <Card
      bg="rgba(41, 41, 41, 0.6)"
      backdropFilter="blur(10px)"
      borderRadius="2xl"
      border="1px solid rgba(255, 255, 255, 0.1)"
      p={8}
      overflow="hidden"
      position="relative"
      maxW="1000px"
      mx="auto"
    >
      <CardBody>
        <Flex alignItems="center" justify="space-between" h="300px">
          <VStack alignItems="flex-start" spacing={6} maxW="50%" zIndex={2}>
            {/* Icono con fondo */}
            <Box 
              bg="rgba(139, 69, 19, 0.2)"
              border="1px solid rgba(139, 69, 19, 0.3)"
              p={3} 
              borderRadius="xl"
            >
              <Box
                w={6}
                h={6}
                bg="linear-gradient(135deg, #ff8a50, #ff6b35)"
                borderRadius="md"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="xs" color="white">⚡</Text>
              </Box>
            </Box>

            {/* Título */}
            <Heading size="xl" color="white" fontWeight="bold" lineHeight="1.2">
              Seamless Task Automation
            </Heading>

            {/* Descripción */}
            <Text color="rgba(255, 255, 255, 0.7)" fontSize="lg" lineHeight="1.6">
              Let your AI agent handle the busywork so your team can
              focus on what really matters, innovation and growth.
            </Text>
          </VStack>
          
          {/* Gráfico del lado derecho - recreando el diseño de órbitas */}
          <Box position="relative" w="50%" h="100%">
            {/* Fondo con puntos simulando estrellas */}
            <Box
              position="absolute"
              right="0"
              top="50%"
              transform="translateY(-50%)"
              w="300px"
              h="300px"
              borderRadius="full"
              bg="radial-gradient(circle, rgba(255, 138, 80, 0.1) 0%, transparent 70%)"
            />
            
            {/* Elemento central (átomo/núcleo) */}
            <Box
              position="absolute"
              right="150px"
              top="50%"
              transform="translateY(-50%)"
              w="40px"
              h="40px"
              borderRadius="full"
              bg="linear-gradient(135deg, #ff8a50, #ff6b35)"
              boxShadow="0 0 30px rgba(255, 138, 80, 0.5)"
            />

            {/* Órbitas/anillos */}
            <Box
              position="absolute"
              right="50px"
              top="50%"
              transform="translateY(-50%) rotate(15deg)"
              w="200px"
              h="120px"
              border="2px solid rgba(255, 138, 80, 0.3)"
              borderRadius="50%"
            />
            
            <Box
              position="absolute"
              right="70px"
              top="50%"
              transform="translateY(-50%) rotate(-25deg)"
              w="160px"
              h="100px"
              border="2px solid rgba(255, 138, 80, 0.4)"
              borderRadius="50%"
            />

            <Box
              position="absolute"
              right="90px"
              top="50%"
              transform="translateY(-50%) rotate(45deg)"
              w="120px"
              h="80px"
              border="2px solid rgba(255, 138, 80, 0.5)"
              borderRadius="50%"
            />

            {/* Partículas/puntos pequeños */}
            <Box
              position="absolute"
              right="80px"
              top="40%"
              w="3px"
              h="3px"
              borderRadius="full"
              bg="#ff8a50"
              boxShadow="0 0 10px rgba(255, 138, 80, 0.8)"
            />
            
            <Box
              position="absolute"
              right="200px"
              top="30%"
              w="2px"
              h="2px"
              borderRadius="full"
              bg="#ff8a50"
              boxShadow="0 0 8px rgba(255, 138, 80, 0.8)"
            />

            <Box
              position="absolute"
              right="120px"
              top="70%"
              w="2px"
              h="2px"
              borderRadius="full"
              bg="#ff8a50"
              boxShadow="0 0 8px rgba(255, 138, 80, 0.8)"
            />
          </Box>
        </Flex>
      </CardBody>
    </Card>
  </Box>
);