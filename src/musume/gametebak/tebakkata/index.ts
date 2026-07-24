import { QuestionData, QueueState } from '../../../types';
import data1 from './data.json';
import data2 from './data2.json';
import data3 from './data3.json';

class TebakKataManager {
  private allQuestions: QuestionData[] = [];
  private permanentQueue: QuestionData[] = [];
  private queueIndex: number = 0;
  private sources: string[] = ['data.json', 'data2.json', 'data3.json'];

  constructor() {
    this.initDataSources();
  }

  private initDataSources() {
    const d1 = (data1 as any[]).map(q => ({ ...q, sourceFile: 'data.json' }));
    const d2 = (data2 as any[]).map(q => ({ ...q, sourceFile: 'data2.json' }));
    const d3 = (data3 as any[]).map(q => ({ ...q, sourceFile: 'data3.json' }));

    this.allQuestions = [...d1, ...d2, ...d3];
    this.shufflePermanentQueue();
  }

  /**
   * Fisher-Yates Shuffle for permanent random queueing
   */
  public shufflePermanentQueue() {
    this.permanentQueue = [...this.allQuestions];
    for (let i = this.permanentQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.permanentQueue[i], this.permanentQueue[j]] = [this.permanentQueue[j], this.permanentQueue[i]];
    }
    this.queueIndex = 0;
  }

  /**
   * Queue -> Random permanen
   * Pulls the next question from the permanently shuffled queue.
   * If exhausted, re-shuffles automatically.
   */
  public getNextQuestion(): QuestionData {
    if (this.permanentQueue.length === 0) {
      this.initDataSources();
    }

    if (this.queueIndex >= this.permanentQueue.length) {
      this.shufflePermanentQueue();
    }

    const question = this.permanentQueue[this.queueIndex];
    this.queueIndex++;
    return question;
  }

  public getQueueState(): QueueState {
    return {
      totalQuestions: this.allQuestions.length,
      remainingInQueue: this.permanentQueue.length - this.queueIndex,
      currentQueueIndex: this.queueIndex,
      sourcesLoaded: [...this.sources],
    };
  }

  /**
   * Reward Carrot Coin in range 2999 to 4555
   */
  public generateRewardCoins(): number {
    const MIN = 2999;
    const MAX = 4555;
    return Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
  }

  /**
   * Helper to normalize text (case-insensitive, trimmed, lowercased)
   */
  public normalizeText(text: string): string {
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Check if guess matches answer.
   * Return true if exact match (case-insensitive, whitespace trimmed).
   */
  public checkAnswer(guess: string, correctAnswer: string): boolean {
    return this.normalizeText(guess) === this.normalizeText(correctAnswer);
  }

  /**
   * Generate hint string for a word (e.g., "K _ _ a" for "Kuda")
   */
  public generateHint(answer: string, hintLevel: number = 1): string {
    const trimmed = answer.trim();
    if (trimmed.length <= 2) return trimmed;

    const words = trimmed.split(' ');
    const maskedWords = words.map(word => {
      if (word.length <= 2) return word;
      const chars = word.split('');
      const length = chars.length;

      if (hintLevel === 1) {
        // Show 1st and last letter
        return chars.map((c, idx) => (idx === 0 || idx === length - 1 ? c : '_')).join(' ');
      } else {
        // Show 1st, middle, and last letter
        const mid = Math.floor(length / 2);
        return chars.map((c, idx) => (idx === 0 || idx === mid || idx === length - 1 ? c : '_')).join(' ');
      }
    });

    return maskedWords.join('   ');
  }

  /**
   * Oguri Cap themed responses generator
   */
  public getOguriCapTheme() {
    return {
      avatar: '/assets/avatar.png',
      tagline: 'Oguri Cap (Grey Monster of Tracen)',
      color: 'from-slate-700 via-sky-800 to-indigo-900',
    };
  }
}

export const tebakKataManager = new TebakKataManager();
