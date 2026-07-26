/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BotMessage, GameSession } from './types';
import { userDb } from './database/userDb';
import { gameDb } from './database/gameDb';
import { messageHandler } from './handler/messageHandler';
import { OguriCapHeader, HeaderTab } from './components/OguriCapHeader';
import { ChatSimulator } from './components/ChatSimulator';
import { MusicPlayViewer } from './components/MusicPlayViewer';
import { DatabaseViewer } from './components/DatabaseViewer';
import { DataQueueViewer } from './components/DataQueueViewer';
import { ArchitectureAnalysisModal } from './components/ArchitectureAnalysisModal';
import { ProfileProvider, useProfile } from './context/ProfileContext';
import { LoginModal } from './components/LoginModal';
import { ProfileView } from './components/ProfileView';
import { ShopView } from './components/ShopView';
import { DeveloperPanelView } from './components/DeveloperPanelView';
import { ServiceView } from './components/ServiceView';
import { RunningMarquee } from './components/RunningMarquee';

const DEFAULT_CHAT_ID = 'chat_default';
const CURRENT_USER_ID = 'trainer_01';

function AppContent() {
  const { profile, isLoggedIn, updateStats } = useProfile();
  const [activeTab, setActiveTab] = useState<HeaderTab>('chat');
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [userCoins, setUserCoins] = useState<number>(0);
  const [userName, setUserName] = useState<string>('Trainer Sensei');
  const [userWinStreak, setUserWinStreak] = useState<number>(0);
  const [activeSession, setActiveSession] = useState<GameSession | undefined>(undefined);
  const [activeSessionCount, setActiveSessionCount] = useState<number>(0);

  // Initialize initial welcome message
  useEffect(() => {
    const activeName = profile?.username || 'Trainer Sensei';
    const initialUser = userDb.getUser(CURRENT_USER_ID, activeName);
    setUserCoins(initialUser.carrotCoins);
    setUserName(initialUser.name);

    const welcomeMsg: BotMessage = {
      id: 'msg_welcome',
      chatId: DEFAULT_CHAT_ID,
      sender: 'bot',
      senderName: 'Oguri Cap 🐎',
      text: `[ 🐎 HALO TRAINER! TEBAK KATA OGURI CAP SIAP! ]

Selamat datang di Tracen Academy! Oguri Cap sudah siap diajak bermain Tebak Kata! 🥕

💡 *Fitur Game Tebak Kata:*
• Data dari dataset \`data.json\`, \`data2.json\`, dst.
• Sistem Queue → Random Permanen
• Timer 60 Detik per soal
• Jika jawaban salah → *Bot Diam (Silent)*
• Jika jawaban benar → *Reward 2.999 ~ 4.555 Carrot Coins*

Ketik *.tebakkata* atau klik tombol di bawah untuk memulai!`,
      timestamp: Date.now(),
      theme: 'oguri-cap',
    };

    setMessages([welcomeMsg]);

    // Subscribe to bot message emissions
    const unsubscribe = messageHandler.onMessage((msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      refreshState();
    });

    refreshState();

    return () => {
      unsubscribe();
    };
  }, []);

  // Keep name synced with profile
  useEffect(() => {
    if (profile) {
      setUserName(profile.username);
      setUserCoins(profile.coins);
      userDb.getUser(CURRENT_USER_ID, profile.username);
    }
  }, [profile]);

  // Sync state on demand or periodic interval
  const refreshState = () => {
    const activeUserId = profile?.id || CURRENT_USER_ID;
    const currentName = profile?.username || 'Trainer Sensei';
    const user = userDb.getUser(activeUserId, currentName);

    // Sync the visible state from the game/user database (source of truth)
    const currentCoins = user.carrotCoins ?? user.coin ?? profile?.coins ?? 0;
    const currentTotalGame = user.gamesPlayed ?? user.totalGame ?? profile?.totalGame ?? 0;
    const currentWins = user.gamesWon ?? user.win ?? profile?.win ?? 0;
    const currentLosses = user.lose ?? profile?.lose ?? 0;

    setUserCoins(currentCoins);
    setUserName(currentName);
    setUserWinStreak(user.winStreak || 0);

    // Keep profile context aligned so the header/profile page update immediately.
    if (
      profile &&
      (
        profile.coins !== currentCoins ||
        profile.totalGame !== currentTotalGame ||
        profile.win !== currentWins ||
        profile.lose !== currentLosses
      )
    ) {
      updateStats(currentCoins, currentTotalGame, currentWins, currentLosses);
    }

    const session = gameDb.getSession(DEFAULT_CHAT_ID);
    setActiveSession(session);
    setActiveSessionCount(gameDb.getActiveSessionsCount());
  };

  useEffect(() => {
    refreshState();
    const interval = setInterval(refreshState, 2000);
    return () => clearInterval(interval);
  }, [profile]);

  const handleSendMessage = (text: string) => {
    const currentName = profile?.username || userName;
    const userMsg: BotMessage = {
      id: `msg_user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      chatId: DEFAULT_CHAT_ID,
      sender: 'user',
      senderName: currentName,
      text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);

    // Process via MessageHandler
    messageHandler.handleUserMessage(
      DEFAULT_CHAT_ID,
      CURRENT_USER_ID,
      currentName,
      text,
      userMsg.id
    );

    refreshState();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Login Gate Modal */}
      {!isLoggedIn && <LoginModal />}

      {/* Header */}
      <OguriCapHeader
        userCoins={userCoins}
        userName={profile?.username || userName}
        userWinStreak={userWinStreak}
        activeSessionCount={activeSessionCount}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Global Duel Announcement Marquee */}
      <RunningMarquee />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'chat' && (
          <ChatSimulator
            messages={messages}
            onSendMessage={handleSendMessage}
            activeSession={activeSession}
            userName={profile?.username || userName}
            userCoins={userCoins}
            userWinStreak={userWinStreak}
          />
        )}

        {activeTab === 'play' && <MusicPlayViewer />}

        {activeTab === 'service' && <ServiceView />}

        {activeTab === 'shop' && <ShopView />}

        {activeTab === 'devpanel' && <DeveloperPanelView />}

        {activeTab === 'profile' && <ProfileView />}

        {activeTab === 'database' && <DatabaseViewer />}

        {activeTab === 'queue' && <DataQueueViewer />}

        {activeTab === 'analysis' && <ArchitectureAnalysisModal />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-4 text-center text-xs text-slate-500">
        <p>Oguri Cap • Musume Bot Simulator • Shiro Anna × Gemini × GPT-5.5</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ProfileProvider>
      <AppContent />
    </ProfileProvider>
  );
}

