// src/App.jsx
import React, { useState, useEffect } from 'react';
import { ChakraProvider, extendTheme, Box, Container, VStack, Heading, Text, Link, HStack, Image, Button } from '@chakra-ui/react';
// Rutas de importación corregidas para cuando App.jsx está en src/ (estructura estándar)
import OperationSelector from './components/OperationSelector'; // Ahora sí necesita './components/'
import WalletConnect from './components/WalletConnect'; // Ahora sí necesita './components/'
import AxelarBridge from './components/AxelarBridge'; // Ahora sí necesita './components/'
import PuntoRedWithdraw from './components/PuntoRedWithdraw'; // Ahora sí necesita './components/'
import StellarAuth from './components/StellarAuth'; // Ahora sí necesita './components/'

import { WagmiProvider } from 'wagmi';
import { polygon, mainnet, arbitrum } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createConfig, http } from 'wagmi';

const config = createConfig({
  chains: [polygon, mainnet, arbitrum],
  transports: {
    [polygon.id]: http(),
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
  },
});

const queryClient = new QueryClient();

const theme = extendTheme({
  colors: {
    stellarBlue: {
      50: '#E0F2F7', 100: '#B3E0EE', 200: '#84D0E5', 300: '#56BFDC', 400: '#28AFD3',
      500: '#009ECC',
      600: '#0083B0', 700: '#006993', 800: '#004F75', 900: '#003558',
    },
  },
  components: {
    Button: {
      baseStyle: { borderRadius: 'lg' },
      variants: {
        solid: {
          bg: 'stellarBlue.500', color: 'white', _hover: { bg: 'stellarBlue.600' },
        },
      },
    },
  },
});

function App() {
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [walletConnectedEVM, setWalletConnectedEVM] = useState(false);
  // Estados para la dirección Stellar y el JWT, intentando cargar desde localStorage
  const [stellarAddress, setStellarAddress] = useState(localStorage.getItem('stellarAddress') || null);
  const [jwtToken, setJwtToken] = useState(localStorage.getItem('stellarJwt') || null);
  const [amountToBridge, setAmountToBridge] = useState(null);
  const [bridgeComplete, setBridgeComplete] = useState(false);

  // Función para resetear todos los estados y volver a la selección de operación
  const handleGoBack = () => {
    setSelectedOperation(null);
    setWalletConnectedEVM(false);
    // No reseteamos stellarAddress y jwtToken aquí, ya que la autenticación es persistente
    setAmountToBridge(null);
    setBridgeComplete(false);
    // Limpiar parámetros de URL si estamos volviendo de un callback de SEP-24
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  let currentComponent;
  let showGoBackButton = true; // Controla la visibilidad del botón "Volver"

  // Verificar si estamos en un callback de SEP-24 (después de la redirección del ancla)
  const urlParams = new URLSearchParams(window.location.search);
  const callbackTxId = urlParams.get('id');
  const callbackTxStatus = urlParams.get('status');

  if (callbackTxId && jwtToken && stellarAddress) {
    // Si hay un ID de transacción en la URL y estamos autenticados,
    // significa que regresamos del flujo interactivo del ancla.
    // Mostramos directamente el componente de retiro para que monitoree la transacción.
    currentComponent = (
      <PuntoRedWithdraw
        operationType={selectedOperation || "Transacción en curso"} // Puede ser nulo si se llega directamente aquí
        stellarAddress={stellarAddress}
        amount={amountToBridge} // Puede ser nulo
        jwtToken={jwtToken}
        initialTransactionId={callbackTxId}
        initialTransactionStatus={callbackTxStatus}
      />
    );
    // En este caso, el botón "Volver" es útil para reiniciar el flujo
    showGoBackButton = true;
  } else if (!selectedOperation) {
    currentComponent = <OperationSelector setSelectedOperation={setSelectedOperation} />;
    showGoBackButton = false; // No mostrar "Volver" en la pantalla inicial
  } else if (!walletConnectedEVM || !stellarAddress || !jwtToken) {
    currentComponent = (
      <WalletConnect
        onEVMConnect={setWalletConnectedEVM}
        onStellarAuthSuccess={(token, pk) => { // Nueva prop para manejar la autenticación Stellar
          setJwtToken(token);
          setStellarAddress(pk);
          localStorage.setItem('stellarJwt', token); // Persistir JWT
          localStorage.setItem('stellarAddress', pk); // Persistir Stellar Address
        }}
        currentStellarAddress={stellarAddress} // Pasar la dirección Stellar actual para mostrar
      />
    );
  } else if (!bridgeComplete) {
    currentComponent = (
      <AxelarBridge
        onBridgeComplete={(amount) => {
          setBridgeComplete(true);
          setAmountToBridge(amount);
        }}
        token="USDC"
        stellarAddress={stellarAddress}
      />
    );
  } else {
    currentComponent = (
      <PuntoRedWithdraw
        operationType={selectedOperation}
        stellarAddress={stellarAddress}
        amount={amountToBridge}
        jwtToken={jwtToken}
      />
    );
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>
          <Container maxW="container.md" py={10}>
            <VStack spacing={8} align="stretch">
              <Box textAlign="center" mb={10}>
                {/* Contenedor para el logo y el título */}
                <HStack justifyContent="center" alignItems="center" spacing={4} mb={4}>
                  {/* Placeholder para el logo. Puedes reemplazar la URL con tu logo real */}
                  <Image
                    src="https://placehold.co/60x60/009ECC/ffffff?text=LOGO"
                    alt="Dispenser Logo"
                    boxSize="60px"
                    borderRadius="full"
                    fallbackSrc="https://placehold.co/60x60/009ECC/ffffff?text=LOGO" // Fallback si la imagen no carga
                  />
                  <Heading
                    as="h1"
                    size="2xl"
                    fontSize={{ base: "3xl", md: "5xl" }} // Tamaño de fuente responsivo
                    bgGradient="linear(to-r, stellarBlue.500, stellarBlue.700)" // Degradado para más vida
                    bgClip="text" // Aplica el degradado al texto
                    fontWeight="extrabold" // Hace el texto más grueso
                  >
                    🌟 Dispenser
                  </Heading>
                </HStack>
                <Text fontSize="xl" color="gray.700" maxW="lg" mx="auto">
                  Tu puerta de entrada a servicios financieros sin fronteras en Colombia.
                </Text>
              </Box>

              {/* Botón "Volver" - visible solo cuando showGoBackButton es true */}
              {showGoBackButton && (
                <Button
                  onClick={handleGoBack}
                  variant="outline"
                  colorScheme="gray"
                  alignSelf="flex-start"
                  mb={4}
                  leftIcon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>}
                >
                  Volver
                </Button>
              )}

              {currentComponent}

              <Box textAlign="center" mt={12} py={4} bg="gray.50" borderRadius="md">
                <Text fontSize="sm" color="gray.600">
                  Construido para el {" "}
                  <Link href="https://star-maker-hub.vercel.app/hackathon" isExternal color="stellarBlue.500" fontWeight="bold">
                    Stellar LATAM Hackathon
                  </Link>
                  {" "} - Track 1: Dinero sin fronteras.
                </Text>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Equipo [Tu Nombre de Equipo] © {new Date().getFullYear()}
                </Text>
              </Box>
            </VStack>
          </Container>
        </ChakraProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
