// src/components/OperationSelector.jsx
import React from 'react';
import { VStack, Button, Text, Heading, SimpleGrid, Icon } from '@chakra-ui/react';
import { FaMoneyBillWave, FaMobileAlt, FaFileInvoiceDollar, FaWallet, FaReceipt } from 'react-icons/fa'; // Importar iconos

function OperationSelector({ setSelectedOperation }) {
  // Definimos las operaciones con sus iconos y un esquema de color sugerido
  const operations = [
    { name: 'Retirar efectivo', icon: FaMoneyBillWave, colorScheme: 'green' },
    { name: 'Recargar Nequi/Daviplata', icon: FaWallet, colorScheme: 'purple' },
    { name: 'Recarga a celulares', icon: FaMobileAlt, colorScheme: 'blue' },
    { name: 'Pago de facturas', icon: FaFileInvoiceDollar, colorScheme: 'orange' },
    { name: 'Pago de recibos', icon: FaReceipt, colorScheme: 'red' }, // Añadido si aplica
  ];

  return (
    <VStack spacing={8} align="center" width="100%">
      <Heading as="h2" size="xl" textAlign="center" color="stellarBlue.600">
        ¿Qué operación deseas realizar?
      </Heading>
      <Text fontSize="lg" color="gray.700" textAlign="center">
        Selecciona un servicio de PuntoRed para iniciar tu transacción.
      </Text>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} width="100%" maxWidth="lg">
        {operations.map((operation) => (
          <Button
            key={operation.name}
            onClick={() => setSelectedOperation(operation.name)}
            colorScheme={operation.colorScheme} // Color distinto para cada botón
            size="lg"
            height="auto" // Permitir que el botón ajuste su altura
            py={6} // Padding vertical para hacerlos más grandes
            borderRadius="xl" // Bordes más redondeados
            boxShadow="lg" // Sombra para un efecto 3D
            _hover={{ boxShadow: "xl", transform: "translateY(-2px)" }} // Efecto al pasar el ratón
            transition="all 0.2s ease-in-out" // Transición suave
            display="flex" // Usar flexbox para centrar contenido
            flexDirection="column" // Apilar icono y texto verticalmente
            justifyContent="center" // Centrar verticalmente
            alignItems="center" // Centrar horizontalmente
            textAlign="center" // Centrar el texto
          >
            <VStack spacing={2}>
              <Icon as={operation.icon} w={8} h={8} /> {/* Icono más grande */}
              <Text fontSize="lg" fontWeight="bold">
                {operation.name}
              </Text>
            </VStack>
          </Button>
        ))}
      </SimpleGrid>
    </VStack>
  );
}

export default OperationSelector;