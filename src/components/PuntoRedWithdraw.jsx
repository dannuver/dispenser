// src/components/PuntoRedWithdraw.jsx
import React, { useState, useEffect } from 'react';
import { Box, Button, FormControl, FormLabel, Input, VStack, Heading, Text, useToast, Link, Spinner, Flex, Icon, HStack } from '@chakra-ui/react';
import { FaExternalLinkAlt, FaTimesCircle, FaCheckCircle, FaPaperPlane } from 'react-icons/fa'; // Importar FaPaperPlane para enviar pago
import { Server, TransactionBuilder, Networks, Asset, Operation } from 'stellar-sdk'; // Importar Operation y Asset
import { kit } from '../utils/stellarKit'; // Importamos kit desde el archivo de utilidad

// ¡IMPORTANTE! Reemplaza con la URL base SEP-24 real de PuntoRed.
const ANCHOR_SEP24_URL = 'https://puntored-anchor.com/sep24'; // Ejemplo: 'https://testanchor.stellar.org/sep24'
const STELLAR_NETWORK = Networks.TESTNET; // Asegúrate de que coincida con la red del kit
const STELLAR_RPC_URL = 'https://horizon-testnet.stellar.org'; // URL de Horizon para enviar transacciones

// ¡IMPORTANTE! Reemplaza con la clave pública REAL de la cuenta de depósito Stellar de PuntoRed.
// Esta cuenta es a donde el usuario enviará los fondos directamente.
// Necesitarás obtener esta dirección de la documentación de PuntoRed o contactarlos.
const PUNTORED_DEPOSIT_ACCOUNT = 'GCV2X5Z6T62X2Q4M7U7E5Z3Z8Z3Z8Z3Z8Z3Z8Z3Z8Z3Z8Z3Z8Z3Z8Z3Z8Z3Z8Z3Z8'; // <<-- ¡PLACEHOLDER!

// ¡IMPORTANTE! Reemplaza con el código del activo y el emisor si no es nativo (XLM)
// Para USDC en Testnet, necesitarías el Asset Issuer.
const USDC_ASSET = new Asset('USDC', 'GBEDQW4S2G37C2F34C2F34C2F34C2F34C2F34C2F34C2F34C2F34C2F34C2F34C2F34C'); // <<-- ¡PLACEHOLDER!

// En una aplicación real, esta información de los campos requeridos
// se obtendría dinámicamente del endpoint /info del ancla SEP-24.
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
  // La opción 'Puenteo de Fondos' se maneja en App.jsx, no aquí directamente
};


