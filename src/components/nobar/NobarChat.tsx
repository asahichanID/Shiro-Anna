import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, Sparkles, MessageSquare, ShieldCheck, Heart, ThumbsUp, Laugh, Zap } from 'lucide-react';
import { NobarChatMessage, NobarService } from '../../services/NobarService';
import { useProfile } from '../../context/ProfileContext';
import { BOT_DEFAULT_AVATAR } from '../../config/constants';

export const NobarChat: React.FC = () => {
  const { profile } = useProfile();
  const [messages, setMessages] = useState<NobarChatMessage[]>(() => NobarService.getChatMessagesSync());
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = NobarService.onChatUpdate((updatedMsgs) => {
      setMessages(updatedMsgs);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    NobarService.sendChatMessage(text, {
      id: profile?.id || 'guest',
      name: profile?.username || 'Trainer Sensei',
      avatar: profile?.avatar,
      role: profile?.role || 'Trainer',
    });

    setInputText('');
  };

  const handleQuickReaction = (emoji: string) => {
    NobarService.sendChatMessage(emoji, {
      id: profile?.id || 'guest',
      name: profile?.username || 'Trainer Sensei',
      avatar: profile?.avatar,
      role: profile?.role || 'Trainer',
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl min-h-[350px]">
      {/* Chat Room Header */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <span>Diskusi Nobar Global</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Live
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Obrolan langsung saat nonton & dengar musik bersama</p>
          </div>
        </div>

        {/* Quick Reaction Chips */}
        <div className="flex items-center space-x-1">
          {['🔥', '👏', '❤️', '🍿', '🎵'].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleQuickReaction(emoji)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs border border-slate-700 hover:scale-110 transition-all cursor-pointer"
              title={`Kirim ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar max-h-[50vh]">
        {messages.map((msg) => {
          const isDev = msg.senderRole === 'Developer' || msg.senderName.toLowerCase() === 'shiro anna';
          const isBot = msg.senderId === 'bot' || msg.senderName.includes('Oguri Cap');
          const isMe = msg.senderId === (profile?.id || 'guest');

          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-700 flex-shrink-0 bg-slate-800">
                <img
                  src={msg.senderAvatar || BOT_DEFAULT_AVATAR}
                  alt={msg.senderName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = BOT_DEFAULT_AVATAR;
                  }}
                />
              </div>

              {/* Message Bubble */}
              <div className={`max-w-[78%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {/* Meta Name & Time */}
                <div className="flex items-center space-x-1.5 mb-1 text-[11px]">
                  <span className={`font-bold ${isDev ? 'text-rose-400' : isBot ? 'text-amber-300' : 'text-slate-300'}`}>
                    {msg.senderName}
                  </span>
                  {isDev && (
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-red-600 text-white">Dev</span>
                  )}
                  {isBot && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-600 text-white">Bot</span>
                  )}
                  <span className="text-slate-500">{msg.time}</span>
                </div>

                {/* Text Content */}
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-md ${
                    isMe
                      ? 'bg-sky-600 text-white rounded-tr-none'
                      : isBot
                      ? 'bg-gradient-to-r from-slate-800 to-indigo-950/80 border border-indigo-500/30 text-slate-100 rounded-tl-none'
                      : 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 bg-slate-950/80 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Tulis pesan obrolan Nobar..."
          className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-sky-600/30"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Kirim</span>
        </button>
      </form>
    </div>
  );
};
