// src/components/PuntoRedWithdraw.jsx
import React, { useState, useEffect } from 'react';
import { Box, Button, FormControl, FormLabel, Input, VStack, Heading, Text, useToast, Link, Spinner, Flex, Icon, HStack } from '@chakra-ui/react';
import { FaExternalLinkAlt, FaTimesCircle, FaCheckCircle, FaWindowRestore } from 'react-icons/fa'; // Iconos para el link, errores/éxito y ventana emergente

// ¡IMPORTANTE! Reemplaza con la URL base SEP-24 real de PuntoRed.
// Esta URL suele ser el ANCHOR_HOME_DOMAIN + /sep24
const ANCHOR_SEP24_URL = 'https://puntored-anchor.com/sep24'; // Ejemplo: 'https://testanchor.stellar.org/sep24'

// En una aplicación real, esta información de los campos requeridos
// se obtendría dinámicamente del endpoint /info del ancla SEP-24.
// Para este ejemplo, mantenemos una estructura similar a tu mock para la UI,
// pero los datos enviados al ancla serán los del formulario.
const MOCK_OPERATION_INFO = {
  'Retirar efectivo': {
    description: 'Retiro de efectivo en corresponsal bancario.',
    fields: {
      recipient_name: { type: 'text', description: 'Nombre completo del beneficiario', optional: false },
      id_number: { type: 'text', description: 'Número de identificación del beneficiario', optional: false },
      phone_number: { type: 'text', description: 'Número de celular del beneficiario', optional: false },
    }
  },
  'Recargar Nequi/Daviplata': {
    description: 'Recarga de saldo a cuentas Nequi o Daviplata.',
    fields: {
      phone_number: { type: 'text', description: 'Número de celular asociado a Nequi/Daviplata', optional: false },
    }
  },
  'Recarga a celulares': {
    description: 'Recarga de saldo a un número de celular.',
    fields: {
      phone_number: { type: 'text', description: 'Número de celular a recargar', optional: false },
      operator: { type: 'text', description: 'Operador de celular (Claro, Tigo, etc.)', optional: true },
    }
  },
  'Pago de facturas': {
    description: 'Pago de facturas de servicios públicos o privados.',
    fields: {
      invoice_number: { type: 'text', description: 'Número de referencia de la factura', optional: false },
      service_type: { type: 'text', description: 'Tipo de servicio (luz, agua, gas)', optional: true },
    }
  },
  // Añade más tipos de operación si tu OperationSelector los tiene
};


