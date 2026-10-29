import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createRoom, deleteRoom, getRooms } from '../controllers/room.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const roomRouter = Router();

// Crear salas es una acción sensible: 1 petición por minuto por IP.
const createRoomLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 1,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    message: 'Too many room creation attempts. Please wait a minute and try again.',
  },
});

roomRouter.get('/', verifyToken, getRooms);
roomRouter.post('/', verifyToken, createRoomLimiter, createRoom);
roomRouter.delete('/:id', verifyToken, deleteRoom);

export default roomRouter;
