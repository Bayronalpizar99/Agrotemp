// src/App.tsx
import { Box, Container } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { WeatherDashboard } from './components/WeatherDashboard';
import { Footer } from './components/Footer';
import { InfoPage } from './components/InfoPage';
import { ParticleBackground } from './components/ParticleBackground';
import { AgroReportPage } from './components/AgroReportPage';
import { FeedbackWidget } from './components/FeedbackWidget';
import { ParcelasPage } from './components/ParcelasPage';

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
    <>
    <Box minH="100vh" position="relative" isolation="isolate">
      <ParticleBackground />

      <Box position="relative" zIndex={1} display="flex">
        <Header
          isVisible={true}
          activePage={activePage}
          setActivePage={setActivePage}
          isScrolled={false}
        />

        <Box flex={1} ml={{ base: 0, md: '210px' }} minW={0}>
        <Container
          maxW="container.xl"
          px={{ base: 3, md: 4 }}
          pt={{ base: '72px', md: 6 }}
          pb={{ base: 20, md: 16 }}
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
          <Box display={activePage === 'Parcelas' ? 'block' : 'none'}>
            <ParcelasPage isActive={activePage === 'Parcelas'} />
          </Box>
        </Container>

        {activePage !== 'Reporte IA' && <Footer />}
        </Box>
      </Box>
    </Box>
    <FeedbackWidget activePage={activePage} />
    </>
  );
}

export default App;
