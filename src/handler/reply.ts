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
    return `[ 🐎 OGURI CAP • TEBAK KATA ]

📖 Tantangan Trainer
━━━━━━━━━━━━━━
📝 Soal:
${soal}

💡 Petunjuk:
${clue}

📌 Kategori:
${kategori}
━━━━━━━━━━━━━━

⏱️ Batas Waktu: 60 detik
🎁 Hadiah: 2.999 ~ 4.555 Carrot Coins 🥕

Oguri Cap:
"Trainer, tunjukkan kemampuanmu! Aku yakin kamu bisa menemukan jawabannya!" 🥕

Cara Bermain:
💬 Ketik jawaban langsung di chat
🔎 .hint — Meminta petunjuk huruf
🏳️ .nyerah — Menyerah dan melihat jawaban
🥕 .coin — Mengecek saldo Carrot Coins`;
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

🌟 Selamat, Trainer ${trainerName}!
Jawabanmu berhasil ditemukan dengan sempurna!

Oguri Cap:
"Umai~! Kerja kerasmu membuahkan hasil. Aku bangga melihat semangatmu!" 🥕

━━━━━━━━━━━━━━
📝 Jawaban Benar:
${jawaban}

⏱️ Waktu Penyelesaian:
${timeTakenSec.toFixed(1)} detik

${streakText}

🥕 Carrot Coins Didapat:
+${rewardCoins.toLocaleString('id-ID')} Coins ${isStreakBonus ? '(Bonus Win Streak 1.5x Aktif!)' : ''}

💰 Total Saldo:
${newTotalCoins.toLocaleString('id-ID')} Carrot Coins
━━━━━━━━━━━━━━

🏆 Latihan berhasil diselesaikan!
Siapkan semangatmu untuk tantangan berikutnya.

Ketik .tebakkata untuk memulai babak selanjutnya! 🐎`;
  }

  public static formatTimeout(correctAnswer: string): string {
    const timeoutMsg = this.timeoutList[Math.floor(Math.random() * this.timeoutList.length)];

    return `[ ⏰ WAKTU HABIS ]

${timeoutMsg}

Oguri Cap:
"Waktu sudah berakhir, Trainer... tapi jangan menyerah!" 🥕

━━━━━━━━━━━━━━
💭 Jawaban yang benar:
${correctAnswer}

💔 Win Streak: Reset ke awal
━━━━━━━━━━━━━━

Setiap kegagalan adalah bagian dari latihan.
Ayo kembali mencoba dan raih kemenangan berikutnya!

Ketik .tebakkata untuk memulai tantangan baru! 🐎`;
  }


  public static formatHint(clue: string, hintPattern: string): string {
    return `[ 💡 PETUNJUK ]

Trainer, Oguri memberikan sedikit bantuan untukmu! 🥕

━━━━━━━━━━━━━━
💡 Clue:
${clue}

🔤 Petunjuk Huruf:
${hintPattern}
━━━━━━━━━━━━━━

Masih ada waktu untuk berpikir!
Gunakan petunjuk ini dan temukan jawabannya, Trainer! ✨`;
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

📋 Profil Trainer
━━━━━━━━━━━━━━
👤 Nama Trainer:
${trainerName}

💰 Carrot Coins:
${coins.toLocaleString('id-ID')} Coins

🏆 Total Kemenangan:
${gamesWon} Kali

🔥 Win Streak Saat Ini:
${winStreak} Kemenangan ${winStreak >= 3 ? '⚡ Bonus Multiplier 1.5x Aktif!' : ''}

👑 Rekor Win Streak:
${maxWinStreak} Kemenangan
━━━━━━━━━━━━━━

Oguri Cap:
"Wahh! Wortel kita semakin banyak, Trainer! Teruslah berlatih dan raih kemenangan baru!" 🥕`;
  }

  public static formatLeaderboard(leaderboardText: string): string {
    return `[ 🏆 RANKING TRAINER TRACEN ]

━━━━━━━━━━━━━━
${leaderboardText}
━━━━━━━━━━━━━━

Oguri Cap:
"Siapa yang akan menjadi Trainer terkuat berikutnya?" 🐎✨

Terus latih kemampuanmu, kumpulkan Carrot Coins, dan buktikan dirimu di antara para Trainer terbaik!`;
  }
}
