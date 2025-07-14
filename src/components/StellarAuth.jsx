// src/components/StellarAuth.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Button, VStack, Text, useToast, Spinner, Box, HStack } from '@chakra-ui/react';
import { Networks, TransactionBuilder, Operation, Server, Asset } from 'stellar-sdk'; // Importamos Server y Asset
import { kit, setStellarKitWallet, getStellarKitPublicKey, disconnectStellarKitWallet } from '../utils/stellarKit'; // Importamos desde el archivo de utilidad

// ¡IMPORTANTE! Reemplaza con el dominio real de PuntoRed.
const ANCHOR_HOME_DOMAIN = 'https://puntored-anchor.com'; // Ejemplo: 'https://testanchor.stellar.org'
const STELLAR_NETWORK = Networks.TESTNET; // Cambia a Networks.PUBLIC para la red principal de Stellar
const STELLAR_RPC_URL = 'https://soroban-testnet.stellar.org:443'; // URL del RPC de Stellar (Horizon)

// Función auxiliar para obtener el stellar.toml y extraer el WEB_AUTH_ENDPOINT
async function getWebAuthEndpoint(homeDomain) {
  try {
    const response = await fetch(`${homeDomain}/.well-known/stellar.toml`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stellar.toml: ${response.statusText}`);
    }
    const tomlText = await response.text();

    const webAuthEndpointMatch = tomlText.match(/WEB_AUTH_ENDPOINT\s*=\s*"(.*)"/);
    if (webAuthEndpointMatch && webAuthEndpointMatch[1]) {
      return webAuthEndpointMatch[1];
    } else {
      console.warn('WEB_AUTH_ENDPOINT not found in stellar.toml. Falling back to home domain + /auth.');
      return `${homeDomain}/auth`;
    }
  } catch (error) {
    console.error('Error fetching or parsing stellar.toml:', error);
    return `${homeDomain}/auth`;
  }
}

function StellarAuth({ onAuthSuccess, currentStellarAddress }) {
  const [loading, setLoading] = useState(false);
  const [jwtToken, setJwtToken] = useState(null);
  const [isConnected, setIsConnected] = useState(false); // Estado para saber si alguna wallet está conectada
  const toast = useToast();

  // Función para establecer la wallet seleccionada y guardarla en localStorage
  const handleSetWallet = useCallback(async (walletId) => {
    await setStellarKitWallet(walletId);
    setIsConnected(true);
  }, []);

  // Efecto para verificar el estado de la conexión al cargar el componente
  useEffect(() => {
    const checkConnectionStatus = async () => {
      try {
        const publicKey = await getStellarKitPublicKey();
        if (publicKey) {
          setIsConnected(true);
          // Reestablecer JWT y dirección en el padre si están en localStorage
          onAuthSuccess(localStorage.getItem('stellarJwt'), publicKey);
        } else {
          setIsConnected(false);
          localStorage.removeItem('stellarJwt');
          localStorage.removeItem('stellarAddress');
          localStorage.removeItem('selectedWalletId');
        }
      } catch (error) {
        console.error('Error al verificar conexión de wallet Stellar:', error);
        setIsConnected(false);
        localStorage.removeItem('stellarJwt');
        localStorage.removeItem('stellarAddress');
        localStorage.removeItem('selectedWalletId');
      }
    };
    checkConnectionStatus();
  }, [onAuthSuccess]);

  // Función para abrir el modal de conexión de StellarWalletsKit
  const connectStellarWallet = async () => {
    setLoading(true);
    try {
      await kit.openModal({
        onWalletSelected: async (option) => {
          try {
            await handleSetWallet(option.id);
            const publicKey = await getStellarKitPublicKey();
            await authenticateWithStellar(publicKey);
          } catch (e) {
            console.error('Error al seleccionar wallet o autenticar:', e);
            toast({
              title: 'Error al conectar/autenticar',
              description: e.message || 'No se pudo conectar o autenticar la wallet Stellar.',
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
          } finally {
            setLoading(false);
          }
          return option.id;
        },
      });
    } catch (error) {
      console.error('Error al abrir el modal de conexión:', error);
      toast({
        title: 'Error de conexión',
        description: error.message || 'No se pudo abrir el modal de conexión de la wallet.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setLoading(false);
    }
  };

  // Función para autenticar con la wallet Stellar (SEP-10)
  const authenticateWithStellar = async (publicKey) => {
    setLoading(true);
    try {
      if (!publicKey) {
        throw new Error('No Stellar public key available for authentication.');
      }

      const webAuthEndpoint = await getWebAuthEndpoint(ANCHOR_HOME_DOMAIN);
      console.log('Using WEB_AUTH_ENDPOINT:', webAuthEndpoint);

      const authInfoResponse = await fetch(`${webAuthEndpoint}?account=${publicKey}`);
      if (!authInfoResponse.ok) {
        const errorText = await authInfoResponse.text();
        throw new Error(`Error fetching auth challenge: ${authInfoResponse.status} - ${errorText}`);
      }
      const authInfo = await authInfoResponse.json();
      const challengeXDR = authInfo.transaction;

      const signedXDR = await kit.signTransaction(challengeXDR, STELLAR_NETWORK); // kit.signTransaction requiere la network passphrase

      const tokenResponse = await fetch(webAuthEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transaction: signedXDR }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Error getting JWT: ${tokenResponse.status} - ${errorText}`);
      }
      const tokenData = await tokenResponse.json();
      const token = tokenData.token;

      setJwtToken(token);
      localStorage.setItem('stellarJwt', token);
      localStorage.setItem('stellarAddress', publicKey);
      onAuthSuccess(token, publicKey);

      toast({
        title: 'Autenticación Stellar exitosa',
        description: 'Ahora puedes interactuar con el ancla.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

    } catch (error) {
      console.error('Error durante la autenticación Stellar:', error);
      toast({
        title: 'Error de autenticación',
        description: error.message || 'Ocurrió un error al autenticar con la wallet Stellar. Revisa la consola para más detalles.',
        status: 'error',
        duration: 9000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <VStack spacing={4} p={4} borderWidth="1px" borderRadius="lg" w="full">
      <Text fontSize="md" fontWeight="bold">Autenticación Stellar Wallet</Text>
      {currentStellarAddress && (
        <Text fontSize="sm" color="green.600">
          Wallet conectada: <Text as="span" fontWeight="bold">{currentStellarAddress.substring(0, 8)}...{currentStellarAddress.substring(currentStellarAddress.length - 8)}</Text>
        </Text>
      )}

      {!jwtToken ? (
        <Button
          onClick={connectStellarWallet}
          isLoading={loading}
          isDisabled={loading}
          colorScheme="teal"
          size="lg"
          width="full"
        >
          {loading ? (
            <HStack>
              <Spinner size="sm" />
              <Text>Conectando...</Text>
            </HStack>
          ) : (
            'Conectar/Autenticar Stellar Wallet'
          )}
        </Button>
      ) : (
        <VStack w="full">
          <Text fontSize="md" color="green.600" fontWeight="bold">¡Autenticado con Stellar!</Text>
        </VStack>
      )}

      {jwtToken && <Text fontSize="sm" color="green.600">JWT obtenido y almacenado.</Text>}
      {!isConnected && !loading && !jwtToken && (
        <Text fontSize="sm" color="orange.500" textAlign="center">
          Haz clic en "Conectar/Autenticar Stellar Wallet" para elegir tu billetera (ej. Freighter).
        </Text>
      )}
    </VStack>
  );
}

export default StellarAuth;