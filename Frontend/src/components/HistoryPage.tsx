// src/components/HistoryPage.tsx
import {
  Box,
  Heading,
  VStack,
  HStack,
  Input,
  SimpleGrid,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
} from '@chakra-ui/react';
import { useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const historicalData = [
  { date: '2023-10-27', tempMax: 25, tempMin: 18, rain: 0 },
  { date: '2023-10-26', tempMax: 24, tempMin: 17, rain: 2 },
  { date: '2023-10-25', tempMax: 26, tempMin: 19, rain: 5 },
  { date: '2023-10-24', tempMax: 23, tempMin: 16, rain: 0 },
  { date: '2023-10-23', tempMax: 22, tempMin: 15, rain: 10 },
];

const StatCard = ({ title, value }: { title: string; value: string }) => (
  <Box
    p="1px"
    borderRadius="xl"
    bgGradient="linear(to-b, rgba(255, 129, 68, 0.4), rgba(255, 255, 255, 0.1))"
    h="100%"
  >
    <Box 
      bg="#1A1A1A"
      p={5}
      borderRadius="xl"
      h="100%"
    >
      <VStack h="100%" align="start" justify="flex-end" spacing={0}>
        <Heading
          as="h3"
          fontSize="4xl"
          fontWeight="bold"
          lineHeight="1"
          bgGradient="linear(to-b, brand.orangeLight, brand.orange)"
          bgClip="text"
        >
          {value}
        </Heading>
        <Text color="brand.subtext" fontSize="sm">{title}</Text>
      </VStack>
    </Box>
  </Box>
);

const GradientBorderBox = ({ children }: { children: React.ReactNode }) => (
    <Box
        p="1px"
        borderRadius="xl"
        bgGradient="linear(to-b, rgba(255, 129, 68, 0.4), rgba(255, 255, 255, 0.1))"
        h="100%" // Añadimos h="100%" para asegurar que el borde ocupe toda la altura
    >
        <Box bg="#1A1A1A" p={6} borderRadius="xl" h="100%">
            {children}
        </Box>
    </Box>
);


export const HistoryPage = () => {
  const [startDate, setStartDate] = useState('2023-10-01');
  const [endDate, setEndDate] = useState('2023-10-27');

  const filteredData = historicalData.filter(d => d.date >= startDate && d.date <= endDate);

  const chartLabels = filteredData.map(d => d.date.slice(5)).reverse();

  const chartOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: '#fff' } } },
    scales: {
        x: { ticks: { color: '#A0AEC0' }, grid: { color: 'rgba(255,255,255,0.1)' } },
        y: { ticks: { color: '#A0AEC0' }, grid: { color: 'rgba(255,255,255,0.1)' } }
    },
  };

  const lineChartData = {
    labels: chartLabels,
    datasets: [
      { label: 'Temp. Máxima (°C)', data: filteredData.map(d => d.tempMax).reverse(), borderColor: '#ff8a50', backgroundColor: '#ff8a50' },
      { label: 'Temp. Mínima (°C)', data: filteredData.map(d => d.tempMin).reverse(), borderColor: '#D2B48C', backgroundColor: '#D2B48C' },
    ],
  };
  
  const barChartData = {
    labels: chartLabels,
    datasets: [
      { label: 'Precipitación (mm)', data: filteredData.map(d => d.rain).reverse(), backgroundColor: '#646cff' },
    ],
  };

  const avgTemp = (filteredData.reduce((sum, d) => sum + d.tempMax, 0) / filteredData.length).toFixed(1);
  const totalRain = filteredData.reduce((sum, d) => sum + d.rain, 0);

  return (
    <VStack spacing={8} align="stretch">
      <Box textAlign="center">
        <Heading as="h1" fontSize={{ base: "4xl", md: "6xl" }} bgGradient="linear(to-r, #ff9a56, #ff6b35, #e55a2b)" bgClip="text">
          Historial de Datos
        </Heading>
      </Box>

      {/* ✅ MEJORA: Reemplazamos HStack por SimpleGrid para lograr simetría. */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
        <GradientBorderBox>
            {/* Hacemos que el contenido se centre y ocupe toda la altura */}
            <VStack align="start" spacing={4} justifyContent="center" h="100%">
                <Text color="brand.text" fontWeight="bold">Selecciona un rango</Text>
                <HStack>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </HStack>
            </VStack>
        </GradientBorderBox>
        <StatCard title="Temperatura Promedio" value={`${avgTemp}°C`} />
        <StatCard title="Precipitación Total" value={`${totalRain} mm`} />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <GradientBorderBox><Line options={chartOptions} data={lineChartData} /></GradientBorderBox>
        <GradientBorderBox><Bar options={chartOptions} data={barChartData} /></GradientBorderBox>
      </SimpleGrid>

      <GradientBorderBox>
        <TableContainer>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Fecha</Th>
                <Th isNumeric>Temp. Máx (°C)</Th>
                <Th isNumeric>Temp. Mín (°C)</Th>
                <Th isNumeric>Precipitación (mm)</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredData.map(d => (
                <Tr key={d.date}>
                  <Td>{d.date}</Td>
                  <Td isNumeric>{d.tempMax}</Td>
                  <Td isNumeric>{d.tempMin}</Td>
                  <Td isNumeric>{d.rain}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </GradientBorderBox>
    </VStack>
  );
};