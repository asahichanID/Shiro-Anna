import React from 'react';
import { Swords, Trophy, Clock, Sparkles, Eye, Zap, ShieldCheck } from 'lucide-react';
import { LiveDuelSession } from '../types';

interface LiveDuelPanelProps {
  duel: LiveDuelSession;
  currentUserId: string;
  onClose?: () => void;
}

export const LiveDuelPanel: React.FC<LiveDuelPanelProps> = ({ duel, currentUserId }) => {
  const isParticipant = duel.player1.id === currentUserId || duel.player2.id === currentUserId;
  const isSpectator = !isParticipant;

  return (
    <div className="absolute inset-x-3 sm:inset-x-8 top-12 z-30 max-w-md mx-auto animate-teleport-enter">
      {/* Magic Circle Particles Glow Ring */}
      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-500 via-sky-500 to-indigo-500 opacity-40 blur-md animate-pulse"></div>

      {/* Main Glass Panel */}
      <div className="relative bg-slate-900/90 backdrop-blur-md border border-amber-500/50 rounded-2xl p-4 sm:p-5 text-slate-100 shadow-2xl transition-opacity duration-300 hover:opacity-100 opacity-95">
        
        {/* Header Title Bar */}
        <div className="flex items-center justify-between border-b border-amber-500/30 pb-3 mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300">
              <Swords className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-black text-amber-300 tracking-wide">LIVE DUEL ARENA</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/40">
                  Ronde {duel.currentRound} / {duel.totalRounds}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Tebak Kata 1 vs 1 Realtime</p>
            </div>
          </div>

          {/* Spectator or Participant Status Tag */}
          <div>
            {isSpectator ? (
              <span className="flex items-center space-x-1 text-[10px] bg-slate-800 text-sky-300 px-2.5 py-1 rounded-full border border-sky-500/30 font-medium">
                <Eye className="w-3 h-3 text-sky-400" />
                <span>Penonton</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-[10px] bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full border border-amber-500/40 font-bold">
                <Zap className="w-3 h-3 text-amber-400 animate-pulse" />
                <span>Pemain</span>
              </span>
            )}
          </div>
        </div>

        {/* Players Matchup Bar */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-center mb-3">
          {/* Player 1 */}
          <div className={`p-2 rounded-lg transition-all ${duel.player1.id === currentUserId ? 'bg-sky-950/60 border border-sky-500/40' : ''}`}>
            <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">Pemain 1</span>
            <p className="text-xs font-bold text-white truncate">{duel.player1.name}</p>
            <div className="text-sm font-black text-amber-300 mt-0.5">{duel.player1.score} poin</div>
          </div>

          {/* Player 2 */}
          <div className={`p-2 rounded-lg transition-all ${duel.player2.id === currentUserId ? 'bg-indigo-950/60 border border-indigo-500/40' : ''}`}>
            <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Pemain 2</span>
            <p className="text-xs font-bold text-white truncate">{duel.player2.name}</p>
            <div className="text-sm font-black text-amber-300 mt-0.5">{duel.player2.score} poin</div>
          </div>
        </div>

        {/* DYNAMIC PANEL FLOW CONTENT */}
        
        {/* 1. COUNTDOWN STEP */}
        {duel.status === 'countdown' && (
          <div className="text-center py-4 space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 font-black text-2xl shadow-xl animate-ping-short">
              {duel.countdownSeconds || 3}
            </div>
            <p className="text-xs font-bold text-amber-200">Bersiap! Soal duel segera muncul...</p>
          </div>
        )}

        {/* 2. QUESTION STEP */}
        {duel.status === 'question' && duel.question && (
          <div className="space-y-2 bg-slate-950/90 p-3 rounded-xl border border-amber-500/30 text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-sky-300 font-bold uppercase">{duel.question.kategori || 'Soal Duel'}</span>
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3 animate-spin" /> Jawab Cepat!
              </span>
            </div>
            <p className="text-sm font-bold text-white leading-snug">"{duel.question.soal}"</p>
            <p className="text-[11px] text-slate-400">
              💡 Clue: <span className="text-amber-300 font-medium">{duel.question.clue}</span>
            </p>

            {isSpectator && (
              <div className="bg-sky-950/50 border border-sky-500/30 p-2 rounded text-[11px] text-sky-200 text-center">
                👁 Kamu adalah penonton. Perhatikan jalannya duel secara realtime!
              </div>
            )}
          </div>
        )}

        {/* 3. ANSWER CORRECT STEP */}
        {duel.status === 'answer_correct' && (
          <div className="text-center py-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl space-y-1">
            <div className="inline-flex items-center justify-center p-2 rounded-full bg-emerald-500/20 text-emerald-300 mb-1">
              <Sparkles className="w-5 h-5 animate-spin" />
            </div>
            <p className="text-sm font-bold text-emerald-300">
              🎉 {duel.lastAnswerUser} Menjawab Benar!
            </p>
            <p className="text-xs text-slate-300">
              Jawaban: <span className="font-extrabold text-white">"{duel.lastAnswerText}"</span>
            </p>
          </div>
        )}

        {/* 4. SCORES STEP */}
        {duel.status === 'scores' && (
          <div className="text-center py-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wide">Papan Skor Sementara</p>
            <div className="flex justify-center items-center space-x-6 text-sm font-black">
              <span className="text-sky-300">{duel.player1.name}: {duel.player1.score}</span>
              <span className="text-slate-600">VS</span>
              <span className="text-indigo-300">{duel.player2.name}: {duel.player2.score}</span>
            </div>
          </div>
        )}

        {/* 5. FINISHED STEP */}
        {duel.status === 'finished' && (
          <div className="text-center py-4 bg-gradient-to-b from-amber-950/80 to-slate-950 rounded-xl border border-amber-400/50 space-y-2">
            <Trophy className="w-10 h-10 text-amber-400 mx-auto animate-bounce" />
            <h4 className="text-base font-extrabold text-amber-300">
              {duel.winnerId === 'draw' ? 'DUEL SERI!' : `JUARA DUEL: ${duel.winnerName}!`}
            </h4>
            <p className="text-xs text-slate-300">
              Skor Akhir: {duel.player1.score} - {duel.player2.score}
            </p>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Reward +5,000 Carrot Coins & Streak Badge!</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
