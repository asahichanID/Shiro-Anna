import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getD1Database, queryAll, queryOne, executeSql } from './src/database/d1Engine.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Initialize D1 Database Schema
  try {
    await getD1Database();
    console.log('[D1 SERVER] SQLite D1 Database engine successfully initialized.');
  } catch (err) {
    console.error('[D1 SERVER CRITICAL INIT ERROR]:', err);
  }

  // CORS headers for API
  app.use('/api', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // =========================================================================
  // WORKER API ROUTES (/api/v1/*)
  // =========================================================================

  // 1. USERS: Register or Login User
  app.post('/api/v1/users/register-or-login', async (req, res) => {
    try {
      const {
        id: requestedId,
        username,
        role = 'Trainer',
        avatar,
        coins,
        totalGame,
        win,
        lose,
        device = 'Desktop',
        browser = 'Browser',
      } = req.body;

      if (!username || typeof username !== 'string' || !username.trim()) {
        console.error('[D1 USER REGISTRATION/INSERT ERROR]: Username parameter missing or empty.');
        return res.status(400).json({ success: false, message: 'Username is required.' });
      }

      const cleanUsername = username.trim();
      const defaultAvatar = avatar || 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1';
      const now = Date.now();

      // Check if user exists by username or requested id
      let existingUser = await queryOne<any>(
        'SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR id = ?',
        [cleanUsername, requestedId || '']
      );

      if (existingUser) {
        // UPDATE existing user status, avatar, coins, game stats
        const updatedCoins = typeof coins === 'number' ? coins : existingUser.coins;
        const updatedTotalGame = typeof totalGame === 'number' ? totalGame : existingUser.totalGame;
        const updatedWin = typeof win === 'number' ? win : existingUser.win;
        const updatedLose = typeof lose === 'number' ? lose : existingUser.lose;

        await executeSql(
          'UPDATE users SET status = ?, lastSeen = ?, avatar = ?, coins = ?, totalGame = ?, win = ?, lose = ?, device = ?, browser = ?, updated_at = ? WHERE id = ?',
          ['Online', now, defaultAvatar, updatedCoins, updatedTotalGame, updatedWin, updatedLose, device, browser, now, existingUser.id]
        );

        existingUser.status = 'Online';
        existingUser.lastSeen = now;
        existingUser.avatar = defaultAvatar;
        existingUser.coins = updatedCoins;
        existingUser.totalGame = updatedTotalGame;
        existingUser.win = updatedWin;
        existingUser.lose = updatedLose;

        // Ensure user is in presence table
        await executeSql(
          'INSERT OR REPLACE INTO presence (user_id, status, last_active) VALUES (?, ?, ?)',
          [existingUser.id, 'Online', now]
        );

        return res.json({ success: true, result: existingUser });
      } else {
        // INSERT new user
        const isDev = cleanUsername.toLowerCase() === 'shiro anna';
        let userId = requestedId || '#1';

        if (!isDev && (!requestedId || requestedId === '#1')) {
          const countRow = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users');
          const nextNum = (countRow?.count || 1) + 1;
          userId = `#${nextNum}`;
        }

        const initialCoins = typeof coins === 'number' ? coins : 0;
        const initialTotalGame = typeof totalGame === 'number' ? totalGame : 0;
        const initialWin = typeof win === 'number' ? win : 0;
        const initialLose = typeof lose === 'number' ? lose : 0;

        await executeSql(
          `INSERT INTO users (id, username, role, avatar, coins, totalGame, win, lose, status, lastSeen, device, browser, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Online', ?, ?, ?, ?, ?)`,
          [userId, cleanUsername, role, defaultAvatar, initialCoins, initialTotalGame, initialWin, initialLose, now, device, browser, now, now]
        );

        // Ensure presence entry
        await executeSql(
          'INSERT OR REPLACE INTO presence (user_id, status, last_active) VALUES (?, ?, ?)',
          [userId, 'Online', now]
        );

        // Log login activity
        const logId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await executeSql(
          `INSERT INTO activity_logs (id, user_id, user_name, category, type, title, detail, time, timestamp, created_at)
           VALUES (?, ?, ?, 'login', 'Register & Login', ?, ?, ?, ?, ?)`,
          [
            logId,
            userId,
            cleanUsername,
            `User ${cleanUsername} registered and logged in`,
            `Registered new ${role} account (${userId})`,
            new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            now,
            now,
          ]
        );

        const newUser = await queryOne<any>('SELECT * FROM users WHERE id = ?', [userId]);
        return res.json({ success: true, result: newUser });
      }
    } catch (err) {
      console.error('[D1 USER REGISTRATION/INSERT ERROR]: Failed to register or login user:', err);
      return res.status(500).json({ success: false, message: 'Database query failed during user registration.' });
    }
  });

  // 1b. USERS: Update User Full Profile / Coins / Stats
  app.post('/api/v1/users/update', async (req, res) => {
    try {
      const { id, username, role, avatar, coins, totalGame, win, lose, status } = req.body;
      if (!id) {
        return res.status(400).json({ success: false, message: 'User id is required.' });
      }

      const now = Date.now();
      const existing = await queryOne<any>('SELECT * FROM users WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const updatedUsername = username || existing.username;
      const updatedRole = role || existing.role;
      const updatedAvatar = avatar || existing.avatar;
      const updatedCoins = typeof coins === 'number' ? coins : existing.coins;
      const updatedTotalGame = typeof totalGame === 'number' ? totalGame : existing.totalGame;
      const updatedWin = typeof win === 'number' ? win : existing.win;
      const updatedLose = typeof lose === 'number' ? lose : existing.lose;
      const updatedStatus = status || existing.status;

      await executeSql(
        `UPDATE users SET username = ?, role = ?, avatar = ?, coins = ?, totalGame = ?, win = ?, lose = ?, status = ?, updated_at = ? WHERE id = ?`,
        [updatedUsername, updatedRole, updatedAvatar, updatedCoins, updatedTotalGame, updatedWin, updatedLose, updatedStatus, now, id]
      );

      const result = await queryOne<any>('SELECT * FROM users WHERE id = ?', [id]);
      return res.json({ success: true, result });
    } catch (err) {
      console.error('[D1 USER UPDATE ERROR]: Failed to update user:', err);
      return res.status(500).json({ success: false, message: 'Failed to update user in D1.' });
    }
  });

  // 2. USERS: Update Presence Heartbeat
  app.post('/api/v1/users/presence', async (req, res) => {
    try {
      const { userId, status = 'Online', device, browser } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, message: 'userId is required.' });
      }

      const now = Date.now();
      await executeSql('INSERT OR REPLACE INTO presence (user_id, status, last_active) VALUES (?, ?, ?)', [userId, status, now]);
      await executeSql('UPDATE users SET status = ?, lastSeen = ?, updated_at = ? WHERE id = ?', [status, now, now, userId]);

      return res.json({ success: true });
    } catch (err) {
      console.error('[D1 PRESENCE UPDATE ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to update presence.' });
    }
  });

  // 3. USERS: Get All Registered Users
  app.get('/api/v1/users', async (req, res) => {
    try {
      const users = await queryAll<any>(`
        SELECT u.*, p.status as liveStatus, p.last_active as lastActive 
        FROM users u 
        LEFT JOIN presence p ON u.id = p.user_id 
        ORDER BY u.created_at ASC
      `);

      const now = Date.now();
      const formatted = users.map((u) => {
        const isRecentlyActive = u.lastActive && (now - u.lastActive < 35000);
        const resolvedStatus = isRecentlyActive ? (u.liveStatus || 'Online') : (u.status === 'Away' ? 'Away' : 'Offline');

        return {
          id: u.id,
          username: u.username,
          name: u.username,
          role: u.role || 'Trainer',
          avatar: u.avatar || 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
          status: resolvedStatus,
          coin: u.coins !== undefined ? u.coins : 0,
          carrotCoins: u.coins !== undefined ? u.coins : 0,
          level: u.role === 'Developer' ? 100 : 1,
          totalGame: u.totalGame || 0,
          gamesPlayed: u.totalGame || 0,
          win: u.win || 0,
          gamesWon: u.win || 0,
          lose: u.lose || 0,
          winStreak: 0,
          maxWinStreak: 0,
          createdAt: new Date(u.created_at || Date.now()).toLocaleDateString('id-ID'),
          lastOnline: resolvedStatus,
          lastMessage: 'Halo Trainer!',
          friends: [],
        };
      });

      return res.json({ success: true, result: formatted });
    } catch (err) {
      console.error('[D1 SELECT USERS ERROR]: Failed to fetch users:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch users from D1.' });
    }
  });

  // 4. FRIENDS: Get Friends List
  app.get('/api/v1/friends', async (req, res) => {
    try {
      const userId = (req.query.userId as string) || '#1';

      // 1. Explicit friends from friends table
      const explicitFriends = await queryAll<any>('SELECT * FROM friends WHERE user_id = ?', [userId]);

      // 2. All registered users from users table (except current user)
      const allUsers = await queryAll<any>('SELECT * FROM users WHERE id != ?', [userId]);

      const friendMap = new Map();

      // Developer Shiro Anna always pinned at top
      friendMap.set('#1', {
        id: '#1',
        username: 'Shiro Anna',
        avatar: 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
        status: 'Online',
        lastMessage: 'Salam dari Lead Developer Tracen Academy! 🐎⚡',
        lastOnline: 'Online Sekarang',
        bio: 'Lead Developer & Creator of Oguri Cap Bot',
        role: 'Developer',
        isOnline: true,
      });

      // Add explicit friends
      explicitFriends.forEach((f) => {
        friendMap.set(f.friend_id, {
          id: f.friend_id,
          username: f.username,
          avatar: f.avatar || 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
          status: f.status || 'Online',
          lastMessage: f.bio || 'Halo! Mari berteman!',
          lastOnline: 'Baru saja',
          bio: f.bio || 'Trainer Tracen Academy',
          role: f.role || 'Trainer',
          isOnline: f.isOnline === 1 || f.status === 'Online',
        });
      });

      // Add registered users as discoverable friends
      allUsers.forEach((u) => {
        if (!friendMap.has(u.id)) {
          friendMap.set(u.id, {
            id: u.id,
            username: u.username,
            avatar: u.avatar || 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
            status: u.status || 'Online',
            lastMessage: `Trainer ${u.username} terdaftar di D1 Tracen Academy`,
            lastOnline: 'Baru saja',
            bio: `Registered Trainer (${u.role || 'Trainer'})`,
            role: u.role || 'Trainer',
            isOnline: u.status === 'Online',
          });
        }
      });

      const friendsList = Array.from(friendMap.values());
      return res.json({ success: true, result: friendsList });
    } catch (err) {
      console.error('[D1 SELECT FRIENDS ERROR]: Failed to fetch friends:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch friends from D1.' });
    }
  });

  // 5. FRIENDS: Add Friend
  app.post('/api/v1/friends', async (req, res) => {
    try {
      const { userId = '#1', friend } = req.body;
      if (!friend || !friend.id) {
        return res.status(400).json({ success: false, message: 'Friend data is missing.' });
      }

      const id = `fr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = Date.now();

      await executeSql(
        `INSERT OR REPLACE INTO friends (id, user_id, friend_id, username, avatar, bio, status, role, isOnline, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          userId,
          friend.id,
          friend.username || 'Trainer Musume',
          friend.avatar || 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
          friend.bio || 'Trainer Tracen Academy',
          friend.status || 'Online',
          friend.role || 'Trainer',
          friend.isOnline ? 1 : 0,
          now,
          now,
        ]
      );

      return res.json({ success: true, result: friend });
    } catch (err) {
      console.error('[D1 INSERT FRIEND ERROR]: Failed to insert friend:', err);
      return res.status(500).json({ success: false, message: 'Failed to add friend in D1.' });
    }
  });

  // 6. FRIENDS: Remove Friend
  app.post('/api/v1/friends/remove', async (req, res) => {
    try {
      const { userId, friendId } = req.body;
      if (friendId === '#1') {
        return res.json({ success: true });
      }

      await executeSql('DELETE FROM friends WHERE user_id = ? AND friend_id = ?', [userId, friendId]);
      return res.json({ success: true });
    } catch (err) {
      console.error('[D1 DELETE FRIEND ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to remove friend.' });
    }
  });

  // 7. GLOBAL CHAT: Get Messages
  app.get('/api/v1/global-chat', async (req, res) => {
    try {
      const since = req.query.since ? parseInt(req.query.since as string, 10) : 0;
      let sql = 'SELECT * FROM global_messages';
      const params: any[] = [];

      if (since > 0) {
        sql += ' WHERE timestamp > ?';
        params.push(since);
      }

      sql += ' ORDER BY timestamp ASC LIMIT 100';

      const messages = await queryAll<any>(sql, params);
      const formatted = messages.map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        senderName: m.sender_name,
        senderRole: m.sender_role || 'Trainer',
        senderAvatar: m.sender_avatar || 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
        text: m.text,
        isDuelAnswer: m.is_duel_answer === 1,
        time: m.time,
        timestamp: m.timestamp,
      }));

      return res.json({ success: true, result: formatted });
    } catch (err) {
      console.error('[D1 SELECT GLOBAL CHAT ERROR]: Failed to fetch global messages:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch global chat from D1.' });
    }
  });

  // 8. GLOBAL CHAT: Send Message
  app.post('/api/v1/global-chat', async (req, res) => {
    try {
      const { id, senderId, senderName, senderRole = 'Trainer', senderAvatar, text, isDuelAnswer, time, timestamp } = req.body;

      if (!text || !senderId) {
        console.error('[D1 CHAT INSERT ERROR]: Missing required fields for global chat message.');
        return res.status(400).json({ success: false, message: 'senderId and text are required.' });
      }

      const msgId = id || `gmsg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = timestamp || Date.now();
      const timeStr = time || new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      await executeSql(
        `INSERT INTO global_messages (id, sender_id, sender_name, sender_role, sender_avatar, text, is_duel_answer, time, timestamp, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          msgId,
          senderId,
          senderName || 'Trainer',
          senderRole,
          senderAvatar || 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
          text,
          isDuelAnswer ? 1 : 0,
          timeStr,
          now,
          now,
        ]
      );

      const inserted = {
        id: msgId,
        senderId,
        senderName: senderName || 'Trainer',
        senderRole,
        senderAvatar: senderAvatar || 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
        text,
        isDuelAnswer: !!isDuelAnswer,
        time: timeStr,
        timestamp: now,
      };

      return res.json({ success: true, result: inserted });
    } catch (err) {
      console.error('[D1 CHAT INSERT ERROR]: Failed to insert global chat message:', err);
      return res.status(500).json({ success: false, message: 'Failed to save global chat message in D1.' });
    }
  });

  // 9. DIRECT CHAT: Get Room Messages
  app.get('/api/v1/chat', async (req, res) => {
    try {
      const roomId = (req.query.roomId as string) || 'chat_default';
      const messages = await queryAll<any>('SELECT * FROM messages WHERE room_id = ? ORDER BY timestamp ASC LIMIT 100', [roomId]);

      const formatted = messages.map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        receiverId: m.receiver_id,
        text: m.text,
        time: m.time,
        timestamp: m.timestamp,
        status: m.status || 'sent',
        isRead: m.is_read === 1,
      }));

      return res.json({ success: true, result: formatted });
    } catch (err) {
      console.error('[D1 SELECT DIRECT CHAT ERROR]: Failed to fetch room messages:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch room messages from D1.' });
    }
  });

  // 10. DIRECT CHAT: Send Message
  app.post('/api/v1/chat', async (req, res) => {
    try {
      const { id, roomId, senderId, receiverId, text, time, timestamp } = req.body;
      if (!roomId || !senderId || !text) {
        console.error('[D1 CHAT INSERT ERROR]: Direct message missing required parameters.');
        return res.status(400).json({ success: false, message: 'roomId, senderId, and text are required.' });
      }

      const msgId = id || `dm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = timestamp || Date.now();
      const timeStr = time || new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      await executeSql(
        `INSERT INTO messages (id, room_id, sender_id, receiver_id, text, time, timestamp, status, is_read, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'sent', 0, ?, ?)`,
        [msgId, roomId, senderId, receiverId || '', text, timeStr, now, now, now]
      );

      const inserted = {
        id: msgId,
        senderId,
        receiverId: receiverId || '',
        text,
        time: timeStr,
        timestamp: now,
        status: 'sent',
        isRead: false,
      };

      return res.json({ success: true, result: inserted });
    } catch (err) {
      console.error('[D1 CHAT INSERT ERROR]: Failed to insert direct chat message:', err);
      return res.status(500).json({ success: false, message: 'Failed to save direct message in D1.' });
    }
  });

  // 11. DIRECT CHAT: Mark Read
  app.post('/api/v1/chat/read', async (req, res) => {
    try {
      const { roomId, userId } = req.body;
      await executeSql('UPDATE messages SET is_read = 1, status = "read" WHERE room_id = ? AND receiver_id = ?', [roomId, userId]);
      return res.json({ success: true });
    } catch (err) {
      console.error('[D1 CHAT UPDATE READ ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to mark messages read.' });
    }
  });

  // 12. ACTIVITY LOGS: Get History
  app.get('/api/v1/activity', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const logs = await queryAll<any>('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT ?', [limit]);

      const formatted = logs.map((l) => ({
        id: l.id,
        userId: l.user_id,
        userName: l.user_name,
        category: l.category,
        type: l.type,
        title: l.title,
        detail: l.detail,
        time: l.time,
        timestamp: l.timestamp,
      }));

      return res.json({ success: true, result: formatted });
    } catch (err) {
      console.error('[D1 SELECT ACTIVITY LOGS ERROR]: Failed to fetch activity logs:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch activity logs from D1.' });
    }
  });

  // 13. ACTIVITY LOGS: Log New Activity
  app.post('/api/v1/activity', async (req, res) => {
    try {
      const { id, userId, userName, category, type, title, detail, time, timestamp } = req.body;

      if (!title || !category) {
        console.error('[D1 ACTIVITY LOG INSERT ERROR]: Title and category are required.');
        return res.status(400).json({ success: false, message: 'Title and category required.' });
      }

      const logId = id || `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = timestamp || Date.now();
      const timeStr = time || new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      await executeSql(
        `INSERT INTO activity_logs (id, user_id, user_name, category, type, title, detail, time, timestamp, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [logId, userId || '#1', userName || 'Shiro Anna', category, type || category, title, detail || title, timeStr, now, now]
      );

      const inserted = {
        id: logId,
        userId: userId || '#1',
        userName: userName || 'Shiro Anna',
        category,
        type: type || category,
        title,
        detail: detail || title,
        time: timeStr,
        timestamp: now,
      };

      return res.json({ success: true, result: inserted });
    } catch (err) {
      console.error('[D1 ACTIVITY LOG INSERT ERROR]: Failed to save activity log:', err);
      return res.status(500).json({ success: false, message: 'Failed to insert activity log in D1.' });
    }
  });

  // 14. DEVELOPER SETTINGS: Get Settings
  app.get('/api/v1/settings', async (req, res) => {
    try {
      const rows = await queryAll<{ setting_key: string; setting_value: string }>('SELECT setting_key, setting_value FROM developer_settings');
      const settingsMap: Record<string, string> = {};

      rows.forEach((r) => {
        settingsMap[r.setting_key] = r.setting_value;
      });

      return res.json({ success: true, result: settingsMap });
    } catch (err) {
      console.error('[D1 SELECT DEVELOPER SETTINGS ERROR]: Failed to load developer settings:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch developer settings from D1.' });
    }
  });

  // 15. DEVELOPER SETTINGS: Update Settings
  app.post('/api/v1/settings', async (req, res) => {
    try {
      const settings = req.body;
      const keyMap: Record<string, string> = {
        globalChatEnabled: 'global_chat_enabled',
        liveDuelEnabled: 'live_duel_enabled',
        autoDuelEnabled: 'auto_duel_enabled',
        shopEnabled: 'shop_enabled',
        minStreakBanner: 'min_streak_banner',
        minStreakMarquee: 'min_streak_marquee',
        maxPollingMs: 'max_polling_ms',
        duelRewardCoins: 'duel_reward_coins',
        duelCooldownSec: 'duel_cooldown_sec',
      };

      for (const [prop, value] of Object.entries(settings)) {
        const dbKey = keyMap[prop] || prop;
        const valStr = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);

        await executeSql(
          `INSERT INTO developer_settings (id, setting_key, setting_value, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at`,
          [`ds_${dbKey}`, dbKey, valStr, Date.now()]
        );
      }

      return res.json({ success: true });
    } catch (err) {
      console.error('[D1 UPDATE DEVELOPER SETTINGS ERROR]: Failed to update settings:', err);
      return res.status(500).json({ success: false, message: 'Failed to update developer settings in D1.' });
    }
  });

  // 16. LIVE DUEL: Active Duel
  app.get('/api/v1/duel/active', async (req, res) => {
    try {
      const activeDuel = await queryOne<any>('SELECT * FROM duel ORDER BY updated_at DESC LIMIT 1');
      if (!activeDuel) {
        return res.json({ success: true, result: null });
      }

      const formatted = {
        id: activeDuel.id,
        status: activeDuel.status,
        player1: {
          id: activeDuel.challenger_id,
          name: activeDuel.challenger_name,
          score: activeDuel.score_p1 || 0,
        },
        player2: {
          id: activeDuel.opponent_id,
          name: activeDuel.opponent_name,
          score: activeDuel.score_p2 || 0,
        },
        currentRound: activeDuel.current_round || 1,
        totalRounds: activeDuel.total_rounds || 3,
        question: activeDuel.current_question ? JSON.parse(activeDuel.current_question) : undefined,
        winnerId: activeDuel.winner_id,
        updatedAt: activeDuel.updated_at,
      };

      return res.json({ success: true, result: formatted });
    } catch (err) {
      console.error('[D1 SELECT DUEL ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch active duel.' });
    }
  });

  // 16b. LIVE DUEL: Start Duel
  app.post('/api/v1/duel/start', async (req, res) => {
    try {
      const { id, player1, player2, currentRound = 1, totalRounds = 3, question } = req.body;
      const duelId = id || `duel_${Date.now()}`;
      const now = Date.now();

      await executeSql(
        `INSERT OR REPLACE INTO duel (id, status, challenger_id, challenger_name, opponent_id, opponent_name, current_round, total_rounds, score_p1, score_p2, current_question, updated_at)
         VALUES (?, 'countdown', ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
        [
          duelId,
          player1?.id || '#1',
          player1?.name || 'Challenger',
          player2?.id || '#2',
          player2?.name || 'Opponent',
          currentRound,
          totalRounds,
          question ? JSON.stringify(question) : null,
          now,
        ]
      );

      const activeDuel = await queryOne<any>('SELECT * FROM duel WHERE id = ?', [duelId]);
      const formatted = {
        id: activeDuel.id,
        status: activeDuel.status,
        player1: { id: activeDuel.challenger_id, name: activeDuel.challenger_name, score: activeDuel.score_p1 || 0 },
        player2: { id: activeDuel.opponent_id, name: activeDuel.opponent_name, score: activeDuel.score_p2 || 0 },
        currentRound: activeDuel.current_round,
        totalRounds: activeDuel.total_rounds,
        question: activeDuel.current_question ? JSON.parse(activeDuel.current_question) : undefined,
        updatedAt: activeDuel.updated_at,
      };

      return res.json({ success: true, result: formatted });
    } catch (err) {
      console.error('[D1 START DUEL ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to start duel.' });
    }
  });

  // 16c. LIVE DUEL: Update Duel
  app.post('/api/v1/duel/update', async (req, res) => {
    try {
      const { id, status, player1, player2, currentRound, totalRounds, question, winnerId } = req.body;
      if (!id) {
        return res.status(400).json({ success: false, message: 'Duel id is required.' });
      }

      const now = Date.now();
      await executeSql(
        `UPDATE duel SET status = COALESCE(?, status), score_p1 = COALESCE(?, score_p1), score_p2 = COALESCE(?, score_p2),
         current_round = COALESCE(?, current_round), total_rounds = COALESCE(?, total_rounds), current_question = COALESCE(?, current_question),
         winner_id = COALESCE(?, winner_id), updated_at = ? WHERE id = ?`,
        [
          status || null,
          player1?.score !== undefined ? player1.score : null,
          player2?.score !== undefined ? player2.score : null,
          currentRound || null,
          totalRounds || null,
          question ? JSON.stringify(question) : null,
          winnerId || null,
          now,
          id,
        ]
      );

      const activeDuel = await queryOne<any>('SELECT * FROM duel WHERE id = ?', [id]);
      if (!activeDuel) return res.json({ success: true, result: null });

      const formatted = {
        id: activeDuel.id,
        status: activeDuel.status,
        player1: { id: activeDuel.challenger_id, name: activeDuel.challenger_name, score: activeDuel.score_p1 || 0 },
        player2: { id: activeDuel.opponent_id, name: activeDuel.opponent_name, score: activeDuel.score_p2 || 0 },
        currentRound: activeDuel.current_round,
        totalRounds: activeDuel.total_rounds,
        question: activeDuel.current_question ? JSON.parse(activeDuel.current_question) : undefined,
        winnerId: activeDuel.winner_id,
        updatedAt: activeDuel.updated_at,
      };

      return res.json({ success: true, result: formatted });
    } catch (err) {
      console.error('[D1 UPDATE DUEL ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to update duel.' });
    }
  });

  // 16d. LIVE DUEL: Submit Answer
  app.post('/api/v1/duel/answer', async (req, res) => {
    try {
      const { duelId, playerId, playerName, answer } = req.body;
      const activeDuel = await queryOne<any>('SELECT * FROM duel WHERE id = ?', [duelId]);
      if (!activeDuel) return res.status(404).json({ success: false, message: 'Duel not found.' });

      const currentQ = activeDuel.current_question ? JSON.parse(activeDuel.current_question) : null;
      let isCorrect = false;

      if (currentQ && currentQ.answer && answer) {
        isCorrect = currentQ.answer.trim().toLowerCase() === answer.trim().toLowerCase();
      }

      if (isCorrect) {
        if (playerId === activeDuel.challenger_id) {
          activeDuel.score_p1 = (activeDuel.score_p1 || 0) + 1;
        } else if (playerId === activeDuel.opponent_id) {
          activeDuel.score_p2 = (activeDuel.score_p2 || 0) + 1;
        }
        activeDuel.status = 'answer_correct';
        activeDuel.updated_at = Date.now();

        await executeSql('UPDATE duel SET score_p1 = ?, score_p2 = ?, status = ?, updated_at = ? WHERE id = ?', [
          activeDuel.score_p1,
          activeDuel.score_p2,
          activeDuel.status,
          activeDuel.updated_at,
          duelId,
        ]);
      }

      const formatted = {
        id: activeDuel.id,
        status: activeDuel.status,
        player1: { id: activeDuel.challenger_id, name: activeDuel.challenger_name, score: activeDuel.score_p1 || 0 },
        player2: { id: activeDuel.opponent_id, name: activeDuel.opponent_name, score: activeDuel.score_p2 || 0 },
        currentRound: activeDuel.current_round,
        totalRounds: activeDuel.total_rounds,
        question: currentQ,
        winnerId: activeDuel.winner_id,
        updatedAt: activeDuel.updated_at,
      };

      return res.json({ success: true, result: { isCorrect, updatedDuel: formatted } });
    } catch (err) {
      console.error('[D1 DUEL ANSWER ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to submit duel answer.' });
    }
  });

  // 16e. NOTIFICATIONS
  app.get('/api/v1/notifications', async (req, res) => {
    try {
      const userId = (req.query.userId as string) || '#1';
      const notifications = await queryAll<any>('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [userId]);
      return res.json({ success: true, result: notifications });
    } catch (err) {
      console.error('[D1 NOTIFICATIONS GET ERROR]:', err);
      return res.json({ success: true, result: [] });
    }
  });

  app.post('/api/v1/notifications', async (req, res) => {
    try {
      const { userId = '#1', title, body, type = 'system' } = req.body;
      const id = `notif_${Date.now()}`;
      await executeSql('INSERT INTO notifications (id, user_id, title, body, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)', [
        id,
        userId,
        title,
        body,
        type,
        Date.now(),
      ]);
      return res.json({ success: true });
    } catch (err) {
      console.error('[D1 NOTIFICATIONS POST ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to create notification.' });
    }
  });

  // 16f. MIGRATE
  app.post('/api/v1/migrate', async (req, res) => {
    return res.json({ success: true });
  });

  // 17. BOT PROFILE
  app.get('/api/v1/profile', async (req, res) => {
    try {
      const profile = await queryOne<any>('SELECT * FROM bot_profile WHERE id = "default"');
      return res.json({ success: true, result: profile });
    } catch (err) {
      console.error('[D1 SELECT BOT PROFILE ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch bot profile.' });
    }
  });

  app.post('/api/v1/profile', async (req, res) => {
    try {
      const { name, avatar, bio, status } = req.body;
      const now = Date.now();
      await executeSql(
        `INSERT OR REPLACE INTO bot_profile (id, name, avatar, bio, status, updated_at)
         VALUES ('default', ?, ?, ?, ?, ?)`,
        [
          name || 'Oguri Cap 🐎',
          avatar || 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
          bio || 'Siap membantu Trainer dalam Tebak Kata & Musik Tracen Academy! 🥕',
          status || 'Online',
          now,
        ]
      );
      const updated = await queryOne<any>('SELECT * FROM bot_profile WHERE id = "default"');
      return res.json({ success: true, result: updated });
    } catch (err) {
      console.error('[D1 UPDATE BOT PROFILE ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to update bot profile.' });
    }
  });

  // 18. DEVELOPER BADGE
  app.get('/api/v1/badge', async (req, res) => {
    try {
      const badge = await queryOne<any>('SELECT * FROM developer_badge WHERE id = "dev_badge_main"');
      if (!badge) return res.json({ success: true, result: null });

      return res.json({
        success: true,
        result: {
          id: badge.id,
          userId: badge.user_id,
          badgeName: badge.badge_name,
          themeId: badge.theme_id,
          icon: badge.icon,
          effect: badge.effect,
          updatedAt: badge.updated_at,
        },
      });
    } catch (err) {
      console.error('[D1 SELECT BADGE ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch developer badge.' });
    }
  });

  app.post('/api/v1/badge', async (req, res) => {
    try {
      const { userId = '#1', badgeName, themeId, icon, effect } = req.body;
      const now = Date.now();
      await executeSql(
        `INSERT OR REPLACE INTO developer_badge (id, user_id, badge_name, theme_id, icon, effect, updated_at)
         VALUES ('dev_badge_main', ?, ?, ?, ?, ?, ?)`,
        [userId, badgeName || 'Ruby Developer', themeId || 'ruby', icon || '🔥', effect || 'Shine & Glow', now]
      );

      return res.json({
        success: true,
        result: {
          id: 'dev_badge_main',
          userId,
          badgeName: badgeName || 'Ruby Developer',
          themeId: themeId || 'ruby',
          icon: icon || '🔥',
          effect: effect || 'Shine & Glow',
          updatedAt: now,
        },
      });
    } catch (err) {
      console.error('[D1 UPDATE BADGE ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to update developer badge.' });
    }
  });

  // ================= SHOP & COIN HISTORY API ROUTES ================= //

  // 1. Get Shop Products
  app.get('/api/v1/shop/products', async (req, res) => {
    try {
      const products = await queryAll<any>('SELECT * FROM shop_products ORDER BY sort_order ASC, created_at ASC');
      return res.json({ success: true, result: products });
    } catch (err) {
      console.error('[GET SHOP PRODUCTS ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch shop products.' });
    }
  });

  // 2. Save / Update Product
  app.post('/api/v1/shop/products/save', async (req, res) => {
    try {
      const { id, name, description, duration, coins, stock, is_active, sort_order } = req.body;
      const now = Date.now();
      const prodId = id || `prod_${now}_${Math.random().toString(36).substring(2, 6)}`;
      const numCoins = typeof coins === 'number' ? coins : parseInt(coins, 10) || 0;
      const numStock = typeof stock === 'number' ? stock : parseInt(stock, 10) || 0;
      const active = is_active === 0 || is_active === false || is_active === '0' ? 0 : 1;
      const order = typeof sort_order === 'number' ? sort_order : parseInt(sort_order, 10) || 1;

      const existing = await queryOne<any>('SELECT * FROM shop_products WHERE id = ?', [prodId]);
      if (existing) {
        await executeSql(
          `UPDATE shop_products SET name = ?, description = ?, duration = ?, coins = ?, stock = ?, is_active = ?, sort_order = ?, updated_at = ? WHERE id = ?`,
          [name, description || '', duration || '1 Hari', numCoins, numStock, active, order, now, prodId]
        );
      } else {
        await executeSql(
          `INSERT INTO shop_products (id, name, description, duration, coins, stock, is_active, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [prodId, name, description || '', duration || '1 Hari', numCoins, numStock, active, order, now, now]
        );
      }

      const updated = await queryOne<any>('SELECT * FROM shop_products WHERE id = ?', [prodId]);
      return res.json({ success: true, result: updated });
    } catch (err) {
      console.error('[SAVE SHOP PRODUCT ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to save product.' });
    }
  });

  // 3. Delete Product
  app.post('/api/v1/shop/products/delete', async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ success: false, message: 'Product ID required.' });
      await executeSql('DELETE FROM shop_products WHERE id = ?', [id]);
      return res.json({ success: true, message: 'Product deleted.' });
    } catch (err) {
      console.error('[DELETE SHOP PRODUCT ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to delete product.' });
    }
  });

  // 4. Get Shop Settings
  app.get('/api/v1/shop/settings', async (req, res) => {
    try {
      const settings = await queryAll<any>('SELECT setting_key, setting_value FROM developer_settings WHERE setting_key LIKE "shop_%"');
      const configMap: Record<string, string> = {
        shop_enabled: 'true',
        shop_global_max_daily: '100',
        shop_user_max_daily: '1',
        shop_daily_limit_msg: 'Batas penarikan harian telah tercapai. Silakan coba lagi besok.',
        shop_out_of_stock_msg: 'Stok produk ini sedang habis. Silakan tunggu refill stok.',
      };
      settings.forEach((s) => {
        configMap[s.setting_key] = s.setting_value;
      });
      return res.json({ success: true, result: configMap });
    } catch (err) {
      console.error('[GET SHOP SETTINGS ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch shop settings.' });
    }
  });

  // 5. Update Shop Settings
  app.post('/api/v1/shop/settings/update', async (req, res) => {
    try {
      const settingsObj = req.body;
      const now = Date.now();
      for (const [key, value] of Object.entries(settingsObj)) {
        if (key.startsWith('shop_')) {
          const valStr = String(value);
          await executeSql(
            `INSERT INTO developer_settings (id, setting_key, setting_value, updated_at, created_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?, updated_at = ?`,
            [`ds_${key}`, key, valStr, now, now, valStr, now]
          );
        }
      }
      return res.json({ success: true, message: 'Shop settings updated.' });
    } catch (err) {
      console.error('[UPDATE SHOP SETTINGS ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to update shop settings.' });
    }
  });

  // 6. Get Shop Orders
  app.get('/api/v1/shop/orders', async (req, res) => {
    try {
      const userId = req.query.user_id as string;
      let sql = 'SELECT * FROM shop_orders';
      const params: any[] = [];
      if (userId) {
        sql += ' WHERE user_id = ? OR LOWER(user_name) = LOWER(?)';
        params.push(userId, userId);
      }
      sql += ' ORDER BY created_at DESC';
      const orders = await queryAll<any>(sql, params);
      return res.json({ success: true, result: orders });
    } catch (err) {
      console.error('[GET SHOP ORDERS ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
    }
  });

  // 7. Create Order (Buying Process)
  app.post('/api/v1/shop/orders/create', async (req, res) => {
    try {
      const { user_id, user_name, wibuku_name, wibuku_id, product_id } = req.body;
      if (!wibuku_name || !wibuku_name.trim() || !wibuku_id || !wibuku_id.trim()) {
        return res.status(400).json({ success: false, message: 'Nama Wibuku dan ID Wibuku wajib diisi.' });
      }

      const cleanUserId = user_id || '#1';
      const cleanUserName = user_name || 'Trainer Sensei';
      let user = await queryOne<any>('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)', [cleanUserId, cleanUserName]);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
      }

      const product = await queryOne<any>('SELECT * FROM shop_products WHERE id = ?', [product_id]);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
      }

      const settingsList = await queryAll<any>('SELECT setting_key, setting_value FROM developer_settings WHERE setting_key LIKE "shop_%"');
      const settingsMap: Record<string, string> = {};
      settingsList.forEach((s) => { settingsMap[s.setting_key] = s.setting_value; });

      const outOfStockMsg = settingsMap.shop_out_of_stock_msg || 'Stok produk ini sedang habis.';
      const dailyLimitMsg = settingsMap.shop_daily_limit_msg || 'Batas penarikan harian telah tercapai. Silakan coba lagi besok.';
      const globalMax = parseInt(settingsMap.shop_global_max_daily || '100', 10);
      const userMax = parseInt(settingsMap.shop_user_max_daily || '1', 10);

      if (product.is_active !== 1 || product.stock <= 0) {
        return res.status(400).json({ success: false, message: outOfStockMsg });
      }

      if (user.coins < product.coins) {
        return res.status(400).json({ success: false, message: 'Carrot Coin tidak mencukupi.' });
      }

      const now = Date.now();
      const startOfToday = new Date().setHours(0, 0, 0, 0);

      const globalTodayCountRow = await queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM shop_orders WHERE timestamp >= ? AND status != "Rejected"',
        [startOfToday]
      );
      const globalCount = globalTodayCountRow?.count || 0;
      if (globalCount >= globalMax) {
        return res.status(400).json({ success: false, message: dailyLimitMsg });
      }

      const userTodayCountRow = await queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM shop_orders WHERE user_id = ? AND timestamp >= ? AND status != "Rejected"',
        [user.id, startOfToday]
      );
      const userCount = userTodayCountRow?.count || 0;
      if (userCount >= userMax) {
        return res.status(400).json({ success: false, message: dailyLimitMsg });
      }

      // Process order: reduce stock & user coins
      const newStock = Math.max(0, product.stock - 1);
      await executeSql('UPDATE shop_products SET stock = ?, updated_at = ? WHERE id = ?', [newStock, now, product.id]);

      const newCoins = user.coins - product.coins;
      await executeSql('UPDATE users SET coins = ?, updated_at = ? WHERE id = ?', [newCoins, now, user.id]);

      const orderId = `ord_${now}_${Math.random().toString(36).substring(2, 6)}`;
      await executeSql(
        `INSERT INTO shop_orders (id, user_id, user_name, wibuku_name, wibuku_id, product_id, product_name, duration, coins, status, rejection_reason, refunded, timestamp, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', '', 0, ?, ?, ?)`,
        [orderId, user.id, user.username, wibuku_name.trim(), wibuku_id.trim(), product.id, product.name, product.duration, product.coins, now, now, now]
      );

      const histId = `ch_${now}_${Math.random().toString(36).substring(2, 6)}`;
      await executeSql(
        `INSERT INTO coin_history (id, user_id, user_name, type, title, amount, balance_after, detail, timestamp, created_at)
         VALUES (?, ?, ?, 'penukaran', 'Penukaran Premium Wibuku', ?, ?, ?, ?, ?)`,
        [histId, user.id, user.username, -product.coins, newCoins, `Order: ${product.name} | Wibuku: ${wibuku_name.trim()} (${wibuku_id.trim()})`, now, now]
      );

      const createdOrder = await queryOne<any>('SELECT * FROM shop_orders WHERE id = ?', [orderId]);
      return res.json({ success: true, result: createdOrder, newCoins });
    } catch (err: any) {
      console.error('[CREATE SHOP ORDER ERROR]:', err);
      return res.status(500).json({ success: false, message: err.message || 'Gagal membuat pesanan.' });
    }
  });

  // 8. Update Order Status (Dev Tools: Processing, Success, Reject)
  app.post('/api/v1/shop/orders/update-status', async (req, res) => {
    try {
      const { order_id, status, rejection_reason } = req.body;
      if (!order_id || !status) {
        return res.status(400).json({ success: false, message: 'Order ID dan status wajib diisi.' });
      }

      const order = await queryOne<any>('SELECT * FROM shop_orders WHERE id = ?', [order_id]);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order tidak ditemukan.' });
      }

      const now = Date.now();

      if (status === 'Rejected' && order.refunded === 0) {
        const user = await queryOne<any>('SELECT * FROM users WHERE id = ?', [order.user_id]);
        let refundedCoins = order.coins;
        if (user) {
          refundedCoins = user.coins + order.coins;
          await executeSql('UPDATE users SET coins = ?, updated_at = ? WHERE id = ?', [refundedCoins, now, user.id]);

          const histId = `ch_${now}_${Math.random().toString(36).substring(2, 6)}`;
          await executeSql(
            `INSERT INTO coin_history (id, user_id, user_name, type, title, amount, balance_after, detail, timestamp, created_at)
             VALUES (?, ?, ?, 'refund', 'Refund Penukaran Premium', ?, ?, ?, ?, ?)`,
            [histId, user.id, user.username, order.coins, refundedCoins, `Refund Order: ${order.product_name} (Penarikan Ditolak)`, now, now]
          );
        }

        await executeSql(
          'UPDATE shop_orders SET status = ?, rejection_reason = ?, refunded = 1, updated_at = ? WHERE id = ?',
          ['Rejected', rejection_reason || 'Pesanan ditolak oleh Developer', now, order_id]
        );
      } else {
        await executeSql(
          'UPDATE shop_orders SET status = ?, rejection_reason = ?, updated_at = ? WHERE id = ?',
          [status, rejection_reason || '', now, order_id]
        );
      }

      const updatedOrder = await queryOne<any>('SELECT * FROM shop_orders WHERE id = ?', [order_id]);
      return res.json({ success: true, result: updatedOrder });
    } catch (err) {
      console.error('[UPDATE ORDER STATUS ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to update order status.' });
    }
  });

  // 9. Realtime Shop Stats
  app.get('/api/v1/shop/stats', async (req, res) => {
    try {
      const startOfToday = new Date().setHours(0, 0, 0, 0);
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

      const todayRow = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM shop_orders WHERE timestamp >= ?', [startOfToday]);
      const monthRow = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM shop_orders WHERE timestamp >= ?', [startOfMonth]);
      const pendingRow = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM shop_orders WHERE status = "Pending"');
      const processingRow = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM shop_orders WHERE status = "Processing"');
      const successRow = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM shop_orders WHERE status = "Success"');
      const rejectRow = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM shop_orders WHERE status = "Rejected"');
      const coinRow = await queryOne<{ total: number }>('SELECT SUM(coins) as total FROM shop_orders WHERE status != "Rejected"');

      return res.json({
        success: true,
        result: {
          totalToday: todayRow?.count || 0,
          totalMonth: monthRow?.count || 0,
          totalPending: pendingRow?.count || 0,
          totalProcessing: processingRow?.count || 0,
          totalSuccess: successRow?.count || 0,
          totalReject: rejectRow?.count || 0,
          totalCoinsUsed: coinRow?.total || 0,
        },
      });
    } catch (err) {
      console.error('[GET SHOP STATS ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch shop statistics.' });
    }
  });

  // 10. Coin History
  app.get('/api/v1/coin-history', async (req, res) => {
    try {
      const userId = req.query.user_id as string;
      let sql = 'SELECT * FROM coin_history';
      const params: any[] = [];
      if (userId) {
        sql += ' WHERE user_id = ? OR LOWER(user_name) = LOWER(?)';
        params.push(userId, userId);
      }
      sql += ' ORDER BY timestamp DESC LIMIT 100';
      const history = await queryAll<any>(sql, params);
      return res.json({ success: true, result: history });
    } catch (err) {
      console.error('[GET COIN HISTORY ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch coin history.' });
    }
  });

  // 11. Record Coin Transaction
  app.post('/api/v1/coin-history/record', async (req, res) => {
    try {
      const { user_id, user_name, type, title, amount, detail } = req.body;
      const cleanUserId = user_id || '#1';
      const user = await queryOne<any>('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)', [cleanUserId, user_name || '']);
      if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

      const now = Date.now();
      const histId = `ch_${now}_${Math.random().toString(36).substring(2, 6)}`;
      await executeSql(
        `INSERT INTO coin_history (id, user_id, user_name, type, title, amount, balance_after, detail, timestamp, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [histId, user.id, user.username, type || 'event', title || 'Transaksi Coin', amount || 0, user.coins, detail || '', now, now]
      );
      return res.json({ success: true });
    } catch (err) {
      console.error('[RECORD COIN HISTORY ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to record coin history.' });
    }
  });

  // 19. SYNC & POLLING
  app.get('/api/v1/sync', async (req, res) => {
    try {
      const userId = (req.query.userId as string) || '#1';
      const since = req.query.since ? parseInt(req.query.since as string, 10) : Date.now() - 30000;

      const activeUsers = await queryAll<any>('SELECT * FROM users WHERE status = "Online" LIMIT 20');
      const recentLogs = await queryAll<any>('SELECT * FROM activity_logs WHERE timestamp > ? ORDER BY timestamp DESC LIMIT 10', [since]);

      return res.json({
        success: true,
        result: {
          lastTimestamp: Date.now(),
          activeUsers: activeUsers.map((u) => ({ id: u.id, username: u.username, role: u.role, status: u.status })),
          activityLogs: recentLogs.map((l) => ({ id: l.id, userId: l.user_id, userName: l.user_name, title: l.title, timestamp: l.timestamp })),
          unreadNotificationsCount: 0,
        },
      });
    } catch (err) {
      console.error('[D1 SYNC POLLING ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Sync polling failed.' });
    }
  });

  // Vite middleware in dev mode / static files in production mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[D1 SERVER READY] Express + D1 SQLite Backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