function PuntoRedWithdraw({ operationType, stellarAddress, amount, jwtToken, initialTransactionId, initialTransactionStatus }) {
  const [additionalFields, setAdditionalFields] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [transactionId, setTransactionId] = useState(initialTransactionId || null);
  const [transactionStatus, setTransactionStatus] = useState(initialTransactionStatus || null);
  const toast = useToast();

  // Usamos el mock para la UI, pero los datos reales se enviarán al ancla
  const currentOperationInfo = MOCK_OPERATION_INFO[operationType];

  // Limpiar campos adicionales cuando cambia el tipo de operación
  useEffect(() => {
    setAdditionalFields({});
    // Limpiar el ID y estado de la transacción si la operación cambia
    setTransactionId(null);
    setTransactionStatus(null);
  }, [operationType]);

  // Efecto para manejar el callback de la URL y monitorear la transacción
  useEffect(() => {
    // Si hay un ID de transacción inicial (desde el callback de la URL)
    // y tenemos un JWT y dirección Stellar, iniciamos el polling.
    if (initialTransactionId && jwtToken && stellarAddress && !transactionId) {
      setTransactionId(initialTransactionId);
      setTransactionStatus(initialTransactionStatus || 'pending'); // Establecer un estado inicial si no viene

      const pollTransactionStatus = async () => {
        setIsLoading(true);
        try {
          const txResponse = await fetch(`${ANCHOR_SEP24_URL}/transaction?id=${initialTransactionId}`, {
            headers: { 'Authorization': `Bearer ${jwtToken}` }
          });

          if (!txResponse.ok) {
            const errorData = await txResponse.json();
            throw new Error(`Error al obtener estado de transacción: ${errorData.error || txResponse.statusText}`);
          }
          const txData = await txResponse.json();
          const currentStatus = txData.transaction.status;
          setTransactionStatus(currentStatus);

          if (currentStatus === 'completed') {
            toast({
              title: 'Transacción completada',
              description: `Retiro de ${amount || 'monto desconocido'} USDC exitoso.`,
              status: 'success',
              duration: 9000,
              isClosable: true,
            });
            // Aquí podrías resetear el flujo de la app o mostrar un resumen final
          } else if (currentStatus === 'failed' || currentStatus === 'error') {
            toast({
              title: 'Transacción fallida',
              description: `Estado: ${currentStatus}. ${txData.transaction.message || ''}`,
              status: 'error',
              duration: 9000,
              isClosable: true,
            });
          } else {
            // Seguir haciendo polling si el estado es 'pending', 'processing', 'waiting_for_user_transfer_start', etc.
            setTimeout(pollTransactionStatus, 5000); // Poll cada 5 segundos
          }
        } catch (error) {
          console.error('Error durante el polling de transacción:', error);
          toast({
            title: 'Error de polling',
            description: error.message,
            status: 'error',
            duration: 9000,
            isClosable: true,
          });
        } finally {
          setIsLoading(false);
        }
      };
      pollTransactionStatus();
    }
  }, [initialTransactionId, initialTransactionStatus, jwtToken, stellarAddress, amount, toast, transactionId]); // Dependencias para el useEffect

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

  const handleStartPuntoRedFlow = async () => {
    if (!stellarAddress || !amount || !jwtToken) {
      toast({
        title: 'Error de Datos',
        description: 'Faltan datos clave (dirección Stellar, monto o token de autenticación). Por favor, reinicia el flujo y asegúrate de autenticarte.',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });
      return;
    }

    // Validación de campos obligatorios usando las claves de additionalFields
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

    try {
      // La URL de callback a la que el ancla redirigirá después de la interacción
      // Usamos la misma ruta actual para que App.jsx pueda capturar los parámetros de la URL
      const callbackUrl = window.location.origin + window.location.pathname;

      // Construir los campos para el cuerpo de la solicitud POST
      const requestBodyFields = {
        asset_code: 'USDC', // O el activo que estés usando
        account: stellarAddress,
        type: operationType, // El tipo de operación que el ancla espera
        amount: amount,
        // Incluir los campos adicionales del formulario
        ...additionalFields,
        // Otros campos opcionales que el ancla pueda requerir
        // lang: 'es',
        // customer_id: '...', // Si tienes un ID de cliente para el ancla
        // email: '...',
      };

      console.log('Initiating withdraw with fields:', requestBodyFields);

      const response = await fetch(`${ANCHOR_SEP24_URL}/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}` // Enviar el JWT en la cabecera de autorización
        },
        body: JSON.stringify({
          ...requestBodyFields,
          // El callback postMessage es para aplicaciones de cliente puro
          // Si tu app tiene un backend, usarías una URL de callback normal
          callback: 'postMessage', // Según la documentación de BasicPay
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error al iniciar retiro: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      const interactiveUrl = data.url; // URL a la que redirigir al usuario para completar la transacción

      // Abrir la ventana emergente y escuchar el callback postMessage
      const popup = window.open(interactiveUrl, "bpaTransfer24Window", "width=800,height=600,resizable=yes,scrollbars=yes");

      // Escuchar el mensaje del popup (callback postMessage)
      const messageListener = async (event) => {
        // Asegúrate de que el mensaje provenga de la URL esperada del ancla
        // Es crucial validar event.origin para seguridad
        if (event.origin !== new URL(ANCHOR_SEP24_URL).origin) {
          console.warn('Mensaje recibido de origen desconocido:', event.origin);
          return;
        }

        if (event.data && event.data.transaction && event.data.transaction.id) {
          const newTxId = event.data.transaction.id;
          const newTxStatus = event.data.transaction.status; // También puede venir el estado inicial

          setTransactionId(newTxId);
          setTransactionStatus(newTxStatus);

          // Limpiar la URL de la ventana principal si se regresa con parámetros
          // Esto es importante para evitar que al recargar la página, se intente procesar
          // el mismo callback ID nuevamente.
          if (window.location.search) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }

          toast({
            title: 'Transacción iniciada',
            description: `ID: ${newTxId}. Monitoreando estado...`,
            status: 'info',
            duration: 5000,
            isClosable: true,
          });

          // El useEffect de polling ya se encargará de esto al cambiar transactionId
        }

        // Cerrar la ventana emergente
        popup?.close();
        window.removeEventListener('message', messageListener); // Limpiar el listener para evitar duplicados
      };

      window.addEventListener('message', messageListener);

      toast({
        title: 'Ventana de PuntoRed abierta',
        description: 'Por favor, completa los detalles en la ventana emergente.',
        status: 'info',
        duration: 7000,
        isClosable: true,
        position: 'top',
      });

    } catch (error) {
      console.error('Error en el retiro:', error);
      toast({
        title: 'Error en el retiro',
        description: error.message || 'No se pudo iniciar la operación de retiro. Verifica la autenticación y los detalles.',
        status: 'error',
        duration: 9000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Determinar si el botón debe estar deshabilitado
  const isButtonDisabled = isLoading || !stellarAddress || !amount || !jwtToken ||
    (currentOperationInfo && Object.entries(currentOperationInfo.fields).some(([fieldName, fieldInfo]) => !fieldInfo.optional && (!additionalFields[fieldName] || additionalFields[fieldName].trim() === '')));

  return (
    <VStack spacing={6} p={6} shadow="lg" borderWidth="1px" borderRadius="xl" width="100%" maxWidth="md" mx="auto" bg="white">
      <Heading as="h3" size="lg" mb={4} color="stellarBlue.700">Paso Final: Completa tu operación en PuntoRed</Heading>
      <Text fontSize="md" color="gray.600">
        Has elegido "{currentOperationInfo.description}". Usarás {amount} USDC desde tu wallet Stellar.
      </Text>
      <Text fontSize="sm" color="gray.600">
        Por favor, ingresa los detalles adicionales requeridos por PuntoRed **para iniciar el flujo**:
      </Text>

      {currentOperationInfo && Object.entries(currentOperationInfo.fields).map(([fieldName, fieldInfo]) => (
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
        isLoading={isLoading && !transactionId} // Solo mostrar loading si no hay ID de transacción aún
        loadingText="Abriendo PuntoRed..."
        width="100%" py={6} borderRadius="lg" boxShadow="md" _hover={{ boxShadow: "lg" }}
        leftIcon={<Icon as={FaExternalLinkAlt} />} // Icono para indicar redirección
      >
        {isLoading && !transactionId ? <Spinner size="sm" mr={2} /> : null}
        Ir a PuntoRed para completar
      </Button>

      {transactionId && (
        <Box mt={4} p={3} borderWidth="1px" borderRadius="md" w="full" bg="gray.50">
          <Text fontWeight="bold">Estado de la Transacción:</Text>
          <Text>ID: <Text as="span" fontFamily="mono">{transactionId.substring(0, 10)}...</Text></Text>
          <HStack>
            <Text>Estado:</Text>
            <Text as="span" fontWeight="bold" color={
              transactionStatus === 'completed' ? 'green.500' :
              transactionStatus === 'failed' || transactionStatus === 'error' ? 'red.500' : 'orange.500'
            }>{transactionStatus || 'Cargando...'}</Text>
            {isLoading && transactionId && transactionStatus !== 'completed' && transactionStatus !== 'failed' && (
              <Spinner size="sm" ml={2} />
            )}
          </HStack>
          {transactionStatus === 'completed' && (
            <HStack mt={2} color="green.600">
              <Icon as={FaCheckCircle} />
              <Text>¡Retiro completado con éxito!</Text>
            </HStack>
          )}
          {transactionStatus === 'failed' || transactionStatus === 'error' ? (
            <HStack mt={2} color="red.600">
              <Icon as={FaTimesCircle} />
              <Text>El retiro ha fallado. Por favor, inténtalo de nuevo.</Text>
            </HStack>
          ) : null}
          {/* En un entorno real, aquí podrías mostrar un enlace a la transacción en un explorador de Stellar */}
          {/* <ChakraLink href={`https://stellar.expert/explorer/${STELLAR_NETWORK.toLowerCase()}/tx/${transactionId}`} isExternal color="stellarBlue.500">
            Ver en Stellar Explorer
          </ChakraLink> */}
        </Box>
      )}

      <Flex mt={4} justifyContent="center" alignItems="center">
        <Text fontSize="sm" color="gray.500" mr={2}>
          *Se abrirá una ventana emergente donde PuntoRed gestionará los detalles finales y el pago.
        </Text>
        <Link href="https://developers.stellar.org/docs/integrate/sep/sep-0024" isExternal fontSize="sm" color="blue.500" display="flex" alignItems="center">
          Más sobre SEP-24 <Icon as={FaExternalLinkAlt} ml={1} w={3} h={3} />
        </Link>
      </Flex>
    </VStack>
  );
}

export default PuntoRedWithdraw;
