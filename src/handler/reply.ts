import { BotMessage } from '../types';

export class ReplyHelper {
  private static correctPraiseList = [
    '🎉 Hebat! Jawabanmu benar!',
    '🥕 Wahh! Tepat sekali, Trainer!',
    '✨ Keren! Kamu berhasil menebaknya!',
    '🐴 Yatta~ Jawabanmu benar!',
    '🎊 Luar biasa! Kamu dapat hadiah Carrot Coin!',
    '🎯 Tepat! Oguri bangga sama kamu!',
  ];

  private static timeoutList = [
    '😢 Yahh... waktunya habis.',
    '🥕 Sayang sekali, coba lagi ya!',
    '🐴 Belum berhasil kali ini.',
  ];

  public static createBotReply(
    chatId: string,
    text: string,
    replyToId?: string
  ): BotMessage {
    return {
      id: `msg_bot_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${Math.floor(Math.random() * 1000000)}`,
      chatId,
      sender: 'bot',
      senderName: 'Oguri Cap 🐎',
      text,
      timestamp: Date.now(),
      isReply: !!replyToId,
      replyToId,
      theme: 'oguri-cap',
    };
  }

  public static formatStartGame(
    soal: string,
    clue: string,
    kategori: string = 'Umamusume'
  ): string {
    return `[ 🐎 OGURI CAP - TEBAK KATA ]

📝 *Soal:* ${soal}
💡 *Clue:* ${clue}
📌 *Kategori:* ${kategori}

⏱️ *Waktu:* 60 detik
🎁 *Reward:* 2.999 ~ 4.555 Carrot Coins 🥕

_Ketik jawaban langsung di chat!_
Commands:
• .hint - Petunjuk huruf
• .nyerah - Menyerah dan lihat jawaban
• .coin - Cek saldo Carrot Coins`;
  }

  public static formatCorrectAnswer(
    trainerName: string,
    jawaban: string,
    timeTakenSec: number,
    rewardCoins: number,
    newTotalCoins: number,
    winStreak: number = 1,
    isStreakBonus: boolean = false
  ): string {
    const praise = this.correctPraiseList[Math.floor(Math.random() * this.correctPraiseList.length)];

    const streakText = isStreakBonus
      ? `🔥 *WIN STREAK ${winStreak}X COMBO!* (Bonus Multiplier 1.5x Multiplier Aktif! ⚡)`
      : `🔥 *Win Streak:* ${winStreak} Kemenangan ${winStreak < 3 ? `(${3 - winStreak} lagi untuk bonus 1.5x)` : ''}`;

    return `[ ${praise} ]

Umai~! Jawabanmu tepat sekali, ${trainerName}! 🌟

📝 *Jawaban:* ${jawaban}
⏱️ *Waktu:* ${timeTakenSec.toFixed(1)} detik
${streakText}
🥕 *Reward:* +${rewardCoins.toLocaleString('id-ID')} Carrot Coins ${isStreakBonus ? ' (Termasuk Bonus Streak 1.5x!)' : ''}
💰 *Total Saldo:* ${newTotalCoins.toLocaleString('id-ID')} Carrot Coins

_Luar biasa! Oguri Cap bangga padamu!_
Ketik *.tebakkata* untuk babak berikutnya! 🏆`;
  }

  public static formatTimeout(correctAnswer: string): string {
    const timeoutMsg = this.timeoutList[Math.floor(Math.random() * this.timeoutList.length)];

    return `[ ⏰ ${timeoutMsg} ]

Waktu 60 detik telah habis, Trainer! Oguri Cap sudah lapar menunggu... 🍲

💭 *Jawabannya ternyata adalah:* ${correctAnswer}
💔 *Win Streak Reset!*

Jangan menyerah! Ketik *.tebakkata* untuk coba soal selanjutnya! 🐎`;
  }


  public static formatHint(clue: string, hintPattern: string): string {
    return `[ 💡 HINT OGURI CAP ]

💡 *Clue:* ${clue}
🔤 *Petunjuk Huruf:* \`${hintPattern}\`

Ayo Trainer, tebak lagi sekarang!`;
  }

  public static formatSurrender(correctAnswer: string): string {
    return `[ 🏳️ MENYERAH ]

Baiklah Trainer, mari istirahat dan makan wortel sejenak! 🥕
💡 *Jawabannya adalah:* ${correctAnswer}
💔 *Win Streak Reset!*

Ketik *.tebakkata* jika sudah siap berlatih lagi!`;
  }

  public static formatBalance(trainerName: string, coins: number, gamesWon: number, winStreak: number = 0, maxWinStreak: number = 0): string {
    return `[ 🥕 DOMPET CARROT COINS ]

👤 *Trainer:* ${trainerName}
💰 *Saldo Carrot Coins:* ${coins.toLocaleString('id-ID')} Coins
🏆 *Total Kemenangan:* ${gamesWon} Kali
🔥 *Current Win Streak:* ${winStreak} Win(s) ${winStreak >= 3 ? '⚡ (1.5x Multiplier Active!)' : ''}
👑 *Max Win Streak:* ${maxWinStreak} Win(s)

Oguri Cap: *"Teruskan latihanmu agar stok wortel kita makin banyak!"*`;
  }

  public static formatLeaderboard(leaderboardText: string): string {
    return `[ 🏆 LEADERBOARD TRAINER TERBAIK ]

${leaderboardText}

Latihlah Uma Musumemu dan kumpulkan Carrot Coins terbanyak!`;
  }
}
