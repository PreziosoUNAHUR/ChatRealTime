import authRoutes from './routes/auth.routes';
import roomRoutes from './routes/room.routes';
import http from 'http';
import express, { Application } from 'express';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { socketAuthMiddleware } from './middlewares/socket.middleware';
import { registerChatHandlers } from './sockets/chat.socket';
import roomRoutes from './routes/room.routes';

const CLIENT_ORIGIN = 'http://localhost:5173';
const PORT = Number(process.env.PORT) || 3000;

const corsOptions: cors.CorsOptions = {
  origin: CLIENT_ORIGIN,
  credentials: true,
};

const app: Application = express();

// 1. Parseo de body y cors siempre arriba de todo
app.use(express.json());
app.use(cors(corsOptions));

// 2. Las rutas van después de express.json()
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

const httpServer = http.createServer(app);

export const io = new Server(httpServer, {
  cors: corsOptions,
});

// Filtro de seguridad: intercepta la conexión y valida el JWT
io.use(socketAuthMiddleware);

const registerSocketHandlers = (socket: Socket): void => {
  console.log(`Socket connected: ${socket.id} | User ID: ${socket.data.user?.id}`);

  // Conectamos la lógica de salas y mensajes a este socket
  registerChatHandlers(io, socket);

  const onDisconnect = (reason: string): void => {
    console.log(`Socket disconnected: ${socket.id} (${reason})`);
    socket.removeAllListeners();
  };

  socket.once('disconnect', onDisconnect);
};

io.on('connection', registerSocketHandlers);

const shutdown = (signal: string): void => {
  console.log(`${signal} received. Shutting down gracefully...`);
  io.removeAllListeners();
  io.close(() => {
    httpServer.close(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Arrancamos el server
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

export { app, httpServer };