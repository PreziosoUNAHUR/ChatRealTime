import { useEffect, useState } from 'react';
import { useChatStore } from '../store/useChatStore';
import { MsnLogo } from './MsnLogo';
import { ThemePanel } from './ThemePanel';

function SnakeIcon() {
  return (
    <svg
      className="xp-task__icon"
      width="18"
      height="18"
      viewBox="0 0 16 16"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <rect width="16" height="16" rx="2" fill="#0b3d1c" />
      <path
        d="M4 4h5v2H6v2H4V4Zm7 2h2v3h-2V6ZM6 8h5v2H8v2H4v-2h2V8Zm-2 4h4v2H4v-2Z"
        fill="#6ddb5f"
      />
      <rect x="10" y="4" width="2" height="2" fill="#ff3b30" />
      <rect x="10" y="4" width="1" height="1" fill="#fff1a8" />
    </svg>
  );
}

export function Taskbar() {
  const [now, setNow] = useState(() => new Date());
  const token = useChatStore((state) => state.token);
  const unreadMessages = useChatStore((state) => state.unreadMessages);
  const chatMinimized = useChatStore((state) => state.chatMinimized);
  const windowFocused = useChatStore((state) => state.windowFocused);
  const snakeOpen = useChatStore((state) => state.snakeOpen);
  const toggleChatMinimized = useChatStore(
    (state) => state.toggleChatMinimized,
  );
  const toggleSnake = useChatStore((state) => state.toggleSnake);
  const setWindowFocused = useChatStore((state) => state.setWindowFocused);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const focus = () => setWindowFocused(true);
    const blur = () => setWindowFocused(false);
    const visibility = () => setWindowFocused(document.visibilityState === 'visible');

    window.addEventListener('focus', focus);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);

    return () => {
      window.removeEventListener('focus', focus);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [setWindowFocused]);

  const unreadTotal = Object.values(unreadMessages).reduce(
    (total, count) => total + count,
    0,
  );
  const shouldBlink =
    Boolean(token) && unreadTotal > 0 && (chatMinimized || !windowFocused);

  return (
    <footer className="xp-taskbar">
      <button type="button" className="xp-start" aria-label="Menú Inicio">
        <span className="xp-start__flag" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        <span>Inicio</span>
      </button>

      <button
        type="button"
        className={`xp-task xp-task--msn${shouldBlink ? ' xp-task--blink' : ''}`}
        aria-pressed={Boolean(token) && !chatMinimized}
        onClick={toggleChatMinimized}
        disabled={!token}
        title={
          unreadTotal > 0
            ? `${unreadTotal} mensaje${unreadTotal === 1 ? '' : 's'} sin leer`
            : 'MSN Messenger'
        }
      >
        <MsnLogo size={17} />
        <span className="xp-task__label">MSN Messenger</span>
        {unreadTotal > 0 && (
          <span className="xp-task__badge" aria-label={`${unreadTotal} sin leer`}>
            {unreadTotal > 99 ? '99+' : unreadTotal}
          </span>
        )}
      </button>

      <button
        type="button"
        className="xp-task xp-task--snake"
        aria-pressed={snakeOpen}
        onClick={toggleSnake}
        disabled={!token}
        title="Snake XP"
      >
        <SnakeIcon />
        <span className="xp-task__label">Snake XP</span>
      </button>

      <div className="xp-tray">
        <ThemePanel />
        <span
          className="xp-tray__clock"
          title={now.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        >
          {now.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </footer>
  );
}
