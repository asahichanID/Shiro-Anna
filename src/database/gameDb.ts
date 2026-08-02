import { GameSession, QuestionData } from '../types';

type TimeoutCallback = (chatId: string, session: GameSession) => void;
type TickCallback = (chatId: string, remainingSeconds: number) => void;

class GameDatabase {
  private sessions: Map<string, GameSession> = new Map();
  private timerIntervals: Map<string, any> = new Map();
  private onTimeoutCallback?: TimeoutCallback;
  private onTickCallback?: TickCallback;

  public setCallbacks(onTimeout: TimeoutCallback, onTick?: TickCallback) {
    this.onTimeoutCallback = onTimeout;
    this.onTickCallback = onTick;
  }

  public getSession(chatId: string): GameSession | undefined {
    return this.sessions.get(chatId);
  }

  public isGameActive(chatId: string): boolean {
    const session = this.sessions.get(chatId);
    return !!session && session.status === 'active';
  }

  public createSession(
    chatId: string,
    question: QuestionData,
    durationSeconds: number = 60
  ): GameSession {
    // Clear any existing timer for this chat
    this.clearTimer(chatId);

    const session: GameSession = {
      chatId,
      gameType: 'tebakkata',
      question,
      startTime: Date.now(),
      durationSeconds,
      hintsUsed: 0,
      status: 'active',
    };

    this.sessions.set(chatId, session);
    this.startTimer(chatId, durationSeconds);

    return session;
  }

  private startTimer(chatId: string, durationSeconds: number) {
    let remaining = durationSeconds;

    const interval = setInterval(() => {
      remaining -= 1;

      if (this.onTickCallback) {
        this.onTickCallback(chatId, remaining);
      }

      if (remaining <= 0) {
        this.handleTimeout(chatId);
      }
    }, 1000);

    this.timerIntervals.set(chatId, interval);
  }

  private handleTimeout(chatId: string) {
    const session = this.sessions.get(chatId);
    this.clearTimer(chatId);

    if (session && session.status === 'active') {
      session.status = 'timeout';
      if (this.onTimeoutCallback) {
        this.onTimeoutCallback(chatId, session);
      }
    }
  }

  public clearTimer(chatId: string) {
    if (this.timerIntervals.has(chatId)) {
      clearInterval(this.timerIntervals.get(chatId));
      this.timerIntervals.delete(chatId);
    }
  }

  public endSession(chatId: string, status: 'completed' | 'surrendered' | 'timeout'): GameSession | undefined {
    const session = this.sessions.get(chatId);
    if (session) {
      session.status = status;
      this.clearTimer(chatId);
    }
    return session;
  }

  public removeSession(chatId: string) {
    this.clearTimer(chatId);
    this.sessions.delete(chatId);
  }

  public getActiveSessionsCount(): number {
    let count = 0;
    this.sessions.forEach((session) => {
      if (session.status === 'active') count++;
    });
    return count;
  }
}

export const gameDb = new GameDatabase();
