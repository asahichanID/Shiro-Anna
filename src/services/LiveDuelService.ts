import { D1DatabaseService } from './D1DatabaseService';
import { StorageService } from './StorageService';
import { LiveDuelSession, QuestionData, DuelStep } from '../types';
import { tebakKataManager } from '../musume/gametebak/tebakkata';
import { SettingsService } from './SettingsService';
import { RealtimeService } from './SupabaseService';

const STORAGE_KEY_ACTIVE_DUEL = 'oguri_active_live_duel';
const DUEL_QUESTION_IDLE_LIMIT_MS = 1 * 60 * 1000;
const DUEL_RESULT_VISIBLE_MS = 5000;
const DUEL_RESULT_FADE_MS = 1300;

type DuelListener = (duel: LiveDuelSession | null) => void;
type AnnouncementListener = (announcement: string | null) => void;

export class LiveDuelService {
  private static listeners: DuelListener[] = [];
  private static announcementListeners: AnnouncementListener[] = [];
  private static currentAnnouncement: string | null = null;
  private static stepTimer: any = null;
  private static questionTimeoutTimer: any = null;
  private static closeTimer: any = null;

  public static onDuelUpdate(listener: DuelListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== listener);
    };
  }

  public static onAnnouncementUpdate(listener: AnnouncementListener): () => void {
    this.announcementListeners.push(listener);
    return () => {
      this.announcementListeners = this.announcementListeners.filter((fn) => fn !== listener);
    };
  }

  private static notifyListeners(duel: LiveDuelSession | null) {
    this.listeners.forEach((fn) => fn(duel));
  }

  private static notifyAnnouncement(announcement: string | null) {
    this.currentAnnouncement = announcement;
    this.announcementListeners.forEach((fn) => fn(announcement));
  }

  private static clearTimers() {
    if (this.stepTimer) {
      clearTimeout(this.stepTimer);
      clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
    if (this.questionTimeoutTimer) {
      clearTimeout(this.questionTimeoutTimer);
      this.questionTimeoutTimer = null;
    }
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  private static scheduleQuestionIdleTimeout(duel: LiveDuelSession) {
    if (this.questionTimeoutTimer) {
      clearTimeout(this.questionTimeoutTimer);
      this.questionTimeoutTimer = null;
    }

    this.questionTimeoutTimer = setTimeout(() => {
      const latest = this.getActiveDuelSync();
      if (!latest || latest.id !== duel.id || latest.status !== 'question') return;

      latest.status = 'timeout';
      latest.lastAnswerUser = 'WAKTU HABIS!';
      latest.lastAnswerText = 'Tidak ada respons selama 1 menit.';
      latest.updatedAt = Date.now();

      StorageService.setItem(STORAGE_KEY_ACTIVE_DUEL, latest);
      this.notifyListeners({ ...latest });
      D1DatabaseService.updateDuel(latest);

      this.closeTimer = setTimeout(() => {
        this.clearDuel();
      }, DUEL_RESULT_VISIBLE_MS + DUEL_RESULT_FADE_MS);
    }, DUEL_QUESTION_IDLE_LIMIT_MS);
  }

  public static getCurrentAnnouncement(): string | null {
    return this.currentAnnouncement;
  }

  public static getActiveDuelSync(): LiveDuelSession | null {
    const cached = StorageService.getItem<LiveDuelSession | null>(STORAGE_KEY_ACTIVE_DUEL, null);
    if (!cached || cached.status === 'idle') return null;
    return cached;
  }

  public static async getActiveDuel(): Promise<LiveDuelSession | null> {
    const cached = this.getActiveDuelSync();
    try {
      const d1Duel = await D1DatabaseService.getActiveDuel();
      if (d1Duel && d1Duel.status !== 'idle') {
        StorageService.setItem(STORAGE_KEY_ACTIVE_DUEL, d1Duel);
        this.notifyListeners(d1Duel);
        return d1Duel;
      }
    } catch (e) {
      console.warn('Error fetching active duel from D1:', e);
    }
    return cached;
  }

  /**
   * Start a new live duel. Enforces SINGLE ACTIVE DUEL constraint.
   */
  public static async startDuel(
    challenger: { id: string; name: string },
    opponent: { id: string; name: string }
  ): Promise<{ success: boolean; message?: string; duel?: LiveDuelSession }> {
    const currentSettings = SettingsService.getSettingsSync();
    if (!currentSettings.liveDuelEnabled) {
      return { success: false, message: 'Fitur Live Duel sedang dinonaktifkan oleh Developer.' };
    }

    const active = this.getActiveDuelSync();
    if (active && active.status !== 'idle' && active.status !== 'finished') {
      return { success: false, message: 'Duel sedang berlangsung. Tunggu hingga selesai.' };
    }

    const firstQuestion = tebakKataManager.getNextQuestion();

    const newDuel: LiveDuelSession = {
      id: `duel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      status: 'countdown',
      player1: { id: challenger.id, name: challenger.name, score: 0 },
      player2: { id: opponent.id, name: opponent.name, score: 0 },
      currentRound: 1,
      totalRounds: 3,
      question: firstQuestion,
      countdownSeconds: 5,
      updatedAt: Date.now(),
    };

    StorageService.setItem(STORAGE_KEY_ACTIVE_DUEL, newDuel);
    this.notifyListeners(newDuel);

    try {
      await D1DatabaseService.createDuel(newDuel);
    } catch (e) {
      console.warn('Error saving new duel to D1:', e);
    }

    // Start auto step timer flow
    this.runDuelFlow(newDuel);

    return { success: true, duel: newDuel };
  }

  /**
   * Automated Step Progression Flow inside the SINGLE floating panel
   */
  private static runDuelFlow(duel: LiveDuelSession) {
    this.clearTimers();

    if (duel.status === 'countdown') {
      let count = duel.countdownSeconds || 5;
      const countInterval = setInterval(() => {
      this.stepTimer = countInterval;
        const current = this.getActiveDuelSync();
        if (!current || current.id !== duel.id || current.status !== 'countdown') {
          clearInterval(countInterval);
          if (this.stepTimer === countInterval) this.stepTimer = null;
          return;
        }

        count -= 1;
        duel.countdownSeconds = count;
        duel.updatedAt = Date.now();
        StorageService.setItem(STORAGE_KEY_ACTIVE_DUEL, duel);
        this.notifyListeners({ ...duel });

        if (count <= 0) {
          clearInterval(countInterval);
          if (this.stepTimer === countInterval) this.stepTimer = null;
          duel.status = 'question';
          duel.countdownSeconds = 0;
          duel.updatedAt = Date.now();
          StorageService.setItem(STORAGE_KEY_ACTIVE_DUEL, duel);
          this.notifyListeners({ ...duel });
          D1DatabaseService.updateDuel(duel);

          this.scheduleQuestionIdleTimeout(duel);
        }
      }, 1000);
    }
  }

  /**
   * Submit an answer for a player in the active duel
   */
  public static async submitAnswer(
    playerId: string,
    playerName: string,
    answerText: string
  ): Promise<{ isCorrect: boolean; duel: LiveDuelSession | null; message?: string }> {
    const active = this.getActiveDuelSync();
    if (!active || active.status !== 'question' || !active.question) {
      return { isCorrect: false, duel: active, message: 'Tidak ada ronde duel aktif untuk dijawab.' };
    }

    // Only player1 or player2 can answer
    const isP1 = active.player1.id === playerId;
    const isP2 = active.player2.id === playerId;

    if (!isP1 && !isP2) {
      return { isCorrect: false, duel: active, message: 'Kamu adalah penonton (spectator) dan tidak dapat ikut menjawab duel ini.' };
    }

    // Any response from either duelist resets the idle countdown.
    this.scheduleQuestionIdleTimeout(active);

    const isCorrect = tebakKataManager.checkAnswer(answerText, active.question.jawaban);

    if (isCorrect) {
      if (this.questionTimeoutTimer) {
        clearTimeout(this.questionTimeoutTimer);
        this.questionTimeoutTimer = null;
      }

      // Award point to answering player
      if (isP1) active.player1.score += 1;
      if (isP2) active.player2.score += 1;

      active.status = 'answer_correct';
      active.lastAnswerUser = playerName;
      active.lastAnswerText = answerText;
      active.updatedAt = Date.now();

      StorageService.setItem(STORAGE_KEY_ACTIVE_DUEL, active);
      this.notifyListeners({ ...active });
      D1DatabaseService.updateDuel(active);

      // Transition to Scores -> Next Question or Final Results
      this.stepTimer = setTimeout(() => {
        active.status = 'scores';
        StorageService.setItem(STORAGE_KEY_ACTIVE_DUEL, active);
        this.notifyListeners({ ...active });

        this.stepTimer = setTimeout(() => {
          if (active.currentRound < active.totalRounds) {
            // Next round
            active.currentRound += 1;
            active.question = tebakKataManager.getNextQuestion();
            active.status = 'countdown';
            active.countdownSeconds = 3;
            StorageService.setItem(STORAGE_KEY_ACTIVE_DUEL, active);
            this.notifyListeners({ ...active });
            D1DatabaseService.updateDuel(active);
            this.runDuelFlow(active);
          } else {
            // Final results
            active.status = 'finished';
            const p1Won = active.player1.score > active.player2.score;
            const draw = active.player1.score === active.player2.score;

            if (draw) {
              active.winnerId = 'draw';
              active.winnerName = 'Seri!';
            } else if (p1Won) {
              active.winnerId = active.player1.id;
              active.winnerName = active.player1.name;
            } else {
              active.winnerId = active.player2.id;
              active.winnerName = active.player2.name;
            }

            StorageService.setItem(STORAGE_KEY_ACTIVE_DUEL, active);
            this.notifyListeners({ ...active });
            D1DatabaseService.updateDuel(active);

            // Close panel after 5 seconds
            this.closeTimer = setTimeout(() => {
              this.clearDuel();
            }, 5000);
          }
        }, 2000);
      }, 2000);

      return { isCorrect: true, duel: active };
    } else {
      return { isCorrect: false, duel: active, message: 'Jawaban kurang tepat!' };
    }
  }

  public static triggerGlobalStreakAnnouncement(userName: string, streakCount: number) {
    const settings = SettingsService.getSettingsSync();
    if (streakCount >= settings.minStreakBanner) {
      const bannerText = `🔥 ${userName} menang ${streakCount} kali berturut-turut dalam Live Duel!`;
      this.notifyAnnouncement(bannerText);
    }
  }

  public static clearDuel() {
    const current = this.getActiveDuelSync();
    this.clearTimers();
    StorageService.removeItem(STORAGE_KEY_ACTIVE_DUEL);
    this.notifyListeners(null);

    if (current && current.id) {
      const clearedDuel: Partial<LiveDuelSession> = {
        id: current.id,
        status: 'idle',
        updatedAt: Date.now(),
      };

      D1DatabaseService.updateDuel(clearedDuel).catch((err) => {
        console.warn('Error clearing live duel in D1:', err);
      });
    }
  }
}

// Subscribe to Realtime Live Duel updates from Supabase Broadcast
RealtimeService.subscribe('live_duel_updated', (duel: LiveDuelSession) => {
  if (!duel) {
    StorageService.removeItem(STORAGE_KEY_ACTIVE_DUEL);
    (LiveDuelService as any).notifyListeners(null);
    return;
  }
  StorageService.setItem(STORAGE_KEY_ACTIVE_DUEL, duel);
  (LiveDuelService as any).notifyListeners(duel);
});
