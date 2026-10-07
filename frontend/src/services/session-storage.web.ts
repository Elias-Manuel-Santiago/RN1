// Browsers use the backend's HttpOnly cookie, never localStorage for credentials.
export const readSession = async (): Promise<string | null> => null;
export const saveSession = async (_token: string): Promise<void> => {};
export const clearSession = async (): Promise<void> => {};
