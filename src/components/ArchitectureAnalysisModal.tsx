import React from 'react';
import { BookOpen, Layers, Terminal, Database, MessageSquare, Coins, Clock, Sparkles } from 'lucide-react';

export const ArchitectureAnalysisModal: React.FC = () => {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-6 text-slate-200 shadow-2xl">
      
      {/* Title */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">
              Analisis Struktur & Alur Kerja Project Musume Bot
            </h2>
            <p className="text-xs text-purple-300 mt-0.5">
              Penjelasan arsitektur modular, alur command handler, database user, session game, dan reply system.
            </p>
          </div>
        </div>
      </div>

      {/* Grid Analysis Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        
        {/* 1. Struktur Folder */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            1. Struktur Folder (`/src`)
          </h3>
          <ul className="space-y-1.5 text-slate-300 text-[11px] font-mono">
            <li>📁 <span className="text-sky-300 font-bold">/musume/gametebak/tebakkata/</span></li>
            <li className="pl-4">├── data.json, data2.json, data3.json (Multi Dataset Soal)</li>
            <li className="pl-4">└── index.ts (Manager Queue & Evaluator Jawaban)</li>
            <li>📁 <span className="text-sky-300 font-bold">/database/</span></li>
            <li className="pl-4">├── userDb.ts (Penyimpanan Saldo Carrot Coins & Statistik)</li>
            <li className="pl-4">└── gameDb.ts (Penyimpanan Active Game Session & Timer 60s)</li>
            <li>📁 <span className="text-sky-300 font-bold">/handler/</span></li>
            <li className="pl-4">├── messageHandler.ts (Router Command & Silent Filter)</li>
            <li className="pl-4">└── reply.ts (Formatter Balasan Persona Oguri Cap)</li>
          </ul>
        </div>

        {/* 2. Cara Command Bekerja */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            2. Cara Command Bekerja
          </h3>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Command menggunakan prefix <code className="text-amber-300 font-bold">.</code> atau <code className="text-amber-300 font-bold">!</code> (contoh: <code className="text-amber-300">.tebakkata</code>, <code className="text-amber-300">.hint</code>, <code className="text-amber-300">.nyerah</code>, <code className="text-amber-300">.coin</code>, <code className="text-amber-300">.leaderboard</code>).
          </p>
          <p className="text-slate-400 text-[11px]">
            String diparse di <code className="text-sky-300">MessageHandler</code>, dipisahkan antara command utama dan argumen, lalu dieksekusi oleh <code className="text-sky-300">executeCommand()</code>.
          </p>
        </div>

        {/* 3. Handler Menerima Pesan & Diam Jika Salah */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            3. Cara Handler Menerima Pesan & Silent Answer
          </h3>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Saat pesan non-command masuk saat game aktif:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-slate-300 text-[11px]">
            <li>Handler mencocokkan teks dengan jawaban (<code className="text-emerald-300">tebakKataManager.checkAnswer</code>).</li>
            <li><span className="text-rose-400 font-bold">Jawaban Salah:</span> Handler mengembalikan <code className="font-mono text-rose-300">null</code> → <span className="text-rose-300 font-semibold">BOT DIAM (Tidak mengirim balasan apapun)</span>.</li>
            <li><span className="text-emerald-400 font-bold">Jawaban Benar:</span> Bot menyelesaikan session, menghitung reward, dan mengirim pesan selebrasi.</li>
          </ul>
        </div>

        {/* 4. Database User & Reward Storage */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2">
            <Coins className="w-4 h-4" />
            4. Database User & Reward Carrot Coins
          </h3>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            <code className="text-purple-300">userDb.ts</code> menyimpan statistik tiap Trainer (ID, Nama, Carrot Coins, Games Won).
          </p>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Setiap jawaban benar, reward dihitung secara acak di rentang <span className="text-amber-300 font-bold">2.999 hingga 4.555 Carrot Coins</span> dan ditambahkan langsung ke saldo user:
          </p>
          <div className="bg-slate-900 p-2 rounded font-mono text-[10px] text-amber-300">
            userDb.addCarrotCoins(userId, Math.floor(Math.random() * (4555 - 2999 + 1)) + 2999)
          </div>
        </div>

        {/* 5. Database Game & Session Manager */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            5. Database Game & Session Game (Timer 60s)
          </h3>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            <code className="text-indigo-300">gameDb.ts</code> mencatat session aktif berdasarkan <code className="text-indigo-300">chatId</code>.
          </p>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Menjalankan interval timer 60 detik. Jika durasi habis tanpa jawaban benar, callback timeout dipanggil untuk mengumumkan waktu habis dan mengakhiri session.
          </p>
        </div>

        {/* 6. Queue -> Random Permanen */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            6. Queue → Random Permanen
          </h3>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Semua soal dari <code className="text-sky-300">data.json</code>, <code className="text-sky-300">data2.json</code>, dst., digabung dan diacak dengan algoritma <span className="text-rose-300 font-bold">Fisher-Yates Shuffle</span> ke dalam antrean permanen. Soal diambil satu per satu tanpa perulangan berurutan hingga queue habis, kemudian otomatis di-reshuffle.
          </p>
        </div>

      </div>

      {/* Summary Footer */}
      <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-purple-950 p-4 rounded-xl border border-sky-500/30 text-xs flex items-center justify-between">
        <div>
          <p className="font-bold text-white">
            ✅ Alur Lengkap Telah Diterapkan Sesuai Spesifikasi Project
          </p>
          <p className="text-slate-400 text-[11px] mt-0.5">
            Sistem modular, tema Oguri Cap, timer 60s, silent wrong guess, reward 2999-4555 Carrot Coins.
          </p>
        </div>
      </div>
    </div>
  );
};
