import React, { useState, useEffect } from 'react';
import { UserProfile, GameSession } from '../types';
import { userDb } from '../database/userDb';
import { gameDb } from '../database/gameDb';
import { Coins, Trophy, Users, ShieldAlert, Plus, RefreshCw, Clock } from 'lucide-react';

export const DatabaseViewer: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeSession, setActiveSession] = useState<GameSession | undefined>(undefined);

  const refreshData = () => {
    setUsers(userDb.getAllUsers());
    setActiveSession(gameDb.getSession('chat_default'));
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAddCoins = (userId: string) => {
    userDb.addCarrotCoins(userId, 3500);
    refreshData();
  };

  const handleResetDb = () => {
    if (confirm('Reset seluruh database user dan statistik ke default?')) {
      userDb.resetDatabase();
      refreshData();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 p-5 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" />
            Database User & Active Session Inspector
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Melihat data penyimpanan Carrot Coins user dan status active game session secara real-time.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={refreshData}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh State</span>
          </button>

          <button
            onClick={handleResetDb}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium border border-rose-500/30 transition-all"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Reset DB</span>
          </button>
        </div>
      </div>

      {/* Active Game Session Card */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Active Game Database (`gameDb`)
          </h3>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
            activeSession && activeSession.status === 'active'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            {activeSession && activeSession.status === 'active' ? 'Active Session Running' : 'No Active Session'}
          </span>
        </div>

        {activeSession && activeSession.status === 'active' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-400">Chat / Room ID:</span>
              <p className="font-mono text-sky-400 font-bold">{activeSession.chatId}</p>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-400">Soal Aktif:</span>
              <p className="text-white font-medium truncate">{activeSession.question.soal}</p>
              <p className="text-[10px] text-slate-500">Jawaban: <span className="text-emerald-400 font-bold">{activeSession.question.jawaban}</span></p>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-400">Timer & Status:</span>
              <p className="text-amber-300 font-bold">Timer: 60 Detik Countdown</p>
              <p className="text-[10px] text-slate-400">Hints Digunakan: {activeSession.hintsUsed}</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic py-2">
            Tidak ada session game yang sedang berjalan. Mulai game dengan mengirim <span className="text-sky-400 font-mono font-semibold">.tebakkata</span> di chat bot.
          </p>
        )}
      </div>

      {/* User Database Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            Tabel User (`userDb`) - Carrot Coins Balance
          </h3>
          <span className="text-xs text-slate-400">Total Trainer Registered: {users.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">Trainer Name</th>
                <th className="px-4 py-3">Carrot Coins 🥕</th>
                <th className="px-4 py-3">Win Streak 🔥</th>
                <th className="px-4 py-3">Max Streak 👑</th>
                <th className="px-4 py-3">Games Played</th>
                <th className="px-4 py-3">Games Won</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-400">{user.id}</td>
                  <td className="px-4 py-3 font-semibold text-white flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    {user.name}
                  </td>
                  <td className="px-4 py-3 font-bold text-amber-300">
                    +{user.carrotCoins.toLocaleString('id-ID')} Coins
                  </td>
                  <td className="px-4 py-3 font-bold text-orange-400">
                    {user.winStreak || 0}x {(user.winStreak || 0) >= 3 ? '⚡ (1.5x)' : ''}
                  </td>
                  <td className="px-4 py-3 font-semibold text-purple-300">
                    {user.maxWinStreak || 0}x
                  </td>
                  <td className="px-4 py-3 text-slate-300">{user.gamesPlayed} x</td>
                  <td className="px-4 py-3 text-emerald-400 font-semibold">{user.gamesWon} Win</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleAddCoins(user.id)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-medium transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+3,500 Coins</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
