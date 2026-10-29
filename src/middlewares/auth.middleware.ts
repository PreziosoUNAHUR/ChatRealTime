import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { verifyToken as verifyJwt, TokenPayload } from '../utils/jwt';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

const BEARER_PREFIX = 'Bearer ';

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
    res.status(401).json({ message: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.slice(BEARER_PREFIX.length).trim();

  try {
    req.user = verifyJwt(token);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Debe usarse después de verifyToken.
export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== Role.ADMIN) {
    res.status(403).json({ message: 'Admin role required' });
    return;
  }
  next();
};