// src/App.jsx
import React, { useState, useEffect } from 'react';
import { ChakraProvider, extendTheme, Box, Container, VStack, Heading, Text, Link, HStack, Image } from '@chakra-ui/react';
import OperationSelector from './components/OperationSelector';
import WalletConnect from './components/WalletConnect';
import AxelarBridge from './components/AxelarBridge';
import PuntoRedWithdraw from './components/PuntoRedWithdraw';
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
  const [stellarAddress, setStellarAddress] = useState(null);
  const [amountToBridge, setAmountToBridge] = useState(null);
  const [bridgeComplete, setBridgeComplete] = useState(false);

  let currentComponent;

  if (!selectedOperation) {
    currentComponent = <OperationSelector setSelectedOperation={setSelectedOperation} />;
  } else if (!walletConnectedEVM || !stellarAddress) {
    currentComponent = (
      <WalletConnect
        onEVMConnect={setWalletConnectedEVM}
        onStellarConnect={setStellarAddress}
        currentStellarAddress={stellarAddress}
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
                <Heading as="h1" size="2xl" mb={4} color="stellarBlue.600">
                  🌟 Dispenser
                </Heading>
                <Text fontSize="xl" color="gray.700" maxW="lg" mx="auto">
                  Tu puerta de entrada a servicios financieros sin fronteras en Colombia.
                </Text>
              </Box>
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