import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Sparkles, User, CheckCheck, Clock } from 'lucide-react';
import { Friend, DirectMessage } from '../types';
import { ChatService, TypingCallbackStatus } from '../services/ChatService';

interface RoomChatViewProps {
  friend: Friend;
  onBack: () => void;
}

export const RoomChatView: React.FC<RoomChatViewProps> = ({ friend, onBack }) => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [typingStatus, setTypingStatus] = useState<TypingCallbackStatus | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load chat history
    const initialMsgs = ChatService.getMessages(friend.id);
    setMessages(initialMsgs);

    // Listen to typing status
    const unsubscribeTyping = ChatService.onTyping((status) => {
      if (status.friendId === friend.id) {
        setTypingStatus(status);
      }
    });

    return () => {
      unsubscribeTyping();
    };
  }, [friend.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingStatus]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    setInputText('');

    const sentMsg = ChatService.sendMessage(friend, userText, (replyMsg) => {
      setMessages((prev) => [...prev, replyMsg]);
    });

    setMessages((prev) => [...prev, sentMsg]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Online':
        return 'bg-emerald-400';
      case 'Away':
        return 'bg-amber-400';
      case 'Busy':
        return 'bg-rose-400';
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <div className="flex flex-col h-[700px] max-h-[82vh] bg-slate-950 border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="bg-slate-900/90 border-b border-slate-800 p-3.5 px-4 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Kembali ke Daftar Teman"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative">
            <img
              src={friend.avatar}
              alt={friend.username}
              className="w-10 h-10 rounded-full object-cover border border-slate-700 shadow"
            />
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${getStatusColor(
                friend.status
              )}`}
            ></span>
          </div>

          <div>
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
              {friend.username}
            </h3>
            <div className="flex items-center space-x-2 text-[11px]">
              <span className="text-sky-400 font-medium">{friend.status}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                {friend.lastOnline}
              </span>
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 bg-sky-950/40 border border-sky-800/40 text-sky-300 text-xs px-3 py-1.5 rounded-full">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>Room Chat Active</span>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/60 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <User className="w-12 h-12 text-slate-700 mb-2" />
            <p className="text-sm font-medium">Belum ada percakapan</p>
            <p className="text-xs text-slate-600 mt-1">Kirim pesan pertama untuk menyapa {friend.username}!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === 'me';
            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                {!isMe && (
                  <img
                    src={friend.avatar}
                    alt={friend.username}
                    className="w-7 h-7 rounded-full object-cover border border-slate-700 flex-shrink-0"
                  />
                )}

                <div
                  className={`max-w-[75%] sm:max-w-[68%] rounded-2xl p-3 px-4 shadow-md text-xs sm:text-sm leading-relaxed ${
                    isMe
                      ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-br-none border border-sky-400/30'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  <div
                    className={`mt-1 flex items-center justify-end space-x-1 text-[10px] ${
                      isMe ? 'text-sky-200/80' : 'text-slate-500'
                    }`}
                  >
                    <span>{msg.time}</span>
                    {isMe && <CheckCheck className="w-3 h-3 text-sky-200" />}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {typingStatus && typingStatus.isTyping && (
          <div className="flex items-center space-x-2.5 my-2 animate-fadeIn">
            <img
              src={friend.avatar}
              alt={friend.username}
              className="w-7 h-7 rounded-full object-cover border border-slate-700 flex-shrink-0"
            />
            <div className="bg-slate-900 border border-slate-800 text-sky-300 text-xs px-3.5 py-2 rounded-2xl rounded-bl-none shadow flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping"></span>
              <span>{typingStatus.text}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center space-x-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Tulis pesan untuk ${friend.username}...`}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
        />

        <button
          onClick={handleSend}
          disabled={!inputText.trim()}
          className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center shadow-md shadow-sky-500/20 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
