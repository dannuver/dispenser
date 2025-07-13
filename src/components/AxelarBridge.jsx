// src/components/AxelarBridge.jsx
import React, { useState } from 'react';
import { Box, Button, FormControl, FormLabel, Input, Select, VStack, Text, useToast, Spinner, Heading, Flex, Progress } from '@chakra-ui/react';

function AxelarBridge({ onBridgeComplete, token, stellarAddress }) {
  const [amount, setAmount] = useState('');
  const [sourceNetwork, setSourceNetwork] = useState('polygon');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0); // Para la barra de progreso
  const toast = useToast();

  const handleBridge = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: 'Cantidad inválida',
        description: 'Por favor, ingresa una cantidad válida para puentear.',
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });
      return;
    }

    if (!stellarAddress) {
      toast({
        title: 'Wallet Stellar No Conectada',
        description: 'Por favor, conecta tu wallet Stellar (Freighter).',
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });
      return;
    }

    setIsLoading(true);
    setProgress(0); // Reinicia el progreso
    toast({
      title: 'Iniciando Bridge (Simulación)',
      description: `Simulando puenteo de ${parsedAmount} ${token.toUpperCase()} desde ${sourceNetwork} a Stellar...`,
      status: 'info',
      duration: 900000,
      isClosable: true,
      position: 'top',
    });

    // Simulación de progreso
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress += 20;
      if (currentProgress >= 100) {
        clearInterval(progressInterval);
        currentProgress = 100;
      }
      setProgress(currentProgress);
    }, 500); // Actualiza cada 0.5 segundos

    setTimeout(() => {
      clearInterval(progressInterval); // Asegura que el intervalo se detenga
      setIsLoading(false);
      setProgress(100); // Asegura que la barra llega al 100%
      toast({
        title: 'Bridge Completado (Simulación)',
        description: `Fondos simuladamente puenteados a Stellar. Ahora puedes usar ${token.toUpperCase()} en PuntoRed.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });
      onBridgeComplete(parsedAmount);
    }, 3000);
  };

  return (
    <VStack spacing={6} p={6} shadow="lg" borderWidth="1px" borderRadius="xl" width="100%" maxWidth="md" mx="auto" bg="white">
      <Heading as="h3" size="lg" mb={4} color="stellarBlue.700">Paso 2: Enviar fondos a Stellar</Heading>
      <Text fontSize="md" color="gray.600">
        Ingresa la cantidad de {token.toUpperCase()} que deseas puentear y desde qué red EVM.
      </Text>

      <FormControl id="source-network-bridge" isRequired>
        <FormLabel fontSize="md" fontWeight="semibold">Red de Origen (EVM)</FormLabel>
        <Select value={sourceNetwork} onChange={(e) => setSourceNetwork(e.target.value)} isDisabled={isLoading} size="lg" borderRadius="lg">
          <option value="polygon">Polygon</option>
          <option value="ethereum">Ethereum</option>
          <option value="arbitrum">Arbitrum</option>
          {/* Agrega más redes que Axelar soporte */}
        </Select>
      </FormControl>

      <FormControl id="amount-bridge" isRequired>
        <FormLabel fontSize="md" fontWeight="semibold">Cantidad de {token.toUpperCase()}</FormLabel>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`Ej: 50 ${token.toUpperCase()}`}
          isDisabled={isLoading}
          size="lg"
          borderRadius="lg"
        />
      </FormControl>

      {isLoading && (
        <Box width="100%">
          <Text fontSize="sm" color="blue.600" mb={2}>Progreso del Bridge:</Text>
          <Progress value={progress} size="md" colorScheme="blue" hasStripe isAnimated={progress < 100} borderRadius="md" />
        </Box>
      )}

      <Button
        colorScheme="blue"
        size="lg"
        onClick={handleBridge}
        isDisabled={isLoading || !amount || !stellarAddress}
        isLoading={isLoading}
        loadingText="Simulando bridge..."
        width="100%" py={6} borderRadius="lg" boxShadow="md" _hover={{ boxShadow: "lg" }}
      >
        Iniciar Bridge a Stellar (Simulado)
      </Button>

      {!stellarAddress && (
        <Flex p={3} bg="orange.50" borderRadius="lg" width="100%" alignItems="center" boxShadow="sm">
          <Icon as={FaTimesCircle} color="orange.500" w={5} h={5} mr={3} />
          <Text color="orange.700" fontSize="sm" fontWeight="medium">
            Conecta tu wallet Stellar para continuar.
          </Text>
        </Flex>
      )}
    </VStack>
  );
}

export default AxelarBridge;