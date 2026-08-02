/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
import { AudioPlayerProvider } from './context/AudioPlayerContext';
import { FpsProvider } from './context/FpsContext';
import { MediaNotificationOverlay } from './components/MediaNotificationOverlay';
import { StateSyncService } from './services/StateSyncService';
import { RealtimeService } from './services/SupabaseService';
import { LoginModal } from './components/LoginModal';
import { ProfileView } from './components/ProfileView';
import { DeveloperPanelView } from './components/DeveloperPanelView';
import { ServiceView } from './components/ServiceView';
import { ShopView } from './components/ShopView';
import { RunningMarquee } from './components/RunningMarquee';
import { BackgroundMusicPlayer } from './components/BackgroundMusicPlayer';
import { NobarView } from './components/nobar/NobarView';
import { InitialLaunchLoadingScreen } from './components/InitialLaunchLoadingScreen';
import { VideoDownloadIndicator } from './components/VideoDownloadIndicator';
import { UmaMusumeTapEffect } from './components/UmaMusumeTapEffect';

const DEFAULT_CHAT_ID = 'chat_default';

function AppContent() {
  const { profile, isLoggedIn, updateStats } = useProfile();
  const [activeTab, setActiveTab] = useState<HeaderTab>('chat');
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [userCoins, setUserCoins] = useState<number>(0);
  const [userName, setUserName] = useState<string>('Trainer Sensei');
  const [userWinStreak, setUserWinStreak] = useState<number>(0);
  const [activeSession, setActiveSession] = useState<GameSession | undefined>(undefined);
  const [activeSessionCount, setActiveSessionCount] = useState<number>(0);

  // Determine if splash should run (only on standalone launch, not inside AI Studio iframe preview / dev hot-reload)
  const [splashKey, setSplashKey] = useState<number>(0);
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isIframe = window.self !== window.top;
    const isAlreadyDone = sessionStorage.getItem('app_initial_splash_done') === 'true';
    return !isIframe && !isAlreadyDone;
  });

  const lastTapRef = useRef<number>(0);

  const triggerTestSplash = () => {
    setSplashKey((prev) => prev + 1);
    setShowSplash(true);
  };

  const handleDoubleTapOrClick = () => {
    triggerTestSplash();
  };

  const handleTouchStart = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      triggerTestSplash();
    }
    lastTapRef.current = now;
  };

  const isDev = Boolean((import.meta as any).env?.DEV) || (typeof window !== 'undefined' && (window.location.hostname.includes('dev') || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));

  // Initialize initial welcome message
  useEffect(() => {
    const initialUser = userDb.getCurrentUser();
    setUserCoins(initialUser.carrotCoins);
    setUserName(initialUser.username || 'Trainer Sensei');

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

  // Keep name synced with profile and register StateSyncService listener
  useEffect(() => {
    if (profile) {
      setUserName(profile.username);
      const isDev = profile.role === 'Developer' || profile.username.toLowerCase() === 'shiro anna';
      setUserCoins(isDev ? 999999999 : profile.coins);
      userDb.getUser(profile.id, profile.username);
    }

    const handleStatsSync = (data: any) => {
      const activeId = profile?.id || userDb.getCurrentUser().id;
      const activeName = profile?.username || userName;
      if (data && (data.id === activeId || (data.username && data.username.toLowerCase() === activeName.toLowerCase()))) {
        const isDev = profile?.role === 'Developer' || profile?.username?.toLowerCase() === 'shiro anna';
        const finalCoins = isDev ? 999999999 : (data.coins !== undefined ? data.coins : (data.carrotCoins !== undefined ? data.carrotCoins : userCoins));
        setUserCoins(finalCoins);
        if (data.winStreak !== undefined) {
          setUserWinStreak(data.winStreak);
        }
      }
    };

    const unsubSync = StateSyncService.on('user_stats_updated', handleStatsSync);
    const unsubRealtimeStats = RealtimeService.subscribe('user_stats_updated', handleStatsSync);

    return () => {
      unsubSync();
      unsubRealtimeStats();
    };
  }, [profile]);

  // Sync state on demand or periodic interval
  const refreshState = () => {
    const activeUserId = profile?.id || userDb.getCurrentUser().id;
    const currentName = profile?.username || 'Trainer Sensei';
    const user = userDb.getUser(activeUserId, currentName);

    const isDev = profile?.role === 'Developer' || profile?.username?.toLowerCase() === 'shiro anna';
    const currentCoins = isDev ? 999999999 : (profile ? profile.coins : user.carrotCoins);
    
    setUserCoins(currentCoins);
    setUserName(currentName);
    setUserWinStreak(user.winStreak || 0);

    const session = gameDb.getSession(DEFAULT_CHAT_ID);
    setActiveSession(session);
    setActiveSessionCount(gameDb.getActiveSessionsCount());
  };

  useEffect(() => {
    refreshState();
    const interval = setInterval(refreshState, 1000);
    return () => clearInterval(interval);
  }, [profile]);

  const handleSendMessage = (text: string) => {
    const activeUserId = profile?.id || userDb.getCurrentUser().id;
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
      activeUserId,
      currentName,
      text,
      userMsg.id
    );

    refreshState();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Top Center Small Circular Download Indicator */}
      <VideoDownloadIndicator />

      {/* Initial App Launch Loading Screen */}
      {showSplash && (
        <InitialLaunchLoadingScreen key={splashKey} onComplete={() => setShowSplash(false)} />
      )}

      {/* Development/Testing Floating Trigger for Loading Screen */}
      {isDev && (
        <div className="fixed bottom-3 right-3 z-[9999] flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
          <button
            type="button"
            onDoubleClick={handleDoubleTapOrClick}
            onTouchStart={handleTouchStart}
            title="Tekan 2x (Double-Tap) untuk mencoba Loading Screen"
            className="px-2.5 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-700/80 shadow-xl text-[10px] sm:text-xs font-mono flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all select-none backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>🧪 Test Loading (Double-Tap)</span>
          </button>
        </div>
      )}

      {/* Standalone Background Music Player (Fixed Top-Left Corner) */}
      <BackgroundMusicPlayer isAppLoading={showSplash} />

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

        {activeTab === 'nobar' && <NobarView />}

        {activeTab === 'play' && <MusicPlayViewer />}

        {activeTab === 'shop' && <ShopView />}

        {activeTab === 'service' && <ServiceView />}

        {activeTab === 'devpanel' && <DeveloperPanelView />}

        {activeTab === 'profile' && <ProfileView />}

        {activeTab === 'database' && <DatabaseViewer />}

        {activeTab === 'queue' && <DataQueueViewer />}

        {activeTab === 'analysis' && <ArchitectureAnalysisModal />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-4 text-center text-xs text-slate-500">
        <p>Oguri Cap • Musume Bot Simulator • Shiro Anna</p>
      </footer>

      {/* Floating Audio Player & Media Notification Overlay (Persistent across all tabs) */}
      <MediaNotificationOverlay />

      {/* Global Uma Musume Tap Effect (Particles & SFX) */}
      <UmaMusumeTapEffect />
    </div>
  );
}

export default function App() {
  return (
    <FpsProvider>
      <ProfileProvider>
        <AudioPlayerProvider>
          <AppContent />
        </AudioPlayerProvider>
      </ProfileProvider>
    </FpsProvider>
  );
}

