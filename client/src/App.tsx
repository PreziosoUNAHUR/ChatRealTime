import { useEffect, type CSSProperties } from 'react';
import { Taskbar } from './components/Taskbar';
import { isTokenExpired } from './lib/jwt';
import { ChatWindow } from './screens/ChatWindow';
import { Login } from './screens/Login';
import { useChatStore } from './store/useChatStore';

function App() {
  const token = useChatStore((state) => state.token);
  const theme = useChatStore((state) => state.theme);
  const customHue = useChatStore((state) => state.customHue);
  const logout = useChatStore((state) => state.logout);

  const hasValidSession = token !== null && !isTokenExpired(token);

  // Si el token guardado ya expiró, limpiamos la sesión persistida.
  useEffect(() => {
    if (token && !hasValidSession) {
      logout();
    }
  }, [token, hasValidSession, logout]);

  return (
    <div
      className="xp-desktop"
      data-xp-theme={theme}
      style={{ '--xp-hue': `${customHue}deg` } as CSSProperties}
    >
      <div className="xp-desktop__backdrop" aria-hidden="true" />
      {hasValidSession ? <ChatWindow /> : <Login />}
      <Taskbar />
    </div>
  );
}

export default App;
