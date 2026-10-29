import type { Socket, ExtendedError } from 'socket.io';
import { verifyToken } from '../utils/jwt';

export const socketAuthMiddleware = (
  socket: Socket,
  next: (err?: ExtendedError) => void
): void => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication error'));
    }

    // verifyToken valida la firma y la expiración con el mismo secreto usado al firmar
    socket.data.user = verifyToken(token);
    next();
  } catch {
    next(new Error('Authentication error'));
  }
};
