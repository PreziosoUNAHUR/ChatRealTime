import { useState, type FormEvent } from 'react';
import axios from 'axios';
import { api, SOCKET_URL } from '../services/api';
import { useChatStore } from '../store/useChatStore';
import type { LoginResponse } from '../types/chat';
import { MsnLogo } from '../components/MsnLogo';
import { WindowTitleBar } from '../components/WindowTitleBar';

const SERVER_MESSAGES: Record<string, string> = {
  'Invalid credentials': 'Correo o contraseña incorrectos.',
  'Email and password are required': 'Ingresa tu correo y tu contraseña.',
  'Internal server error': 'El servidor tuvo un problema. Intenta de nuevo.',
};

export function Login() {
  const setSession = useChatStore((state) => state.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      const { data } = await api.post<LoginResponse>('/auth/login', {
        email: email.trim(),
        password,
      });
      setSession(data.token, data.user);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const serverMessage = (
          err.response?.data as { message?: string } | undefined
        )?.message;

        setError(
          serverMessage
            ? (SERVER_MESSAGES[serverMessage] ?? serverMessage)
            : 'No se pudo conectar con el servidor. ¿Está corriendo en el puerto 3000?',
        );
      } else {
        setError('Ocurrió un error inesperado.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="xp-screen">
      <section className="window login-window" aria-labelledby="login-title">
        <WindowTitleBar title="Iniciar sesión en MSN Messenger" />

        <div className="window-body login-body">
          <div className="login-brand">
            <MsnLogo size={54} />
            <div>
              <h1 id="login-title" className="login-title">
                MSN Messenger
              </h1>
              <p className="login-subtitle">
                Conéctate a .NET Messenger Service
              </p>
            </div>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field-row-stacked">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="field-row-stacked">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <div className="login-actions">
              <button type="submit" disabled={loading}>
                {loading ? 'Conectando…' : 'Iniciar sesión'}
              </button>
            </div>

            <p className="login-hint">
              Usa una cuenta registrada en{' '}
              <code>POST /api/auth/register</code>.
            </p>
          </form>
        </div>

        <div className="status-bar">
          <p className="status-bar-field">
            Estado: {loading ? 'Conectando…' : 'Desconectado'}
          </p>
          <p className="status-bar-field">
            Servidor: {SOCKET_URL.replace(/^https?:\/\//, '')}
          </p>
        </div>
      </section>
    </main>
  );
}
