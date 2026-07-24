export interface QuestionData {
  id: string;
  soal: string;
  jawaban: string;
  clue: string;
  kategori?: string;
  sourceFile?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  carrotCoins: number;
  gamesPlayed: number;
  gamesWon: number;
  winStreak: number;
  maxWinStreak: number;
  lastActive: number;
}

export type UserStatus = 'Online' | 'Offline' | 'Away' | 'Busy';

export interface AppUser {
  id: string;
  username: string;
  avatar: string;
  role: 'Developer' | 'Trainer';
  status: UserStatus;
  coin: number;
  level: number;
  friends: string[];
  createdAt: string;
  totalGame: number;
  win: number;
  lose: number;
  lastOnline: string;
  lastMessage: string;
}

export interface Friend {
  id: string;
  username: string;
  avatar: string;
  status: UserStatus;
  lastMessage: string;
  lastOnline: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  text: string;
  time: string;
  timestamp: number;
}

export interface ChatRoom {
  roomId: string;
  members: string[];
  messages: DirectMessage[];
  lastMessage?: string;
  lastMessageTime?: number;
}

export interface AutoReplyRule {
  id: string;
  trigger: string;
  response: string;
}

export interface GameSession {
  chatId: string;
  gameType: 'tebakkata';
  question: QuestionData;
  startTime: number;
  durationSeconds: number;
  timerId?: any;
  hintsUsed: number;
  status: 'active' | 'completed' | 'timeout' | 'surrendered';
}

export interface BotMessage {
  id: string;
  chatId: string;
  sender: 'user' | 'bot' | 'system';
  senderName: string;
  text: string;
  timestamp: number;
  isReply?: boolean;
  replyToId?: string;
  theme?: string;
}

export interface QueueState {
  totalQuestions: number;
  remainingInQueue: number;
  currentQueueIndex: number;
  sourcesLoaded: string[];
}
