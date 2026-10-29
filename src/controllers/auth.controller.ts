import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { generateToken } from '../utils/jwt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

const emailSchema = z
  .string({ error: 'A valid email is required' })
  .trim()
  .toLowerCase()
  .email('A valid email is required');

const registerSchema = z
  .strictObject({
    email: emailSchema,
    password: z
      .string({
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      })
      .min(
        MIN_PASSWORD_LENGTH,
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      ),
  });

const loginSchema = z
  .strictObject({
    email: emailSchema,
    password: z
      .string({ error: 'Email and password are required' })
      .min(1, 'Email and password are required'),
  });

const formatValidationError = (
  error: z.ZodError,
): { message: string; errors: Array<{ field: string; message: string }> } => {
  const [firstIssue] = error.issues;

  return {
    message: firstIssue?.message ?? 'Invalid request body',
    errors: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  };
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json(formatValidationError(parsed.error));
    return;
  }

  const { email, password } = parsed.data;

  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // El rol nunca se toma del body: evita escalada de privilegios (default USER).
    const user = await prisma.user.create({
      data: { email, password: hashedPassword },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    res.status(201).json({ user });
  } catch (error) {
    // P2002: violación de unicidad (cubre la condición de carrera sobre email).
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ message: 'Email already registered' });
      return;
    }
    console.error('register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json(formatValidationError(parsed.error));
    return;
  }

  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    // Mensaje genérico para no revelar si el email existe.
    const isValid = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !isValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const token = generateToken({ id: user.id, role: user.role });

    res.status(200).json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
