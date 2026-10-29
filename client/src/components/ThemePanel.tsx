import { useState } from 'react';
import {
  useChatStore,
  type XpTheme,
} from '../store/useChatStore';

const THEMES: Array<{ id: XpTheme; label: string }> = [
  { id: 'blue', label: 'Azul' },
  { id: 'silver', label: 'Plata' },
  { id: 'olive', label: 'Oliva' },
  { id: 'custom', label: 'Custom' },
];

export function ThemePanel() {
  const [open, setOpen] = useState(false);
  const theme = useChatStore((state) => state.theme);
  const customHue = useChatStore((state) => state.customHue);
  const setTheme = useChatStore((state) => state.setTheme);
  const setCustomHue = useChatStore((state) => state.setCustomHue);

  return (
    <>
      {open && (
        <section
          className="window theme-panel"
          aria-label="Propiedades de pantalla"
        >
          <div className="title-bar">
            <div className="title-bar-text">Propiedades de pantalla</div>
            <div className="title-bar-controls">
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
              />
            </div>
          </div>
          <div className="window-body">
            <p className="theme-panel__hint">Tema de Windows XP</p>

            <div className="theme-swatches" role="group" aria-label="Temas">
              {THEMES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`theme-swatch theme-swatch--${option.id}`}
                  aria-pressed={theme === option.id}
                  onClick={() => setTheme(option.id)}
                >
                  <span className="theme-swatch__bar" aria-hidden="true" />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>

            {theme === 'custom' && (
              <div className="theme-hue">
                <label htmlFor="theme-hue">
                  Tono: {customHue}°
                </label>
                <input
                  id="theme-hue"
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={customHue}
                  onChange={(event) =>
                    setCustomHue(Number(event.target.value))
                  }
                />
              </div>
            )}

            <p className="theme-panel__note">
              El modo Custom aplica <code>hue-rotate()</code> a las ventanas.
            </p>
          </div>
        </section>
      )}

      <button
        type="button"
        className="xp-tray__theme"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        title="Cambiar el tema de Windows XP"
      >
        <span className="xp-tray__palette" aria-hidden="true">
          🎨
        </span>
        <span>Tema</span>
      </button>
    </>
  );
}
