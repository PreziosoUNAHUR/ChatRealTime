import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET is required in production');
}

// NOTE: el fallback es solo para desarrollo local. En producción usar JWT_SECRET.
const SECRET: string = JWT_SECRET ?? 'insecure-development-secret';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ??
  '1d') as NonNullable<SignOptions['expiresIn']>;

export interface TokenPayload {
  id: string;
  role: Role;
}

export const generateToken = (payload: TokenPayload): string => {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };

  return jwt.sign({ id: payload.id, role: payload.role }, SECRET, options);
};

// Lanza JsonWebTokenError / TokenExpiredError si el token es inválido o expiró.
export const verifyToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, SECRET) as JwtPayload & TokenPayload;
  return { id: decoded.id, role: decoded.role };
};
