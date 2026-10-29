import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'xp.css/dist/XP.css';
import './styles/xp-themes.css';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
