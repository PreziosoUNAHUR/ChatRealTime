import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateRoomBody {
  name?: unknown;
}

export const createRoom = async (req: Request, res: Response): Promise<void> => {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ message: 'Only administrators can create rooms' });
    return;
  }

  const { name } = (req.body ?? {}) as CreateRoomBody;

  if (typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ message: 'Room name is required' });
    return;
  }

  try {
    const room = await prisma.room.create({
      data: { name: name.trim() },
    });

    res.status(201).json({ room });
  } catch (error) {
    // P2002: violación de unicidad sobre Room.name.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ message: 'Room already exists' });
      return;
    }

    console.error('createRoom error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getRooms = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: { name: 'asc' },
    });

    res.status(200).json({ rooms });
  } catch (error) {
    console.error('getRooms error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteRoom = async (req: Request, res: Response): Promise<void> => {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ message: 'Only administrators can delete rooms' });
    return;
  }

  const roomId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!roomId) {
    res.status(404).json({ message: 'Room not found' });
    return;
  }

  try {
    await prisma.$transaction([
      prisma.message.deleteMany({ where: { roomId } }),
      prisma.room.delete({ where: { id: roomId } }),
    ]);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ message: 'Room not found' });
      return;
    }
    console.error('deleteRoom error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
