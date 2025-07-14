// src/components/WalletConnect.jsx
import React from 'react';
import { VStack, Text, Box } from '@chakra-ui/react';
import StellarAuth from './StellarAuth'; // Importar el componente de autenticación Stellar

function WalletConnect({ onStellarAuthSuccess, currentStellarAddress }) {
  return (
    <VStack spacing={6} p={6} borderWidth="1px" borderRadius="lg" w="full" boxShadow="md">
      <Text fontSize="xl" fontWeight="bold">Paso 1: Conecta y Autentica tu Wallet Stellar</Text>

      {/* Sección de Autenticación Stellar (usando StellarAuth) */}
      <StellarAuth onAuthSuccess={onStellarAuthSuccess} currentStellarAddress={currentStellarAddress} />

      <Text fontSize="sm" color="gray.500" textAlign="center">
        La autenticación con tu Stellar Wallet es necesaria para las operaciones.
      </Text>
    </VStack>
  );
}

export default WalletConnect;
