// src/components/OperationSelector.jsx
import React from 'react';
import { Box, Button, SimpleGrid, Heading, Text, VStack, Icon } from '@chakra-ui/react';
// Importa algunos iconos para los botones si no los tienes aún (requiere react-icons)
import { FaMoneyBillWave, FaMobileAlt, FaFileInvoiceDollar, FaWallet, FaReceipt } from 'react-icons/fa';

function OperationSelector({ setSelectedOperation }) {
  const operations = [
    { id: 'retirar', icon: FaMoneyBillWave, label: 'Retirar efectivo' },
    { id: 'recarga_celular', icon: FaMobileAlt, label: 'Recargar celular' },
    { id: 'pago_factura', icon: FaFileInvoiceDollar, label: 'Pagar factura (servicios)' },
    { id: 'recarga_nequi_daviplata', icon: FaWallet, label: 'Recargar Nequi/Daviplata' },
    { id: 'pago_recibos', icon: FaReceipt, label: 'Pagar Recibos varios' }, // Etiqueta más descriptiva
  ];

  return (
    <VStack spacing={8} p={6} textAlign="center" width="100%" maxWidth="lg" mx="auto">
      <Heading as="h2" size="xl" mb={4} color="stellarBlue.700">¿Qué operación deseas realizar?</Heading>
      <Text fontSize="lg" color="gray.600">Selecciona el tipo de transacción para comenzar.</Text>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} width="100%">
        {operations.map((op) => (
          <Button
            key={op.id}
            size="lg"
            height="150px" // Botones más grandes
            variant="solid" // Estilo sólido con el color stellarBlue
            colorScheme="blue" // Usar el color scheme definido en App.jsx
            fontSize="2xl" // Icono y texto más grandes
            fontWeight="bold"
            leftIcon={<Icon as={op.icon} w={8} h={8} />} // Icono más grande
            onClick={() => setSelectedOperation(op.id)}
            boxShadow="md" // Sombra sutil
            _hover={{
              bg: "stellarBlue.600", // Cambio de color al pasar el ratón
              transform: "translateY(-3px)", // Ligero levantamiento
              boxShadow: "lg", // Sombra más pronunciada
            }}
            transition="all 0.2s" // Transición suave
            justifyContent="flex-start" // Alinear el contenido a la izquierda
            px={8}
            py={4}
            borderRadius="xl" // Bordes más redondeados
          >
            {op.label}
          </Button>
        ))}
      </SimpleGrid>
    </VStack>
  );
}

export default OperationSelector;