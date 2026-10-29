import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SendMessagePayload {
  roomId: string | number;
  content: string;
}

const SEND_COOLDOWN_MS = 1000;

export const registerChatHandlers = (io: Server, socket: Socket): void => {
  socket.on('joinRoom', (roomId: string) => {
    socket.join(roomId);
  });

  socket.on('leaveRoom', (roomId: string) => {
    socket.leave(roomId);
  });

  socket.on('sendMessage', async ({ roomId, content }: SendMessagePayload) => {
    const now = Date.now();
    const lastSentAt = Number(socket.data.lastMessageAt ?? 0);

    if (now - lastSentAt < SEND_COOLDOWN_MS) {
      socket.emit('error', {
        message: 'Esperá un segundo antes de enviar otro mensaje.',
      });
      return;
    }

    // Reservamos el timestamp antes del await para que dos eventos casi
    // simultáneos no puedan saltarse el cooldown.
    socket.data.lastMessageAt = now;

    try {
      if (typeof content !== 'string' || content.trim().length === 0) {
        socket.emit('error', { message: 'El mensaje no puede estar vacío.' });
        return;
      }

      const userId = socket.data.user.id;

      const message = await prisma.message.create({
        data: {
          content: content.trim().slice(0, 2000),
          room: { connect: { id: roomId as any } },
          user: { connect: { id: userId } },
        },
        include: { user: { select: { id: true, email: true } } },
      });

      io.to(String(roomId)).emit('newMessage', message);
    } catch (error) {
      socket.emit('error', { message: 'Error sending message' });
    }
  });
};
