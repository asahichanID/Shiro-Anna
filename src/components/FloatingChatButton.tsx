import React from 'react';
import { MessageSquare, Users } from 'lucide-react';

interface FloatingChatButtonProps {
  onClick: () => void;
  unreadCount?: number;
}

export const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({
  onClick,
  unreadCount = 0,
}) => {
  return (
    <button
      onClick={onClick}
      id="floating-chat-button"
      className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-[0_0_25px_rgba(56,189,248,0.55)] border border-sky-300/40 hover:scale-105 active:scale-95 transition-all duration-300 group animate-bounce-slow cursor-pointer"
      title="Buka Halaman Teman & Chat"
    >
      <div className="relative flex items-center justify-center">
        <MessageSquare className="w-7 h-7 text-white drop-shadow group-hover:rotate-12 transition-transform duration-300" />
        <Users className="w-3.5 h-3.5 text-sky-200 absolute -bottom-1 -right-1" />
      </div>

      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-950 animate-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}

      {/* Subtle outer pulse ring */}
      <span className="absolute inset-0 rounded-full bg-sky-400/20 animate-ping -z-10 pointer-events-none"></span>
    </button>
  );
};
