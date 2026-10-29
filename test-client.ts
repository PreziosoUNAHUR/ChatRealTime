import { io } from 'socket.io-client';

// REEMPLAZÁ ESTAS DOS VARIABLES
const token = process.env.JWT_TOKEN;
const roomId = process.env.ROOM_ID;

if (!token || !roomId) {
  throw new Error('Definí JWT_TOKEN y ROOM_ID antes de ejecutar este cliente.');
}
const socket = io('http://localhost:3000', {
  auth: { token }
});

socket.on('connect', () => {
  console.log('✅ Cliente conectado con ID:', socket.id);
  
  // 1. Nos unimos a la sala
  socket.emit('joinRoom', roomId);
  console.log(`📡 Uniendo a la sala: ${roomId}`);

  // 2. Mandamos el mensaje un segundo después para asegurar el join
  setTimeout(() => {
    socket.emit('sendMessage', {
      roomId: roomId,
      content: "¡Mensaje de prueba exitoso directo a PostgreSQL!"
    });
    console.log('💬 Evento sendMessage emitido.');
  }, 1000);
});

socket.on('newMessage', (message) => {
  console.log('🔥 ¡Mensaje retransmitido por el servidor y recibido!', message);
  process.exit(0); // Corta el script al recibirlo
});

socket.on('connect_error', (err) => {
  console.error('❌ Error de conexión:', err.message);
});