import * as SecureStore from 'expo-secure-store';

const KEY = 'rn1.session';
export const readSession = () => SecureStore.getItemAsync(KEY);
export const saveSession = (token: string) => SecureStore.setItemAsync(KEY, token);
export const clearSession = () => SecureStore.deleteItemAsync(KEY);
