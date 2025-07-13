// src/components/PuntoRedWithdraw.jsx
import React, { useState, useEffect } from 'react';
import { Box, Button, FormControl, FormLabel, Input, VStack, Heading, Text, useToast, Link, Spinner, Flex, Icon } from '@chakra-ui/react';
import { FaExternalLinkAlt, FaTimesCircle } from 'react-icons/fa'; // Iconos para el link y errores

const PUNTORED_ANCHOR_INFO = {
  withdraw: {
    USDC: {
      methods: {
        'retirar': {
            description: 'Retiro de efectivo en corresponsal bancario.',
            fields: {
                recipient_name: { type: 'text', description: 'Nombre completo del beneficiario', optional: false },
                id_number: { type: 'text', description: 'Número de identificación del beneficiario', optional: false },
                phone_number: { type: 'text', description: 'Número de celular del beneficiario', optional: false },
            }
        },
        'recarga_celular': {
            description: 'Recarga de saldo a un número de celular.',
            fields: {
                phone_number: { type: 'text', description: 'Número de celular a recargar', optional: false },
                operator: { type: 'text', description: 'Operador de celular (Claro, Tigo, etc.)', optional: true },
            }
        },
        'pago_factura': {
            description: 'Pago de facturas de servicios públicos o privados.',
            fields: {
                invoice_number: { type: 'text', description: 'Número de referencia de la factura', optional: false },
                service_type: { type: 'text', description: 'Tipo de servicio (luz, agua, gas)', optional: true },
            }
        },
        'recarga_nequi_daviplata': {
            description: 'Recarga de saldo a cuentas Nequi o Daviplata.',
            fields: {
                phone_number: { type: 'text', description: 'Número de celular asociado a Nequi/Daviplata', optional: false },
            }
        },
        'pago_recibos': {
            description: 'Pago de recibos varios.',
            fields: {
                receipt_reference: { type: 'text', description: 'Número de referencia del recibo', optional: false },
            }
        }
      }
    }
  }
};

function PuntoRedWithdraw({ operationType, stellarAddress, amount }) {
  const [additionalFields, setAdditionalFields] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const currentOperationInfo = PUNTORED_ANCHOR_INFO.withdraw.USDC.methods[operationType];

  useEffect(() => {
    setAdditionalFields({});
  }, [operationType]);

  if (!currentOperationInfo) {
    return (
      <Flex p={4} bg="red.50" borderRadius="lg" alignItems="center" boxShadow="sm">
        <Icon as={FaTimesCircle} color="red.500" w={6} h={6} mr={3} />
        <Text color="red.700" fontSize="md" fontWeight="medium">
          Operación seleccionada no reconocida o no configurada.
        </Text>
      </Flex>
    );
  }

  const handleFieldChange = (fieldName, value) => {
    setAdditionalFields(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleStartPuntoRedFlow = () => {
    if (!stellarAddress || !amount) {
      toast({
        title: 'Error de Datos',
        description: 'Faltan datos clave (dirección Stellar o monto). Por favor, reinicia el flujo.',
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });
      return;
    }

    // Validación de campos obligatorios, usando las claves de additionalFields
    const missingFields = Object.entries(currentOperationInfo.fields)
      .filter(([fieldName, fieldInfo]) => !fieldInfo.optional && (!additionalFields[fieldName] || additionalFields[fieldName].trim() === ''))
      .map(([, fieldInfo]) => fieldInfo.description);

    if (missingFields.length > 0) {
      toast({
        title: 'Campos Faltantes',
        description: `Por favor, completa los siguientes campos obligatorios: ${missingFields.join(', ')}.`,
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });
      return;
    }

    setIsLoading(true);

    toast({
      title: 'Redirigiendo a PuntoRed (Simulación)',
      description: `Simulando la interacción con PuntoRed para ${currentOperationInfo.description}. Serás redirigido a una página de ejemplo.`,
      status: 'info',
      duration: 7000,
      isClosable: true,
      position: 'top',
    });

    const finalRedirectUrl = 'http://example.com';

    setTimeout(() => {
      window.location.href = finalRedirectUrl;
      setIsLoading(false);
    }, 1500);
  };

  // Determinar si el botón debe estar deshabilitado
  const isButtonDisabled = isLoading || !stellarAddress || !amount ||
    Object.entries(currentOperationInfo.fields).some(([fieldName, fieldInfo]) => !fieldInfo.optional && (!additionalFields[fieldName] || additionalFields[fieldName].trim() === ''));

  return (
    <VStack spacing={6} p={6} shadow="lg" borderWidth="1px" borderRadius="xl" width="100%" maxWidth="md" mx="auto" bg="white">
      <Heading as="h3" size="lg" mb={4} color="stellarBlue.700">Paso Final: Completa tu operación en PuntoRed</Heading>
      <Text fontSize="md" color="gray.600">
        Has elegido "{currentOperationInfo.description}". Usarás {amount} USDC desde tu wallet Stellar.
      </Text>
      <Text fontSize="sm" color="gray.600">
        Por favor, ingresa los detalles adicionales requeridos por PuntoRed:
      </Text>

      {Object.entries(currentOperationInfo.fields).map(([fieldName, fieldInfo]) => (
        <FormControl key={fieldName} id={fieldName} isRequired={!fieldInfo.optional}>
          <FormLabel fontSize="md" fontWeight="semibold">{fieldInfo.description}</FormLabel>
          <Input
            type={fieldInfo.type === 'text' ? 'text' : 'number'}
            value={additionalFields[fieldName] || ''}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            placeholder={fieldInfo.description}
            isDisabled={isLoading}
            size="lg"
            borderRadius="lg"
          />
        </FormControl>
      ))}

      <Button
        colorScheme="green"
        size="lg"
        onClick={handleStartPuntoRedFlow}
        isDisabled={isButtonDisabled}
        isLoading={isLoading}
        loadingText="Redirigiendo..."
        width="100%" py={6} borderRadius="lg" boxShadow="md" _hover={{ boxShadow: "lg" }}
      >
        Ir a PuntoRed (Simulado) para completar
      </Button>

      <Flex mt={4} justifyContent="center" alignItems="center">
        <Text fontSize="sm" color="gray.500" mr={2}>
          *Serás redirigido a una página de ejemplo.
        </Text>
        <Link href="https://developers.stellar.org/docs/integrate/sep/sep-0024" isExternal fontSize="sm" color="blue.500" display="flex" alignItems="center">
          Más sobre SEP-24 <Icon as={FaExternalLinkAlt} ml={1} w={3} h={3} />
        </Link>
      </Flex>
    </VStack>
  );
}

export default PuntoRedWithdraw;