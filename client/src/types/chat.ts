export type Role = 'ADMIN' | 'USER';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface Room {
  id: string;
  name: string;
  createdAt: string;
}

export interface RoomsResponse {
  rooms: Room[];
}

export interface CreateRoomResponse {
  room: Room;
}

export interface ChatMessage {
  id: string;
  content: string;
  userId: string;
  roomId: string;
  createdAt: string;
  user?: {
    id?: string;
    email?: string;
  };
  email?: string;
}

export interface SendMessagePayload {
  roomId: string;
  content: string;
}
