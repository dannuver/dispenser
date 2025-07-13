// src/components/WalletConnect.jsx
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { getPublicKey, isAllowed } from "@stellar/freighter-api";
import React, { useEffect, useState } from 'react';
import { Button, VStack, Text, Box, Spinner, useToast, Icon, Heading, Flex, Spacer } from '@chakra-ui/react';
import { FaWallet, FaEthereum, FaLink, FaCheckCircle, FaTimesCircle, FaAngleRight } from 'react-icons/fa';

export function WalletConnect({ onEVMConnect, onStellarConnect, currentStellarAddress }) {
  const { address: evmAddress, isConnected: isEVMConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const [stellarAddress, setStellarAddress] = useState(currentStellarAddress);
  const [isConnectingStellar, setIsConnectingStellar] = useState(false);

  const toast = useToast();

  useEffect(() => {
    onEVMConnect(isEVMConnected);
  }, [isEVMConnected, onEVMConnect]);

  useEffect(() => {
    setStellarAddress(currentStellarAddress);
  }, [currentStellarAddress]);

  const handleConnectStellar = async () => {
    setIsConnectingStellar(true);
    try {
      const allowed = await isAllowed();
      if (!allowed) {
        toast({
          title: 'Permiso para Freighter',
          description: 'Por favor, abre la extensión de Freighter y permite la conexión.',
          status: 'info',
          duration: 5000,
          isClosable: true,
          position: 'top', // Mensaje en la parte superior
        });
        await getPublicKey();
      }

      const publicKey = await getPublicKey();
      if (publicKey) {
        setStellarAddress(publicKey);
        onStellarConnect(publicKey);
        toast({
          title: 'Wallet Stellar Conectada',
          description: `Conectado con Freighter: ${publicKey.substring(0, 4)}...${publicKey.substring(publicKey.length - 4)}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
          position: 'top',
        });
      } else {
        throw new Error("No se pudo obtener la clave pública de Freighter.");
      }
    } catch (error) {
      console.error("Error conectando wallet Stellar:", error);
      toast({
        title: 'Error al conectar Stellar',
        description: 'Asegúrate de tener Freighter instalado y activo. ' + (error.message || ''),
        status: 'error',
        duration: 7000,
        isClosable: true,
        position: 'top',
      });
    } finally {
      setIsConnectingStellar(false);
    }
  };

  return (
    <VStack spacing={6} p={6} shadow="lg" borderWidth="1px" borderRadius="xl" width="100%" maxWidth="md" mx="auto" bg="white">
      <Heading as="h3" size="lg" mb={4} color="stellarBlue.700">Paso 1: Conecta tus Wallets</Heading>

      {/* Conexión EVM Wallet (MetaMask) */}
      <Box width="100%">
        <Text mb={2} fontWeight="semibold" fontSize="md">Wallet EVM (ej. MetaMask):</Text>
        {isEVMConnected ? (
          <Flex p={4} bg="green.50" borderRadius="lg" alignItems="center" justifyContent="space-between" boxShadow="sm">
            <Icon as={FaCheckCircle} color="green.500" w={5} h={5} mr={3} />
            <Text flex="1" fontSize="sm" color="green.700" fontWeight="medium">
              Conectada: {evmAddress ? `${evmAddress.substring(0, 6)}...${evmAddress.substring(evmAddress.length - 4)}` : ''}
            </Text>
            <Button size="sm" colorScheme="red" onClick={() => disconnect()} variant="ghost">Desconectar</Button>
          </Flex>
        ) : (
          <Button leftIcon={<FaEthereum />} colorScheme="blue" onClick={() => connect({ connector: injected() })} width="100%" size="lg" py={6} borderRadius="lg" boxShadow="md" _hover={{ boxShadow: "lg" }}>
            Conectar Wallet EVM
          </Button>
        )}
      </Box>

      {/* Conexión Stellar Wallet (Freighter) */}
      <Box width="100%">
        <Text mb={2} fontWeight="semibold" fontSize="md">Wallet Stellar (Freighter):</Text>
        {stellarAddress ? (
          <Flex p={4} bg="green.50" borderRadius="lg" alignItems="center" justifyContent="space-between" boxShadow="sm">
            <Icon as={FaCheckCircle} color="green.500" w={5} h={5} mr={3} />
            <Text flex="1" fontSize="sm" color="green.700" fontWeight="medium">
              Conectada: {stellarAddress ? `${stellarAddress.substring(0, 6)}...${stellarAddress.substring(stellarAddress.length - 4)}` : ''}
            </Text>
            <Button size="sm" colorScheme="red" onClick={() => { setStellarAddress(null); onStellarConnect(null); }} variant="ghost">Desconectar</Button>
          </Flex>
        ) : (
          <Button
            leftIcon={<FaLink />}
            colorScheme="blue"
            onClick={handleConnectStellar}
            isLoading={isConnectingStellar}
            loadingText="Conectando..."
            width="100%"
            size="lg" py={6} borderRadius="lg" boxShadow="md" _hover={{ boxShadow: "lg" }}
          >
            Conectar Wallet Stellar
          </Button>
        )}
      </Box>

      {(!isEVMConnected || !stellarAddress) && (
        <Flex p={3} bg="orange.50" borderRadius="lg" width="100%" alignItems="center" boxShadow="sm">
          <Icon as={FaTimesCircle} color="orange.500" w={5} h={5} mr={3} />
          <Text color="orange.700" fontSize="sm" fontWeight="medium">
            Conecta ambas wallets para continuar con la operación.
          </Text>
        </Flex>
      )}
    </VStack>
  );
}

export default WalletConnect;