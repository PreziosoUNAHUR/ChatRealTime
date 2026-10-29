import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useChatStore } from '../store/useChatStore';
import { WindowTitleBar } from './WindowTitleBar';

const GRID = 20;
const CELL = 16;
const BOARD = GRID * CELL;
const TICK_MS = 120;
const BEST_KEY = 'snake-xp-best';

type Point = { x: number; y: number };
type GameStatus = 'idle' | 'running' | 'over';

const INITIAL_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];

const randomFood = (snake: Point[]): Point => {
  const occupied = new Set(snake.map((segment) => `${segment.x}:${segment.y}`));
  const free: Point[] = [];

  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      if (!occupied.has(`${x}:${y}`)) free.push({ x, y });
    }
  }

  return free[Math.floor(Math.random() * free.length)] ?? { x: 0, y: 0 };
};

const readBest = (): number => {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
};

function PixelSnakeIcon(): ReactNode {
  return (
    <svg
      width="16"
      height="16"
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
    </svg>
  );
}

const KEY_DIRECTIONS: Record<string, Point> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
};

export function SnakeGame() {
  const setSnakeOpen = useChatStore((state) => state.setSnakeOpen);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snakeRef = useRef<Point[]>(INITIAL_SNAKE);
  const foodRef = useRef<Point>({ x: 14, y: 10 });
  const directionRef = useRef<Point>({ x: 1, y: 0 });
  const queueRef = useRef<Point[]>([]);
  const scoreRef = useRef(0);
  const bestRef = useRef(readBest());

  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Point>({ x: 14, y: 10 });
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(readBest);
  const [status, setStatus] = useState<GameStatus>('idle');

  const start = useCallback(() => {
    const initial = INITIAL_SNAKE.map((segment) => ({ ...segment }));

    snakeRef.current = initial;
    foodRef.current = randomFood(initial);
    directionRef.current = { x: 1, y: 0 };
    queueRef.current = [];
    scoreRef.current = 0;

    setSnake(initial);
    setFood(foodRef.current);
    setScore(0);
    setStatus('running');
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && status !== 'running') {
        event.preventDefault();
        start();
        return;
      }

      const next = KEY_DIRECTIONS[event.key.toLowerCase()] ??
        KEY_DIRECTIONS[event.key];

      if (!next) return;

      event.preventDefault();

      const last =
        queueRef.current[queueRef.current.length - 1] ?? directionRef.current;

      // Ignora la dirección actual y la opuesta (el cuerpo no puede invertirse).
      if (next.x === last.x && next.y === last.y) return;
      if (next.x === -last.x && next.y === -last.y) return;

      if (queueRef.current.length < 2) queueRef.current.push(next);

      if (status !== 'running') start();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, start]);

  useEffect(() => {
    if (status !== 'running') return;

    const timer = window.setInterval(() => {
      const previous = snakeRef.current;
      const direction = queueRef.current.shift() ?? directionRef.current;
      directionRef.current = direction;

      const head = {
        x: previous[0].x + direction.x,
        y: previous[0].y + direction.y,
      };

      const hitWall =
        head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID;

      if (hitWall) {
        setStatus('over');
        return;
      }

      const eating =
        head.x === foodRef.current.x && head.y === foodRef.current.y;
      const body = eating ? previous : previous.slice(0, -1);

      if (body.some((segment) => segment.x === head.x && segment.y === head.y)) {
        setStatus('over');
        return;
      }

      const next = [head, ...previous];
      if (!eating) {
        next.pop();
      } else {
        scoreRef.current += 10;
        setScore(scoreRef.current);

        if (scoreRef.current > bestRef.current) {
          bestRef.current = scoreRef.current;
          setBest(scoreRef.current);

          try {
            window.localStorage.setItem(BEST_KEY, String(scoreRef.current));
          } catch {
            // localStorage puede estar bloqueado; el récord sigue en memoria.
          }
        }

        foodRef.current = randomFood(next);
        setFood(foodRef.current);
      }

      snakeRef.current = next;
      setSnake(next);
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!context) return;

    context.fillStyle = '#0d2b14';
    context.fillRect(0, 0, BOARD, BOARD);

    context.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID; x += 1) {
        if ((x + y) % 2 === 0) {
          context.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }
    }

    context.fillStyle = '#e63b2e';
    context.fillRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4);
    context.fillStyle = '#ff8a80';
    context.fillRect(food.x * CELL + 4, food.y * CELL + 4, 3, 3);

    snake.forEach((segment, index) => {
      const isHead = index === 0;
      context.fillStyle = isHead ? '#b6f56a' : '#5ccf4a';
      context.fillRect(
        segment.x * CELL + 1,
        segment.y * CELL + 1,
        CELL - 2,
        CELL - 2,
      );
      context.fillStyle = isHead ? '#1f5c22' : '#2f7d2b';
      context.fillRect(
        segment.x * CELL + 3,
        segment.y * CELL + 3,
        CELL - 6,
        CELL - 6,
      );
    });

    if (snake[0]) {
      context.fillStyle = '#fff1a8';
      context.fillRect(snake[0].x * CELL + 4, snake[0].y * CELL + 4, 3, 3);
      context.fillRect(snake[0].x * CELL + 10, snake[0].y * CELL + 4, 3, 3);
    }
  }, [snake, food]);

  return (
    <section className="window snake-window" aria-label="Snake XP">
      <WindowTitleBar
        title="Snake XP"
        icon={<PixelSnakeIcon />}
        onMinimize={() => setSnakeOpen(false)}
        onClose={() => setSnakeOpen(false)}
      />

      <div className="window-body snake-body">
        <div className="snake-toolbar">
          <span>
            Puntos: <strong>{score}</strong>
          </span>
          <span>
            Récord: <strong>{best}</strong>
          </span>
          <button type="button" onClick={start}>
            Reiniciar
          </button>
        </div>

        <div className="snake-stage">
          <canvas
            ref={canvasRef}
            width={BOARD}
            height={BOARD}
            className="snake-canvas"
            aria-label="Tablero de Snake"
            role="img"
          />

          {status !== 'running' && (
            <div className="snake-overlay">
              <strong>
                {status === 'over' ? '¡Game Over!' : 'Snake XP'}
              </strong>
              <span>
                {status === 'over'
                  ? `Puntaje final: ${score}`
                  : 'Comé las manzanas y no choques.'}
              </span>
              <button type="button" onClick={start}>
                {status === 'over' ? 'Jugar de nuevo' : 'Empezar'}
              </button>
            </div>
          )}
        </div>

        <p className="snake-help">
          Flechas o WASD para moverte · Enter para reiniciar
        </p>
      </div>
    </section>
  );
}
