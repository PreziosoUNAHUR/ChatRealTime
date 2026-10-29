# MSN Messenger XP — Cliente

Cliente de chat en tiempo real con React + TypeScript + Vite, estética de
Windows XP / MSN Messenger (xp.css), estado global con Zustand y Socket.IO.

## Requisitos

- Node.js 20.19+ (probado con Node 24)
- El backend de `ChatRealTime` corriendo en `http://localhost:3000`
- Una cuenta registrada (`POST /api/auth/register`)

## Puesta en marcha

```bash
cd client
npm install
npm run dev
```

Abre `http://localhost:5173`.

## Variables de entorno

Copia `.env.example` a `.env` si necesitas apuntar a otro backend:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

## Estructura

```
src/
  components/    MsnLogo, RoomList, Taskbar, ThemePanel, WindowTitleBar
  lib/           Utilidades de JWT
  screens/       Login y ChatWindow
  services/      Instancia de Axios con interceptor de Authorization
  store/         Zustand (token, usuario, tema XP)
  styles/        Temas Plata / Oliva / Custom sobre xp.css
  types/         Tipos compartidos del chat
```

## Salas

- El panel lateral lista las salas con `GET /api/rooms`.
- El formulario del panel crea salas con `POST /api/rooms` y refresca la lista.
- Al seleccionar una sala se emite `joinRoom`; el chat y el input de mensajes
  permanecen bloqueados hasta que haya una sala activa.
- El interceptor de Axios lee el token persistido por Zustand en
  `localStorage` (`xp-chat-store`) y agrega `Authorization: Bearer <token>`.

## Temas

xp.css solo incluye el tema Luna azul. Los temas **Plata** y **Oliva** se
recrean sobrescribiendo `.window` y `.title-bar` con los gradientes clásicos
de Windows XP. El modo **Custom** aplica `filter: hue-rotate()` sobre las
ventanas del escritorio con el ángulo elegido en el panel de temas.

## Notas del backend

- El login se hace contra `POST /api/auth/login`.
- Las rutas `/api/rooms` requieren JWT.
- El socket se autentica con `auth: { token }` en el handshake.
- `joinRoom` / `leaveRoom` / `sendMessage` usan el ID de la sala.
