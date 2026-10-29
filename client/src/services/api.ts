import axios from 'axios';

export const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000';

const STORE_KEY = 'xp-chat-store';

/**
 * El token vive dentro del estado persistido de Zustand en localStorage.
 * Lo leemos en cada request para no depender de una copia desactualizada.
 */
const readStoredToken = (): string | null => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      state?: { token?: unknown };
    };

    return typeof parsed.state?.token === 'string'
      ? parsed.state.token
      : null;
  } catch {
    return null;
  }
};

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

api.interceptors.request.use((config) => {
  const token = readStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
