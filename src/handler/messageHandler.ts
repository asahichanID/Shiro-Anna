import { BotMessage } from '../types';
import { userDb } from '../database/userDb';
import { gameDb } from '../database/gameDb';
import { tebakKataManager } from '../musume/gametebak/tebakkata';
import { ReplyHelper } from './reply';
import { ActivityService } from '../services/ActivityService';

export interface TypingStatus {
  active: boolean;
  text: string;
  dots: string;
}

export class MessageHandler {
  private messageListeners: ((msg: BotMessage) => void)[] = [];
  private typingListeners: ((status: TypingStatus) => void)[] = [];
  private isTypingState: boolean = false;

  constructor() {
    // Setup gameDb callbacks for 60s timeout handling
    gameDb.setCallbacks((chatId, session) => {
      userDb.recordGameAttempt('trainer_01', false);
      ActivityService.logActivity(
        'game_lose',
        'Kalah / Waktu Habis Tebak Kata',
        `Waktu habis untuk soal Tebak Kata. Jawaban: "${session.question.jawaban}"`
      );
      const timeoutMsg = ReplyHelper.createBotReply(
        chatId,
        ReplyHelper.formatTimeout(session.question.jawaban)
      );
      this.emitMessage(timeoutMsg);
    });
  }

  public onMessage(listener: (msg: BotMessage) => void) {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter((fn) => fn !== listener);
    };
  }

  public onTyping(listener: (status: TypingStatus) => void) {
    this.typingListeners.push(listener);
    return () => {
      this.typingListeners = this.typingListeners.filter((fn) => fn !== listener);
    };
  }

  private emitMessage(msg: BotMessage) {
    this.messageListeners.forEach((fn) => fn(msg));
  }

  private emitTyping(status: TypingStatus) {
    this.typingListeners.forEach((fn) => fn(status));
  }

  private triggerTyping(
    durationMs: number,
    statusList: string[],
    onComplete: () => void
  ) {
    if (this.isTypingState) return;
    this.isTypingState = true;

    const randomStatusText = statusList[Math.floor(Math.random() * statusList.length)];
    let dotCount = 1;

    const emitCurrentStatus = () => {
      const dots = '.'.repeat(dotCount);
      this.emitTyping({ active: true, text: randomStatusText, dots });
    };

    emitCurrentStatus();

    const dotInterval = setInterval(() => {
      dotCount = (dotCount % 3) + 1;
      emitCurrentStatus();
    }, 500);

    setTimeout(() => {
      clearInterval(dotInterval);
      this.isTypingState = false;
      this.emitTyping({ active: false, text: '', dots: '' });
      onComplete();
    }, durationMs);
  }

  /**
   * Main entry point to process incoming messages from user
   */
  public handleUserMessage(
    chatId: string,
    userId: string,
    userName: string,
    text: string,
    messageId: string
  ): BotMessage | null {
    const trimmedText = text.trim();
    if (!trimmedText) return null;

    const lowerText = trimmedText.toLowerCase();

    // Ensure user exists in DB
    userDb.getUser(userId, userName);

    // COMMAND HANDLING (Prefix . or ! or standard command names)
    if (lowerText.startsWith('.') || lowerText.startsWith('!')) {
      const commandParts = trimmedText.slice(1).split(/\s+/);
      const command = commandParts[0].toLowerCase();
      const args = commandParts.slice(1);

      return this.executeCommand(command, args, chatId, userId, userName, messageId);
    }

    // CHECK IF ACTIVE GAME SESSION EXISTS
    if (gameDb.isGameActive(chatId)) {
      const session = gameDb.getSession(chatId)!;
      const isCorrect = tebakKataManager.checkAnswer(trimmedText, session.question.jawaban);

      if (isCorrect) {
        // JAWABAN BENAR!
        const timeTakenSec = (Date.now() - session.startTime) / 1000;
        
        // End game session
        gameDb.endSession(chatId, 'completed');

        // Record win attempt first to update win streak count
        const updatedUser = userDb.recordGameAttempt(userId, true);
        const currentStreak = updatedUser.winStreak;
        const isStreakBonus = currentStreak >= 3;

        // Base Carrot Coins reward (2999 - 4555)
        const baseCoins = tebakKataManager.generateRewardCoins();
        const multiplier = isStreakBonus ? 1.5 : 1.0;
        const rewardCoins = Math.floor(baseCoins * multiplier);

        // Add calculated coins to user balance
        const finalUser = userDb.addCarrotCoins(userId, rewardCoins);

        ActivityService.logActivity(
          'game_win',
          'Menang Tebak Kata',
          `Menjawab benar: "${session.question.jawaban}". Reward +${rewardCoins} Carrot Coin.`
        );

        const replyMsg = ReplyHelper.createBotReply(
          chatId,
          ReplyHelper.formatCorrectAnswer(
            userName,
            session.question.jawaban,
            timeTakenSec,
            rewardCoins,
            finalUser.carrotCoins,
            currentStreak,
            isStreakBonus
          ),
          messageId
        );

        this.emitMessage(replyMsg);
        return replyMsg;
      } else {
        // JAWABAN SALAH -> DIAM (Returns null, NO REPLY at all, per requirements)
        return null;
      }
    }

    // If text is not a command and no active game, check if user wrote shortcut words like "tebak"
    if (lowerText === 'tebak' || lowerText === 'tebakkata') {
      return this.executeCommand('tebakkata', [], chatId, userId, userName, messageId);
    }

    return null;
  }

  private executeCommand(
    command: string,
    _args: string[],
    chatId: string,
    userId: string,
    userName: string,
    messageId: string
  ): BotMessage | null {
    switch (command) {
      case 'tebak':
      case 'tebakkata': {
        if (gameDb.isGameActive(chatId)) {
          const session = gameDb.getSession(chatId)!;
          const msg = ReplyHelper.createBotReply(
            chatId,
            `⚠️ *Game Tebak Kata sedang berlangsung!*\n\n📝 *Soal:* ${session.question.soal}\n💡 *Clue:* ${session.question.clue}\n\nKetik jawabanmu, atau gunakan *.hint* / *.nyerah*`,
            messageId
          );
          this.emitMessage(msg);
          return msg;
        }

        const tebakTypingStatuses = [
          '🐴 Oguri sedang mengetik',
          '🥕 Oguri sedang berpikir',
          '📖 Oguri sedang mencari soal',
          '💭 Oguri sedang menyiapkan tantangan',
          '✍️ Oguri sedang menulis',
          '🎲 Oguri sedang memilih pertanyaan',
          '🍀 Oguri sedang mengacak soal',
        ];

        this.triggerTyping(5000, tebakTypingStatuses, () => {
          // Pull question from queue -> random permanen
          const question = tebakKataManager.getNextQuestion();
          
          // Create game session with 60s timer (timer starts after typing delay!)
          gameDb.createSession(chatId, question, 60);

          ActivityService.logActivity(
            'game_start',
            'Memulai Tebak Kata',
            `Sesi game baru dimulai. Soal: "${question.soal}" (${question.kategori})`
          );

          const startMsg = ReplyHelper.createBotReply(
            chatId,
            ReplyHelper.formatStartGame(question.soal, question.clue, question.kategori),
            messageId
          );

          this.emitMessage(startMsg);
        });

        return null;
      }

      case 'hint':
      case 'clue': {
        if (!gameDb.isGameActive(chatId)) {
          const msg = ReplyHelper.createBotReply(
            chatId,
            `❌ *Tidak ada game Tebak Kata yang sedang aktif!*\nKetik *.tebakkata* untuk memulai game baru.`,
            messageId
          );
          this.emitMessage(msg);
          return msg;
        }

        const hintTypingStatuses = [
          '🥕 Oguri sedang berpikir',
          '📖 Oguri sedang mencari hint',
          '💭 Oguri sedang menyusun petunjuk',
        ];

        this.triggerTyping(2500, hintTypingStatuses, () => {
          const session = gameDb.getSession(chatId);
          if (!session || session.status !== 'active') return;

          session.hintsUsed += 1;
          const hintPattern = tebakKataManager.generateHint(
            session.question.jawaban,
            session.hintsUsed
          );

          const hintMsg = ReplyHelper.createBotReply(
            chatId,
            ReplyHelper.formatHint(session.question.clue, hintPattern),
            messageId
          );

          this.emitMessage(hintMsg);
        });

        return null;
      }

      case 'nyerah':
      case 'surrender': {
        if (!gameDb.isGameActive(chatId)) {
          const msg = ReplyHelper.createBotReply(
            chatId,
            `❌ *Tidak ada game Tebak Kata yang sedang aktif!*`,
            messageId
          );
          this.emitMessage(msg);
          return msg;
        }

        const surrenderTypingStatuses = [
          '🐴 Oguri sedang menulis',
          '💭 Oguri sedang menyiapkan jawaban',
          '🥕 Oguri sedang mencatat jawaban',
        ];

        this.triggerTyping(2000, surrenderTypingStatuses, () => {
          const session = gameDb.endSession(chatId, 'surrendered');
          if (!session) return;

          userDb.recordGameAttempt(userId, false);

          const surrenderMsg = ReplyHelper.createBotReply(
            chatId,
            ReplyHelper.formatSurrender(session.question.jawaban),
            messageId
          );

          this.emitMessage(surrenderMsg);
        });

        return null;
      }

      case 'coin':
      case 'coins':
      case 'saldo':
      case 'balance': {
        const user = userDb.getUser(userId, userName);
        const coinMsg = ReplyHelper.createBotReply(
          chatId,
          ReplyHelper.formatBalance(user.name, user.carrotCoins, user.gamesWon, user.winStreak, user.maxWinStreak),
          messageId
        );

        this.emitMessage(coinMsg);
        return coinMsg;
      }

      case 'leaderboard':
      case 'lb':
      case 'top': {
        const users = userDb.getAllUsers();
        let lbText = '';
        users.slice(0, 10).forEach((u, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '👤';
          const streakBadge = (u.winStreak || 0) >= 3 ? ` 🔥${u.winStreak}x Combo!` : u.winStreak > 0 ? ` (Streak: ${u.winStreak})` : '';
          lbText += `${medal} *${i + 1}. ${u.name}* - ${u.carrotCoins.toLocaleString('id-ID')} Coins 🥕 (${u.gamesWon} Win${streakBadge})\n`;
        });

        const lbMsg = ReplyHelper.createBotReply(
          chatId,
          ReplyHelper.formatLeaderboard(lbText),
          messageId
        );

        this.emitMessage(lbMsg);
        return lbMsg;
      }

      case 'queue':
      case 'data': {
        const queueState = tebakKataManager.getQueueState();
        const msg = ReplyHelper.createBotReply(
          chatId,
          `[ 📊 QUEUE DATA TEBAK KATA ]

📚 *Total Soal Terload:* ${queueState.totalQuestions} Soal
🔀 *Sisa di Queue Permanen:* ${queueState.remainingInQueue} Soal
📁 *Sumber Data:* ${queueState.sourcesLoaded.join(', ')}
🔄 *Mekanisme:* Queue -> Random Permanen (Auto-shuffle saat habis)

Ketik *.tebakkata* untuk bermain!`,
          messageId
        );

        this.emitMessage(msg);
        return msg;
      }

      case 'help':
      case 'menu': {
        const msg = ReplyHelper.createBotReply(
          chatId,
          `[ 🐎 OGURI CAP BOT - MENU GAMETEBAK & PLAY ]

Gunakan command berikut:
• *.tebakkata* - Mulai Tebak Kata (Timer 60s)
• *.play [lagu]* - Putar lagu & video YouTube di tab 🎵 Play
• *.hint* - Minta petunjuk huruf
• *.nyerah* - Menyerah dan lihat jawaban
• *.coin* - Cek Carrot Coins & win streak
• *.leaderboard* - Lihat Trainer teratas
• *.queue* - Cek status queue data.json

💡 *Aturan Main:*
1. Saat game aktif, ketik jawaban langsung di chat.
2. Jawaban salah -> *Bot DIAM* (tidak mereply).
3. Jawaban benar -> *Bot REPLY* + Reward Carrot Coins!`,
          messageId
        );

        this.emitMessage(msg);
        return msg;
      }

      case 'play':
      case 'music':
      case 'song': {
        const queryText = _args.join(' ');
        const info = queryText
          ? `🎵 *Pencarian Musik:* "${queryText}"\n\nSilakan klik menu **🎵 Play** di bagian atas navbar untuk mencari, mengunduh, dan memutar audio MP3 / video 720p!`
          : `🎵 *Oguri Cap Jukebox & Player*\n\nBuka tab **🎵 Play** di navbar atas untuk mencari lagu YouTube, mendengarkan audio MP3, atau menonton video HD! 🐎`;

        const msg = ReplyHelper.createBotReply(chatId, info, messageId);
        this.emitMessage(msg);
        return msg;
      }

      default:
        return null;
    }
  }
}

export const messageHandler = new MessageHandler();
