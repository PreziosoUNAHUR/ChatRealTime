import { useState, type FormEvent } from 'react';
import type { Room } from '../types/chat';

interface RoomListProps {
  rooms: Room[];
  activeRoomId: string | null;
  unreadMessages: Record<string, number>;
  loading: boolean;
  creating: boolean;
  canCreate: boolean;
  error: string | null;
  onSelect: (room: Room) => void;
  onCreate: (name: string) => Promise<boolean>;
  onLeave: () => void;
  canDelete: boolean;
  onDelete: (room: Room) => void;
}

export function RoomList({
  rooms,
  activeRoomId,
  unreadMessages,
  loading,
  creating,
  canCreate,
  error,
  onSelect,
  onCreate,
  onLeave,
  canDelete,
  onDelete,
}: RoomListProps) {
  const [name, setName] = useState('');

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const roomName = name.trim();
    if (!roomName || creating) return;

    const created = await onCreate(roomName);
    if (created) setName('');
  };

  return (
    <div className="sidebar-section sidebar-section--rooms">
      <div className="sidebar-section__head">
        <h2 className="sidebar-title">Salas</h2>
        {activeRoomId && (
          <button
            type="button"
            className="sidebar-link"
            onClick={onLeave}
          >
            Salir
          </button>
        )}
      </div>

      {loading ? (
        <p className="sidebar-empty">Cargando salas…</p>
      ) : rooms.length === 0 ? (
        <p className="sidebar-empty">
          No hay salas todavía. Creá la primera.
        </p>
      ) : (
        <ul className="room-list" aria-label="Salas de chat">
          {rooms.map((room) => {
            const isActive = room.id === activeRoomId;
            const unread = unreadMessages[room.id] ?? 0;
            const isUnread = unread > 0;

            return (
              <li key={room.id}>
                <button
                  type="button"
                  className={`room-item${isActive ? ' room-item--active' : ''}${
                    isUnread ? ' room-item--unread' : ''
                  }`}
                  aria-pressed={isActive}
                  aria-label={`${room.name}${isUnread ? `, ${unread} sin leer` : ''}`}
                  onClick={() => onSelect(room)}
                >
                  <span className="room-item__icon" aria-hidden="true">
                    #
                  </span>
                  <span className="room-item__name" title={room.name}>
                    {room.name}
                  </span>
                  {isUnread ? (
                    <span
                      className="room-item__unread"
                      aria-label={`${unread} mensaje${unread === 1 ? '' : 's'} sin leer`}
                    >
                      {unread > 99 ? '99+' : unread}
                    </span>
                  ) : (
                    isActive && (
                      <span className="room-item__badge">En línea</span>
                    )
                  )}
                </button>
                {canDelete && (
                  <button
                    type="button"
                    className="room-delete"
                    title={`Eliminar sala ${room.name}`}
                    aria-label={`Eliminar sala ${room.name}`}
                    onClick={() => onDelete(room)}
                  >
                    x
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canCreate ? (
        <form className="create-room-form" onSubmit={handleCreate}>
          <label className="sr-only" htmlFor="new-room-name">
            Nombre de la nueva sala
          </label>
          <input
            id="new-room-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nueva sala…"
            autoComplete="off"
            maxLength={60}
            disabled={creating}
          />
          <button
            type="submit"
            disabled={creating || !name.trim()}
            title="Crear sala"
          >
            {creating ? '…' : 'Crear'}
          </button>
        </form>
      ) : (
        <p className="sidebar-note">Solo un administrador puede crear salas.</p>
      )}

      {error && (
        <p className="sidebar-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