function PuntoRedWithdraw({ operationType, stellarAddress, jwtToken, initialTransactionId, initialTransactionStatus }) {
  const [additionalFields, setAdditionalFields] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [transactionId, setTransactionId] = useState(initialTransactionId || null);
  const [transactionStatus, setTransactionStatus] = useState(initialTransactionStatus || null);
  const [paymentAmount, setPaymentAmount] = useState(''); // Nuevo estado para el monto del pago
  const toast = useToast();

  const currentOperationInfo = MOCK_OPERATION_INFO[operationType];

  // Limpiar campos adicionales y estado de transacción al cambiar el tipo de operación
  useEffect(() => {
    setAdditionalFields({});
    setTransactionId(null);
    setTransactionStatus(null);
    setPaymentAmount(''); // También limpiar el monto
  }, [operationType]);

  // Efecto para manejar el callback de la URL y monitorear la transacción (SEP-24)
  useEffect(() => {
    if (initialTransactionId && jwtToken && stellarAddress && !transactionId) {
      setTransactionId(initialTransactionId);
      setTransactionStatus(initialTransactionStatus || 'pending');

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
              description: `Operación de ${operationType} exitosa.`,
              status: 'success',
              duration: 9000,
              isClosable: true,
            });
          } else if (currentStatus === 'failed' || currentStatus === 'error') {
            toast({
              title: 'Transacción fallida',
              description: `Estado: ${currentStatus}. ${txData.transaction.message || ''}`,
              status: 'error',
              duration: 9000,
              isClosable: true,
            });
          } else {
            setTimeout(pollTransactionStatus, 5000);
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
  }, [initialTransactionId, initialTransactionStatus, jwtToken, stellarAddress, operationType, toast, transactionId]);

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

  // Nueva función para manejar el envío directo del pago Stellar
  const handleSendStellarPayment = async () => {
    if (!stellarAddress || !jwtToken || !paymentAmount || isNaN(parseFloat(paymentAmount)) || parseFloat(paymentAmount) <= 0) {
      toast({
        title: 'Error de Datos',
        description: 'Faltan datos clave (dirección Stellar, token, o monto de pago inválido).',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });
      return;
    }

    // Validación de campos obligatorios del formulario
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
      const server = new Server(STELLAR_RPC_URL);
      const sourceAccount = await server.loadAccount(stellarAddress);

      // Crear la operación de pago
      const paymentOperation = Operation.payment({
        destination: PUNTORED_DEPOSIT_ACCOUNT, // Cuenta de depósito del ancla
        asset: USDC_ASSET, // El activo a enviar (USDC)
        amount: paymentAmount.toString(), // Monto del input
        // memo: TransactionBuilder.textMemo('pago_dispenser_ref'), // Opcional: un memo para la transacción
      });

      // Construir la transacción
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: await server.fetchBaseFee(), // Obtener el fee actual de la red
        networkPassphrase: STELLAR_NETWORK,
      })
        .addOperation(paymentOperation)
        .setTimeout(30) // Tiempo de espera en segundos
        .build();

      console.log('Transacción a firmar (XDR):', transaction.toXDR());

      // Firmar la transacción con StellarWalletsKit
      const signedXDR = await kit.signTransaction(transaction.toXDR(), STELLAR_NETWORK);

      // Enviar la transacción firmada a Horizon
      const response = await server.submitTransaction(signedXDR);

      console.log('Transacción enviada:', response);
      setTransactionId(response.hash);
      setTransactionStatus('completed'); // Asumimos completado si se envió a la red

      toast({
        title: 'Pago Stellar Enviado',
        description: `Transacción ${response.hash.substring(0, 10)}... enviada a la red Stellar.`,
        status: 'success',
        duration: 9000,
        isClosable: true,
      });

      // Opcional: Después de enviar el pago, podrías redirigir al flujo interactivo del ancla
      // para que el usuario confirme el depósito o complete KYC si es necesario.
      // Esto dependería de cómo PuntoRed maneje los depósitos directos.
      // const callbackUrl = window.location.origin + window.location.pathname;
      // const interactiveUrlResponse = await fetch(`${ANCHOR_SEP24_URL}/deposit`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwtToken}` },
      //   body: JSON.stringify({ asset_code: 'USDC', amount: paymentAmount, account: stellarAddress, callback: 'postMessage', ...additionalFields }),
      // });
      // const interactiveData = await interactiveUrlResponse.json();
      // window.open(interactiveData.url, "bpaTransfer24Window", "width=800,height=600,resizable=yes,scrollbars=yes");

    } catch (error) {
      console.error('Error al enviar pago Stellar:', error);
      setTransactionStatus('failed');
      toast({
        title: 'Error al enviar pago',
        description: error.message || 'No se pudo firmar y enviar la transacción Stellar.',
        status: 'error',
        duration: 9000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Determinar si el botón debe estar deshabilitado
  const isButtonDisabled = isLoading || !stellarAddress || !jwtToken ||
    !paymentAmount || isNaN(parseFloat(paymentAmount)) || parseFloat(paymentAmount) <= 0 ||
    (currentOperationInfo && Object.entries(currentOperationInfo.fields).some(([fieldName, fieldInfo]) => !fieldInfo.optional && (!additionalFields[fieldName] || additionalFields[fieldName].trim() === '')));

  return (
    <VStack spacing={6} p={6} shadow="lg" borderWidth="1px" borderRadius="xl" width="100%" maxWidth="md" mx="auto" bg="white">
      <Heading as="h3" size="lg" mb={4} color="stellarBlue.700">Paso Final: Realiza tu Pago</Heading>
      <Text fontSize="md" color="gray.600">
        Has elegido "{currentOperationInfo.description}". Enviarás USDC desde tu wallet Stellar.
      </Text>

      {/* Input para el monto a pagar */}
      <FormControl id="payment-amount" isRequired>
        <FormLabel fontSize="md" fontWeight="semibold">Monto a Pagar (USDC)</FormLabel>
        <Input
          type="number"
          value={paymentAmount}
          onChange={(e) => setPaymentAmount(e.target.value)}
          placeholder="Ej: 100.00"
          isDisabled={isLoading}
          size="lg"
          borderRadius="lg"
        />
      </FormControl>

      <Text fontSize="sm" color="gray.600">
        Por favor, ingresa los detalles adicionales requeridos por PuntoRed:
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
        onClick={handleSendStellarPayment} // Nueva función para el pago directo
        isDisabled={isButtonDisabled}
        isLoading={isLoading}
        loadingText="Firmando y Enviando..."
        width="100%" py={6} borderRadius="lg" boxShadow="md" _hover={{ boxShadow: "lg" }}
        leftIcon={<Icon as={FaPaperPlane} />} // Icono de enviar
      >
        Firmar y Enviar Pago Stellar
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
              <Text>¡Pago completado con éxito!</Text>
            </HStack>
          )}
          {transactionStatus === 'failed' || transactionStatus === 'error' ? (
            <HStack mt={2} color="red.600">
              <Icon as={FaTimesCircle} />
              <Text>El pago ha fallado. Por favor, inténtalo de nuevo.</Text>
            </HStack>
          ) : null}
          <Text fontSize="sm" color="gray.500" mt={2}>
            *Este pago se ha enviado directamente a la red Stellar.
          </Text>
          {/* En un entorno real, aquí podrías mostrar un enlace a la transacción en un explorador de Stellar */}
          {/* <Link href={`https://stellar.expert/explorer/${STELLAR_NETWORK.toLowerCase()}/tx/${transactionId}`} isExternal color="stellarBlue.500">
            Ver en Stellar Explorer
          </ChakraLink> */}
        </Box>
      )}

      <Flex mt={4} justifyContent="center" alignItems="center">
        <Text fontSize="sm" color="gray.500" mr={2}>
          *Este es un pago directo. La confirmación final por parte de PuntoRed puede requerir pasos adicionales.
        </Text>
        <Link href="https://developers.stellar.org/docs/integrate/sep/sep-0024" isExternal fontSize="sm" color="blue.500" display="flex" alignItems="center">
          Más sobre SEP-24 <Icon as={FaExternalLinkAlt} ml={1} w={3} h={3} />
        </Link>
      </Flex>
    </VStack>
  );
}

export default PuntoRedWithdraw;
