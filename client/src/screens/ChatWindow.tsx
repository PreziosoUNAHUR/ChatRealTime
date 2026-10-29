import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import axios from 'axios';
import { io, type Socket } from 'socket.io-client';
import { api, SOCKET_URL } from '../services/api';
import { useChatStore } from '../store/useChatStore';
import type {
  ChatMessage,
  CreateRoomResponse,
  Room,
  RoomsResponse,
  SendMessagePayload,
} from '../types/chat';
import { MsnLogo } from '../components/MsnLogo';
import { RoomList } from '../components/RoomList';
import { SnakeGame } from '../components/SnakeGame';
import { WindowTitleBar } from '../components/WindowTitleBar';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';
type ServerErrorPayload = { message?: string } | string;

const SEND_COOLDOWN_MS = 1000;

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Conectando…',
  connected: 'Conectado',
  disconnected: 'Desconectado',
};

const ROOM_ERRORS: Record<string, string> = {
  'Room already exists': 'Ya existe una sala con ese nombre.',
  'Room name is required': 'El nombre de la sala es obligatorio.',
  'Only administrators can create rooms':
    'Solo un administrador puede crear salas.',
  'Too many room creation attempts. Please wait a minute and try again.':
    'Demasiados intentos de crear salas. Esperá un minuto.',
  'Internal server error': 'El servidor tuvo un problema. Intenta de nuevo.',
};

const describeApiError = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError(error)) return fallback;

  if (error.response?.status === 401) {
    return 'Tu sesión expiró. Cerrá sesión y volvé a entrar.';
  }

  const serverMessage = (
    error.response?.data as { message?: string } | undefined
  )?.message;

  if (!serverMessage) return fallback;
  return ROOM_ERRORS[serverMessage] ?? serverMessage;
};

const sortRooms = (rooms: Room[]): Room[] =>
  [...rooms].sort((a, b) =>
    a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
  );

const initials = (value: string): string =>
  value.trim().slice(0, 2).toUpperCase() || '?';

const shortRoom = (room: string): string =>
  room.length > 18 ? `${room.slice(0, 16)}…` : room;

