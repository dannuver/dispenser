// src/App.jsx
import React, { useState, useEffect } from 'react';
import { ChakraProvider, extendTheme, Box, Container, VStack, Heading, Text, Link, HStack, Image, Button } from '@chakra-ui/react';
// Rutas de importación corregidas para cuando App.jsx está en src/ (estructura estándar)
import OperationSelector from './components/OperationSelector';
import WalletConnect from './components/WalletConnect';
import AxelarBridge from './components/AxelarBridge';
import PuntoRedWithdraw from './components/PuntoRedWithdraw';
import StellarAuth from './components/StellarAuth'; // Asegúrate de que esta importación sea correcta

import { WagmiProvider } from 'wagmi';
import { polygon, mainnet, arbitrum } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createConfig, http } from 'wagmi';

// Importar la función de desconexión del kit
import { disconnectStellarKitWallet } from './utils/stellarKit';

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
  const [walletConnectedEVM, setWalletConnectedEVM] = useState(false); // Mantener para futura re-activación si es necesario
  // Estados para la dirección Stellar y el JWT, intentando cargar desde localStorage
  const [stellarAddress, setStellarAddress] = useState(localStorage.getItem('stellarAddress') || null);
  const [jwtToken, setJwtToken] = useState(localStorage.getItem('stellarJwt') || null);
  const [amountToBridge, setAmountToBridge] = useState(null);
  const [bridgeComplete, setBridgeComplete] = useState(false);

  // Función para resetear todos los estados relacionados con el flujo de operación
  const handleGoBack = () => {
    setSelectedOperation(null);
    setWalletConnectedEVM(false); // Resetear EVM también si se oculta
    setAmountToBridge(null);
    setBridgeComplete(false); // Resetear el estado del puenteo al volver
    // Limpiar parámetros de URL si estamos volviendo de un callback de SEP-24
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  // Nueva función para desconectar la billetera Stellar
  const handleStellarDisconnect = async () => {
    await disconnectStellarKitWallet(); // Usar la función de utilidad
    setJwtToken(null);
    setStellarAddress(null);
    // Resetear también los estados de operación para volver a la pantalla de conexión
    setSelectedOperation(null);
    setWalletConnectedEVM(false);
    setAmountToBridge(null);
    setBridgeComplete(false);
    // Opcional: Mostrar un toast de desconexión
  };

  let currentComponent;
  let showGoBackButton = true; // Controla la visibilidad del botón "Volver"

  // Verificar si estamos en un callback de SEP-24 (después de la redirección del ancla)
  const urlParams = new URLSearchParams(window.location.search);
  const callbackTxId = urlParams.get('id');
  const callbackTxStatus = urlParams.get('status');

  // --- Lógica del Flujo de la Aplicación ---
  if (callbackTxId && jwtToken && stellarAddress) {
    // Caso 1: Regreso de un flujo interactivo de SEP-24 del ancla
    // Si hay un ID de transacción en la URL y estamos autenticados,
    // mostramos directamente el componente de retiro para que monitoree la transacción.
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
    showGoBackButton = true;
  } else if (!stellarAddress || !jwtToken) {
    // Caso 2: El usuario aún no está autenticado con la wallet Stellar
    // Mostramos el componente de conexión/autenticación de wallets.
    currentComponent = (
      <WalletConnect
        onEVMConnect={setWalletConnectedEVM} // Mantener para futura re-activación de EVM
        onStellarAuthSuccess={(token, pk) => {
          setJwtToken(token);
          setStellarAddress(pk);
          localStorage.setItem('stellarJwt', token);
          localStorage.setItem('stellarAddress', pk);
        }}
        currentStellarAddress={stellarAddress}
      />
    );
    showGoBackButton = false; // No mostrar "Volver" en la pantalla de conexión inicial
  } else if (!selectedOperation) {
    // Caso 3: Autenticación Stellar completa, pero no se ha seleccionado una operación
    // Mostramos las opciones de operación de PuntoRed.
    currentComponent = <OperationSelector setSelectedOperation={setSelectedOperation} />;
    showGoBackButton = true; // Permitir volver a la pantalla de conexión si el usuario lo desea
  } else if (selectedOperation === 'Puenteo de Fondos') {
    // Caso 4: El usuario ha seleccionado la opción de Puenteo de Fondos
    // Dirigimos al usuario al componente AxelarBridge.
    currentComponent = (
      <AxelarBridge
        onBridgeComplete={(amount) => {
          setBridgeComplete(true);
          setAmountToBridge(amount);
          setSelectedOperation(null); // Opcional: Volver a la selección de operación después del puenteo
        }}
        token="USDC"
        stellarAddress={stellarAddress}
      />
    );
    showGoBackButton = true;
  } else {
    // Caso 5: Autenticación Stellar completa y se ha seleccionado una operación (que no es puenteo)
    // Mostramos el componente de retiro para completar la operación con el ancla.
    currentComponent = (
      <PuntoRedWithdraw
        operationType={selectedOperation}
        stellarAddress={stellarAddress}
        amount={amountToBridge} // El monto puenteado se pasa aquí si es relevante para el retiro
        jwtToken={jwtToken}
      />
    );
    showGoBackButton = true;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>
          <Container maxW="container.md" py={10}>
            <VStack spacing={8} align="stretch">
              <Box textAlign="center" mb={10}>
                <HStack justifyContent="center" alignItems="center" spacing={4} mb={4}>
                  <Image
                    src="https://placehold.co/60x60/009ECC/ffffff?text=LOGO"
                    alt="Dispenser Logo"
                    boxSize="60px"
                    borderRadius="full"
                    fallbackSrc="https://placehold.co/60x60/009ECC/ffffff?text=LOGO"
                  />
                  <Heading
                    as="h1"
                    size="2xl"
                    fontSize={{ base: "3xl", md: "5xl" }}
                    bgGradient="linear(to-r, stellarBlue.500, stellarBlue.700)"
                    bgClip="text"
                    fontWeight="extrabold"
                  >
                    🌟 Dispenser
                  </Heading>
                </HStack>
                <Text fontSize="xl" color="gray.700" maxW="lg" mx="auto">
                  Tu puerta de entrada a servicios financieros sin fronteras en Colombia.
                </Text>
              </Box>

              {/* Contenedor para los botones de Volver y Desconectar */}
              <HStack justifyContent="space-between" width="100%">
                {showGoBackButton && (
                  <Button
                    onClick={handleGoBack}
                    variant="outline"
                    colorScheme="gray"
                    leftIcon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>}
                  >
                    Volver
                  </Button>
                )}

                {/* Botón de Desconexión de Billetera Stellar - Visible solo si está autenticado */}
                {stellarAddress && jwtToken && (
                  <Button
                    onClick={handleStellarDisconnect}
                    colorScheme="red"
                    variant="outline"
                    leftIcon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>}
                  >
                    Desconectar Wallet Stellar
                  </Button>
                )}
              </HStack>

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