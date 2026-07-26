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
  badgeInventory?: any[];
  equippedBadgeId?: string | null;
  premiumUntil?: number | null;
}

export type UserStatus = 'Online' | 'Offline' | 'Away' | 'Busy';

export interface AppUser {
  id: string;
  username: string;
  avatar: string;
  role: 'Developer' | 'Trainer';
  status: UserStatus;
  coin: number;
  coins?: number;
  carrotCoins?: number;
  gamesPlayed?: number;
  gamesWon?: number;
  winStreak?: number;
  maxWinStreak?: number;
  level: number;
  friends: string[];
  createdAt: string;
  totalGame: number;
  win: number;
  lose: number;
  lastOnline: string;
  lastMessage: string;
  badgeInventory?: any[];
  equippedBadgeId?: string | null;
  premiumUntil?: number | null;
}

export interface Friend {
  id: string;
  username: string;
  avatar: string;
  status: UserStatus;
  lastMessage: string;
  lastOnline: string;
  bio?: string;
  role?: 'Developer' | 'Trainer';
  isOnline?: boolean;
}

export type MessageDeliveryStatus = 'sent' | 'delivered' | 'read';

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId?: string;
  text: string;
  time: string;
  timestamp: number;
  status?: MessageDeliveryStatus;
  isRead?: boolean;
}

export interface GlobalChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole?: 'Developer' | 'Trainer';
  senderAvatar?: string;
  text: string;
  isDuelAnswer?: boolean;
  time: string;
  timestamp: number;
}

export type DuelStep = 'countdown' | 'question' | 'answer_correct' | 'scores' | 'finished' | 'idle';

export interface LiveDuelPlayer {
  id: string;
  name: string;
  avatar?: string;
  score: number;
}

export interface LiveDuelSession {
  id: string;
  status: DuelStep;
  player1: LiveDuelPlayer;
  player2: LiveDuelPlayer;
  currentRound: number;
  totalRounds: number;
  question?: QuestionData;
  countdownSeconds?: number;
  lastAnswerUser?: string;
  lastAnswerText?: string;
  winnerId?: string;
  winnerName?: string;
  updatedAt: number;
}

export interface DeveloperSettings {
  globalChatEnabled: boolean;
  liveDuelEnabled: boolean;
  autoDuelEnabled: boolean;
  shopEnabled: boolean;
  minStreakBanner: number;
  minStreakMarquee: number;
  maxPollingMs: number;
  duelRewardCoins: number;
  duelCooldownSec: number;
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
  senderBadgeId?: string | null;
  senderBadgeLabel?: string;
}

export type ShopOrderStatus = 'Pending' | 'Processing' | 'Success' | 'Rejected';

export interface ShopProduct {
  id: string;
  name: string;
  description: string;
  duration: string;
  coins: number;
  stock: number;
  badgeId?: string;
  premiumPlanId?: string;
  is_active: number;
  sort_order: number;
  created_at?: number;
  updated_at?: number;
}

export interface ShopOrder {
  id: string;
  user_id: string;
  user_name: string;
  wibuku_name: string;
  wibuku_id: string;
  product_id: string;
  product_name: string;
  duration: string;
  coins: number;
  status: ShopOrderStatus;
  rejection_reason?: string;
  refunded: number;
  timestamp: number;
  created_at: number;
  updated_at: number;
}

export interface ShopSettings {
  shop_enabled: string;
  shop_global_max_daily: string;
  shop_user_max_daily: string;
  shop_daily_limit_msg: string;
  shop_out_of_stock_msg: string;
}

export interface ShopStats {
  totalToday: number;
  totalMonth: number;
  totalPending: number;
  totalProcessing: number;
  totalSuccess: number;
  totalReject: number;
  totalCoinsUsed: number;
}

export interface CoinHistoryItem {
  id: string;
  user_id: string;
  user_name: string;
  type: 'penukaran' | 'refund' | 'reward_tebak' | 'reward_duel' | 'event' | 'admin';
  title: string;
  amount: number;
  balance_after: number;
  detail: string;
  timestamp: number;
  created_at: number;
}


export interface QueueState {
  totalQuestions: number;
  remainingInQueue: number;
  currentQueueIndex: number;
  sourcesLoaded: string[];
}
