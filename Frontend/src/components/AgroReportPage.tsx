// src/components/AgroReportPage.tsx
import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Input,
  Button,
  SimpleGrid,
  useToast,
  Spinner,
  Stat,
  StatNumber,
  StatHelpText,
  StatArrow,
  Icon,
  Select,
  Textarea,
  Divider,
  Avatar,
  IconButton,
  Flex,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Collapse
} from '@chakra-ui/react';
import {
  FiCpu, 
  FiDroplet, 
  FiSun, 
  FiThermometer, 
  FiAlertCircle,
  FiSend,
  FiUser,
  FiMic,
  FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';
import { agroAnalyticsService } from '../services/agro-analytics.service';
import type { AgroReportResult } from '../services/agro-analytics.service';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  ComposedChart,
  Area
} from 'recharts';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  helpText?: string;
  trend?: 'increase' | 'decrease';
  icon?: any;
  color?: string;
}

const CardWrapper = ({ children, ...props }: any) => (
  <Box
    p="1px"
    borderRadius="xl"
    bgGradient="linear(to-b, rgba(255, 129, 68, 0.4), rgba(255, 255, 255, 0.1))"
    transition="all 0.3s ease-in-out"
    _hover={{
      transform: 'translateY(-2px)',
      boxShadow: 'glow',
    }}
    {...props}
  >
    <Box 
        bg="#1A1A1A"
        p={4}
        borderRadius="xl"
        h="100%"
    >
      {children}
    </Box>
  </Box>
);

const MetricCard = ({ label, value, unit, helpText, trend, icon, color = "brand.orange" }: MetricCardProps) => (
  <CardWrapper>
        <HStack justify="space-between" mb={2}>
        <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase">
            {label}
        </Text>
        {icon && <Icon as={icon} color={color} w={4} h={4} />}
        </HStack>
        <Stat>
        <StatNumber 
            fontSize="2xl" 
            fontWeight="bold" 
            bgGradient="linear(to-b, brand.orange, orange.300)" 
            bgClip="text"
            color="transparent" // Fallback
        >
            {value}
            {unit && <Text as="span" fontSize="sm" color="gray.500" ml={1} display="inline-block" style={{ WebkitTextFillColor: 'initial' }}>{unit}</Text>}
        </StatNumber>
        {helpText && (
            <StatHelpText mb={0} fontSize="xs" color="gray.400">
            {trend && <StatArrow type={trend} />}
            {helpText}
            </StatHelpText>
        )}
        </Stat>
  </CardWrapper>
);

// Constantes de Cultivos
const CROPS = [
    { name: 'Maíz', base: 10, max: 30 },
    { name: 'Trigo', base: 5, max: 25 },
    { name: 'Soya', base: 10, max: 30 },
    { name: 'Tomate', base: 10, max: 28 },
    { name: 'Papa', base: 7, max: 25 },
    { name: 'Arroz', base: 10, max: 35 },
    { name: 'Café', base: 18, max: 25 },
    { name: 'Frijol', base: 10, max: 28 },
    { name: 'Personalizado', base: 10, max: 30 },
];

interface ChatMessage {
    id: number;
    role: 'user' | 'assistant';
    content?: string;
    reportData?: AgroReportResult;
    cropName?: string;
    isLoading?: boolean;
}

interface PersistedAgroReportState {
  version: 1;
  startDate: string;
  endDate: string;
  selectedCrop: string;
  baseTemp: number;
  maxTemp: number;
  inputText: string;
  messages: ChatMessage[];
  currentReport: AgroReportResult | null;
  isMobileFiltersOpen: boolean;
  showCustomInputs?: boolean;
}

const AGRO_REPORT_SESSION_KEY = 'agro_report_session_v1';

const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  id: 1,
  role: 'assistant',
  content: '¡Hola! Soy tu asistente de Agricultura de Precisión. Configura los parámetros abajo y genera un reporte para comenzar.'
};

