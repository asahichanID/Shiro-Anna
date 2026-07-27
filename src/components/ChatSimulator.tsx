import React, { useState, useEffect, useRef } from 'react';
import { Send, Clock, Sparkles, Coins, HelpCircle, Flag, Zap, RotateCcw, AlertCircle, Users, Globe, MessageSquare, Swords, UserPlus, UserMinus, Check, CheckCheck, Eye } from 'lucide-react';
import { BotMessage, GameSession, GlobalChatMessage, DirectMessage, Friend, LiveDuelSession } from '../types';
import { gameDb } from '../database/gameDb';
import { messageHandler } from '../handler/messageHandler';
import { BotService, BotProfile } from '../services/BotService';
import { GlobalChatService } from '../services/GlobalChatService';
import { FriendsService } from '../services/FriendsService';
import { LiveDuelService } from '../services/LiveDuelService';
import { PresenceService } from '../services/PresenceService';
import { BotAvatar } from './BotAvatar';
import { LiveDuelPanel } from './LiveDuelPanel';

import { DeveloperBadge } from './DeveloperBadge';
import { D1DatabaseService } from '../services/D1DatabaseService';
import { useProfile } from '../context/ProfileContext';

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
  const { profile, activeBadge, activeBadgeCustomName } = useProfile();
  const currentUserId = profile?.id || 'trainer_01';

  // Navigation state
  const [chatMode, setChatMode] = useState<'global' | 'friends' | 'bot'>('global');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

  // Chat Data state
  const [globalMessages, setGlobalMessages] = useState<GlobalChatMessage[]>(() => GlobalChatService.getGlobalMessagesSync());
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [friendsList, setFriendsList] = useState<Friend[]>(() => FriendsService.getFriendsSync());
  const [activeDuel, setActiveDuel] = useState<LiveDuelSession | null>(() => LiveDuelService.getActiveDuelSync());

  // Input & notice state
  const [inputText, setInputText] = useState('');
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [typingStatus, setTypingStatus] = useState<{ active: boolean; text: string; dots: string } | null>(null);
  const [botProfile, setBotProfile] = useState<BotProfile>(() => BotService.getBotProfileSync());
  const [userActiveBadge, setUserActiveBadge] = useState<string | undefined>(undefined);
  
  // New Friend Input state
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Services & Subscriptions
  useEffect(() => {
    // Start presence tracking
    PresenceService.startPresenceTracking(currentUserId);

    // Start lightweight polling for Global Chat
    GlobalChatService.startPolling(currentUserId);

    // Load initial data
    GlobalChatService.fetchGlobalMessages().then(setGlobalMessages);
    FriendsService.getFriends(currentUserId).then(setFriendsList);
    LiveDuelService.getActiveDuel().then(setActiveDuel);
    D1DatabaseService.getUserBadges(currentUserId).then((res) => {
      if (res && res.activeBadge) {
        setUserActiveBadge(res.activeBadge);
      }
    });

    // Subscriptions
    const unsubBot = BotService.onBotProfileUpdate(setBotProfile);
    const unsubGlobal = GlobalChatService.onGlobalMessagesUpdate(setGlobalMessages);
    const unsubFriends = FriendsService.onFriendsUpdate(setFriendsList);
    const unsubDuel = LiveDuelService.onDuelUpdate(setActiveDuel);
    const unsubTyping = messageHandler.onTyping(setTypingStatus);

    return () => {
      unsubBot();
      unsubGlobal();
      unsubFriends();
      unsubDuel();
      unsubTyping();
      GlobalChatService.stopPolling();
      PresenceService.stopPresenceTracking();
    };
  }, []);

  // Sync Direct Messages when selectedFriend changes
  useEffect(() => {
    if (selectedFriend) {
      const roomId = `room_${currentUserId}_${selectedFriend.id}`;
      setDirectMessages(GlobalChatService.getDirectMessagesSync(roomId));
      GlobalChatService.fetchDirectMessages(roomId, currentUserId).then(setDirectMessages);

      const unsubDM = GlobalChatService.onDirectMessagesUpdate(roomId, (_, msgs) => {
        setDirectMessages(msgs);
      });

      return () => unsubDM();
    }
  }, [selectedFriend]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, globalMessages, directMessages, typingStatus, activeDuel]);

  // Game timer
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

  const showTemporaryNotice = (text: string) => {
    setNoticeMessage(text);
    setTimeout(() => setNoticeMessage(null), 4000);
  };

  const handleStartLiveDuel = async (targetOpponent?: { id: string; name: string }) => {
    const opponent = targetOpponent || { id: 'bot_oguri', name: 'Oguri Cap 🐎' };
    const result = await LiveDuelService.startDuel(
      { id: currentUserId, name: userName },
      opponent
    );

    if (!result.success) {
      showTemporaryNotice(`⚠️ ${result.message || 'Gagal memulai duel.'}`);
    } else {
      showTemporaryNotice(`⚔ Live Duel Dimulai melawan ${opponent.name}!`);
      // Broadcast to Global Chat
      GlobalChatService.sendGlobalMessage({
        senderId: 'system',
        senderName: 'SYSTEM ARENA',
        text: `⚔ LIVE DUEL DIMULAI: ${userName} vs ${opponent.name}! Semua Trainer dapat menonton!`,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setInputText('');
    setNoticeMessage(null);

    // Check if user is triggering duel command
    if (text.toLowerCase() === '.duel' || text.toLowerCase() === '!duel') {
      handleStartLiveDuel();
      return;
    }

    if (chatMode === 'global') {
      // Check if there is an active duel and user is a participant answering
      if (activeDuel && activeDuel.status === 'question') {
        const isParticipant = activeDuel.player1.id === currentUserId || activeDuel.player2.id === currentUserId;

        if (isParticipant) {
          // Send as duel answer in global chat
          await GlobalChatService.sendGlobalMessage({
            senderId: currentUserId,
            senderName: userName,
            text,
            isDuelAnswer: true,
          });

          const answerRes = await LiveDuelService.submitAnswer(currentUserId, userName, text);
          if (answerRes.isCorrect) {
            showTemporaryNotice('🎉 JAWABAN BENAR DALAM DUEL!');
            LiveDuelService.triggerGlobalStreakAnnouncement(userName, (userWinStreak || 0) + 1);
          }
          return;
        }
      }

      // Standard Global Message
      await GlobalChatService.sendGlobalMessage({
        senderId: currentUserId,
        senderName: userName,
        senderBadge: activeBadge || userActiveBadge,
        senderBadgeName: activeBadgeCustomName,
        text,
      });

    } else if (chatMode === 'friends' && selectedFriend) {
      const roomId = `room_${currentUserId}_${selectedFriend.id}`;
      await GlobalChatService.sendDirectMessage(roomId, currentUserId, selectedFriend.id, text);

    } else if (chatMode === 'bot') {
      const isGameActive = gameDb.isGameActive('chat_default');
      onSendMessage(text);

      if (isGameActive && !text.startsWith('.') && !text.startsWith('!')) {
        setTimeout(() => {
          if (gameDb.isGameActive('chat_default')) {
            showTemporaryNotice(`🤐 Bot DIAM karena jawaban "${text}" kurang tepat.`);
          }
        }, 100);
      }
    }
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendName.trim()) return;

    await FriendsService.addFriend(currentUserId, {
      username: newFriendName.trim(),
      status: 'Online',
      bio: 'Trainer Tracen Academy Baru',
      role: 'Trainer',
    });

    setNewFriendName('');
    setShowAddFriendModal(false);
    showTemporaryNotice(`✅ Berhasil menambahkan ${newFriendName.trim()} sebagai teman!`);
  };

  const handleRemoveFriend = async (friendId: string, friendName: string) => {
    if (friendId === '#1') {
      showTemporaryNotice('⚠️ Tidak dapat menghapus Lead Developer dari daftar teman!');
      return;
    }
    await FriendsService.removeFriend(currentUserId, friendId);
    if (selectedFriend?.id === friendId) {
      setSelectedFriend(null);
    }
    showTemporaryNotice(`❌ ${friendName} telah dihapus dari teman.`);
  };

  const handleQuickCommand = (cmd: string) => {
    if (chatMode !== 'bot') {
      setChatMode('bot');
    }
    onSendMessage(cmd);
  };

  return (
    <div className="relative flex flex-col h-[calc(100vh-140px)] min-h-[520px] bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
      
      {/* FLOATING LIVE DUEL PANEL OVERLAY */}
      {activeDuel && activeDuel.status !== 'idle' && (
        <LiveDuelPanel duel={activeDuel} currentUserId={currentUserId} />
      )}

      {/* TOP NAVIGATION BAR: Channel Tabs */}
      <div className="bg-slate-900 border-b border-slate-800 px-3 py-2.5 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setChatMode('global')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              chatMode === 'global'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Global Chat</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </button>

          <button
            onClick={() => setChatMode('friends')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              chatMode === 'friends'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Friends ({friendsList.length})</span>
          </button>

          <button
            onClick={() => setChatMode('bot')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              chatMode === 'bot'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Oguri Bot</span>
          </button>
        </div>

        {/* Live Duel Action Trigger & Win Streak Badge */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {userWinStreak >= 3 && (
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border badge-gold-steady">
              <span>🔥 {userWinStreak}x Win Streak</span>
            </div>
          )}

          <button
            onClick={() => handleStartLiveDuel()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black transition-all shadow-lg shadow-amber-500/20"
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Start Live Duel</span>
          </button>
        </div>
      </div>

      {/* NOTICE BANNER */}
      {noticeMessage && (
        <div className="bg-slate-900/90 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-300 flex items-center justify-between animate-fadeIn z-10">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{noticeMessage}</span>
          </div>
        </div>
      )}

      {/* MAIN CHAT CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* MODE 1: GLOBAL CHAT */}
        {chatMode === 'global' && (
          <div className="flex-1 flex flex-col bg-slate-950/80 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {globalMessages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              const isDev = msg.senderRole === 'Developer';
              const isSystem = msg.senderId === 'system';

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-1.5">
                    <span className="text-[11px] font-bold text-amber-300 bg-amber-950/70 border border-amber-500/30 px-3 py-1 rounded-full shadow-md">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}>
                  <div className="flex items-center space-x-2 px-1">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      {msg.senderBadge && (
                        <DeveloperBadge
                          badgeId={msg.senderBadge}
                          badgeName={
                            msg.senderId === currentUserId && msg.senderBadge === (activeBadge || userActiveBadge)
                              ? (activeBadgeCustomName || msg.senderBadgeName)
                              : msg.senderBadgeName
                          }
                          showRarity={false}
                          size="sm"
                        />
                      )}
                      <span>{msg.senderName}</span>
                      {isDev && (
                        <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.2 rounded font-black">
                          DEV
                        </span>
                      )}
                    </span>
                    <span className="text-[9px] text-slate-500">{msg.time}</span>
                  </div>

                  <div className="flex items-start gap-2">
                    {!isMe && (
                      <img
                        src={msg.senderAvatar || 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1'}
                        alt={msg.senderName}
                        className="w-7 h-7 rounded-full object-cover border border-slate-700 mt-0.5"
                      />
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed shadow-lg ${
                        isMe
                          ? 'bg-sky-600 text-white rounded-br-none border border-sky-400/20'
                          : isDev
                          ? 'bg-slate-900 border border-rose-500/40 text-rose-100 rounded-bl-none shadow-rose-950/50'
                          : 'bg-slate-900 text-slate-100 rounded-bl-none border border-slate-800'
                      }`}
                    >
                      {msg.isDuelAnswer && (
                        <span className="text-[10px] font-bold text-amber-400 block mb-0.5">
                          ⚔ JAWABAN DUEL:
                        </span>
                      )}
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* MODE 2: FRIENDS & DIRECT MESSAGES */}
        {chatMode === 'friends' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Friends Sidebar List */}
            <div className="w-64 sm:w-72 bg-slate-900 border-r border-slate-800 flex flex-col">
              <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Daftar Teman</span>
                <button
                  onClick={() => setShowAddFriendModal(true)}
                  className="p-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 border border-sky-500/30 text-xs flex items-center gap-1 transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
                {friendsList.map((friend) => {
                  const isSelected = selectedFriend?.id === friend.id;
                  const isDev = friend.id === '#1';

                  return (
                    <div
                      key={friend.id}
                      onClick={() => setSelectedFriend(friend)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition-all ${
                        isSelected ? 'bg-sky-950/60 border-l-4 border-sky-500' : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 overflow-hidden">
                        <div className="relative">
                          <img
                            src={friend.avatar}
                            alt={friend.username}
                            className="w-9 h-9 rounded-full object-cover border border-slate-700"
                          />
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                              friend.status === 'Online' ? 'bg-emerald-400' : 'bg-slate-500'
                            }`}
                          />
                        </div>
                        <div className="overflow-hidden">
                          <div className="flex items-center space-x-1">
                            <span className="text-xs font-bold text-white truncate">{friend.username}</span>
                            {isDev && (
                              <span className="text-[8px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1 py-0.2 rounded font-black">
                                DEV
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">{friend.lastMessage}</p>
                        </div>
                      </div>

                      {!isDev && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFriend(friend.id, friend.username);
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="Hapus Teman"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Direct Message Area */}
            <div className="flex-1 flex flex-col bg-slate-950">
              {selectedFriend ? (
                <>
                  {/* DM Header */}
                  <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <img
                        src={selectedFriend.avatar}
                        alt={selectedFriend.username}
                        className="w-8 h-8 rounded-full object-cover border border-slate-700"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-white">{selectedFriend.username}</h4>
                        <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          {selectedFriend.status}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartLiveDuel({ id: selectedFriend.id, name: selectedFriend.username })}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1 hover:bg-amber-500/30 transition-all"
                    >
                      <Swords className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ajak Duel</span>
                    </button>
                  </div>

                  {/* DM Feed */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {directMessages.map((dm) => {
                      const isMe = dm.senderId === currentUserId;
                      return (
                        <div key={dm.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}>
                          <div className="flex items-center space-x-1 px-1 text-[9px] text-slate-500">
                            <span>{dm.time}</span>
                            {isMe && (
                              <span>
                                {dm.status === 'read' ? (
                                  <CheckCheck className="w-3 h-3 text-sky-400 inline" />
                                ) : dm.status === 'delivered' ? (
                                  <CheckCheck className="w-3 h-3 text-slate-400 inline" />
                                ) : (
                                  <Check className="w-3 h-3 text-slate-500 inline" />
                                )}
                              </span>
                            )}
                          </div>
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-md ${
                              isMe
                                ? 'bg-sky-600 text-white rounded-br-none'
                                : 'bg-slate-900 text-slate-100 rounded-bl-none border border-slate-800'
                            }`}
                          >
                            {dm.text}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs space-y-2 p-6">
                  <MessageSquare className="w-10 h-10 text-slate-700" />
                  <p>Pilih teman di sebelah kiri untuk memulai Chat Pribadi.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODE 3: BOT GAME SIMULATOR */}
        {chatMode === 'bot' && (
          <div className="flex-1 flex flex-col bg-slate-950/80 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}>
                  <div className="flex items-center space-x-2 px-1">
                    <span className="text-[10px] text-slate-400">{isUser ? msg.senderName : botProfile.name}</span>
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed shadow-lg ${
                      isUser
                        ? 'bg-sky-600 text-white rounded-br-none'
                        : 'bg-slate-900 text-slate-100 rounded-bl-none border border-slate-800'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}

            {/* TYPING INDICATOR BUBBLE */}
            {typingStatus && typingStatus.active && (
              <div className="flex flex-col items-start space-y-1 animate-fadeIn">
                <div className="flex items-center space-x-2 px-1">
                  <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    {botProfile.name}
                  </span>
                </div>
                <div className="bg-slate-900 border border-slate-800 text-slate-300 rounded-2xl rounded-bl-none px-4 py-2.5 text-sm shadow-lg flex items-center space-x-2">
                  <span>{typingStatus.text}</span>
                  <span className="inline-flex items-center text-sky-400 font-bold text-base tracking-widest animate-pulse">
                    {typingStatus.dots || '...'}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

      </div>

      {/* QUICK COMMAND BAR */}
      <div className="bg-slate-900/90 border-t border-slate-800/80 px-3 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none z-10">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" /> Quick:
        </span>
        {[
          { label: '.tebakkata', cmd: '.tebakkata', color: 'hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-300' },
          { label: '.hint', cmd: '.hint', color: 'hover:border-amber-500/50 hover:bg-amber-500/10 text-amber-300' },
          { label: '.nyerah', cmd: '.nyerah', color: 'hover:border-rose-500/50 hover:bg-rose-500/10 text-rose-300' },
          { label: '.coin', cmd: '.coin', color: 'hover:border-sky-500/50 hover:bg-sky-500/10 text-sky-300' },
          { label: '.leaderboard', cmd: '.leaderboard', color: 'hover:border-purple-500/50 hover:bg-purple-500/10 text-purple-300' },
        ].map((item) => (
          <button
            key={item.cmd}
            type="button"
            onClick={() => handleQuickCommand(item.cmd)}
            className={`px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-bold transition-all shadow-sm whitespace-nowrap active:scale-95 ${item.color}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* INPUT FORM */}
      <form onSubmit={handleSubmit} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center space-x-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            chatMode === 'global'
              ? 'Ketik pesan global atau ketik .duel untuk tanding...'
              : chatMode === 'friends'
              ? selectedFriend
                ? `Ketik pesan ke ${selectedFriend.username}...`
                : 'Pilih teman terlebih dahulu...'
              : 'Ketik jawaban / command...'
          }
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all"
        />

        <button
          type="submit"
          className="bg-sky-600 hover:bg-sky-500 text-white p-2.5 rounded-xl transition-all shadow-md flex items-center justify-center flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* ADD FRIEND MODAL */}
      {showAddFriendModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-sky-400" />
              <span>Tambah Teman Baru</span>
            </h3>
            <input
              type="text"
              value={newFriendName}
              onChange={(e) => setNewFriendName(e.target.value)}
              placeholder="Masukkan Username Trainer..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowAddFriendModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleAddFriend}
                className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