const formatTime = (isoDate: string): string => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function ChatWindow() {
  const token = useChatStore((state) => state.token);
  const user = useChatStore((state) => state.user);
  const logout = useChatStore((state) => state.logout);
  const unreadMessages = useChatStore((state) => state.unreadMessages);
  const chatMinimized = useChatStore((state) => state.chatMinimized);
  const windowFocused = useChatStore((state) => state.windowFocused);
  const snakeOpen = useChatStore((state) => state.snakeOpen);
  const fontSize = useChatStore((state) => state.fontSize);
  const fontFamily = useChatStore((state) => state.fontFamily);
  const fontColor = useChatStore((state) => state.fontColor);
  const roomHistory = useChatStore((state) => state.roomHistory);
  const toggleChatMinimized = useChatStore(
    (state) => state.toggleChatMinimized,
  );

  const socketRef = useRef<Socket | null>(null);
  const joinedRoomRef = useRef<string | null>(null);
  const knownRoomsRef = useRef<Room[]>([]);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const cooldownTimerRef = useRef<number | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sendLocked, setSendLocked] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'history' | null>(null);

  const joinKnownRooms = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    const ids = new Set(knownRoomsRef.current.map((room) => room.id));
    if (joinedRoomRef.current) ids.add(joinedRoomRef.current);

    ids.forEach((roomId) => socket.emit('joinRoom', roomId));
  }, []);

  const loadRooms = useCallback(async (): Promise<Room[] | null> => {
    try {
      const { data } = await api.get<RoomsResponse>('/rooms');
      const sorted = sortRooms(data.rooms);

      knownRoomsRef.current = sorted;
      setRooms(sorted);
      setRoomsError(null);

      // Nos unimos a todas las salas para poder contar mensajes no leídos
      // incluso cuando otra sala está activa.
      joinKnownRooms();

      return data.rooms;
    } catch (loadError) {
      setRoomsError(
        describeApiError(
          loadError,
          'No se pudieron cargar las salas. Revisá la conexión con el servidor.',
        ),
      );
      return null;
    } finally {
      setRoomsLoading(false);
    }
  }, [joinKnownRooms]);

  useEffect(() => {
    // La carga inicial de salas es una sincronización con el backend.
    // eslint-disable-next-line react/set-state-in-effect
    void loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connected');
      setError(null);

      // Al reconectar, recuperamos todas las salas conocidas.
      joinKnownRooms();
    });

    socket.on('disconnect', () => {
      setStatus('disconnected');
    });

    socket.on('connect_error', (err) => {
      setStatus('disconnected');

      if (err.message === 'Authentication error') {
        setError(
          'Tu sesión no es válida o expiró. Cierra sesión y vuelve a entrar.',
        );
        // No tiene sentido seguir reintentando con un token inválido.
        socket.disconnect();
        return;
      }

      setError(`No se pudo conectar con el servidor: ${err.message}`);
    });

    socket.on('newMessage', (message: ChatMessage) => {
      const state = useChatStore.getState();
      const isActiveRoom = message.roomId === joinedRoomRef.current;
      const isOwnMessage = message.userId === state.user?.id;
      const isBeingViewed =
        isActiveRoom && !state.chatMinimized && state.windowFocused;

      if (isActiveRoom) {
        setMessages((previous) =>
          previous.some((item) => item.id === message.id)
            ? previous
            : [...previous, message],
        );
      }

      if (isOwnMessage) return;

      if (isBeingViewed) {
        state.clearUnread(message.roomId);
      } else {
        state.incrementUnread(message.roomId);
      }
    });

    socket.on('error', (payload: ServerErrorPayload) => {
      const message =
        typeof payload === 'string'
          ? payload
          : (payload?.message ?? 'Error del servidor.');
      setError(message);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, joinKnownRooms]);

  // Al recuperar el foco (o restaurar la ventana) limpiamos el no leído
  // de la sala que el usuario está mirando.
  useEffect(() => {
    if (activeRoom && !chatMinimized && windowFocused) {
      useChatStore.getState().clearUnread(activeRoom.id);
    }
  }, [activeRoom, chatMinimized, windowFocused]);

  useEffect(() => {
    const list = messageListRef.current;
    if (list) {
      list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, chatMinimized]);

  useEffect(
    () => () => {
      if (cooldownTimerRef.current !== null) {
        window.clearTimeout(cooldownTimerRef.current);
      }
    },
    [],
  );

  const handleSelectRoom = useCallback((room: Room) => {
    if (joinedRoomRef.current === room.id) return;

    const socket = socketRef.current;
    joinedRoomRef.current = room.id;
    setActiveRoom(room);
    useChatStore.getState().setActiveRoom(room.id, room.name);
    setMessages([]);
    setDraft('');
    setError(null);
    useChatStore.getState().clearUnread(room.id);

    // Se mantiene la unión a las demás salas para contar no leídos.
    if (socket?.connected) {
      socket.emit('joinRoom', room.id);
    }
  }, []);

  const handleLeaveRoom = () => {
    const socket = socketRef.current;

    if (socket && joinedRoomRef.current) {
      socket.emit('leaveRoom', joinedRoomRef.current);
    }

    joinedRoomRef.current = null;
    setActiveRoom(null);
    useChatStore.getState().setActiveRoom(null);
    setMessages([]);
    setDraft('');
    setError(null);
  };

  const handleDeleteRoom = async (room: Room) => {
    try {
      await api.delete(`/rooms/${room.id}`);
      if (activeRoom?.id === room.id) handleLeaveRoom();
      await loadRooms();
    } catch (deleteError) {
      setRoomsError(describeApiError(deleteError, 'No se pudo eliminar la sala.'));
    }
  };

  const handleCreateRoom = async (name: string): Promise<boolean> => {
    if (creatingRoom) return false;

    setCreatingRoom(true);
    setRoomsError(null);

    try {
      const { data } = await api.post<CreateRoomResponse>('/rooms', { name });

      const nextRooms = knownRoomsRef.current.some(
        (room) => room.id === data.room.id,
      )
        ? knownRoomsRef.current
        : sortRooms([...knownRoomsRef.current, data.room]);

      knownRoomsRef.current = nextRooms;
      setRooms(nextRooms);
      socketRef.current?.emit('joinRoom', data.room.id);
      handleSelectRoom(data.room);

      // Refrescamos para quedar sincronizados con el backend.
      void loadRooms();
      return true;
    } catch (createError) {
      setRoomsError(
        describeApiError(createError, 'No se pudo crear la sala.'),
      );
      return false;
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleSendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (sendLocked) return;

    const content = draft.trim();
    if (!content) return;

    if (!activeRoom || !socketRef.current?.connected) {
      setError('Seleccioná una sala y esperá la conexión para enviar mensajes.');
      return;
    }

    const payload: SendMessagePayload = { roomId: activeRoom.id, content };
    socketRef.current.emit('sendMessage', payload);
    setDraft('');
    setError(null);

    // Cooldown visual: input y botón bloqueados exactamente 1 segundo.
    setSendLocked(true);
    if (cooldownTimerRef.current !== null) {
      window.clearTimeout(cooldownTimerRef.current);
    }
    cooldownTimerRef.current = window.setTimeout(() => {
      cooldownTimerRef.current = null;
      setSendLocked(false);
    }, SEND_COOLDOWN_MS);
  };

  const authorOf = (message: ChatMessage): string => {
    return message.user?.email ?? message.email ?? `Usuario ${message.userId.slice(0, 6)}`;
  };

  const unreadTotal = Object.values(unreadMessages).reduce(
    (total, count) => total + count,
    0,
  );

  return (
    <main className="xp-screen xp-screen--chat">
      <section
        className={`window chat-window${chatMinimized ? ' chat-window--minimized' : ''}`}
        aria-label="MSN Messenger"
      >
        <WindowTitleBar
          title={`MSN Messenger — ${user?.email ?? 'Invitado'}`}
          icon={<MsnLogo size={16} />}
          onMinimize={toggleChatMinimized}
          onClose={logout}
        />

        {!chatMinimized && (
          <>
            <nav
              className="menu-bar"
              aria-label="Menú de MSN Messenger"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                margin: 0,
                padding: '2px 8px',
                borderBottom: '1px solid #d4d0c8',
                backgroundColor: '#ece9d8',
                display: 'flex',
              }}
            >
              {['Archivo', 'Edición', 'Ver', 'Acciones', 'Ayuda'].map((label) => <div className="menu-entry" key={label}>
                <button type="button" aria-haspopup="menu" aria-expanded={openMenu === label} onClick={() => setOpenMenu(openMenu === label ? null : label)}>{label}</button>
                {openMenu === label && <div className="menu-dropdown" role="menu">
                  {label === 'Archivo' && <button type="button" role="menuitem" onClick={logout}>Salir</button>}
                  {label === 'Edición' && <>
                    <div className="menu-category">Fuente</div>{(['Arial', 'Tahoma', 'Comic Sans MS'] as const).map((font) => <button type="button" role="menuitemradio" aria-checked={fontFamily === font} key={font} onClick={() => useChatStore.getState().setFontFamily(font)}>{fontFamily === font ? '✓ ' : ''}{font}</button>)}
                    <div className="menu-category">Tamaño</div>{(['small', 'medium', 'large'] as const).map((size) => <button type="button" role="menuitemradio" aria-checked={fontSize === size} key={size} onClick={() => useChatStore.getState().setFontSize(size)}>{fontSize === size ? '✓ ' : ''}{size === 'small' ? 'Pequeño' : size === 'medium' ? 'Mediano' : 'Grande'}</button>)}
                    <div className="menu-category">Color de texto</div>{([{id:'black',name:'Negro'},{id:'blue',name:'Azul'},{id:'red',name:'Rojo'},{id:'green',name:'Verde'}] as const).map(({id,name}) => <button type="button" role="menuitemradio" aria-checked={fontColor === id} key={id} onClick={() => useChatStore.getState().setFontColor(id)}>{fontColor === id ? '✓ ' : ''}{name}</button>)}
                  </>}
                  {label === 'Ver' && <button type="button" role="menuitem" onClick={() => { setDialog('history'); setOpenMenu(null); }}>Historial</button>}
                  {label === 'Acciones' && <button type="button" role="menuitem" onClick={logout}>Cerrar sesión</button>}
                  {label === 'Ayuda' && <button type="button" role="menuitem" onClick={() => { window.open('https://github.com/PreziosoUNAHUR/ChatRealTime', '_blank', 'noopener,noreferrer'); setOpenMenu(null); }}>GitHub</button>}
                </div>}
              </div>)}
            </nav>

            <div className="chat-layout">
              <aside className="chat-sidebar">
                <div className="chat-profile">
                  <div className="chat-avatar">
                    {initials(user?.email ?? '?')}
                  </div>
                  <div className="chat-profile__info">
                    <strong title={user?.email}>{user?.email}</strong>
                    <span className="presence">
                      <i aria-hidden="true" /> En línea
                    </span>
                  </div>
                </div>

                <RoomList
                  rooms={rooms}
                  activeRoomId={activeRoom?.id ?? null}
                  unreadMessages={unreadMessages}
                  loading={roomsLoading}
                  creating={creatingRoom}
                  canCreate={user?.role === 'ADMIN'}
                  error={roomsError}
                  onSelect={handleSelectRoom}
                  onCreate={handleCreateRoom}
                  onLeave={handleLeaveRoom}
                  canDelete={user?.role === 'ADMIN'}
                  onDelete={(room) => void handleDeleteRoom(room)}
                />

                <div className="sidebar-section sidebar-section--contacts">
                  <h2 className="sidebar-title">Contactos</h2>
                  <ul className="contact-list">
                    <li className="contact">
                      <span className="contact__avatar" aria-hidden="true">
                        {initials(user?.email ?? '?')}
                      </span>
                      <span className="contact__name" title={user?.email}>
                        {user?.email} <em>(tú)</em>
                      </span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  className="logout-button"
                  onClick={logout}
                >
                  Cerrar sesión
                </button>
              </aside>

              <section
                className={`chat-main${activeRoom ? '' : ' chat-main--inactive'}`}
                aria-disabled={!activeRoom}
              >
                <header className="chat-header">
                  <div className="chat-header__title">
                    <MsnLogo size={28} />
                    <div>
                      <strong title={activeRoom?.name}>
                        {activeRoom ? shortRoom(activeRoom.name) : 'Sin sala'}
                      </strong>
                      <span>
                        {activeRoom
                          ? `${messages.length} mensaje${messages.length === 1 ? '' : 's'}`
                          : 'Seleccioná una sala de la lista'}
                      </span>
                    </div>
                  </div>
                  <span className={`connection-pill connection-pill--${status}`}>
                    {STATUS_LABEL[status]}
                  </span>
                </header>

                {error && (
                  <div className="chat-alert" role="alert">
                    <span>{error}</span>
                    <button
                      type="button"
                      aria-label="Cerrar aviso"
                      onClick={() => setError(null)}
                    >
                      ×
                    </button>
                  </div>
                )}

                <div
                  className={`message-list message-list--${fontSize} message-list--${fontColor}`}
                  style={{ fontFamily }}
                  ref={messageListRef}
                  role="log"
                  aria-live="polite"
                >
                  {!activeRoom ? (
                    <div className="chat-empty">
                      <MsnLogo size={64} />
                      <p>
                        Elegí una sala del panel izquierdo para empezar a
                        conversar.
                      </p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="chat-empty">
                      <MsnLogo size={64} />
                      <p>
                        Todavía no hay mensajes. ¡Escribe el primero!
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwn = message.userId === user?.id;
                      const author = authorOf(message);

                      return (
                        <article
                          key={message.id}
                          className={`message${isOwn ? ' message--own' : ''}`}
                        >
                          <div
                            className="message__avatar"
                            aria-hidden="true"
                          >
                            {initials(author)}
                          </div>
                          <div className="message__body">
                            <div className="message__meta">
                              <span className="message__author">
                                {author}
                              </span>
                              <time dateTime={message.createdAt}>
                                {formatTime(message.createdAt)}
                              </time>
                            </div>
                            <p className="message__text">{message.content}</p>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>

                <form className="composer" onSubmit={handleSendMessage}>
                  <label className="sr-only" htmlFor="message-input">
                    Mensaje
                  </label>
                  <input
                    id="message-input"
                    type="text"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={
                      sendLocked
                        ? 'Esperá un segundo…'
                        : activeRoom
                          ? 'Escribe un mensaje…'
                          : 'Seleccioná una sala primero'
                    }
                    autoComplete="off"
                    disabled={
                      !activeRoom || status !== 'connected' || sendLocked
                    }
                  />
                  <button
                    type="submit"
                    disabled={
                      !activeRoom ||
                      status !== 'connected' ||
                      sendLocked ||
                      !draft.trim()
                    }
                  >
                    {sendLocked ? 'Espera…' : 'Enviar'}
                  </button>
                </form>

                <div className="status-bar">
                  <p className="status-bar-field">{STATUS_LABEL[status]}</p>
                  <p className="status-bar-field">
                    {activeRoom
                      ? `Sala: ${shortRoom(activeRoom.name)}`
                      : 'Sin sala'}
                  </p>
                  <p className="status-bar-field">
                    {messages.length} mensaje
                    {messages.length === 1 ? '' : 's'}
                    {unreadTotal > 0 ? ` · ${unreadTotal} sin leer` : ''}
                  </p>
                </div>
              </section>
            </div>
          </>
        )}
      </section>

      {snakeOpen && <SnakeGame />}
      {dialog && <div className="xp-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
        <section className="window xp-modal" role="dialog" aria-modal="true" aria-labelledby="xp-modal-title">
          <div className="title-bar"><div className="title-bar-text" id="xp-modal-title">Historial de salas</div><button type="button" className="xp-modal-close" aria-label="Cerrar" onClick={() => setDialog(null)}>×</button></div>
          <div className="window-body">
            {roomHistory.length ? <ul className="history-list">{roomHistory.map((room, index) => <li key={`${room}-${index}`}>{room}</li>)}</ul> : <p>Aún no visitaste ninguna sala en esta sesión.</p>}
            <div className="xp-modal__actions"><button type="button" onClick={() => setDialog(null)}>Aceptar</button></div>
          </div>
        </section>
      </div>}
    </main>
  );
}
