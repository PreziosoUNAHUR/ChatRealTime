import type { ReactNode } from 'react';

interface WindowTitleBarProps {
  title: string;
  icon?: ReactNode;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

export function WindowTitleBar({
  title,
  icon,
  onMinimize,
  onMaximize,
  onClose,
}: WindowTitleBarProps) {
  return (
    <div className="title-bar">
      <div className="title-bar-text window-title">
        {icon}
        <span>{title}</span>
      </div>
      <div className="title-bar-controls">
        <button
          type="button"
          aria-label="Minimize"
          onClick={onMinimize}
          disabled={!onMinimize}
        />
        <button
          type="button"
          aria-label="Maximize"
          onClick={onMaximize}
          disabled={!onMaximize}
        />
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          disabled={!onClose}
        />
      </div>
    </div>
  );
}
