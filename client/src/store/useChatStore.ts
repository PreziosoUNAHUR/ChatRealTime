import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../types/chat';

export type XpTheme = 'blue' | 'silver' | 'olive' | 'custom';
export type FontSize = 'small' | 'medium' | 'large';
export type FontFamily = 'Arial' | 'Tahoma' | 'Comic Sans MS';
export type FontColor = 'black' | 'blue' | 'red' | 'green';

interface ChatState {
  token: string | null;
  user: AuthUser | null;
  theme: XpTheme;
  customHue: number;
  unreadMessages: Record<string, number>;
  chatMinimized: boolean;
  snakeOpen: boolean;
  windowFocused: boolean;
  fontSize: FontSize;
  fontFamily: FontFamily;
  fontColor: FontColor;
  activeRoomId: string | null;
  roomHistory: string[];
  setSession: (token: string, user: AuthUser) => void;
  setActiveRoom: (roomId: string | null, roomName?: string) => void;
  setFontSize: (fontSize: FontSize) => void;
  setFontFamily: (fontFamily: FontFamily) => void;
  setFontColor: (fontColor: FontColor) => void;
  logout: () => void;
  setTheme: (theme: XpTheme) => void;
  setCustomHue: (hue: number) => void;
  incrementUnread: (roomId: string) => void;
  clearUnread: (roomId: string) => void;
  clearAllUnread: () => void;
  setChatMinimized: (minimized: boolean) => void;
  toggleChatMinimized: () => void;
  setSnakeOpen: (open: boolean) => void;
  toggleSnake: () => void;
  setWindowFocused: (focused: boolean) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      theme: 'blue',
      customHue: 0,
      unreadMessages: {},
      chatMinimized: false,
      snakeOpen: false,
      windowFocused: true,
      fontSize: 'medium',
      fontFamily: 'Tahoma',
      fontColor: 'black',
      activeRoomId: null,
      roomHistory: [],

      setSession: (token, user) =>
        set({ token, user, unreadMessages: {}, chatMinimized: false, activeRoomId: null, roomHistory: [] }),
      setActiveRoom: (activeRoomId, roomName) =>
        set((state) => ({
          activeRoomId,
          roomHistory: roomName
            ? [roomName, ...state.roomHistory.filter((name) => name !== roomName)].slice(0, 10)
            : state.roomHistory,
        })),
      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setFontColor: (fontColor) => set({ fontColor }),
      logout: () => {
        set({
          token: null,
          user: null,
          unreadMessages: {},
          chatMinimized: false,
          snakeOpen: false,
          activeRoomId: null,
          roomHistory: [],
        });
        localStorage.removeItem('xp-chat-store');
      },
      setTheme: (theme) => set({ theme }),
      setCustomHue: (customHue) =>
        set({ customHue: Math.min(360, Math.max(0, customHue)) }),

      incrementUnread: (roomId) =>
        set((state) => ({
          unreadMessages: {
            ...state.unreadMessages,
            [roomId]: (state.unreadMessages[roomId] ?? 0) + 1,
          },
        })),
      clearUnread: (roomId) =>
        set((state) => {
          if (!state.unreadMessages[roomId]) return state;

          const next = { ...state.unreadMessages };
          delete next[roomId];
          return { unreadMessages: next };
        }),
      clearAllUnread: () => set({ unreadMessages: {} }),

      setChatMinimized: (chatMinimized) => set({ chatMinimized }),
      toggleChatMinimized: () =>
        set((state) => ({ chatMinimized: !state.chatMinimized })),
      setSnakeOpen: (snakeOpen) => set({ snakeOpen }),
      toggleSnake: () => set((state) => ({ snakeOpen: !state.snakeOpen })),
      setWindowFocused: (windowFocused) => set({ windowFocused }),
    }),
    {
      name: 'xp-chat-store',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        theme: state.theme,
        customHue: state.customHue,
        fontSize: state.fontSize,
        fontFamily: state.fontFamily,
        fontColor: state.fontColor,
      }),
    },
  ),
);
