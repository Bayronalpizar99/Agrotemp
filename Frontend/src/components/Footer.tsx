// src/components/Footer.tsx
import { Box, HStack, Link, Text, VStack } from '@chakra-ui/react';
import { FiGithub, FiLinkedin } from 'react-icons/fi'; 

export const Footer = () => {
  return (
    <Box
      as="footer"
      w="100%"
      px={{ base: 4, md: 12 }}
      py={4}
      bg="rgba(23, 23, 23, 0.85)"
      backdropFilter="blur(10px)"
      borderTop="1px solid rgba(255, 255, 255, 0.06)"
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      zIndex={5}
    >

      <HStack justify="space-between" align="center" w="100%" maxW="container.xl" mx="auto">
        <Text fontSize="xs" color="brand.mutedText">
          © 2026 Agrotemp. All rights reserved.
        </Text>

        <Text fontSize="xs" color="brand.subtext">
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

        <HStack spacing={4}>
          <Link
            href="https://www.linkedin.com/in/bayron-alpízar-quesada-21439a126"
            isExternal
            color="brand.mutedText"
            _hover={{ color: 'brand.orange' }}
            transition="color 0.2s ease"
          >
            <FiLinkedin size="16px" />
          </Link>
          <Link
            href="https://github.com/Bayronalpizar99"
            isExternal
            color="brand.mutedText"
            _hover={{ color: 'brand.orange' }}
            transition="color 0.2s ease"
          >
            <FiGithub size="16px" />
          </Link>
        </HStack>
      </HStack>
    </Box>
  );
}
