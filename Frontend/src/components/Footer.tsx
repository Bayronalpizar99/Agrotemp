// src/components/Footer.tsx
import { Box, HStack, Link, Text, VStack } from '@chakra-ui/react';
import { FiGithub, FiLinkedin } from 'react-icons/fi'; 

export const Footer = () => {
  return (
    <Box as="footer" w="100%" px={{ base: 4, md: 12 }} pt={{ base: 10, md: 16 }} pb={{ base: 8, md: 12 }} bg="transparent">
      {/* Reemplazamos el Divider por un Box con el efecto de gradiente */}
      <Box
        height="1px" // Grosor de la línea
        w="100%"
        // Gradiente horizontal que coincide con el de las tarjetas
        bgGradient="linear(to-r, transparent, rgba(255, 129, 68, 0.4), transparent)"
        mb={8}
      />

      <VStack spacing={4}>
        <HStack spacing={5}>
          <Link href="https://www.linkedin.com/in/bayron-alpízar-quesada-21439a126" isExternal>
            <FiLinkedin size="20px" />
          </Link>
          <Link href="https://github.com/Bayronalpizar99" isExternal>
            <FiGithub size="20px" />
          </Link>
        </HStack>

        <Text fontSize="sm" color="brand.subtext" textAlign="center">
          Developed by{' '}
          <Link 
            href="https://github.com/Bayronalpizar99"
            isExternal 
            color="brand.orangeLight"
            fontWeight="medium"
          >
            @Bayronalpizar99
          </Link>
        </Text>

        <Text fontSize="sm" color="brand.mutedText" textAlign="center">
          © 2025 Agrotemp . All rights reserved.
        </Text>
      </VStack>
    </Box>
  );
}
