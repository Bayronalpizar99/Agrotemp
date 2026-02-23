// src/App.tsx
import { Box, Container } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { WeatherDashboard } from './components/WeatherDashboard';
import { Footer } from './components/Footer';
import { InfoPage } from './components/InfoPage';
import { ParticleBackground } from './components/ParticleBackground';
import { AgroReportPage } from './components/AgroReportPage';

const ACTIVE_PAGE_SESSION_KEY = 'active_page_session_v1';

function App() {
  const [activePage, setActivePage] = useState(() => {
    if (typeof window === 'undefined') return 'Dashboard';
    const saved = window.sessionStorage.getItem(ACTIVE_PAGE_SESSION_KEY);
    return saved ?? 'Dashboard';
  });
  // ❌ Se elimina el estado y el efecto que manejaban el scroll.
  // const [isScrolled, setIsScrolled] = useState(false);

  // useEffect(() => {
  //   const handleScroll = () => {
  //     setIsScrolled(window.scrollY > 10);
  //   };
  //   window.addEventListener('scroll', handleScroll);
  //   return () => {
  //     window.removeEventListener('scroll', handleScroll);
  //   };
  // }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(ACTIVE_PAGE_SESSION_KEY, activePage);
  }, [activePage]);

  return (
    <Box minH="100vh">
      <ParticleBackground />
      
      <Header
        isVisible={true}
        activePage={activePage}
        setActivePage={setActivePage}
        // ✅ Se pasa un valor fijo o se puede eliminar la prop si ya no es necesaria en Header.
        isScrolled={false} 
      />
      
      <Container
        maxW="container.xl"
        px={{ base: 3, md: 4 }}
        py={4}
        pt={{ base: 28, md: 40 }}
      >
        <Box display={activePage === 'Reporte IA' ? 'block' : 'none'}>
          <AgroReportPage />
        </Box>
        <Box display={activePage === 'Dashboard' ? 'block' : 'none'}>
          <WeatherDashboard />
        </Box>
        <Box display={activePage === 'Info' ? 'block' : 'none'}>
          <InfoPage />
        </Box>
      </Container>
      
      {activePage !== 'Reporte IA' && <Footer />}
    </Box>
  );
}

export default App;
