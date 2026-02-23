import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  fonts: {
    heading: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`,
    body: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`,
  },
  colors: {
    brand: {
      background: '#171717',
      orange: '#ff6b35',
      orangeLight: '#ff8a50',
      text: '#ffffff',
      subtext: 'rgba(255, 255, 255, 0.7)',
      mutedText: 'rgba(255, 255, 255, 0.4)',
      border: 'rgba(255, 255, 255, 0.1)',
      cardBg: 'rgba(41, 41, 41, 0.6)',
      headerBg: 'rgba(41, 41, 41, 0.8)',
      badgeBg: 'rgba(139, 69, 19, 0.3)',
      badgeBorder: 'rgba(139, 69, 19, 0.5)',
      badgeText: '#D2B48C',
    },
  },
  shadows: {
    // Sombra actualizada con el color #ff8144
    glow: '0 0 12px 1px rgba(255, 129, 68, 0.15)',
  },
  styles: {
    global: {
      html: {
        overflowY: 'scroll',
        scrollbarGutter: 'stable',
      },
      body: {
        bg: '#171717',
        color: '#ffffff',
        fontFeatureSettings: '"cv11", "cv03", "cv04", "cv09"',
        overflowX: 'hidden',
      },
      '*': {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      '.starry-background': {
        background: '#171717',
        minHeight: '100vh',
      }
    },
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: 'full',
        fontWeight: 'semibold',
        transition: 'all 0.2s ease',
      },
      variants: {
        solid: {
          bg: 'linear-gradient(135deg, #ff8a50, #ff6b35)',
          color: 'white',
          _hover: {
            bg: 'linear-gradient(135deg, #ff7a40, #ff5b25)',
            transform: 'translateY(-1px)',
          },
        },
        outline: {
          border: '1px solid',
          borderColor: 'brand.border',
          color: 'brand.subtext',
          bg: 'transparent',
          _hover: {
            borderColor: 'brand.text',
            color: 'brand.text',
            bg: 'rgba(255, 255, 255, 0.05)',
          },
        },
        ghost: {
          color: 'brand.subtext',
          bg: 'transparent',
          _hover: {
            color: 'brand.text',
            bg: 'rgba(255, 255, 255, 0.05)',
          },
        },
      },
    },
    Link: {
      baseStyle: {
        color: 'brand.subtext',
        transition: 'color 0.2s ease',
        _hover: {
          textDecoration: 'none',
          color: 'brand.text',
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'brand.cardBg',
          backdropFilter: 'blur(10px)',
          border: '1px solid',
          borderColor: 'brand.border',
        },
      },
    },
  },
});

export default theme;
