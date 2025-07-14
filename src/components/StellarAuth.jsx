// src/components/StellarAuth.jsx
import React, { useState } from 'react';
import { Button, VStack, Text, useToast, Spinner, Box, HStack } from '@chakra-ui/react';
import { getPublicKey, signTransaction } from '@stellar/freighter-api'; // Importación correcta
import { Networks } from 'stellar-sdk'; // Importamos Networks de stellar-sdk

// ¡IMPORTANTE! Reemplaza con el dominio real de PuntoRed.
// Este es el 'home_domain' del ancla, donde se aloja el archivo stellar.toml.
const ANCHOR_HOME_DOMAIN = 'https://puntored-anchor.com'; // Ejemplo: 'https://testanchor.stellar.org'
const STELLAR_NETWORK = Networks.TESTNET; // Cambia a Networks.PUBLIC para la red principal de Stellar

// Función auxiliar para obtener el stellar.toml y extraer el WEB_AUTH_ENDPOINT
async function getWebAuthEndpoint(homeDomain) {
  try {
    const response = await fetch(`${homeDomain}/.well-known/stellar.toml`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stellar.toml: ${response.statusText}`);
    }
    const tomlText = await response.text();

    // Parsear el TOML para encontrar WEB_AUTH_ENDPOINT
    // Esto es una simplificación; en un entorno de producción, usarías una librería TOML parser
    const webAuthEndpointMatch = tomlText.match(/WEB_AUTH_ENDPOINT\s*=\s*"(.*)"/);
    if (webAuthEndpointMatch && webAuthEndpointMatch[1]) {
      return webAuthEndpointMatch[1];
    } else {
      // Fallback si WEB_AUTH_ENDPOINT no está en stellar.toml (no recomendado por SEP-10)
      console.warn('WEB_AUTH_ENDPOINT not found in stellar.toml. Falling back to home domain + /auth.');
      return `${homeDomain}/auth`;
    }
  } catch (error) {
    console.error('Error fetching or parsing stellar.toml:', error);
    // Fallback en caso de error al obtener el stellar.toml
    return `${homeDomain}/auth`;
  }
}

function StellarAuth({ onAuthSuccess, currentStellarAddress }) {
  const [loading, setLoading] = useState(false);
  const [jwtToken, setJwtToken] = useState(null);
  const toast = useToast();

  // Función para autenticar con la wallet Stellar (SEP-10)
  const authenticateWithStellar = async () => {
    setLoading(true);
    try {
      // *** INICIO DE LA DEPURACIÓN ***
      console.log('Tipo de getPublicKey:', typeof getPublicKey);
      if (typeof getPublicKey !== 'function') {
        throw new Error('getPublicKey is not a function. Check Freighter API import and installation.');
      }
      // *** FIN DE LA DEPURACIÓN ***

      // 1. Obtener la clave pública de la wallet Stellar (Freighter)
      const publicKey = await getPublicKey();
      if (!publicKey) {
        throw new Error('No Stellar wallet connected or public key not available. Ensure Freighter is active.');
      }

      // 2. Descubrir el WEB_AUTH_ENDPOINT desde stellar.toml
      const webAuthEndpoint = await getWebAuthEndpoint(ANCHOR_HOME_DOMAIN);
      console.log('Using WEB_AUTH_ENDPOINT:', webAuthEndpoint);

      // 3. Obtener la transacción de desafío (challenge transaction) del ancla (SEP-10 /auth endpoint)
      const authInfoResponse = await fetch(`${webAuthEndpoint}?account=${publicKey}`);
      if (!authInfoResponse.ok) {
        const errorText = await authInfoResponse.text(); // Leer el cuerpo del error
        throw new Error(`Error fetching auth challenge: ${authInfoResponse.status} - ${errorText}`);
      }
      const authInfo = await authInfoResponse.json();
      const challengeXDR = authInfo.transaction; // La transacción de desafío en formato XDR

      // 4. Firmar la transacción de desafío con Freighter
      const signedXDR = await signTransaction(challengeXDR, { network: STELLAR_NETWORK });

      // 5. Enviar la transacción firmada de vuelta al ancla para obtener el JWT
      const tokenResponse = await fetch(webAuthEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transaction: signedXDR }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text(); // Leer el cuerpo del error
        throw new Error(`Error getting JWT: ${tokenResponse.status} - ${errorText}`);
      }
      const tokenData = await tokenResponse.json();
      const token = tokenData.token; // El JWT (JSON Web Token)

      setJwtToken(token);
      // Almacenar el JWT y la clave pública en localStorage para persistencia
      localStorage.setItem('stellarJwt', token);
      localStorage.setItem('stellarAddress', publicKey);
      onAuthSuccess(token, publicKey); // Notificar al componente padre (App.jsx)

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
        description: error.message || 'No se pudo autenticar con la wallet Stellar. Asegúrate de que Freighter esté conectado y la red sea correcta.',
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
        <Text fontSize="sm" color="gray.600">
          Wallet conectada: <Text as="span" fontWeight="bold">{currentStellarAddress.substring(0, 8)}...{currentStellarAddress.substring(currentStellarAddress.length - 8)}</Text>
        </Text>
      )}
      <Button
        onClick={authenticateWithStellar}
        isLoading={loading}
        isDisabled={!!jwtToken && !!currentStellarAddress && !loading} // Deshabilitar si ya está autenticado
        colorScheme="teal"
        size="lg"
        width="full"
      >
        {loading ? (
          <HStack>
            <Spinner size="sm" />
            <Text>Autenticando...</Text>
          </HStack>
        ) : (
          jwtToken ? 'Autenticado con Stellar' : 'Autenticar con Stellar Wallet'
        )}
      </Button>
      {jwtToken && <Text fontSize="sm" color="green.600">JWT obtenido y almacenado.</Text>}
      {!currentStellarAddress && (
        <Text fontSize="sm" color="orange.500">
          Asegúrate de que Freighter esté instalado y conectado.
        </Text>
      )}
    </VStack>
  );
}

export default StellarAuth;