// ============================================================
// Storage Utility - Cross-platform secure storage
// ============================================================
// Uses expo-secure-store on native devices and
// localStorage as fallback for web development.
// ============================================================

import { Platform } from 'react-native';

let SecureStore: typeof import('expo-secure-store') | null = null;

// Only import SecureStore on native platforms
if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

/**
 * Get a value from secure storage
 */
export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore?.getItemAsync(key) ?? null;
}

/**
 * Set a value in secure storage
 */
export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch {
      console.warn('[Storage] Failed to save to localStorage');
    }
    return;
  }
  await SecureStore?.setItemAsync(key, value);
}

/**
 * Delete a value from secure storage
 */
export async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch {
      console.warn('[Storage] Failed to remove from localStorage');
    }
    return;
  }
  await SecureStore?.deleteItemAsync(key);
}
