// src/components/StellarAuth.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Button, VStack, Text, useToast, Spinner, Box, HStack } from '@chakra-ui/react';
import { Networks } from 'stellar-sdk'; // Importamos Networks de stellar-sdk

// Importar StellarWalletsKit y sus módulos
import {
  allowAllModules,
  FREIGHTER_ID, // ID para referenciar a Freighter en StellarWalletsKit
  StellarWalletsKit,
} from '@creit.tech/stellar-wallets-kit';

// ¡IMPORTANTE! Reemplaza con el dominio real de PuntoRed.
// Este es el 'home_domain' del ancla, donde se aloja el archivo stellar.toml.
const ANCHOR_HOME_DOMAIN = 'https://puntored-anchor.com'; // Ejemplo: 'https://testanchor.stellar.org'
const STELLAR_NETWORK = Networks.TESTNET; // Cambia a Networks.PUBLIC para la red principal de Stellar

// --- Configuración e inicialización de StellarWalletsKit ---
// La red se obtiene de las variables de entorno o se hardcodea si es necesario.
// Para un proyecto Vite, si tuvieras PUBLIC_STELLAR_NETWORK_PASSPHRASE en .env,
// lo accederías con import.meta.env.PUBLIC_STELLAR_NETWORK_PASSPHRASE.
const STELLAR_NETWORK_PASSPHRASE = Networks.TESTNET; // Usamos Networks.TESTNET como passphrase para el kit

// Inicializar el kit fuera del componente para que persista a través de renders
const SELECTED_WALLET_ID_KEY = "selectedWalletId";
const kit = new StellarWalletsKit({
  modules: allowAllModules(), // Permite todas las billeteras soportadas por el kit
  network: STELLAR_NETWORK_PASSPHRASE,
  // Intentamos obtener la wallet seleccionada previamente de localStorage, si no, usamos Freighter como predeterminado.
  selectedWalletId: localStorage.getItem(SELECTED_WALLET_ID_KEY) ?? FREIGHTER_ID,
});

// Función auxiliar para obtener el stellar.toml y extraer el WEB_AUTH_ENDPOINT
async function getWebAuthEndpoint(homeDomain) {
  try {
    const response = await fetch(`${homeDomain}/.well-known/stellar.toml`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stellar.toml: ${response.statusText}`);
    }
    const tomlText = await response.text();

    // Parsear el TOML para encontrar WEB_AUTH_ENDPOINT
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
  const setWallet = useCallback(async (walletId) => {
    localStorage.setItem(SELECTED_WALLET_ID_KEY, walletId);
    await kit.setWallet(walletId);
    setIsConnected(true);
  }, []);

  // Función para desconectar la wallet
  const disconnectWallet = useCallback(async () => {
    localStorage.removeItem(SELECTED_WALLET_ID_KEY);
    localStorage.removeItem('stellarJwt'); // Limpiar JWT también
    localStorage.removeItem('stellarAddress'); // Limpiar dirección Stellar
    await kit.disconnect();
    setJwtToken(null);
    onAuthSuccess(null, null); // Limpiar en el padre
    setIsConnected(false);
    toast({
      title: 'Wallet Stellar desconectada',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  }, [onAuthSuccess, toast]);

  // Efecto para verificar el estado de la conexión al cargar el componente
  useEffect(() => {
    const checkConnectionStatus = async () => {
      try {
        const storedWalletId = localStorage.getItem(SELECTED_WALLET_ID_KEY);
        if (storedWalletId) {
          await kit.setWallet(storedWalletId); // Intentar reestablecer la wallet
          const { address } = await kit.getAddress(); // Obtener la dirección
          if (address) {
            setIsConnected(true);
            // Reestablecer JWT y dirección en el padre si están en localStorage
            onAuthSuccess(localStorage.getItem('stellarJwt'), address);
          } else {
            // Si no se puede obtener la dirección, la conexión no es válida
            setIsConnected(false);
            localStorage.removeItem(SELECTED_WALLET_ID_KEY);
            localStorage.removeItem('stellarJwt');
            localStorage.removeItem('stellarAddress');
          }
        }
      } catch (error) {
        console.error('Error al verificar conexión de wallet Stellar:', error);
        setIsConnected(false);
        localStorage.removeItem(SELECTED_WALLET_ID_KEY);
        localStorage.removeItem('stellarJwt');
        localStorage.removeItem('stellarAddress');
      }
    };
    checkConnectionStatus();
  }, [onAuthSuccess]); // Se ejecuta una vez al montar

  // Función para abrir el modal de conexión de StellarWalletsKit
  const connectStellarWallet = async () => {
    setLoading(true); // Activar loading cuando se abre el modal
    try {
      await kit.openModal({
        onWalletSelected: async (option) => {
          try {
            await setWallet(option.id); // Establecer la wallet seleccionada
            // Una vez que la wallet está seleccionada y conectada, procedemos a la autenticación SEP-10
            const { address } = await kit.getAddress(); // Obtener la clave pública de la wallet conectada
            await authenticateWithStellar(address);
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
            setLoading(false); // Desactivar loading al finalizar
          }
          return option.id; // Retorna el ID de la wallet seleccionada
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
      setLoading(false); // Desactivar loading si falla la apertura del modal
    }
  };

  // Función para autenticar con la wallet Stellar (SEP-10)
  const authenticateWithStellar = async (publicKey) => {
    setLoading(true); // Mantener loading durante el proceso de autenticación SEP-10
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

      // Usar kit.signTransaction para firmar la transacción de desafío
      const signedXDR = await kit.signTransaction(challengeXDR, STELLAR_NETWORK); // StellarWalletsKit requiere la network passphrase

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
      localStorage.setItem('stellarAddress', publicKey); // Asegurar que la dirección se guarda
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
      setLoading(false); // Desactivar loading al finalizar la autenticación
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

      {/* Botón para conectar/autenticar o mostrar estado de autenticado */}
      {!jwtToken ? ( // Si no hay JWT, mostrar botón de conectar/autenticar
        <Button
          onClick={connectStellarWallet}
          isLoading={loading}
          isDisabled={loading} // Deshabilitar mientras el modal se abre o se autentica
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
      ) : ( // Si ya hay JWT, mostrar que está autenticado y opción de desconectar
        <VStack w="full">
          <Text fontSize="md" color="green.600" fontWeight="bold">¡Autenticado con Stellar!</Text>
          <Button
            onClick={disconnectWallet}
            colorScheme="red"
            size="md"
            width="full"
          >
            Desconectar Stellar Wallet
          </Button>
        </VStack>
      )}

      {jwtToken && <Text fontSize="sm" color="green.600">JWT obtenido y almacenado.</Text>}
      {/* Mensaje de ayuda si no hay conexión y no está cargando */}
      {!isConnected && !loading && !jwtToken && (
        <Text fontSize="sm" color="orange.500" textAlign="center">
          Haz clic en "Conectar/Autenticar Stellar Wallet" para elegir tu billetera (ej. Freighter).
        </Text>
      )}
    </VStack>
  );
}

export default StellarAuth;