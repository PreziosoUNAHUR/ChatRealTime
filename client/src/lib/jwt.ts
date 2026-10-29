/**
 * Comprueba si un JWT ya expiró sin depender de una librería extra.
 * Si no se puede decodificar, lo tratamos como inválido.
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return true;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      Math.ceil(normalized.length / 4) * 4,
      '=',
    );
    const decoded = JSON.parse(atob(padded)) as { exp?: number };

    if (typeof decoded.exp !== 'number') return false;
    return decoded.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};
