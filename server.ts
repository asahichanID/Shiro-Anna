import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getD1Database, queryAll, queryOne, executeSql } from './src/database/d1Engine.ts';

function generateUuid(): string {
  if (typeof globalThis !== 'undefined') {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
      return cryptoObj.randomUUID();
    }
  }

  return `uuid_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function generateEightDigitCode(existingCodes: Iterable<string> = []): string {
  const used = new Set(Array.from(existingCodes, (value) => String(value)));
  let code = '';

  do {
    code = String(Math.floor(10_000_000 + Math.random() * 90_000_000));
  } while (used.has(code));

  return code;
}


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

  const toRowArray = <T extends Record<string, any>>(rows: T[] | null | undefined) => (Array.isArray(rows) ? rows : []);
  const asInt = (value: any, fallback = 0) => {
    const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
    return Number.isFinite(n) ? n : fallback;
  };
  const maxTimestamp = (...values: any[]) =>
    values.reduce((acc, value) => {
      const n = asInt(value, 0);
      return n > acc ? n : acc;
    }, 0);
  const DEFAULT_AVATAR = 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1';
  const HEARTBEAT_TTL_MS = 3000;

  // Ensure newer chat badge columns exist for persisted global chat labels.
  (async () => {
    try {
      const cols = [
        { table: 'global_messages', name: 'sender_badge', def: 'sender_badge TEXT DEFAULT ""' },
        { table: 'global_messages', name: 'sender_badge_name', def: 'sender_badge_name TEXT DEFAULT ""' },
      ];

      const tableCache: Record<string, string[]> = {};
      for (const item of cols) {
        if (!tableCache[item.table]) {
          const info = await queryAll<any>(`PRAGMA table_info(${item.table})`);
          tableCache[item.table] = (info || []).map((c: any) => String(c.name).toLowerCase());
        }
        if (!tableCache[item.table].includes(item.name.toLowerCase())) {
          try {
            await executeSql(`ALTER TABLE ${item.table} ADD COLUMN ${item.def}`);
            tableCache[item.table].push(item.name.toLowerCase());
          } catch (e) {}
        }
      }
    } catch (e) {}
  })();

  const mapUser = (u: any) => ({
    id: u.id,
    username: u.username,
    role: u.role || 'Trainer',
    avatar: u.avatar || DEFAULT_AVATAR,
    status: u.status || 'Online',
    coin: u.coins !== undefined ? u.coins : u.coin ?? 0,
    carrotCoins: u.coins !== undefined ? u.coins : u.coin ?? 0,
    totalGame: u.totalGame || 0,
    win: u.win || 0,
    lose: u.lose || 0,
    accountCode: u.account_code || u.accountCode || '',
    sessionToken: u.session_token || u.sessionToken || '',
    sessionActive: u.session_active === 1 || u.sessionActive === 1 || u.sessionActive === true,
    lastSeen: u.lastSeen || u.last_seen || u.updated_at || u.created_at || Date.now(),
    updatedAt: u.updated_at || u.lastSeen || u.created_at || Date.now(),
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
        accountCode: requestedAccountCode,
        sessionToken: providedSessionToken,
        device = 'Desktop',
        browser = 'Browser',
      } = req.body;

      if (!username || typeof username !== 'string' || !username.trim()) {
        return res.status(400).json({ success: false, message: 'Username is required.' });
      }

      const cleanUsername = username.trim();
      const now = Date.now();
      const defaultAvatar = avatar || DEFAULT_AVATAR;
      const sessionToken = providedSessionToken || generateUuid();

      const existingUser = await queryOne<any>(
        'SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR id = ? OR account_code = ?',
        [cleanUsername, requestedId || '', requestedAccountCode || '']
      );

      const currentSession = existingUser
        ? await queryOne<any>('SELECT * FROM user_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [existingUser.id])
        : null;

      if (currentSession && currentSession.is_active === 1 && currentSession.session_token && currentSession.session_token !== sessionToken) {
        return res.status(409).json({
          success: false,
          message: 'Akun ini sedang login di perangkat lain. Logout dulu dari perangkat lama.',
        });
      }

      const isDev = cleanUsername.toLowerCase() === 'shiro anna';
      const userId = existingUser?.id || (!isDev ? (requestedId && requestedId !== '#1' ? requestedId : `u_${generateUuid().replace(/-/g, '').slice(0, 12)}`) : '#1');
      const accountCode =
        existingUser?.account_code ||
        requestedAccountCode ||
        (isDev ? '00000001' : generateEightDigitCode((await queryAll<any>('SELECT account_code FROM users WHERE account_code IS NOT NULL')).map((row) => row.account_code)));

      const updatedCoins = typeof coins === 'number' ? coins : (existingUser?.coins ?? (isDev ? 999999999 : 0));
      const updatedTotalGame = typeof totalGame === 'number' ? totalGame : (existingUser?.totalGame ?? 0);
      const updatedWin = typeof win === 'number' ? win : (existingUser?.win ?? 0);
      const updatedLose = typeof lose === 'number' ? lose : (existingUser?.lose ?? 0);

      await executeSql(
        `INSERT INTO users (id, username, role, avatar, coins, totalGame, win, lose, status, lastSeen, device, browser, account_code, session_token, session_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Online', ?, ?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           username = excluded.username,
           role = excluded.role,
           avatar = excluded.avatar,
           coins = excluded.coins,
           totalGame = excluded.totalGame,
           win = excluded.win,
           lose = excluded.lose,
           status = 'Online',
           lastSeen = excluded.lastSeen,
           device = excluded.device,
           browser = excluded.browser,
           account_code = excluded.account_code,
           session_token = excluded.session_token,
           session_active = 1,
           updated_at = excluded.updated_at`,
        [userId, cleanUsername, role, defaultAvatar, updatedCoins, updatedTotalGame, updatedWin, updatedLose, now, device, browser, accountCode, sessionToken, now, now, now]
      );

      await executeSql(
        `INSERT INTO user_sessions (id, user_id, session_token, is_active, device, browser, started_at, last_heartbeat_at, ended_at, created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, ?, ?, ?, NULL, ?, ?)
         ON CONFLICT(user_id, session_token) DO UPDATE SET
           is_active = 1,
           device = excluded.device,
           browser = excluded.browser,
           last_heartbeat_at = excluded.last_heartbeat_at,
           ended_at = NULL,
           updated_at = excluded.updated_at`,
        [generateUuid(), userId, sessionToken, device, browser, now, now, now, now]
      );

      await executeSql(
        'INSERT OR REPLACE INTO presence (user_id, status, last_active, updated_at) VALUES (?, ?, ?, ?)',
        [userId, 'Online', now, now]
      );

      const logId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await executeSql(
        `INSERT INTO activity_logs (id, user_id, user_name, category, type, title, detail, time, timestamp, created_at, updated_at)
         VALUES (?, ?, ?, 'login', 'Register & Login', ?, ?, ?, ?, ?, ?)`,
        [
          logId,
          userId,
          cleanUsername,
          `User ${cleanUsername} registered and logged in`,
          `Registered new ${role} account (${userId})`,
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          now,
          now,
          now,
        ]
      );

      const result = await queryOne<any>('SELECT * FROM users WHERE id = ?', [userId]);
      return res.json({ success: true, result: mapUser(result || { id: userId, username: cleanUsername, role, avatar: defaultAvatar, coins: updatedCoins, totalGame: updatedTotalGame, win: updatedWin, lose: updatedLose, account_code: accountCode, session_token: sessionToken, session_active: 1, lastSeen: now, updated_at: now }) });
    } catch (err) {
      console.error('[D1 USER REGISTRATION/INSERT ERROR]: Failed to register or login user:', err);
      return res.status(500).json({ success: false, message: 'Database query failed during user registration.' });
    }
  });

  // 1b. USERS: Update User Full Profile / Coins / Stats
  app.post('/api/v1/users/update', async (req, res) => {
    try {
      const { id, username, role, avatar, coins, totalGame, win, lose, status, accountCode, sessionToken } = req.body;
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
      const updatedAvatar = avatar || existing.avatar || DEFAULT_AVATAR;
      const updatedCoins = typeof coins === 'number' ? coins : existing.coins;
      const updatedTotalGame = typeof totalGame === 'number' ? totalGame : existing.totalGame;
      const updatedWin = typeof win === 'number' ? win : existing.win;
      const updatedLose = typeof lose === 'number' ? lose : existing.lose;
      const updatedStatus = status || existing.status;
      const updatedAccountCode = accountCode || existing.account_code || existing.accountCode || '';
      const updatedSessionToken = sessionToken || existing.session_token || existing.sessionToken || '';

      await executeSql(
        `UPDATE users SET username = ?, role = ?, avatar = ?, coins = ?, totalGame = ?, win = ?, lose = ?, status = ?, account_code = ?, session_token = ?, updated_at = ? WHERE id = ?`,
        [updatedUsername, updatedRole, updatedAvatar, updatedCoins, updatedTotalGame, updatedWin, updatedLose, updatedStatus, updatedAccountCode, updatedSessionToken, now, id]
      );

      if (updatedSessionToken) {
        await executeSql(
          `INSERT INTO user_sessions (id, user_id, session_token, is_active, device, browser, started_at, last_heartbeat_at, ended_at, created_at, updated_at)
           VALUES (?, ?, ?, 1, ?, ?, ?, ?, NULL, ?, ?)
           ON CONFLICT(user_id, session_token) DO UPDATE SET
             is_active = 1,
             last_heartbeat_at = excluded.last_heartbeat_at,
             ended_at = NULL,
             updated_at = excluded.updated_at`,
          [generateUuid(), id, updatedSessionToken, req.body.device || '', req.body.browser || '', now, now, now, now]
        );
      }

      const result = await queryOne<any>('SELECT * FROM users WHERE id = ?', [id]);
      return res.json({ success: true, result: mapUser(result) });
    } catch (err) {
      console.error('[D1 USER UPDATE ERROR]: Failed to update user:', err);
      return res.status(500).json({ success: false, message: 'Failed to update user in D1.' });
    }
  });

  // 2. USERS: Update Presence Heartbeat
  app.post('/api/v1/users/presence', async (req, res) => {
    try {
      const { userId, status = 'Online', sessionToken = '', device, browser } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, message: 'userId is required.' });
      }

      const now = Date.now();
      await executeSql('INSERT OR REPLACE INTO presence (user_id, status, last_active, updated_at) VALUES (?, ?, ?, ?)', [userId, status, now, now]);
      await executeSql('UPDATE users SET status = ?, lastSeen = ?, updated_at = ? WHERE id = ?', [status, now, now, userId]);

      if (sessionToken) {
        await executeSql(
          `INSERT INTO user_sessions (id, user_id, session_token, is_active, device, browser, started_at, last_heartbeat_at, ended_at, created_at, updated_at)
           VALUES (?, ?, ?, 1, ?, ?, ?, ?, NULL, ?, ?)
           ON CONFLICT(user_id, session_token) DO UPDATE SET
             is_active = 1,
             device = excluded.device,
             browser = excluded.browser,
             last_heartbeat_at = excluded.last_heartbeat_at,
             ended_at = NULL,
             updated_at = excluded.updated_at`,
          [generateUuid(), userId, sessionToken, device || '', browser || '', now, now, now, now]
        );
      }

      return res.json({ success: true });
    } catch (err) {
      console.error('[D1 PRESENCE UPDATE ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to update presence.' });
    }
  });

  // 2b. USERS: Logout User / Session Close
  app.post('/api/v1/users/logout', async (req, res) => {
    try {
      const { userId, sessionToken = '' } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, message: 'userId is required.' });
      }

      const now = Date.now();
      await executeSql('UPDATE users SET status = ?, lastSeen = ?, session_active = 0, updated_at = ? WHERE id = ?', ['Offline', now, now, userId]);
      await executeSql('UPDATE presence SET status = ?, last_active = ?, updated_at = ? WHERE user_id = ?', ['Offline', now, now, userId]);
      if (sessionToken) {
        await executeSql(
          `UPDATE user_sessions SET is_active = 0, ended_at = ?, last_heartbeat_at = ?, updated_at = ? WHERE user_id = ? AND session_token = ?`,
          [now, now, now, userId, sessionToken]
        );
      } else {
        await executeSql(`UPDATE user_sessions SET is_active = 0, ended_at = ?, last_heartbeat_at = ?, updated_at = ? WHERE user_id = ?`, [now, now, now, userId]);
      }

      return res.json({ success: true });
    } catch (err) {
      console.error('[D1 USER LOGOUT ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to logout user.' });
    }
  });

  // 3. USERS: Get All Registered Users
  app.get('/api/v1/users', async (req, res) => {
    try {
      const users = await queryAll<any>(`
        SELECT u.*, p.status as liveStatus, p.last_active as lastActive, s.session_token as sessionToken, s.is_active as sessionActive
        FROM users u
        LEFT JOIN presence p ON u.id = p.user_id
        LEFT JOIN user_sessions s ON u.id = s.user_id AND s.is_active = 1
        ORDER BY u.created_at ASC
      `);

      const now = Date.now();
      const formatted = users.map((u) => {
        const lastSeen = u.lastSeen || u.last_seen || u.lastActive || u.updated_at || u.created_at || 0;
        const isRecentlyActive = lastSeen && (now - lastSeen < HEARTBEAT_TTL_MS);
        const resolvedStatus = isRecentlyActive ? (u.liveStatus || u.status || 'Online') : (u.status === 'Away' ? 'Away' : 'Offline');

        return {
          id: u.id,
          username: u.username,
          name: u.username,
          role: u.role || 'Trainer',
          avatar: u.avatar || DEFAULT_AVATAR,
          status: resolvedStatus,
          coin: u.coins !== undefined ? u.coins : 1000,
          carrotCoins: u.coins !== undefined ? u.coins : 1000,
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
          accountCode: u.account_code || '',
          sessionToken: u.sessionToken || '',
          sessionActive: !!u.sessionActive,
          lastSeen,
          updatedAt: u.updated_at || lastSeen,
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

      const explicitFriends = await queryAll<any>('SELECT * FROM friends WHERE user_id = ?', [userId]);
      const allUsers = await queryAll<any>(
        `SELECT u.*, p.status as liveStatus, p.last_active as lastActive
         FROM users u
         LEFT JOIN presence p ON u.id = p.user_id
         ORDER BY u.created_at ASC`
      );

      const friendMap = new Map<string, any>();

      friendMap.set('#1', {
        id: '#1',
        username: 'Shiro Anna',
        avatar: DEFAULT_AVATAR,
        status: 'Online',
        lastMessage: 'Salam dari Lead Developer Tracen Academy! 🐎⚡',
        lastOnline: 'Online Sekarang',
        bio: 'Lead Developer & Creator of Oguri Cap Bot',
        role: 'Developer',
        isOnline: true,
        accountCode: '00000001',
      });

      explicitFriends.forEach((f) => {
        friendMap.set(f.friend_id, {
          id: f.friend_id,
          username: f.username,
          avatar: f.avatar || DEFAULT_AVATAR,
          status: f.status || 'Online',
          lastMessage: f.bio || 'Halo! Mari berteman!',
          lastOnline: 'Baru saja',
          bio: f.bio || 'Trainer Tracen Academy',
          role: f.role || 'Trainer',
          isOnline: f.isOnline === 1 || f.status === 'Online',
          accountCode: f.account_code || '',
          updatedAt: f.updated_at || Date.now(),
        });
      });

      allUsers.forEach((u) => {
        if (!friendMap.has(u.id)) {
          const lastSeen = u.lastSeen || u.last_active || u.updated_at || Date.now();
          const isOnline = (u.liveStatus || u.status) === 'Online' && (Date.now() - lastSeen < HEARTBEAT_TTL_MS);
          friendMap.set(u.id, {
            id: u.id,
            username: u.username,
            avatar: u.avatar || DEFAULT_AVATAR,
            status: isOnline ? 'Online' : 'Offline',
            lastMessage: `Trainer ${u.username} terdaftar di D1 Tracen Academy`,
            lastOnline: isOnline ? 'Online Sekarang' : 'Baru saja',
            bio: `Registered Trainer (${u.role || 'Trainer'})`,
            role: u.role || 'Trainer',
            isOnline,
            accountCode: u.account_code || '',
            updatedAt: u.updated_at || lastSeen,
          });
        }
      });

      return res.json({ success: true, result: Array.from(friendMap.values()) });
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
        senderBadge: m.sender_badge || '',
        senderBadgeName: m.sender_badge_name || '',
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
      const {
        id,
        senderId,
        senderName,
        senderRole = 'Trainer',
        senderAvatar,
        senderBadge = '',
        senderBadgeName = '',
        text,
        isDuelAnswer,
        time,
        timestamp,
      } = req.body;

      if (!text || !senderId) {
        console.error('[D1 CHAT INSERT ERROR]: Missing required fields for global chat message.');
        return res.status(400).json({ success: false, message: 'senderId and text are required.' });
      }

      const msgId = id || `gmsg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = timestamp || Date.now();
      const timeStr = time || new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      await executeSql(
        `INSERT INTO global_messages (id, sender_id, sender_name, sender_role, sender_avatar, sender_badge, sender_badge_name, text, is_duel_answer, time, timestamp, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          msgId,
          senderId,
          senderName || 'Trainer',
          senderRole,
          senderAvatar || 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
          senderBadge || '',
          senderBadgeName || '',
          text,
          isDuelAnswer ? 1 : 0,
          timeStr,
          now,
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
        senderBadge: senderBadge || '',
        senderBadgeName: senderBadgeName || '',
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
      const messages = await queryAll<any>('SELECT * FROM messages WHERE room_id = ? ORDER BY updated_at ASC, timestamp ASC LIMIT 100', [roomId]);

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
      const now = Date.now();
      await executeSql('UPDATE messages SET is_read = 1, status = "read", updated_at = ? WHERE room_id = ? AND receiver_id = ?', [now, roomId, userId]);
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
        `INSERT INTO activity_logs (id, user_id, user_name, category, type, title, detail, time, timestamp, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [logId, userId || '#1', userName || 'Shiro Anna', category, type || category, title, detail || title, timeStr, now, now, now]
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
      const notifications = await queryAll<any>('SELECT * FROM notifications WHERE user_id = ? ORDER BY updated_at DESC, created_at DESC LIMIT 20', [userId]);
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
      const now = Date.now();
      await executeSql('INSERT INTO notifications (id, user_id, title, body, type, is_read, timestamp, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)', [
        id,
        userId,
        title,
        body,
        type,
        now,
        now,
        now,
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
      let products = await queryAll<any>('SELECT * FROM shop_products ORDER BY sort_order ASC, created_at ASC');
      if (!products || products.length === 0) {
        const now = Date.now();
        await executeSql(
          `INSERT INTO shop_products (id, name, description, duration, coins, stock, is_active, sort_order, created_at, updated_at) VALUES
           ('prod_1', 'Premium Wibuku 1 Hari', 'Akses Premium Wibuku selama 1 Hari full', '1 Hari', 15000, 50, 1, 1, ?, ?),
           ('prod_2', 'Premium Wibuku 7 Hari', 'Akses Premium Wibuku selama 7 Hari full (Hemat 10%)', '7 Hari', 95000, 30, 1, 2, ?, ?),
           ('prod_3', 'Premium Wibuku 30 Hari', 'Akses Premium Wibuku selama 30 Hari VIP (Hemat 25%)', '30 Hari', 350000, 15, 1, 3, ?, ?)`,
          [now, now, now, now, now, now]
        );
        products = await queryAll<any>('SELECT * FROM shop_products ORDER BY sort_order ASC, created_at ASC');
      }
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
        const now = Date.now();
        const initialCoins = typeof req.body.user_coins === 'number' ? req.body.user_coins : 0;
        await executeSql(
          `INSERT INTO users (id, username, role, avatar, coins, totalGame, win, lose, status, created_at, updated_at)
           VALUES (?, ?, 'Trainer', '/assets/avatar.png', ?, 0, 0, 0, 'Online', ?, ?)`,
          [cleanUserId, cleanUserName, initialCoins, now, now]
        );
        user = await queryOne<any>('SELECT * FROM users WHERE id = ?', [cleanUserId]);
      } else if (typeof req.body.user_coins === 'number' && req.body.user_coins > user.coins) {
        const now = Date.now();
        user.coins = req.body.user_coins;
        await executeSql('UPDATE users SET coins = ?, updated_at = ? WHERE id = ?', [user.coins, now, user.id]);
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
        `INSERT INTO coin_history (id, user_id, user_name, type, title, amount, balance_after, detail, timestamp, created_at, updated_at)
         VALUES (?, ?, ?, 'penukaran', 'Penukaran Premium Wibuku', ?, ?, ?, ?, ?, ?)`,
        [histId, user.id, user.username, -product.coins, newCoins, `Order: ${product.name} | Wibuku: ${wibuku_name.trim()} (${wibuku_id.trim()})`, now, now, now]
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
            `INSERT INTO coin_history (id, user_id, user_name, type, title, amount, balance_after, detail, timestamp, created_at, updated_at)
             VALUES (?, ?, ?, 'refund', 'Refund Penukaran Premium', ?, ?, ?, ?, ?, ?)`,
            [histId, user.id, user.username, order.coins, refundedCoins, `Refund Order: ${order.product_name} (Penarikan Ditolak)`, now, now, now]
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
      const cleanUserName = user_name || 'Trainer Sensei';
      let user = await queryOne<any>('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)', [cleanUserId, cleanUserName]);
      if (!user) {
        const now = Date.now();
        await executeSql(
          `INSERT INTO users (id, username, role, avatar, coins, totalGame, win, lose, status, created_at, updated_at)
           VALUES (?, ?, 'Trainer', '/assets/avatar.png', 0, 0, 0, 0, 'Online', ?, ?)`,
          [cleanUserId, cleanUserName, now, now]
        );
        user = await queryOne<any>('SELECT * FROM users WHERE id = ?', [cleanUserId]);
      }

      const now = Date.now();
      const histId = `ch_${now}_${Math.random().toString(36).substring(2, 6)}`;
      await executeSql(
        `INSERT INTO coin_history (id, user_id, user_name, type, title, amount, balance_after, detail, timestamp, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [histId, user.id, user.username, type || 'event', title || 'Transaksi Coin', amount || 0, user.coins, detail || '', now, now, now]
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
      const since = req.query.since ? parseInt(req.query.since as string, 10) : 0;
      const baseline = Number.isFinite(since) ? since : 0;

      const [changedUsers, changedFriends, changedPresence, changedMessages, changedGlobalMessages, changedActivityLogs, changedNotifications, changedBotProfile, changedDevBadge, changedSettings, changedDuel, changedShopProducts, changedShopOrders, changedCoinHistory, changedUserBadges] = await Promise.all([
        queryAll<any>('SELECT * FROM users WHERE updated_at > ? ORDER BY updated_at ASC LIMIT 200', [baseline]),
        queryAll<any>('SELECT * FROM friends WHERE user_id = ? AND updated_at > ? ORDER BY updated_at ASC LIMIT 200', [userId, baseline]),
        queryAll<any>('SELECT * FROM presence WHERE updated_at > ? OR last_active > ? ORDER BY last_active ASC LIMIT 200', [baseline, baseline]),
        queryAll<any>('SELECT * FROM messages WHERE (sender_id = ? OR receiver_id = ?) AND updated_at > ? ORDER BY updated_at ASC LIMIT 200', [userId, userId, baseline]),
        queryAll<any>('SELECT * FROM global_messages WHERE updated_at > ? ORDER BY updated_at ASC LIMIT 200', [baseline]),
        queryAll<any>('SELECT * FROM activity_logs WHERE updated_at > ? ORDER BY updated_at ASC LIMIT 200', [baseline]),
        queryAll<any>('SELECT * FROM notifications WHERE user_id = ? AND updated_at > ? ORDER BY updated_at ASC LIMIT 100', [userId, baseline]),
        queryAll<any>('SELECT * FROM bot_profile WHERE id = "default" ORDER BY updated_at DESC LIMIT 1'),
        queryAll<any>('SELECT * FROM developer_badge WHERE updated_at > ? ORDER BY updated_at ASC LIMIT 10', [baseline]),
        queryAll<any>('SELECT * FROM developer_settings WHERE updated_at > ? ORDER BY updated_at ASC LIMIT 100', [baseline]),
        queryAll<any>('SELECT * FROM duel WHERE updated_at > ? ORDER BY updated_at ASC LIMIT 20', [baseline]),
        queryAll<any>('SELECT * FROM shop_products WHERE updated_at > ? ORDER BY updated_at ASC LIMIT 100', [baseline]),
        queryAll<any>('SELECT * FROM shop_orders WHERE (user_id = ? OR LOWER(user_name) = LOWER(?)) AND updated_at > ? ORDER BY updated_at ASC LIMIT 100', [userId, userId, baseline]),
        queryAll<any>('SELECT * FROM coin_history WHERE user_id = ? AND updated_at > ? ORDER BY updated_at ASC LIMIT 100', [userId, baseline]),
        queryAll<any>('SELECT * FROM user_badges WHERE user_id = ? AND updated_at > ? ORDER BY updated_at ASC LIMIT 100', [userId, baseline]),
      ]);

      const lastTimestamp = maxTimestamp(
        baseline,
        ...toRowArray(changedUsers).map((r) => r.updated_at),
        ...toRowArray(changedFriends).map((r) => r.updated_at),
        ...toRowArray(changedPresence).map((r) => r.updated_at || r.last_active),
        ...toRowArray(changedMessages).map((r) => r.updated_at),
        ...toRowArray(changedGlobalMessages).map((r) => r.updated_at),
        ...toRowArray(changedActivityLogs).map((r) => r.updated_at),
        ...toRowArray(changedNotifications).map((r) => r.updated_at),
        ...toRowArray(changedBotProfile).map((r) => r.updated_at),
        ...toRowArray(changedDevBadge).map((r) => r.updated_at),
        ...toRowArray(changedSettings).map((r) => r.updated_at),
        ...toRowArray(changedDuel).map((r) => r.updated_at),
        ...toRowArray(changedShopProducts).map((r) => r.updated_at),
        ...toRowArray(changedShopOrders).map((r) => r.updated_at),
        ...toRowArray(changedCoinHistory).map((r) => r.updated_at),
        ...toRowArray(changedUserBadges).map((r) => r.updated_at),
        Date.now()
      );

      const unreadNotificationsCount = changedNotifications.length;

      return res.json({
        success: true,
        result: {
          lastTimestamp,
          changed: {
            users: changedUsers.map(mapUser),
            friends: changedFriends.map((f) => ({
              id: f.friend_id || f.id,
              friendId: f.friend_id || f.id,
              username: f.username,
              avatar: f.avatar || 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
              bio: f.bio || '',
              status: f.status || 'Offline',
              role: f.role || 'Trainer',
              isOnline: f.isOnline === 1 || f.status === 'Online',
              updatedAt: f.updated_at || f.created_at || Date.now(),
            })),
            presence: changedPresence.map((p) => ({
              userId: p.user_id,
              status: p.status || 'Offline',
              lastActive: p.last_active || p.updated_at || Date.now(),
              updatedAt: p.updated_at || p.last_active || Date.now(),
            })),
            messages: changedMessages.map((m) => ({
              id: m.id,
              senderId: m.sender_id,
              receiverId: m.receiver_id,
              roomId: m.room_id,
              text: m.text,
              time: m.time,
              timestamp: m.timestamp,
              status: m.status || 'sent',
              isRead: m.is_read === 1,
              updatedAt: m.updated_at || m.timestamp || Date.now(),
            })),
            globalMessages: changedGlobalMessages.map((m) => ({
              id: m.id,
              senderId: m.sender_id,
              senderName: m.sender_name,
              senderRole: m.sender_role || 'Trainer',
              senderAvatar: m.sender_avatar || 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
              senderBadge: m.sender_badge || '',
              senderBadgeName: m.sender_badge_name || '',
              text: m.text,
              isDuelAnswer: m.is_duel_answer === 1,
              time: m.time,
              timestamp: m.timestamp,
              updatedAt: m.updated_at || m.timestamp || Date.now(),
            })),
            activityLogs: changedActivityLogs.map((l) => ({
              id: l.id,
              userId: l.user_id,
              userName: l.user_name,
              category: l.category,
              type: l.type,
              title: l.title,
              detail: l.detail,
              time: l.time,
              timestamp: l.timestamp,
              updatedAt: l.updated_at || l.timestamp || Date.now(),
            })),
            notifications: changedNotifications.map((n) => ({
              id: n.id,
              userId: n.user_id,
              title: n.title,
              body: n.body,
              type: n.type,
              isRead: n.is_read === 1,
              timestamp: n.timestamp || n.updated_at || Date.now(),
              updatedAt: n.updated_at || n.timestamp || Date.now(),
            })),
            botProfile: changedBotProfile[0] ? {
              id: changedBotProfile[0].id,
              name: changedBotProfile[0].name,
              avatar: changedBotProfile[0].avatar,
              bio: changedBotProfile[0].bio,
              status: changedBotProfile[0].status,
              updatedAt: changedBotProfile[0].updated_at || Date.now(),
            } : undefined,
            developerBadge: changedDevBadge[0] ? {
              id: changedDevBadge[0].id,
              userId: changedDevBadge[0].user_id,
              badgeName: changedDevBadge[0].badge_name,
              themeId: changedDevBadge[0].theme_id,
              icon: changedDevBadge[0].icon,
              effect: changedDevBadge[0].effect,
              updatedAt: changedDevBadge[0].updated_at || Date.now(),
            } : undefined,
            settings: changedSettings.map((s) => ({
              settingKey: s.setting_key,
              settingValue: s.setting_value,
              updatedAt: s.updated_at || Date.now(),
            })),
            duel: changedDuel.map((d) => ({
              id: d.id,
              status: d.status,
              updatedAt: d.updated_at || Date.now(),
            })),
            shopProducts: changedShopProducts.map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              duration: p.duration,
              coins: p.coins,
              stock: p.stock,
              is_active: p.is_active,
              sort_order: p.sort_order,
              created_at: p.created_at,
              updated_at: p.updated_at,
            })),
            shopOrders: changedShopOrders.map((o) => ({
              id: o.id,
              user_id: o.user_id,
              user_name: o.user_name,
              wibuku_name: o.wibuku_name,
              wibuku_id: o.wibuku_id,
              product_id: o.product_id,
              product_name: o.product_name,
              duration: o.duration,
              coins: o.coins,
              status: o.status,
              rejection_reason: o.rejection_reason,
              refunded: o.refunded,
              timestamp: o.timestamp,
              created_at: o.created_at,
              updated_at: o.updated_at,
            })),
            coinHistory: changedCoinHistory.map((c) => ({
              id: c.id,
              user_id: c.user_id,
              user_name: c.user_name,
              type: c.type,
              title: c.title,
              amount: c.amount,
              balance_after: c.balance_after,
              detail: c.detail,
              timestamp: c.timestamp,
              updatedAt: c.updated_at || c.timestamp || Date.now(),
            })),
            userBadges: changedUserBadges.map((b) => ({
              id: b.id,
              user_id: b.user_id,
              badge_id: b.badge_id,
              custom_name: b.custom_name || '',
              is_active: b.is_active,
              updatedAt: b.updated_at || Date.now(),
            })),
          },
          activeUsers: changedUsers.filter((u) => u.status === 'Online').map((u) => ({ id: u.id, username: u.username, role: u.role, status: u.status })),
          unreadNotificationsCount,
          hasChanges:
            changedUsers.length > 0 ||
            changedFriends.length > 0 ||
            changedPresence.length > 0 ||
            changedMessages.length > 0 ||
            changedGlobalMessages.length > 0 ||
            changedActivityLogs.length > 0 ||
            changedNotifications.length > 0 ||
            changedBotProfile.length > 0 ||
            changedDevBadge.length > 0 ||
            changedSettings.length > 0 ||
            changedDuel.length > 0 ||
            changedShopProducts.length > 0 ||
            changedShopOrders.length > 0 ||
            changedCoinHistory.length > 0 ||
            changedUserBadges.length > 0,
        },
      });
    } catch (err) {
      console.error('[D1 SYNC POLLING ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Sync polling failed.' });
    }
  });

  // 20. BADGE SYSTEM: Get User Owned Badges & Active Badge
  app.get('/api/v1/badges/user', async (req, res) => {
    try {
      const userId = (req.query.userId as string) || '#1';
      const user = await queryOne<any>('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)', [userId, userId]);

      const isDev = user ? (user.id === '#1' || user.role === 'Developer' || user.username?.toLowerCase() === 'shiro anna') : (userId === '#1');

      if (isDev) {
        // Shiro Anna (Developer) has ALL badges unlocked by default
        const allBadgeIds = ['ruby', 'common_red', 'common_blue', 'common_green', 'common_yellow', 'rare_red_blue', 'rare_yellow_green', 'rare_purple_blue', 'rare_red_purple', 'rare_cyan_blue', 'epic_red', 'epic_blue', 'epic_green', 'epic_yellow', 'epic_purple', 'legendary_rainbow'];
        const userBadgeRows = await queryAll<any>('SELECT * FROM user_badges WHERE user_id = ?', [userId]);
        const activeBadgeRow = userBadgeRows.find((r) => r.is_active === 1);
        const activeBadgeId = activeBadgeRow ? activeBadgeRow.badge_id : 'ruby';

        return res.json({
          success: true,
          result: {
            ownedBadges: allBadgeIds.map((bId) => {
              const row = userBadgeRows.find((r) => r.badge_id === bId);
              return {
                badge_id: bId,
                custom_name: row?.custom_name || '',
                is_active: activeBadgeId === bId ? 1 : 0,
              };
            }),
            activeBadge: activeBadgeId,
            customName: activeBadgeRow?.custom_name || '',
          },
        });
      }

      // Regular User: Fetch from user_badges table
      const rows = await queryAll<any>('SELECT * FROM user_badges WHERE user_id = ?', [userId]);
      const activeRow = rows.find((r) => r.is_active === 1);

      return res.json({
        success: true,
        result: {
          ownedBadges: rows.map((r) => ({
            id: r.id,
            badge_id: r.badge_id,
            custom_name: r.custom_name || '',
            is_active: r.is_active === 1 ? 1 : 0,
          })),
          activeBadge: activeRow ? activeRow.badge_id : null,
          customName: activeRow ? (activeRow.custom_name || '') : '',
        },
      });
    } catch (err) {
      console.error('[GET USER BADGES ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch user badges.' });
    }
  });

  // 21. BADGE SYSTEM: Buy Badge
  app.post('/api/v1/badges/buy', async (req, res) => {
    try {
      const { userId = '#1', badgeId, price, userCoins, userName } = req.body;
      if (!badgeId || typeof price !== 'number') {
        return res.status(400).json({ success: false, message: 'Badge ID and price are required.' });
      }

      const cleanUserId = userId || '#1';
      const cleanUserName = userName || 'Trainer Sensei';
      let user = await queryOne<any>('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)', [cleanUserId, cleanUserName]);
      if (!user) {
        const now = Date.now();
        const initialCoins = typeof userCoins === 'number' ? userCoins : 0;
        await executeSql(
          `INSERT INTO users (id, username, role, avatar, coins, totalGame, win, lose, status, created_at, updated_at)
           VALUES (?, ?, 'Trainer', '/assets/avatar.png', ?, 0, 0, 0, 'Online', ?, ?)`,
          [cleanUserId, cleanUserName, initialCoins, now, now]
        );
        user = await queryOne<any>('SELECT * FROM users WHERE id = ?', [cleanUserId]);
      } else if (typeof userCoins === 'number' && userCoins > user.coins) {
        const now = Date.now();
        user.coins = userCoins;
        await executeSql('UPDATE users SET coins = ?, updated_at = ? WHERE id = ?', [user.coins, now, user.id]);
      }

      const isDev = user.id === '#1' || user.role === 'Developer' || user.username?.toLowerCase() === 'shiro anna';
      if (isDev) {
        return res.json({ success: true, message: 'Developer already has all badges unlocked.', newCoins: user.coins });
      }

      // Check if user already owns this badge
      const existingBadge = await queryOne<any>('SELECT * FROM user_badges WHERE user_id = ? AND badge_id = ?', [user.id, badgeId]);
      if (existingBadge) {
        return res.status(400).json({ success: false, message: 'Anda sudah memiliki badge ini.' });
      }

      // Check coins
      if (user.coins < price) {
        return res.status(400).json({ success: false, message: `Carrot Coin tidak mencukupi (Harga: ${price.toLocaleString('id-ID')} Coin).` });
      }

      const now = Date.now();
      const newCoins = user.coins - price;

      // Deduct coins
      await executeSql('UPDATE users SET coins = ?, updated_at = ? WHERE id = ?', [newCoins, now, user.id]);

      // Insert into user_badges
      const ubId = `ub_${now}_${Math.random().toString(36).substring(2, 6)}`;
      await executeSql(
        'INSERT INTO user_badges (id, user_id, badge_id, custom_name, is_active, created_at, updated_at) VALUES (?, ?, ?, "", 0, ?, ?)',
        [ubId, user.id, badgeId, now, now]
      );

      // Record coin history
      const histId = `ch_${now}_${Math.random().toString(36).substring(2, 6)}`;
      await executeSql(
        `INSERT INTO coin_history (id, user_id, user_name, type, title, amount, balance_after, detail, timestamp, created_at, updated_at)
         VALUES (?, ?, ?, 'pembelian_badge', 'Pembelian Badge Shop', ?, ?, ?, ?, ?, ?)`,
        [histId, user.id, user.username, -price, newCoins, `Membeli Badge (${badgeId})`, now, now, now]
      );

      return res.json({ success: true, newCoins, badgeId });
    } catch (err) {
      console.error('[BUY BADGE ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Gagal membeli badge.' });
    }
  });

  // 22. BADGE SYSTEM: Set Active Badge
  app.post('/api/v1/badges/set-active', async (req, res) => {
    try {
      const { userId = '#1', badgeId } = req.body;
      const user = await queryOne<any>('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)', [userId, userId]);
      if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

      const now = Date.now();

      // Deactivate all active badges for this user
      await executeSql('UPDATE user_badges SET is_active = 0, updated_at = ? WHERE user_id = ?', [now, user.id]);

      let customName = '';
      if (badgeId) {
        const existing = await queryOne<any>('SELECT * FROM user_badges WHERE user_id = ? AND badge_id = ?', [user.id, badgeId]);
        if (existing) {
          await executeSql('UPDATE user_badges SET is_active = 1, updated_at = ? WHERE id = ?', [now, existing.id]);
          customName = existing.custom_name || '';
        } else {
          const ubId = `ub_${now}_${Math.random().toString(36).substring(2, 6)}`;
          await executeSql(
            'INSERT INTO user_badges (id, user_id, badge_id, custom_name, is_active, created_at, updated_at) VALUES (?, ?, ?, "", 1, ?, ?)',
            [ubId, user.id, badgeId, now, now]
          );
        }
      }

      return res.json({ success: true, activeBadge: badgeId, customName });
    } catch (err) {
      console.error('[SET ACTIVE BADGE ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Gagal mengubah badge aktif.' });
    }
  });

  // 23. BADGE SYSTEM: Rename Badge
  app.post('/api/v1/badges/rename', async (req, res) => {
    try {
      const { userId = '#1', badgeId, newName } = req.body;
      const user = await queryOne<any>('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)', [userId, userId]);
      if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

      const cleanName = typeof newName === 'string' ? newName.trim() : '';

      // Validate max 7 words
      if (cleanName) {
        const wordCount = cleanName.split(/\s+/).filter(Boolean).length;
        if (wordCount > 7) {
          return res.status(400).json({ success: false, message: 'Nama badge maksimal 7 kata.' });
        }
      }

      const now = Date.now();
      const existing = await queryOne<any>('SELECT * FROM user_badges WHERE user_id = ? AND badge_id = ?', [user.id, badgeId]);

      if (existing) {
        await executeSql('UPDATE user_badges SET custom_name = ?, updated_at = ? WHERE id = ?', [cleanName, now, existing.id]);
      } else {
        const ubId = `ub_${now}_${Math.random().toString(36).substring(2, 6)}`;
        await executeSql(
          'INSERT INTO user_badges (id, user_id, badge_id, custom_name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
          [ubId, user.id, badgeId, cleanName, now, now]
        );
      }

      return res.json({ success: true, customName: cleanName });
    } catch (err) {
      console.error('[RENAME BADGE ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Gagal mengubah nama badge.' });
    }
  });

  // =========================================================================
  // JUKEBOX MUSIC API ROUTES (/api/v1/jukebox/*)
  // =========================================================================

  // Run schema migration for Jukebox tables safely using PRAGMA table_info
  (async () => {
    try {
      const cols = [
        { table: 'jukebox_playlist', name: 'source', def: 'source TEXT DEFAULT "youtube"' },
        { table: 'jukebox_playlist', name: 'video_id', def: 'video_id TEXT DEFAULT ""' },
        { table: 'jukebox_playlist', name: 'audio_expire_at', def: 'audio_expire_at INTEGER DEFAULT 0' },
        { table: 'jukebox_playlist', name: 'last_played_at', def: 'last_played_at INTEGER DEFAULT 0' },
        { table: 'jukebox_favorites', name: 'source', def: 'source TEXT DEFAULT "youtube"' },
        { table: 'jukebox_favorites', name: 'video_id', def: 'video_id TEXT DEFAULT ""' },
        { table: 'jukebox_favorites', name: 'audio_expire_at', def: 'audio_expire_at INTEGER DEFAULT 0' },
        { table: 'jukebox_favorites', name: 'last_played_at', def: 'last_played_at INTEGER DEFAULT 0' },
        { table: 'jukebox_last_played', name: 'source', def: 'source TEXT DEFAULT "youtube"' },
        { table: 'jukebox_last_played', name: 'video_id', def: 'video_id TEXT DEFAULT ""' },
        { table: 'jukebox_last_played', name: 'audio_expire_at', def: 'audio_expire_at INTEGER DEFAULT 0' },
      ];

      const tableCache: Record<string, string[]> = {};
      for (const item of cols) {
        if (!tableCache[item.table]) {
          const info = await queryAll<any>(`PRAGMA table_info(${item.table})`);
          tableCache[item.table] = (info || []).map((c: any) => String(c.name).toLowerCase());
        }
        if (!tableCache[item.table].includes(item.name.toLowerCase())) {
          try {
            await executeSql(`ALTER TABLE ${item.table} ADD COLUMN ${item.def}`);
            tableCache[item.table].push(item.name.toLowerCase());
          } catch (e) {}
        }
      }
    } catch (e) {}
  })();

  // 1. Get User Playlist
  app.get('/api/v1/jukebox/playlist', async (req, res) => {
    try {
      const userId = (req.query.userId as string) || '#1';

      const [playlistRows, favoriteRows] = await Promise.all([
        queryAll<any>(
          'SELECT * FROM jukebox_playlist WHERE user_id = ? ORDER BY created_at DESC',
          [userId]
        ),
        queryAll<any>(
          'SELECT * FROM jukebox_favorites WHERE user_id = ? ORDER BY created_at DESC',
          [userId]
        ),
      ]);

      // Love is the durable source of truth for the jukebox playlist.
      // If an older client/server failed to create the playlist row, the
      // loved track still appears after refresh.
      const merged = new Map<string, any>();

      for (const row of playlistRows || []) {
        merged.set(row.track_id, row);
      }

      for (const fav of favoriteRows || []) {
        if (!merged.has(fav.track_id)) {
          merged.set(fav.track_id, {
            ...fav,
            quality: fav.quality || '',
            is_favorite: 1,
          });
        }
      }

      return res.json({
        success: true,
        result: Array.from(merged.values()),
      });
    } catch (err) {
      console.error('[JUKEBOX PLAYLIST GET ERROR]:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to load jukebox playlist.',
      });
    }
  });

  // 2. Add to Playlist
  app.post('/api/v1/jukebox/playlist/add', async (req, res) => {
    try {
      const {
        userId = '#1',
        trackId,
        source = 'youtube',
        videoId = '',
        title,
        artist,
        thumbnail,
        downloadUrl,
        duration,
        quality,
        audioExpireAt = 0,
        lastPlayedAt = 0,
      } = req.body;

      if (!trackId) {
        return res.status(400).json({ success: false, message: 'Track ID required.' });
      }

      const now = Date.now();
      const existing = await queryOne<any>(
        'SELECT id FROM jukebox_playlist WHERE user_id = ? AND track_id = ?',
        [userId, trackId]
      );

      const vId = videoId || trackId;

      if (!existing) {
        const id = `jp_${now}_${Math.random().toString(36).substring(2, 6)}`;
        await executeSql(
          'INSERT INTO jukebox_playlist (id, user_id, track_id, source, video_id, title, artist, thumbnail, download_url, duration, quality, audio_expire_at, created_at, last_played_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            id,
            userId,
            trackId,
            source || 'youtube',
            vId,
            title || 'Music Track',
            artist || 'Artist',
            thumbnail || '',
            downloadUrl || '',
            duration || '',
            quality || '',
            audioExpireAt || 0,
            now,
            lastPlayedAt || 0,
          ]
        );
      } else {
        await executeSql(
          'UPDATE jukebox_playlist SET download_url = ?, audio_expire_at = ?, thumbnail = ? WHERE user_id = ? AND track_id = ?',
          [downloadUrl || '', audioExpireAt || 0, thumbnail || '', userId, trackId]
        );
      }
      return res.json({ success: true, message: 'Track added to playlist.' });
    } catch (err) {
      console.error('[JUKEBOX PLAYLIST ADD ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to add to playlist.' });
    }
  });

  // 3. Remove from Playlist
  app.post('/api/v1/jukebox/playlist/remove', async (req, res) => {
    try {
      const { userId = '#1', trackId } = req.body;
      if (!trackId) {
        return res.status(400).json({ success: false, message: 'Track ID required.' });
      }
      await executeSql('DELETE FROM jukebox_playlist WHERE user_id = ? AND track_id = ?', [userId, trackId]);
      return res.json({ success: true, message: 'Track removed from playlist.' });
    } catch (err) {
      console.error('[JUKEBOX PLAYLIST REMOVE ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to remove from playlist.' });
    }
  });

  // 4. Get User Favorites
  app.get('/api/v1/jukebox/favorites', async (req, res) => {
    try {
      const userId = (req.query.userId as string) || '#1';
      const items = await queryAll<any>(
        'SELECT * FROM jukebox_favorites WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      return res.json({ success: true, result: items || [] });
    } catch (err) {
      console.error('[JUKEBOX FAVORITES GET ERROR]:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to load jukebox favorites.',
      });
    }
  });

  // 5. Toggle Favorite
  app.post('/api/v1/jukebox/favorites/toggle', async (req, res) => {
    try {
      const {
        userId = '#1',
        trackId,
        source = 'youtube',
        videoId = '',
        title,
        artist,
        thumbnail,
        downloadUrl,
        duration,
        audioExpireAt = 0,
        lastPlayedAt = 0,
      } = req.body;

      if (!trackId) {
        return res.status(400).json({ success: false, message: 'Track ID required.' });
      }

      const now = Date.now();
      const existing = await queryOne<any>(
        'SELECT id FROM jukebox_favorites WHERE user_id = ? AND track_id = ?',
        [userId, trackId]
      );

      let isFavorite = false;

      if (existing) {
        // Unlike = remove Love AND remove the corresponding playlist entry.
        await executeSql(
          'DELETE FROM jukebox_favorites WHERE id = ?',
          [existing.id]
        );
        await executeSql(
          'DELETE FROM jukebox_playlist WHERE user_id = ? AND track_id = ?',
          [userId, trackId]
        );
        isFavorite = false;
      } else {
        const id = `jf_${now}_${Math.random().toString(36).substring(2, 6)}`;
        const vId = videoId || trackId;

        await executeSql(
          'INSERT INTO jukebox_favorites (id, user_id, track_id, source, video_id, title, artist, thumbnail, download_url, duration, audio_expire_at, created_at, last_played_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            id,
            userId,
            trackId,
            source || 'youtube',
            vId,
            title || 'Music Track',
            artist || 'Artist',
            thumbnail || '',
            downloadUrl || '',
            duration || '',
            audioExpireAt || 0,
            now,
            lastPlayedAt || 0,
          ]
        );

        // Persist the playlist row in the SAME server operation as Love.
        // download_url may be empty for Spotify until the user presses Play;
        // the player refreshes it from the Spotify URL/ID later.
        const existingPlaylist = await queryOne<any>(
          'SELECT id FROM jukebox_playlist WHERE user_id = ? AND track_id = ?',
          [userId, trackId]
        );

        if (!existingPlaylist) {
          const playlistId = `jp_${now}_${Math.random().toString(36).substring(2, 6)}`;

          await executeSql(
            'INSERT INTO jukebox_playlist (id, user_id, track_id, source, video_id, title, artist, thumbnail, download_url, duration, quality, audio_expire_at, created_at, last_played_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              playlistId,
              userId,
              trackId,
              source || 'youtube',
              vId,
              title || 'Music Track',
              artist || 'Artist',
              thumbnail || '',
              downloadUrl || '',
              duration || '',
              '',
              audioExpireAt || 0,
              now,
              lastPlayedAt || 0,
            ]
          );
        } else {
          await executeSql(
            'UPDATE jukebox_playlist SET source = ?, video_id = ?, title = ?, artist = ?, thumbnail = ?, download_url = ?, duration = ?, audio_expire_at = ?, last_played_at = ? WHERE user_id = ? AND track_id = ?',
            [
              source || 'youtube',
              vId,
              title || 'Music Track',
              artist || 'Artist',
              thumbnail || '',
              downloadUrl || '',
              duration || '',
              audioExpireAt || 0,
              lastPlayedAt || 0,
              userId,
              trackId,
            ]
          );
        }

        isFavorite = true;
      }

      return res.json({
        success: true,
        isFavorite,
        message: isFavorite ? 'Added to favorites.' : 'Removed from favorites.',
      });
    } catch (err) {
      console.error('[JUKEBOX FAVORITE TOGGLE ERROR]:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to toggle favorite.',
      });
    }
  });

  // 6. Update Expired Track URL in Database
  app.post('/api/v1/jukebox/track/update-url', async (req, res) => {
    try {
      const { userId = '#1', trackId, downloadUrl, audioExpireAt = 0, lastPlayedAt = Date.now() } = req.body;
      if (!trackId || !downloadUrl) {
        return res.status(400).json({ success: false, message: 'Track ID and download URL required.' });
      }

      await executeSql(
        'UPDATE jukebox_playlist SET download_url = ?, audio_expire_at = ?, last_played_at = ? WHERE user_id = ? AND track_id = ?',
        [downloadUrl, audioExpireAt, lastPlayedAt, userId, trackId]
      );

      await executeSql(
        'UPDATE jukebox_favorites SET download_url = ?, audio_expire_at = ?, last_played_at = ? WHERE user_id = ? AND track_id = ?',
        [downloadUrl, audioExpireAt, lastPlayedAt, userId, trackId]
      );

      await executeSql(
        'UPDATE jukebox_last_played SET download_url = ?, audio_expire_at = ?, updated_at = ? WHERE user_id = ? AND track_id = ?',
        [downloadUrl, audioExpireAt, lastPlayedAt, userId, trackId]
      );

      return res.json({ success: true, message: 'Track audio URL refreshed successfully.' });
    } catch (err) {
      console.error('[JUKEBOX UPDATE TRACK URL ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to update track URL.' });
    }
  });

  // 6. Get Play History
  app.get('/api/v1/jukebox/history', async (req, res) => {
    try {
      const userId = (req.query.userId as string) || '#1';
      const items = await queryAll<any>(
        'SELECT * FROM jukebox_history WHERE user_id = ? ORDER BY played_at DESC LIMIT 30',
        [userId]
      );
      return res.json({ success: true, result: items || [] });
    } catch (err) {
      console.error('[JUKEBOX HISTORY GET ERROR]:', err);
      return res.json({ success: true, result: [] });
    }
  });

  // 7. Add Play History
  app.post('/api/v1/jukebox/history/add', async (req, res) => {
    try {
      const { userId = '#1', trackId, title, artist, thumbnail, downloadUrl, duration } = req.body;
      if (!trackId || !downloadUrl) {
        return res.status(400).json({ success: false, message: 'Track ID and download URL required.' });
      }
      const now = Date.now();
      const id = `jh_${now}_${Math.random().toString(36).substring(2, 6)}`;
      await executeSql(
        'INSERT INTO jukebox_history (id, user_id, track_id, title, artist, thumbnail, download_url, duration, played_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, userId, trackId, title || 'Music Track', artist || 'Artist', thumbnail || '', downloadUrl, duration || '', now]
      );
      return res.json({ success: true, message: 'Play history recorded.' });
    } catch (err) {
      console.error('[JUKEBOX HISTORY ADD ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to record history.' });
    }
  });

  // 8. Get Last Played Song
  app.get('/api/v1/jukebox/last-played', async (req, res) => {
    try {
      const userId = (req.query.userId as string) || '#1';
      const item = await queryOne<any>(
        'SELECT * FROM jukebox_last_played WHERE user_id = ?',
        [userId]
      );
      return res.json({ success: true, result: item || null });
    } catch (err) {
      console.error('[JUKEBOX LAST PLAYED GET ERROR]:', err);
      return res.json({ success: true, result: null });
    }
  });

  // 9. Save Last Played Song
  app.post('/api/v1/jukebox/last-played/save', async (req, res) => {
    try {
      const { userId = '#1', trackId, title, artist, thumbnail, downloadUrl, duration, progress = 0 } = req.body;
      if (!trackId) {
        return res.status(400).json({ success: false, message: 'Track ID required.' });
      }
      const now = Date.now();
      await executeSql(
        'INSERT OR REPLACE INTO jukebox_last_played (user_id, track_id, title, artist, thumbnail, download_url, duration, progress, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, trackId, title || 'Music Track', artist || 'Artist', thumbnail || '', downloadUrl || '', duration || '', Math.floor(progress), now]
      );
      return res.json({ success: true, message: 'Last played saved.' });
    } catch (err) {
      console.error('[JUKEBOX LAST PLAYED SAVE ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to save last played.' });
    }
  });

  // 10. Get Layout Settings (Position, Size, Collapse)
  app.get('/api/v1/jukebox/settings', async (req, res) => {
    try {
      const userId = (req.query.userId as string) || '#1';
      const row = await queryOne<any>(
        'SELECT * FROM jukebox_layout_settings WHERE user_id = ?',
        [userId]
      );
      return res.json({ success: true, result: row || null });
    } catch (err) {
      console.error('[JUKEBOX SETTINGS GET ERROR]:', err);
      return res.json({ success: true, result: null });
    }
  });

  // 11. Save Layout Settings
  app.post('/api/v1/jukebox/settings/save', async (req, res) => {
    try {
      const { userId = '#1', posX = 20, posY = 20, width = 480, height = 200, isCollapsed = false } = req.body;
      const now = Date.now();
      await executeSql(
        'INSERT OR REPLACE INTO jukebox_layout_settings (user_id, pos_x, pos_y, width, height, is_collapsed, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, Math.round(posX), Math.round(posY), Math.round(width), Math.round(height), isCollapsed ? 1 : 0, now]
      );
      return res.json({ success: true, message: 'Layout settings saved.' });
    } catch (err) {
      console.error('[JUKEBOX SETTINGS SAVE ERROR]:', err);
      return res.status(500).json({ success: false, message: 'Failed to save layout settings.' });
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
