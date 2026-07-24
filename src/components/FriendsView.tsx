import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Users, MessageSquare, Check, Sparkles, Clock, Compass } from 'lucide-react';
import { AppUser, Friend } from '../types';
import { FriendService } from '../services/FriendService';
import { RoomChatView } from './RoomChatView';
import { BotAvatar } from './BotAvatar';
import { BOT_DEFAULT_AVATAR } from '../config/constants';

export const FriendsView: React.FC = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [recommendations, setRecommendations] = useState<AppUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AppUser[] | null>(null);
  const [activeChatFriend, setActiveChatFriend] = useState<Friend | null>(null);
  const [addedFriendIds, setAddedFriendIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFriendsData();
  }, []);

  const loadFriendsData = () => {
    const friendList = FriendService.getFriends();
    setFriends(friendList);
    setRecommendations(FriendService.getRecommendations(50));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const results = FriendService.searchUsers(searchQuery);
    setSearchResults(results);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults(null);
    } else {
      const results = FriendService.searchUsers(val);
      setSearchResults(results);
    }
  };

  const handleAddFriend = (user: AppUser) => {
    FriendService.addFriend(user);
    setAddedFriendIds((prev) => new Set(prev).add(user.id));
    loadFriendsData();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Online':
        return <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>Online</span>;
      case 'Away':
        return <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium"><span className="w-2 h-2 rounded-full bg-amber-400"></span>Away</span>;
      case 'Busy':
        return <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-medium"><span className="w-2 h-2 rounded-full bg-rose-400"></span>Busy</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium"><span className="w-2 h-2 rounded-full bg-slate-500"></span>Offline</span>;
    }
  };

  // If a chat room is open with a friend
  if (activeChatFriend) {
    return (
      <RoomChatView
        friend={activeChatFriend}
        onBack={() => {
          setActiveChatFriend(null);
          loadFriendsData();
        }}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-1 sm:p-2 animate-fadeIn">
      {/* Search Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
                  Teman & Chat
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Cari sesama Trainer Umamusume dan mulai percakapan seru!
                </p>
              </div>
            </div>
            
            <div className="hidden sm:block text-right">
              <span className="text-2xl font-black text-sky-400">{friends.length}</span>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">Total Teman</p>
            </div>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchInputChange}
                placeholder="Cari nama teman..."
                className="w-full bg-slate-950/90 border border-slate-800 focus:border-sky-500 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-medium px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-sky-500/20 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Teman</span>
            </button>
          </form>
        </div>
      </div>

      {/* Search Results Section */}
      {searchResults !== null && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Search className="w-4 h-4 text-sky-400" />
            Hasil Pencarian "{searchQuery}"
          </h3>

          {searchResults.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs sm:text-sm">
              <p className="font-semibold text-slate-300">Tidak ada pengguna ditemukan.</p>
              <p className="text-slate-500 text-xs mt-1">Coba gunakan nama lain seperti Oguri, Rice Shower, atau Gold Ship.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {searchResults.map((user) => {
                const isAlreadyFriend = friends.some((f) => f.id === user.id) || addedFriendIds.has(user.id);
                return (
                  <div
                    key={user.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between shadow hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <BotAvatar
                        src={user.avatar}
                        alt={user.username}
                        className="w-10 h-10 border border-slate-700"
                      />
                      <div className="truncate">
                        <h4 className="font-bold text-slate-200 text-xs sm:text-sm truncate">{user.username}</h4>
                        {getStatusBadge(user.status)}
                      </div>
                    </div>

                    <button
                      onClick={() => !isAlreadyFriend && handleAddFriend(user)}
                      disabled={isAlreadyFriend}
                      className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0 cursor-pointer ${
                        isAlreadyFriend
                          ? 'bg-slate-800 text-slate-400 cursor-default'
                          : 'bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20'
                      }`}
                    >
                      {isAlreadyFriend ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Teman</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Tambah</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Friends List Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-sky-400" />
            Daftar Teman ({friends.length})
          </h3>
          <span className="text-xs text-slate-400">Klik card untuk membuka Room Chat</span>
        </div>

        {friends.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <Users className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">Belum Ada Teman</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tambahkan teman dari daftar rekomendasi di bawah untuk mulai mengobrol!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {friends.map((friend) => (
              <div
                key={friend.id}
                onClick={() => setActiveChatFriend(friend)}
                className="bg-slate-950/90 hover:bg-slate-900 border border-slate-800/90 hover:border-sky-500/40 rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-all duration-200 group shadow-md"
              >
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <div className="relative flex-shrink-0">
                    <BotAvatar
                      src={friend.avatar}
                      alt={friend.username}
                      className="w-11 h-11 border border-slate-700 group-hover:border-sky-400 transition-colors"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-950 z-10 ${
                        friend.status === 'Online'
                          ? 'bg-emerald-400'
                          : friend.status === 'Away'
                          ? 'bg-amber-400'
                          : friend.status === 'Busy'
                          ? 'bg-rose-400'
                          : 'bg-slate-500'
                      }`}
                    ></span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-200 text-sm group-hover:text-sky-300 transition-colors truncate">
                        {friend.username}
                      </h4>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 flex-shrink-0 ml-2">
                        <Clock className="w-3 h-3" />
                        {friend.lastOnline}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 truncate mt-1 group-hover:text-slate-300">
                      {friend.lastMessage}
                    </p>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-all flex-shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Friend Recommendations Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-2">
            <Compass className="w-4 h-4 text-amber-400" />
            <h3 className="text-base font-bold text-slate-100">Rekomendasi Teman</h3>
          </div>
          <span className="text-xs text-sky-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Tracen Academy Users
          </span>
        </div>

        {recommendations.length === 0 ? (
          <p className="text-xs text-slate-500 p-4 text-center">
            Semua pengguna dalam rekomendasi sudah kamu tambahkan menjadi teman!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recommendations.map((rec) => {
              const isAdded = addedFriendIds.has(rec.id);
              return (
                <div
                  key={rec.id}
                  className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 flex items-center justify-between shadow hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <BotAvatar
                      src={rec.avatar}
                      alt={rec.username}
                      className="w-10 h-10 border border-slate-700"
                    />
                    <div className="truncate">
                      <h4 className="font-bold text-slate-200 text-xs sm:text-sm truncate">{rec.username}</h4>
                      {getStatusBadge(rec.status)}
                    </div>
                  </div>

                  <button
                    onClick={() => !isAdded && handleAddFriend(rec)}
                    disabled={isAdded}
                    className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0 cursor-pointer ${
                      isAdded
                        ? 'bg-slate-800 text-slate-400 cursor-default'
                        : 'bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Ditambahkan</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Tambah</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
