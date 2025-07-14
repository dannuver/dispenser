// src/components/WalletConnect.jsx
import React from 'react';
import { VStack, Text, Box } from '@chakra-ui/react';
// Ya no necesitamos wagmi si ocultamos EVM por ahora
// import { useConnect, useAccount, useDisconnect } from 'wagmi';
// import { injected } from 'wagmi/connectors';
import StellarAuth from './StellarAuth'; // Importar el componente de autenticación Stellar

function WalletConnect({ onStellarAuthSuccess, currentStellarAddress }) {
  // Las props de EVM (onEVMConnect) ya no se usan directamente aquí si ocultamos EVM
  // const { connect, connectors, status: evmConnectStatus, error: evmConnectError } = useConnect();
  // const { address: evmAddress, isConnected: isEVMConnected, status: evmAccountStatus } = useAccount();
  // const { disconnect } = useDisconnect();
  // const toast = useToast();

  // Efecto para notificar al padre sobre la conexión EVM (comentado)
  // useEffect(() => {
  //   onEVMConnect(isEVMConnected);
  //   if (isEVMConnected && evmAddress) {
  //     toast({
  //       title: 'Wallet EVM conectada',
  //       description: `Dirección: ${evmAddress}`,
  //       status: 'success',
  //       duration: 3000,
  //       isClosable: true,
  //     });
  //   }
  // }, [isEVMConnected, evmAddress, onEVMConnect, toast]);

  // Manejar errores de conexión EVM (comentado)
  // useEffect(() => {
  //   if (evmConnectError) {
  //     toast({
  //       title: 'Error de conexión EVM',
  //       description: evmConnectError.message,
  //       status: 'error',
  //       duration: 5000,
  //       isClosable: true,
  //     });
  //   }
  // }, [evmConnectError, toast]);

  return (
    <VStack spacing={6} p={6} borderWidth="1px" borderRadius="lg" w="full" boxShadow="md">
      <Text fontSize="xl" fontWeight="bold">Paso 1: Conecta y Autentica tu Wallet Stellar</Text>

      {/* Sección de Conexión EVM (ocultada temporalmente) */}
      {/*
      <Box w="full" p={4} borderWidth="1px" borderRadius="md">
        <HStack justifyContent="space-between" alignItems="center" w="full">
          <VStack align="flex-start" spacing={1}>
            <Text fontWeight="semibold">Wallet EVM (MetaMask)</Text>
            {isEVMConnected && evmAddress ? (
              <Text fontSize="sm" color="green.600">
                Conectada: {evmAddress.substring(0, 6)}...{evmAddress.substring(evmAddress.length - 4)}
              </Text>
            ) : (
              <Text fontSize="sm" color="orange.500">No conectada</Text>
            )}
          </VStack>
          {isEVMConnected ? (
            <Button onClick={() => disconnect()} colorScheme="red" size="sm">
              Desconectar
            </Button>
          ) : (
            <Button
              onClick={() => connect({ connector: injected() })}
              isLoading={evmConnectStatus === 'pending'}
              isDisabled={evmConnectStatus === 'connecting'}
              colorScheme="purple"
              size="sm"
            >
              {evmConnectStatus === 'pending' ? <Spinner size="sm" /> : 'Conectar MetaMask'}
            </Button>
          )}
        </HStack>
      </Box>
      */}

      {/* Sección de Autenticación Stellar (usando StellarAuth) */}
      <StellarAuth onAuthSuccess={onStellarAuthSuccess} currentStellarAddress={currentStellarAddress} />

      <Text fontSize="sm" color="gray.500" textAlign="center">
        La autenticación con tu Stellar Wallet es necesaria para las operaciones.
      </Text>
    </VStack>
  );
}

export default WalletConnect;
