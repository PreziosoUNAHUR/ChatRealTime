import { useId } from 'react';

interface MsnLogoProps {
  size?: number;
  className?: string;
}

/**
 * Logo simplificado de MSN Messenger (dos burbujas de chat).
 * Se dibuja en SVG para no depender de imágenes externas.
 */
export function MsnLogo({ size = 40, className }: MsnLogoProps) {
  const uid = useId().replace(/:/g, '');
  const blueId = `msn-blue-${uid}`;
  const greenId = `msn-green-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="MSN Messenger"
    >
      <defs>
        <linearGradient id={blueId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8fd3ff" />
          <stop offset="100%" stopColor="#1f6fd0" />
        </linearGradient>
        <linearGradient id={greenId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b8e986" />
          <stop offset="100%" stopColor="#4c9a2a" />
        </linearGradient>
      </defs>

      <path
        d="M6 14a10 10 0 0 1 10-10h22a10 10 0 0 1 10 10v12a10 10 0 0 1-10 10H24l-9 8v-8h-1A8 8 0 0 1 6 28V14Z"
        fill={`url(#${blueId})`}
        stroke="#0b3d7a"
        strokeWidth="2"
      />
      <circle cx="21" cy="20" r="2.6" fill="#fff" />
      <circle cx="31" cy="20" r="2.6" fill="#fff" />
      <circle cx="41" cy="20" r="2.6" fill="#fff" />

      <path
        d="M30 34a9 9 0 0 1 9-9h14a9 9 0 0 1 9 9v8a9 9 0 0 1-9 9h-2v7l-8-7H39a9 9 0 0 1-9-9v-8Z"
        fill={`url(#${greenId})`}
        stroke="#2f6b18"
        strokeWidth="2"
      />
      <circle cx="43" cy="38" r="2.2" fill="#fff" />
      <circle cx="51" cy="38" r="2.2" fill="#fff" />
    </svg>
  );
}