const loadPersistedAgroReportState = (): PersistedAgroReportState | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(AGRO_REPORT_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedAgroReportState;
    if (parsed?.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const AgroReportPage = () => {
  const [persistedState] = useState<PersistedAgroReportState | null>(() => loadPersistedAgroReportState());
  const [startDate, setStartDate] = useState(persistedState?.startDate ?? '');
  const [endDate, setEndDate] = useState(persistedState?.endDate ?? '');
  const [selectedCrop, setSelectedCrop] = useState(persistedState?.selectedCrop ?? 'Maíz'); 
  const [baseTemp, setBaseTemp] = useState(persistedState?.baseTemp ?? 10);
  const [maxTemp, setMaxTemp] = useState(persistedState?.maxTemp ?? 30);
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>(
    persistedState?.messages?.length ? persistedState.messages : [INITIAL_ASSISTANT_MESSAGE]
  );
  const [inputText, setInputText] = useState(persistedState?.inputText ?? '');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [currentReport, setCurrentReport] = useState<AgroReportResult | null>(persistedState?.currentReport ?? null);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(persistedState?.isMobileFiltersOpen ?? false);
  const [showCustomInputs, setShowCustomInputs] = useState(
    persistedState?.showCustomInputs ?? (persistedState?.selectedCrop === 'Personalizado')
  );
  
  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  
  // Modal State
  const { isOpen: isChatModalOpen, onOpen: onOpenChatModal, onClose: onCloseChatModal } = useDisclosure();

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
        toast({
            title: "Navegador no soportado",
            description: "Tu navegador no soporta reconocimiento de voz.",
            status: "error",
            duration: 3000,
            isClosable: true,
        });
        return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        setIsListening(true);
    };

    recognition.onend = () => {
        setIsListening(false);
    };

    recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        // Optional: Auto-send if desired, but safer to let user confirm
        // handleSendMessage(transcript); 
    };
    
    recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        toast({
            title: "Error de reconocimiento",
            description: "No se pudo escuchar el audio. Intenta de nuevo.",
            status: "warning",
            duration: 3000,
        });
    };

    recognition.start();
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const serializableMessages = messages.filter(msg => !msg.isLoading);
    const payload: PersistedAgroReportState = {
      version: 1,
      startDate,
      endDate,
      selectedCrop,
      baseTemp,
      maxTemp,
      inputText,
      messages: serializableMessages.length > 0 ? serializableMessages : [INITIAL_ASSISTANT_MESSAGE],
      currentReport,
      isMobileFiltersOpen,
      showCustomInputs,
    };

    window.sessionStorage.setItem(AGRO_REPORT_SESSION_KEY, JSON.stringify(payload));
  }, [
    startDate,
    endDate,
    selectedCrop,
    baseTemp,
    maxTemp,
    inputText,
    messages,
    currentReport,
    isMobileFiltersOpen,
    showCustomInputs,
  ]);

  const handleCropChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cropName = e.target.value;
    setSelectedCrop(cropName);
    const cropData = CROPS.find(c => c.name === cropName);
    if (cropData) {
        setBaseTemp(cropData.base);
        setMaxTemp(cropData.max);
    }
    setShowCustomInputs(cropName === 'Personalizado');
  };

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      toast({ title: 'Selecciona un rango de fechas', status: 'warning' });
      return;
    }

    setIsGeneratingReport(true);
    setShowCustomInputs(false);
    // Add user message for context
    const userMsgId = Date.now();
    setMessages(prev => [...prev, { 
        id: userMsgId, 
        role: 'user', 
        content: `Generar reporte para ${selectedCrop} del ${startDate} al ${endDate}` 
    }]);

    try {
      // Add loading state message
      const loadingId = Date.now() + 1;
      setMessages(prev => [...prev, { id: loadingId, role: 'assistant', isLoading: true }]);

      const data = await agroAnalyticsService.getReport({
        startDate,
        endDate,
        cropBaseTemp: baseTemp,
        cropMaxTemp: maxTemp,
      });

      setCurrentReport(data);
      setIsMobileFiltersOpen(false);

      // Replace loading message with actual report
      setMessages(prev => prev.filter(m => m.id !== loadingId).concat({
          id: Date.now() + 2,
          role: 'assistant',
          reportData: data,
          cropName: selectedCrop
      }));

    } catch (error: any) {
       toast({ title: 'Error generando reporte', status: 'error' });
       // Remove loading msg
       setMessages(prev => prev.filter(m => !m.isLoading).concat({
           id: Date.now(),
           role: 'assistant',
           content: 'Lo siento, hubo un error al generar el reporte. Por favor intenta de nuevo.'
       }));
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    // Check if we have a report context
    if (!currentReport) {
        toast({ title: 'Primero genera un reporte para tener contexto', status: 'info' });
        return;
    }

    const question = inputText;
    setInputText('');
    setIsSendingMessage(true);

    // Add user message
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: question }]);
    
    // Add loading placeholder
    const loadingId = Date.now() + 1;
    setMessages(prev => [...prev, { id: loadingId, role: 'assistant', isLoading: true }]);

    try {
        const answer = await agroAnalyticsService.chatWithReport(question, currentReport);
        
        // Replace loading with answer
        setMessages(prev => prev.filter(m => m.id !== loadingId).concat({
            id: Date.now() + 2,
            role: 'assistant',
            content: answer
        }));
    } catch (error) {
        setMessages(prev => prev.filter(m => m.id !== loadingId).concat({
            id: Date.now() + 3,
            role: 'assistant',
            content: 'Error al conectar con la IA.'
        }));
    } finally {
        setIsSendingMessage(false);
        onCloseChatModal();
    }
  };

  const openExpandedChat = () => {
      // Only open if report is generated
      if (currentReport) {
          onOpenChatModal();
      } else {
        toast({ title: 'Primero genera un reporte para comenzar a chatear.', status: 'info' });
      }
  };

  return (
    <Flex 
      w="full" 
      direction="column"
      position="relative"
      minH="calc(100vh - 200px)" // Ensure minimum height but allow growth
    >
      
      {/* Messages Area */}
      <VStack 
        w="full"
        maxW="1200px" // Limit content width for readability
        alignSelf="center"
        // Removed overflowY="auto" and flex="1" to let page scroll handle it
        pb={{ base: 72, md: 48 }} // Extra padding at bottom so last message isn't hidden behind fixed chat
        px={4} 
        spacing={6} 
        align="stretch"
      >
        {messages.length === 0 && (
            <VStack spacing={8} py={20} opacity={0.8} align="center" justify="center" minH="50vh">
                <Icon as={FiCpu} w={20} h={20} color="brand.orange" />
                <Heading 
                    as="h1" 
                    size="2xl" 
                    bgGradient="linear(to-r, brand.orange, brand.orangeLight)" 
                    bgClip="text"
                    textAlign="center"
                >
                    Bienvenido a AgroReport AI
                </Heading>
                <Text fontSize="xl" color="gray.400" textAlign="center" maxW="600px">
                    Tu asistente inteligente para agricultura de precisión. <br />
                    Configura los parámetros abajo y genera un reporte para comenzar.
                </Text>
            </VStack>
        )}
        {messages.map((msg) => (
            <Flex key={msg.id} justify={msg.role === 'user' ? 'flex-end' : 'flex-start'}>
                <HStack align="start" maxW={msg.role === 'user' ? '80%' : '90%'} spacing={3}>
                    {msg.role === 'assistant' && (
                        <Avatar size="sm" icon={<FiCpu />} bg="green.500" />
                    )}
                    
                    <Box
                        bg={msg.role === 'user' ? undefined : 'whiteAlpha.100'}
                        bgGradient={msg.role === 'user' ? "linear(to-r, #ed8936, #dd6b20)" : undefined}
                        color="white"
                        px={6}
                        py={4}
                        borderRadius="2xl"
                        borderTopLeftRadius={msg.role === 'assistant' ? 0 : '2xl'}
                        borderTopRightRadius={msg.role === 'user' ? 0 : '2xl'}
                        boxShadow="md"
                        border="1px solid"
                        borderColor="whiteAlpha.100"
                        maxW="fit-content"
                    >
                        {msg.isLoading ? (
                            <Spinner size="sm" color="white" />
                        ) : msg.reportData ? (
                            <VStack align="stretch" spacing={4}>
                                <Text fontWeight="bold" color="green.300">
                                    Reporte Agrometeorológico: {msg.cropName}
                                </Text>
                                <Text fontSize="md" whiteSpace="pre-line" lineHeight="1.6">
                                    {msg.reportData.aiAnalysis}
                                </Text>
                                <Divider borderColor="whiteAlpha.300" />
                                
                                <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={3}>
                                    <MetricCard 
                                      label="GDD" 
                                      value={msg.reportData.metrics.gdd} 
                                      unit="°D" 
                                      icon={FiSun} 
                                      color="orange.300" 
                                    />
                                    <MetricCard 
                                      label="Balance Hídrico" 
                                      value={msg.reportData.metrics.waterBalance.balance} 
                                      unit="mm" 
                                      icon={FiDroplet} 
                                      color="blue.300" 
                                    />
                                    <MetricCard 
                                      label="Estrés Calor" 
                                      value={msg.reportData.metrics.stressHours ? msg.reportData.metrics.stressHours.heatStressHours : 0} 
                                      unit="hrs" 
                                      icon={FiThermometer} 
                                      color="red.300" 
                                    />
                                    <MetricCard 
                                      label="Riesgo Enf." 
                                      value={msg.reportData.metrics.diseaseRisk} 
                                      icon={FiAlertCircle} 
                                      color={msg.reportData.metrics.diseaseRisk === 'ALTO' ? 'red.500' : 'green.400'} 
                                    />
                                </SimpleGrid>

                                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                                   <CardWrapper>
                                      <Text fontSize="xs" fontWeight="bold" color="gray.400" mb={2} textTransform="uppercase">Ventanas Manejo</Text>
                                      <HStack justify="space-between">
                                          <Text fontSize="sm">Óptimas Pulv. (&lt;10km/h):</Text>
                                          <Text fontWeight="bold" color="green.300">
                                              {msg.reportData.metrics.optimalWindows?.optimalSprayHours || 0} hrs
                                          </Text>
                                      </HStack>
                                   </CardWrapper>
                                   
                                   <CardWrapper>
                                      <Text fontSize="xs" fontWeight="bold" color="gray.400" mb={2} textTransform="uppercase">Temp Extrema</Text>
                                       <HStack justify="space-between" mb={1}>
                                          <Text fontSize="sm">Frío:</Text>
                                          <Text fontWeight="bold" color="blue.300">
                                              {msg.reportData.metrics.stressHours?.coldStressHours || 0} h
                                          </Text>
                                      </HStack>
                                      <HStack justify="space-between">
                                          <Text fontSize="sm">Calor:</Text>
                                          <Text fontWeight="bold" color="red.300">
                                              {msg.reportData.metrics.stressHours?.heatStressHours || 0} h
                                          </Text>
                                      </HStack>
                                   </CardWrapper>
                                </SimpleGrid>
                                
                                {msg.reportData.chartData && msg.reportData.chartData.length > 0 && (
                                    <Box mt={4} bg="blackAlpha.300" p={4} borderRadius="xl">
                                        <Text fontWeight="bold" color="gray.300" mb={4} fontSize="sm">
                                            Evolución Diaria: Temperaturas, GDD y Lluvia
                                        </Text>
                                        <Box h="300px" w="100%">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ComposedChart data={msg.reportData.chartData}>
                                                    <defs>
                                                        <linearGradient id="colorGdd" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#ed8936" stopOpacity={0.8}/>
                                                            <stop offset="95%" stopColor="#ed8936" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                                                    <XAxis 
                                                        dataKey="date" 
                                                        stroke="#718096" 
                                                        fontSize={12} 
                                                        tickFormatter={(val: string | number) =>
                                                          val.toString().split('-').slice(1).join('/')
                                                        }
                                                    />
                                                    <YAxis yAxisId="left" stroke="#718096" fontSize={12} label={{ value: 'Temp (°C)', angle: -90, position: 'insideLeft', fill: '#718096' }}/>
                                                    <YAxis yAxisId="right" orientation="right" stroke="#ed8936" fontSize={12} label={{ value: 'GDD', angle: 90, position: 'insideRight', fill: '#ed8936' }}/>
                                                    <YAxis yAxisId="rain" orientation="right" hide domain={[0, 'auto']} />
                                                    <Tooltip 
                                                        contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '8px' }}
                                                        itemStyle={{ color: '#fff' }}
                                                    />
                                                    <Legend />
                                                    <Bar
                                                        yAxisId="rain"
                                                        dataKey="rainfall"
                                                        name="Lluvia (mm)"
                                                        fill="#68D391"
                                                        fillOpacity={0.55}
                                                        barSize={12}
                                                    />
                                                    <Area 
                                                        yAxisId="right"
                                                        type="monotone" 
                                                        dataKey="gdd" 
                                                        name="Grados Día (GDD)" 
                                                        stroke="#ed8936" 
                                                        fillOpacity={1} 
                                                        fill="url(#colorGdd)" 
                                                    />
                                                    <Line 
                                                        yAxisId="left"
                                                        type="monotone" 
                                                        dataKey="tMax" 
                                                        name="T. Máx" 
                                                        stroke="#FC8181" 
                                                        strokeWidth={2}
                                                        dot={false}
                                                    />
                                                    <Line 
                                                        yAxisId="left"
                                                        type="monotone" 
                                                        dataKey="tMin" 
                                                        name="T. Mín" 
                                                        stroke="#63B3ED" 
                                                        strokeWidth={2}
                                                        dot={false}
                                                    />
                                                </ComposedChart>
                                            </ResponsiveContainer>
                                        </Box>
                                    </Box>
                                )}
                            </VStack>
                        ) : (
                            <Text whiteSpace="pre-wrap">{msg.content}</Text>
                        )}
                        
                        {msg.role === 'user' && (
                             <Avatar size="sm" icon={<FiUser />} bg="blue.500" ml={2} display="none" />
                        )}
                    </Box>
                </HStack>
            </Flex>
        ))}
      </VStack>

      <Box
        position="fixed"
        bottom={{ base: 2, md: 6 }}
        left="50%"
        transform="translateX(-50%)"
        zIndex={10}
        w={{ base: "calc(100% - 16px)", md: "900px" }}
      >
        <Flex
            bg="#1A1A1A"
            borderRadius="3xl"
            border="1px solid"
            borderColor="brand.border"
            boxShadow="2xl"
            p={2}
            align="stretch"
            gap={2}
            direction="column"
        >
            <Flex
                w="full"
                align={{ base: "stretch", md: "center" }}
                gap={2}
                direction={{ base: "column", md: "row" }}
            >
            <Button
                display={{ base: "flex", md: "none" }}
                size="sm"
                variant="outline"
                justifyContent="space-between"
                rightIcon={<Icon as={isMobileFiltersOpen ? FiChevronUp : FiChevronDown} />}
                onClick={() => setIsMobileFiltersOpen(prev => !prev)}
            >
                Parámetros de análisis
            </Button>

            <Collapse in={isMobileFiltersOpen} animateOpacity style={{ width: '100%' }}>
                <VStack display={{ base: "flex", md: "none" }} spacing={2} align="stretch">
                    <Select 
                        size="sm" 
                        value={selectedCrop} 
                        onChange={handleCropChange} 
                        bg="whiteAlpha.100" 
                        border="1px solid"
                        borderColor="whiteAlpha.200" 
                        borderRadius="lg" 
                        w="full"
                        color="gray.300"
                        fontSize="xs"
                        _hover={{ bg: "whiteAlpha.200" }}
                        _focus={{ borderColor: "brand.orange", boxShadow: "none" }}
                        sx={{ '& > option': { background: '#1A1A1A' } }}
                    >
                        {CROPS.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </Select>
                    <HStack spacing={2}>
                        <Input 
                            size="sm" 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)} 
                            bg="whiteAlpha.100"
                            border="1px solid"
                            borderColor="whiteAlpha.200"
                            borderRadius="lg"
                            w="full"
                            fontSize="xs"
                            color="gray.300"
                            css={{ '::-webkit-calendar-picker-indicator': { filter: 'invert(0.6) opacity(0.6)' } }}
                            _hover={{ bg: "whiteAlpha.200" }}
                        />
                        <Input 
                            size="sm" 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)} 
                            bg="whiteAlpha.100"
                            border="1px solid"
                            borderColor="whiteAlpha.200"
                            borderRadius="lg"
                            w="full"
                            fontSize="xs"
                            color="gray.300"
                            css={{ '::-webkit-calendar-picker-indicator': { filter: 'invert(0.6) opacity(0.6)' } }}
                            _hover={{ bg: "whiteAlpha.200" }}
                        />
                    </HStack>
                    {selectedCrop === 'Personalizado' && showCustomInputs && (
                        <SimpleGrid columns={1} spacing={2}>
                            <Box>
                                <Text fontSize="xs" color="gray.300" mb={1}>Temperatura base (°C)</Text>
                                <Text fontSize="2xs" color="gray.500" mb={1}>Umbral mínimo para acumular GDD.</Text>
                                <Input
                                    size="sm"
                                    type="number"
                                    value={baseTemp}
                                    onChange={(e) => setBaseTemp(Number(e.target.value))}
                                    bg="whiteAlpha.100"
                                    border="1px solid"
                                    borderColor="whiteAlpha.200"
                                    borderRadius="lg"
                                    w="full"
                                    fontSize="xs"
                                    color="gray.300"
                                    _hover={{ bg: "whiteAlpha.200" }}
                                />
                            </Box>
                            <Box>
                                <Text fontSize="xs" color="gray.300" mb={1}>Temperatura máxima óptima (°C)</Text>
                                <Text fontSize="2xs" color="gray.500" mb={1}>Límite superior recomendado del cultivo.</Text>
                                <Input
                                    size="sm"
                                    type="number"
                                    value={maxTemp}
                                    onChange={(e) => setMaxTemp(Number(e.target.value))}
                                    bg="whiteAlpha.100"
                                    border="1px solid"
                                    borderColor="whiteAlpha.200"
                                    borderRadius="lg"
                                    w="full"
                                    fontSize="xs"
                                    color="gray.300"
                                    _hover={{ bg: "whiteAlpha.200" }}
                                />
                            </Box>
                        </SimpleGrid>
                    )}
                    <Button 
                        size="sm" 
                        colorScheme="orange"
                        variant="solid"
                        onClick={handleGenerateReport}
                        isLoading={isGeneratingReport}
                        leftIcon={<Icon as={FiCpu}/>}
                        borderRadius="lg"
                        boxShadow="dark-lg"
                        w="full"
                        fontSize="xs"
                    >
                        Analizar
                    </Button>
                </VStack>
            </Collapse>

            <HStack display={{ base: "none", md: "flex" }} spacing={2}>
                <Select 
                    size="sm" 
                    value={selectedCrop} 
                    onChange={handleCropChange} 
                    bg="whiteAlpha.100" 
                    border="1px solid"
                    borderColor="whiteAlpha.200" 
                    borderRadius="lg" 
                    w="140px"
                    color="gray.300"
                    fontSize="xs"
                    _hover={{ bg: "whiteAlpha.200" }}
                    _focus={{ borderColor: "brand.orange", boxShadow: "none" }}
                    sx={{ '& > option': { background: '#1A1A1A' } }}
                >
                    {CROPS.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </Select>

                <Input 
                    size="sm" 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    bg="whiteAlpha.100"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    borderRadius="lg"
                    w="130px"
                    fontSize="xs"
                    color="gray.300"
                    css={{ '::-webkit-calendar-picker-indicator': { filter: 'invert(0.6) opacity(0.6)' } }}
                    _hover={{ bg: "whiteAlpha.200" }}
                />
                
                <Input 
                    size="sm" 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    bg="whiteAlpha.100"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    borderRadius="lg"
                    w="130px"
                    fontSize="xs"
                    color="gray.300"
                    css={{ '::-webkit-calendar-picker-indicator': { filter: 'invert(0.6) opacity(0.6)' } }}
                    _hover={{ bg: "whiteAlpha.200" }}
                />
                <Button 
                    size="sm" 
                    colorScheme="orange"
                    variant="solid"
                    onClick={handleGenerateReport}
                    isLoading={isGeneratingReport}
                    leftIcon={<Icon as={FiCpu}/>}
                    borderRadius="lg"
                    boxShadow="dark-lg"
                    fontSize="xs"
                >
                    Analizar
                </Button>
                
                <Divider orientation="vertical" h="24px" borderColor="whiteAlpha.300" />
            </HStack>

            <Flex 
                flex={1} 
                align="center" 
                w="full"
                bg="whiteAlpha.50"
                borderRadius="xl"
                maxW={{ base: "100%", md: "auto" }}
                onClick={openExpandedChat}
                cursor={currentReport ? "pointer" : "not-allowed"}
            >
                <Textarea
                    value={inputText}
                    isReadOnly
                    placeholder={currentReport ? "Click para ampliar y preguntar..." : "Genera reporte"}
                    isDisabled={!currentReport}
                    minH="36px"
                    maxH="120px"
                    rows={1}
                    resize="none"
                    bg="transparent"
                    border="none"
                    _focus={{ ring: 0 }}
                    color="white"
                    px={3}
                    py={1.5}
                    fontSize="sm"
                    sx={{
                        cursor: currentReport ? "pointer" : "not-allowed"
                    }}
                />
                <IconButton
                    aria-label="Microphone"
                    icon={<FiMic />}
                    size="sm"
                    variant="ghost"
                    colorScheme={isListening ? "red" : "gray"}
                    color={isListening ? "red.400" : "gray.400"}
                    onClick={(e) => {
                        e.stopPropagation();
                        // Open modal and start listening
                        if (currentReport) {
                            openExpandedChat();
                            setTimeout(startListening, 300); // Small delay to let modal open
                        }
                    }}
                    isLoading={isListening}
                    isDisabled={!currentReport || isSendingMessage}
                    borderRadius="full"
                    mr={1} 
                    _hover={{ color: isListening ? "red.300" : "brand.orange" }}
                />
                <IconButton
                    aria-label="Expand"
                    icon={<FiSend />}
                    size="sm"
                    variant="ghost"
                    colorScheme="orange"
                    color="brand.orange"
                    isLoading={isSendingMessage}
                    isDisabled={!currentReport}
                    borderRadius="full"
                    mr={1}
                />
            </Flex>
            </Flex>

            {selectedCrop === 'Personalizado' && showCustomInputs && (
                <Box
                    display={{ base: "none", md: "block" }}
                    bg="whiteAlpha.50"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    p={3}
                >
                    <SimpleGrid columns={2} spacing={3}>
                        <Box>
                            <Text fontSize="xs" color="gray.300" mb={1}>Temperatura base (°C)</Text>
                            <Text fontSize="2xs" color="gray.500" mb={2}>Umbral mínimo para acumular GDD.</Text>
                            <Input
                                size="sm"
                                type="number"
                                value={baseTemp}
                                onChange={(e) => setBaseTemp(Number(e.target.value))}
                                bg="whiteAlpha.100"
                                border="1px solid"
                                borderColor="whiteAlpha.200"
                                borderRadius="lg"
                                w="full"
                                fontSize="xs"
                                color="gray.300"
                                _hover={{ bg: "whiteAlpha.200" }}
                            />
                        </Box>
                        <Box>
                            <Text fontSize="xs" color="gray.300" mb={1}>Temperatura máxima óptima (°C)</Text>
                            <Text fontSize="2xs" color="gray.500" mb={2}>Límite superior recomendado del cultivo.</Text>
                            <Input
                                size="sm"
                                type="number"
                                value={maxTemp}
                                onChange={(e) => setMaxTemp(Number(e.target.value))}
                                bg="whiteAlpha.100"
                                border="1px solid"
                                borderColor="whiteAlpha.200"
                                borderRadius="lg"
                                w="full"
                                fontSize="xs"
                                color="gray.300"
                                _hover={{ bg: "whiteAlpha.200" }}
                            />
                        </Box>
                    </SimpleGrid>
                </Box>
            )}
        </Flex>
      </Box>

      {/* Expanded Chat Modal */}
      <Modal isOpen={isChatModalOpen} onClose={onCloseChatModal} size={{ base: "full", md: "xl" }} isCentered>
        <ModalOverlay backdropFilter="blur(5px)" bg="blackAlpha.600" />
        <ModalContent bg="#1A1A1A" borderRadius="2xl" border="1px solid" borderColor="brand.border" boxShadow="dark-lg">
            <ModalHeader color="white" fontSize="lg" fontWeight="bold">
                <HStack>
                    <Icon as={FiCpu} color="brand.orange" />
                    <Text>Asistente AgroReport</Text>
                </HStack>
            </ModalHeader>
            <ModalCloseButton color="gray.400" />
            <ModalBody pb={6}>
                <VStack spacing={4} align="stretch">
                    <Text fontSize="sm" color="gray.400">
                        Describe tu consulta para obtener un análisis detallado sobre el reporte actual.
                    </Text>
                    <Textarea 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Escribe tu pregunta aquí..."
                        size="lg"
                        minH="200px"
                        bg="whiteAlpha.50"
                        border="1px solid"
                        borderColor="whiteAlpha.200"
                        borderRadius="xl"
                        color="white"
                        _focus={{ borderColor: "brand.orange", boxShadow: "0 0 0 1px #FF6B35" }}
                        p={4}
                        fontSize="md"
                        autoFocus
                    />
                    <HStack justify="space-between">
                         <Button
                            leftIcon={<Icon as={FiMic} />}
                            variant="ghost"
                            colorScheme={isListening ? "red" : "gray"}
                            color={isListening ? "red.400" : "gray.400"}
                            onClick={startListening}
                            isLoading={isListening}
                            loadingText="Escuchando..."
                            size="sm"
                        >
                            {isListening ? "Escuchando..." : "Dictar por voz"}
                        </Button>
                        <Text fontSize="xs" color="gray.500">
                            Presiona Enter para enviar
                        </Text>
                    </HStack>
                </VStack>
            </ModalBody>
            <ModalFooter pt={0}>
                <Button variant="ghost" mr={3} onClick={onCloseChatModal} color="gray.400" _hover={{ color: "white", bg: "whiteAlpha.100" }}>
                    Cancelar
                </Button>
                <Button 
                    colorScheme="orange" 
                    bgGradient="linear(to-r, brand.orange, brand.orangeLight)"
                    _hover={{ 
                        bgGradient: "linear(to-r, brand.orangeLight, brand.orange)",
                        transform: "translateY(-1px)",
                        boxShadow: "lg"
                    }}
                    onClick={handleSendMessage}
                    isLoading={isSendingMessage}
                    leftIcon={<Icon as={FiSend} />}
                    px={8}
                    borderRadius="xl"
                >
                    Enviar Consulta
                </Button>
            </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );
};
