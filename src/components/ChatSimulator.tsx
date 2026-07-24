import React, { useState, useEffect, useRef } from 'react';
import { Send, Clock, Sparkles, Coins, HelpCircle, Flag, Zap, RotateCcw, AlertCircle } from 'lucide-react';
import { BotMessage, GameSession } from '../types';
import { gameDb } from '../database/gameDb';
import { messageHandler } from '../handler/messageHandler';
import { BotService, BotProfile } from '../services/BotService';
import { BotAvatar } from './BotAvatar';

interface ChatSimulatorProps {
  messages: BotMessage[];
  onSendMessage: (text: string) => void;
  activeSession: GameSession | undefined;
  userName: string;
  userCoins: number;
  userWinStreak?: number;
}

export const ChatSimulator: React.FC<ChatSimulatorProps> = ({
  messages,
  onSendMessage,
  activeSession,
  userName,
  userCoins,
  userWinStreak = 0,
}) => {
  const [inputText, setInputText] = useState('');
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [silentNotice, setSilentNotice] = useState<string | null>(null);
  const [typingStatus, setTypingStatus] = useState<{ active: boolean; text: string; dots: string } | null>(null);
  const [botProfile, setBotProfile] = useState<BotProfile>(() => BotService.getBotProfile());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to bot profile updates
  useEffect(() => {
    const unsub = BotService.onBotProfileUpdate((updated) => {
      setBotProfile(updated);
    });
    return () => unsub();
  }, []);

  // Subscribe to bot typing updates
  useEffect(() => {
    const unsubscribeTyping = messageHandler.onTyping((status) => {
      setTypingStatus(status);
    });
    return () => {
      unsubscribeTyping();
    };
  }, []);

  // Auto scroll message feed
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, silentNotice, typingStatus]);

  // Handle active game timer updates
  useEffect(() => {
    if (activeSession && activeSession.status === 'active') {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - activeSession.startTime) / 1000);
        const remaining = Math.max(0, activeSession.durationSeconds - elapsed);
        setTimerSeconds(remaining);
      }, 500);

      return () => clearInterval(interval);
    } else {
      setTimerSeconds(60);
    }
  }, [activeSession]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    setInputText('');
    setSilentNotice(null);

    // Track if session is active before sending message
    const isGameActive = gameDb.isGameActive('chat_default');

    // Send to message handler
    onSendMessage(userText);

    // If game was active, and user sent text that wasn't a command, check if bot replied
    if (isGameActive && !userText.startsWith('.') && !userText.startsWith('!')) {
      setTimeout(() => {
        if (gameDb.isGameActive('chat_default')) {
          setSilentNotice(`🤐 Bot DIAM (Tidak mereply) karena jawaban "${userText}" kurang tepat.`);
          setTimeout(() => setSilentNotice(null), 4000);
        }
      }, 100);
    }
  };

  const sendQuickCommand = (cmd: string) => {
    setSilentNotice(null);
    onSendMessage(cmd);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[500px] bg-slate-950 rounded-xl border border-slate-800 shadow-2xl overflow-hidden">
      
      {/* Chat Room Top Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BotAvatar
            src={botProfile.avatar}
            alt={botProfile.name}
            className="w-10 h-10"
            showGlow={true}
          />
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white">{botProfile.name}</h2>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-500/30 font-medium">
                {botProfile.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
              {botProfile.bio}
            </p>
          </div>
        </div>

        {/* Live Active Game Status & Win Streak Indicator */}
        <div className="flex items-center space-x-2">
          {userWinStreak > 0 && (
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                userWinStreak >= 3
                  ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-slate-950 border border-amber-200 shadow-xl animate-streak-gradient'
                  : 'bg-orange-500/15 border border-orange-500/30 text-orange-300'
              }`}
            >
              <span className={userWinStreak >= 3 ? 'animate-streak-fire inline-block' : ''}>🔥</span>
              <span>{userWinStreak}x Streak</span>
              {userWinStreak >= 3 && (
                <span className="bg-slate-950 text-amber-300 text-[10px] px-1.5 py-0.2 rounded font-black border border-amber-400/50">
                  1.5x ⚡
                </span>
              )}
            </div>
          )}

          {activeSession && activeSession.status === 'active' ? (
            <div className="flex items-center space-x-2 bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 rounded-full text-amber-300 text-xs font-semibold animate-pulse">
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>Sisa Waktu: {timerSeconds}s</span>
            </div>
          ) : (
            <div className="hidden sm:block text-xs text-slate-500 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700/50">
              Siap Bertanding • Ketik .tebakkata
            </div>
          )}
        </div>
      </div>

      {/* Active Game Banner Box */}
      {activeSession && activeSession.status === 'active' && (
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border-b border-sky-500/30 p-3.5 text-xs text-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-500/40 text-sky-300 font-bold text-[10px] uppercase">
                  Active Game
                </span>
                <span className="font-semibold text-sky-200">{activeSession.question.kategori || 'Umamusume'}</span>
              </div>
              <p className="text-sm font-medium text-white">
                "{activeSession.question.soal}"
              </p>
              <p className="text-xs text-sky-300/80">
                💡 Clue: <span className="font-semibold text-white">{activeSession.question.clue}</span>
              </p>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 flex-shrink-0 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              <div className="flex items-center space-x-1 text-amber-300 font-bold text-xs">
                <Coins className="w-3.5 h-3.5" />
                <span>
                  {userWinStreak >= 3 ? '4,498 - 6,832 Coins (1.5x)' : '2,999 - 4,555 Coins'}
                </span>
              </div>
              {userWinStreak > 0 ? (
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 transition-all ${
                  userWinStreak >= 3
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black border border-amber-300 shadow-md animate-streak-glow'
                    : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                }`}>
                  <span className={userWinStreak >= 3 ? 'animate-streak-fire inline-block' : ''}>🔥</span>
                  <span>
                    Streak: {userWinStreak}x {userWinStreak >= 3 ? '⚡ (1.5x Active!)' : `(${3 - userWinStreak} more for 1.5x)`}
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-slate-400 text-[10px]">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Timer 60s Count: {timerSeconds}s</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Silent Response Indicator Notification */}
      {silentNotice && (
        <div className="bg-slate-900/90 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-300 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{silentNotice}</span>
          </div>
          <span className="text-[10px] text-slate-400 italic">Rules: Jawaban salah = Bot Diam</span>
        </div>
      )}

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/80 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isSystem = msg.sender === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <span className="text-[11px] text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div className="flex items-center space-x-2 px-1">
                <span className="text-[10px] font-medium text-slate-400">
                  {isUser ? msg.senderName : botProfile.name}
                </span>
                <span className="text-[9px] text-slate-500">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              <div className="flex items-start gap-2">
                {!isUser && (
                  <BotAvatar
                    src={botProfile.avatar}
                    alt={botProfile.name}
                    className="w-7 h-7 mt-0.5"
                  />
                )}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed shadow-lg ${
                    isUser
                      ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-br-none border border-sky-400/20'
                      : 'bg-slate-900 text-slate-100 rounded-bl-none border border-slate-800 font-sans'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}

        {/* Animated Typing Indicator */}
        {typingStatus && typingStatus.active && (
          <div className="flex items-start space-x-2.5 my-2 animate-fadeIn">
            <BotAvatar
              src={botProfile.avatar}
              alt={botProfile.name}
              className="w-8 h-8"
              showGlow={true}
            />
            <div className="bg-slate-900/90 border border-slate-800 text-sky-300 text-xs px-4 py-2.5 rounded-2xl rounded-bl-none shadow-md flex items-center space-x-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping flex-shrink-0"></span>
              <span className="tracking-wide">{typingStatus.text}<span className="font-mono font-bold text-sky-400">{typingStatus.dots}</span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />

      </div>

      {/* Quick Command Toolbar */}
      <div className="bg-slate-900/90 border-t border-slate-800 p-2 overflow-x-auto flex items-center space-x-2 scrollbar-none">
        <button
          onClick={() => sendQuickCommand('.tebakkata')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-semibold whitespace-nowrap transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>.tebakkata</span>
        </button>

        <button
          onClick={() => sendQuickCommand('.hint')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold whitespace-nowrap transition-all"
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>.hint</span>
        </button>

        <button
          onClick={() => sendQuickCommand('.nyerah')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold whitespace-nowrap transition-all"
        >
          <Flag className="w-3.5 h-3.5 text-rose-400" />
          <span>.nyerah</span>
        </button>

        <button
          onClick={() => sendQuickCommand('.coin')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold whitespace-nowrap transition-all"
        >
          <Coins className="w-3.5 h-3.5 text-emerald-400" />
          <span>.coin</span>
        </button>

        <button
          onClick={() => sendQuickCommand('.leaderboard')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-semibold whitespace-nowrap transition-all"
        >
          <Zap className="w-3.5 h-3.5 text-purple-400" />
          <span>.leaderboard</span>
        </button>

        <button
          onClick={() => sendQuickCommand('.queue')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium whitespace-nowrap transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>.queue</span>
        </button>
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSubmit} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center space-x-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            activeSession && activeSession.status === 'active'
              ? 'Ketik jawabanmu di sini (Jawaban salah = bot diam)...'
              : 'Ketik command seperti .tebakkata atau .help...'
          }
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
        />

        <button
          type="submit"
          className="bg-sky-600 hover:bg-sky-500 text-white p-2.5 rounded-xl font-medium transition-all shadow-md shadow-sky-600/20 flex items-center justify-center flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
