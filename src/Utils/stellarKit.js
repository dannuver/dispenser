// src/utils/stellarKit.js
import { StellarWalletsKit, allowAllModules, FREIGHTER_ID } from '@creit.tech/stellar-wallets-kit';
import { Networks } from 'stellar-sdk'; // Importamos Networks de stellar-sdk

const SELECTED_WALLET_ID_KEY = "selectedWalletId";
// Usamos Networks.TESTNET como passphrase para el kit. Ajusta a Networks.PUBLIC para Mainnet.
const STELLAR_NETWORK_PASSPHRASE = Networks.TESTNET;

// Inicializamos el kit una única vez
export const kit = new StellarWalletsKit({
  modules: allowAllModules(), // Permite todas las billeteras soportadas
  network: STELLAR_NETWORK_PASSPHRASE,
  selectedWalletId: localStorage.getItem(SELECTED_WALLET_ID_KEY) ?? FREIGHTER_ID, // Intenta cargar la wallet seleccionada
});

// Funciones de utilidad para interactuar con el kit y localStorage
export async function getStellarKitPublicKey() {
  const storedWalletId = localStorage.getItem(SELECTED_WALLET_ID_KEY);
  if (!storedWalletId) return null;
  try {
    await kit.setWallet(storedWalletId); // Asegura que el kit use la wallet correcta
    const { address } = await kit.getAddress();
    return address;
  } catch (error) {
    console.error("Error getting public key from kit:", error);
    return null;
  }
}

export async function setStellarKitWallet(walletId) {
  localStorage.setItem(SELECTED_WALLET_ID_KEY, walletId);
  await kit.setWallet(walletId);
}

export async function disconnectStellarKitWallet() {
  localStorage.removeItem(SELECTED_WALLET_ID_KEY);
  // No limpiamos stellarJwt o stellarAddress aquí, ya que App.jsx los maneja.
  await kit.disconnect();
}