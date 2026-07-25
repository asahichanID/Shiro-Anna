import 'dotenv/config';

/**
 * Supabase-primary database bridge with local D1/sql.js backup.
 * - Supabase is the primary source of truth when SUPABASE_URL + SUPABASE_ANON_KEY are available.
 * - Local sql.js D1 remains the fallback and offline backup.
 */

import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_FILE_PATH = path.join(process.cwd(), 'd1_database.sqlite');
const SCHEMA_FILE_PATH = path.join(process.cwd(), 'schema.sql');

const SUPABASE_URL =
  (process.env.SUPABASE_URL || 'https://liecstkcclpkjkdqkvga.supabase.co').replace(/\/+$/, '');
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || 'sb_publishable_1BE8rNRK67AGBnt2jGT6iw_iIPHWXLz';
const SUPABASE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const REMOTE_CACHE_TTL_MS = 5000;

type Row = Record<string, any>;
type FilterOp = 'eq' | 'neq' | 'gte' | 'gt' | 'lte' | 'lt' | 'ilike';

interface RemoteCacheEntry {
  rows: Row[];
  fetchedAt: number;
}

let dbInstance: Database | null = null;
const remoteTableCache = new Map<string, RemoteCacheEntry>();

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase();
}

function safeNumber(value: any, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toText(value: any): string {
  return value === undefined || value === null ? '' : String(value);
}

function isSupabaseReady(): boolean {
  return SUPABASE_ENABLED;
}

async function supabaseFetchJson<T = any>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers || {}),
    },
  });

  const text = await res.text();
  let payload: any = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const message =
      (payload && typeof payload === 'object' && (payload.message || payload.error || payload.details)) ||
      `Supabase REST request failed with HTTP ${res.status}`;
    throw new Error(message);
  }

  return payload as T;
}

function buildRestUrl(
  table: string,
  options: {
    select?: string;
    filters?: Array<[string, FilterOp, string | number | boolean]>;
    order?: { column: string; ascending?: boolean };
    limit?: number;
  } = {}
): string {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set('select', options.select || '*');

  for (const [column, op, value] of options.filters || []) {
    url.searchParams.set(column, `${op}.${value}`);
  }

  if (options.order) {
    url.searchParams.set('order', `${options.order.column}.${options.order.ascending === false ? 'desc' : 'asc'}`);
  }

  if (options.limit !== undefined) {
    url.searchParams.set('limit', String(options.limit));
  }

  return url.toString();
}

async function remoteTableRows<T = any>(
  table: string,
  options: {
    select?: string;
    filters?: Array<[string, FilterOp, string | number | boolean]>;
    order?: { column: string; ascending?: boolean };
    limit?: number;
    cache?: boolean;
  } = {}
): Promise<T[] | null> {
  if (!isSupabaseReady()) return null;

  const cacheKey = JSON.stringify({ table, ...options });
  const cached = remoteTableCache.get(cacheKey);
  if (options.cache !== false && cached && Date.now() - cached.fetchedAt < REMOTE_CACHE_TTL_MS) {
    return cached.rows as T[];
  }

  try {
    const url = buildRestUrl(table, options);
    const rows = await supabaseFetchJson<T[]>(url, { method: 'GET' });

    if (options.cache !== false) {
      remoteTableCache.set(cacheKey, { rows: Array.isArray(rows) ? rows : [], fetchedAt: Date.now() });
    }

    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.error(`[SUPABASE SELECT ERROR] ${table}:`, err);
    return null;
  }
}

async function remoteUpsertRows(
  table: string,
  rows: Row | Row[],
  conflictKey = 'id'
): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    url.searchParams.set('on_conflict', conflictKey);

    await supabaseFetchJson(url.toString(), {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
    });

    remoteTableCache.clear();
    return true;
  } catch (err) {
    console.error(`[SUPABASE UPSERT ERROR] ${table}:`, err);
    return false;
  }
}

async function remoteInsertRows(table: string, rows: Row | Row[]): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  try {
    await supabaseFetchJson(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        Prefer: 'return=representation',
      },
      body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
    });

    remoteTableCache.clear();
    return true;
  } catch (err) {
    console.error(`[SUPABASE INSERT ERROR] ${table}:`, err);
    return false;
  }
}

async function remoteUpdateRows(
  table: string,
  patch: Row,
  filters: Array<[string, FilterOp, string | number | boolean]>
): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  try {
    const url = buildRestUrl(table, { filters });
    await supabaseFetchJson(url, {
      method: 'PATCH',
      headers: {
        Prefer: 'return=representation',
      },
      body: JSON.stringify(patch),
    });

    remoteTableCache.clear();
    return true;
  } catch (err) {
    console.error(`[SUPABASE UPDATE ERROR] ${table}:`, err);
    return false;
  }
}

async function remoteDeleteRows(
  table: string,
  filters: Array<[string, FilterOp, string | number | boolean]>
): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  try {
    const url = buildRestUrl(table, { filters });
    await supabaseFetchJson(url, {
      method: 'DELETE',
      headers: {
        Prefer: 'return=minimal',
      },
    });

    remoteTableCache.clear();
    return true;
  } catch (err) {
    console.error(`[SUPABASE DELETE ERROR] ${table}:`, err);
    return false;
  }
}

function pickNewest(rows: Row[], key: string): Row | null {
  if (!rows.length) return null;
  return [...rows].sort((a, b) => safeNumber(b?.[key]) - safeNumber(a?.[key]))[0] || null;
}

function sortBy(rows: Row[], key: string, direction: 'asc' | 'desc' = 'asc'): Row[] {
  return [...rows].sort((a, b) => {
    const av = a?.[key];
    const bv = b?.[key];

    const an = Number(av);
    const bn = Number(bv);

    if (Number.isFinite(an) && Number.isFinite(bn)) {
      return direction === 'asc' ? an - bn : bn - an;
    }

    const as = toText(av);
    const bs = toText(bv);
    return direction === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
  });
}

function localJoinUsersWithPresence(users: Row[], presenceRows: Row[]): Row[] {
  const presenceMap = new Map<string, Row>();
  for (const row of presenceRows) {
    presenceMap.set(toText(row.user_id), row);
  }

  return sortBy(users, 'created_at', 'asc').map((u) => {
    const p = presenceMap.get(toText(u.id));
    const now = Date.now();
    const isRecentlyActive = p?.last_active && now - safeNumber(p.last_active) < 35000;
    const resolvedStatus = isRecentlyActive ? (p?.status || 'Online') : (u.status === 'Away' ? 'Away' : 'Offline');

    return {
      ...u,
      liveStatus: resolvedStatus,
      lastActive: p?.last_active || u.lastSeen || u.last_active || u.updated_at || u.created_at || now,
    };
  });
}

function localCount(rows: Row[]): { count: number }[] {
  return [{ count: rows.length }];
}

async function getLocalDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE_PATH)) {
    const fileBuffer = fs.readFileSync(DB_FILE_PATH);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  if (fs.existsSync(SCHEMA_FILE_PATH)) {
    const schemaSql = fs.readFileSync(SCHEMA_FILE_PATH, 'utf-8');
    dbInstance.run(schemaSql);
    saveD1Database();
  }

  return dbInstance;
}

export async function getD1Database(): Promise<Database> {
  try {
    return await getLocalDb();
  } catch (err) {
    console.error('[D1 DATABASE ENGINE INITIALIZATION ERROR]:', err);
    throw err;
  }
}

export function saveD1Database() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE_PATH, buffer);
  } catch (err) {
    console.error('[D1 DATABASE PERSISTENCE SAVE ERROR]:', err);
  }
}

async function queryLocalAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    const db = await getD1Database();
    const stmt = db.prepare(sql);
    stmt.bind(params);

    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return results;
  } catch (err) {
    console.error(`[D1 SELECT QUERY ERROR] SQL: "${sql}" Params:`, params, 'Error:', err);
    throw err;
  }
}

async function queryLocalOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await queryLocalAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

async function executeLocalSql(sql: string, params: any[] = []): Promise<{ success: boolean; changes: number }> {
  try {
    const db = await getD1Database();
    db.run(sql, params);
    saveD1Database();
    return { success: true, changes: db.getRowsModified() };
  } catch (err) {
    console.error(`[D1 EXECUTE SQL ERROR] SQL: "${sql}" Params:`, params, 'Error:', err);
    throw err;
  }
}

async function querySupabaseAll<T = any>(sql: string, params: any[] = []): Promise<T[] | null> {
  const normalized = normalizeSql(sql);
  if (!isSupabaseReady()) return null;

  try {
    // USERS + PRESENCE JOIN
    if (normalized.includes('from users u left join presence p on u.id = p.user_id')) {
      const users = await remoteTableRows<Row>('users', { order: { column: 'created_at', ascending: true } });
      const presence = await remoteTableRows<Row>('presence', { cache: true });
      if (!users || !presence) return null;
      return localJoinUsersWithPresence(users, presence) as T[];
    }

    // USERS
    if (normalized.includes('select count(*) as count from users')) {
      const users = await remoteTableRows<Row>('users', { cache: true });
      if (!users) return null;
      return localCount(users) as T[];
    }

    if (normalized.includes('from users where id = ? or lower(username) = lower(?)')) {
      const [id, username] = params;
      const users = (await remoteTableRows<Row>('users', { cache: true })) || [];
      const target = toText(username).toLowerCase();
      const filtered = users.filter(
        (u) => toText(u.id) === toText(id) || toText(u.username).toLowerCase() === target
      );
      return filtered as T[];
    }

    if (normalized.includes('from users where id = ?')) {
      const [id] = params;
      const users = (await remoteTableRows<Row>('users', { cache: true })) || [];
      return users.filter((u) => toText(u.id) === toText(id)) as T[];
    }

    if (normalized.includes('from users where id != ?')) {
      const [id] = params;
      const users = (await remoteTableRows<Row>('users', { cache: true })) || [];
      return users.filter((u) => toText(u.id) !== toText(id)) as T[];
    }

    // FRIENDS
    if (normalized.includes('from friends where user_id = ?')) {
      const [userId] = params;
      const friends = (await remoteTableRows<Row>('friends', { cache: true })) || [];
      return friends.filter((f) => toText(f.user_id) === toText(userId)) as T[];
    }

    // GLOBAL CHAT
    if (normalized.includes('from global_messages')) {
      const messages = (await remoteTableRows<Row>('global_messages', { cache: true })) || [];
      const since = params.length > 0 ? safeNumber(params[0]) : 0;
      const filtered = normalized.includes('timestamp > ?')
        ? messages.filter((m) => safeNumber(m.timestamp) > since)
        : messages;
      return sortBy(filtered, 'timestamp', 'asc').slice(0, 100) as T[];
    }

    // DIRECT CHAT
    if (normalized.includes('from messages where room_id = ?')) {
      const [roomId] = params;
      const messages = (await remoteTableRows<Row>('messages', { cache: true })) || [];
      return sortBy(
        messages.filter((m) => toText(m.room_id) === toText(roomId)),
        'timestamp',
        'asc'
      ) as T[];
    }

    // ACTIVITY LOGS
    if (normalized.includes('from activity_logs')) {
      const logs = (await remoteTableRows<Row>('activity_logs', { cache: true })) || [];
      let filtered = logs;

      if (normalized.includes('timestamp > ?')) {
        const since = safeNumber(params[0]);
        filtered = filtered.filter((l) => safeNumber(l.timestamp) > since);
      }

      const limitMatch = normalized.match(/limit\s+(\d+)\b/);
      const limit = limitMatch ? Number(limitMatch[1]) : params.length > 0 && normalized.includes('limit ?') ? safeNumber(params[0]) : undefined;

      filtered = sortBy(filtered, 'timestamp', 'desc');
      return (typeof limit === 'number' ? filtered.slice(0, limit) : filtered) as T[];
    }

    // DEVELOPER SETTINGS
    if (normalized.includes('select setting_key, setting_value from developer_settings')) {
      const settings = (await remoteTableRows<Row>('developer_settings', { cache: true })) || [];
      const filtered = normalized.includes('like "shop_%"')
        ? settings.filter((s) => toText(s.setting_key).startsWith('shop_'))
        : settings;
      return filtered.map((s) => ({ setting_key: s.setting_key, setting_value: s.setting_value })) as T[];
    }

    // DUEL
    if (normalized.includes('from duel order by updated_at desc limit 1')) {
      const duels = (await remoteTableRows<Row>('duel', { cache: true })) || [];
      const newest = pickNewest(duels, 'updated_at');
      return newest ? ([newest] as T[]) : [];
    }

    if (normalized.includes('from duel where id = ?')) {
      const [id] = params;
      const duels = (await remoteTableRows<Row>('duel', { cache: true })) || [];
      return duels.filter((d) => toText(d.id) === toText(id)) as T[];
    }

    // NOTIFICATIONS
    if (normalized.includes('from notifications where user_id = ?')) {
      const [userId] = params;
      const notifications = (await remoteTableRows<Row>('notifications', { cache: true })) || [];
      return sortBy(
        notifications.filter((n) => toText(n.user_id) === toText(userId)),
        'created_at',
        'desc'
      ) as T[];
    }

    // BOT PROFILE
    if (normalized.includes('from bot_profile where id = \'default\'') || normalized.includes('from bot_profile where id = "default"')) {
      const rows = (await remoteTableRows<Row>('bot_profile', { cache: true })) || [];
      return rows.filter((r) => toText(r.id) === 'default') as T[];
    }

    // DEVELOPER BADGE
    if (normalized.includes('from developer_badge where id = \'dev_badge_main\'') || normalized.includes('from developer_badge where id = "dev_badge_main"')) {
      const rows = (await remoteTableRows<Row>('developer_badge', { cache: true })) || [];
      return rows.filter((r) => toText(r.id) === 'dev_badge_main') as T[];
    }

    // SHOP PRODUCTS
    if (normalized.includes('from shop_products')) {
      const products = (await remoteTableRows<Row>('shop_products', { cache: true })) || [];
      if (normalized.includes('where id = ?')) {
        const [id] = params;
        return products.filter((p) => toText(p.id) === toText(id)) as T[];
      }
      return sortBy(products, 'created_at', 'asc').sort((a, b) => {
        const ao = safeNumber(a.sort_order);
        const bo = safeNumber(b.sort_order);
        if (ao !== bo) return ao - bo;
        return safeNumber(a.created_at) - safeNumber(b.created_at);
      }) as T[];
    }

    // SHOP ORDERS
    if (normalized.includes('from shop_orders')) {
      const orders = (await remoteTableRows<Row>('shop_orders', { cache: true })) || [];
      let filtered = orders;
      let paramIndex = 0;

      if (normalized.includes('where id = ?')) {
        const [id] = params;
        filtered = filtered.filter((o) => toText(o.id) === toText(id));
      } else {
        if (normalized.includes('where user_id = ?')) {
          const userId = params[paramIndex++];
          filtered = filtered.filter((o) => toText(o.user_id) === toText(userId));
        }

        if (normalized.includes('status = ?') && !normalized.includes('status != ?')) {
          const status = params[paramIndex++];
          filtered = filtered.filter((o) => toText(o.status) === toText(status));
        }

        if (normalized.includes('timestamp >= ? and status != "rejected"')) {
          const since = params[paramIndex++];
          filtered = filtered.filter(
            (o) => safeNumber(o.timestamp) >= safeNumber(since) && toText(o.status).toLowerCase() !== 'rejected'
          );
        } else if (normalized.includes('created_at >= ?')) {
          const since = params[paramIndex++];
          filtered = filtered.filter((o) => safeNumber(o.created_at) >= safeNumber(since));
        }

        if (normalized.includes('status = "pending"')) {
          filtered = filtered.filter((o) => toText(o.status) === 'Pending');
        } else if (normalized.includes('status = "processing"')) {
          filtered = filtered.filter((o) => toText(o.status) === 'Processing');
        } else if (normalized.includes('status = "success"')) {
          filtered = filtered.filter((o) => toText(o.status) === 'Success');
        } else if (normalized.includes('status = "rejected"')) {
          filtered = filtered.filter((o) => toText(o.status) === 'Rejected');
        } else if (normalized.includes('status != "rejected"')) {
          filtered = filtered.filter((o) => toText(o.status) !== 'Rejected');
        }
      }

      if (normalized.includes('sum(coins) as total')) {
        return [{ total: filtered.reduce((sum, o) => sum + safeNumber(o.coins), 0) }] as T[];
      }

      if (normalized.includes('count(*) as count')) {
        return [{ count: filtered.length }] as T[];
      }

      return sortBy(filtered, 'timestamp', 'desc') as T[];
    }

    // COIN HISTORY
    if (normalized.includes('from coin_history')) {
      const history = (await remoteTableRows<Row>('coin_history', { cache: true })) || [];
      let filtered = history;

      if (normalized.includes('where user_id = ? or lower(user_name) = lower(?)')) {
        const [userId, userName] = params;
        const target = toText(userName).toLowerCase();
        filtered = history.filter(
          (row) => toText(row.user_id) === toText(userId) || toText(row.user_name).toLowerCase() === target
        );
      } else if (normalized.includes('where user_id = ?')) {
        const [userId] = params;
        filtered = history.filter((row) => toText(row.user_id) === toText(userId));
      }

      if (normalized.includes('order by timestamp desc')) {
        filtered = sortBy(filtered, 'timestamp', 'desc');
      }

      const limitMatch = normalized.match(/limit\s+(\d+)\b/);
      const limit = limitMatch ? Number(limitMatch[1]) : undefined;
      if (typeof limit === 'number') filtered = filtered.slice(0, limit);

      return filtered as T[];
    }

    // PRESENCE
    if (normalized.includes('from presence')) {
      const rows = (await remoteTableRows<Row>('presence', { cache: true })) || [];
      if (normalized.includes('where user_id = ?')) {
        const [userId] = params;
        return rows.filter((r) => toText(r.user_id) === toText(userId)) as T[];
      }
      return rows as T[];
    }

    return null;
  } catch (err) {
    console.error(`[SUPABASE SELECT FALLBACK ERROR] SQL: "${sql}" Params:`, params, 'Error:', err);
    return null;
  }
}

async function executeSupabaseSql(sql: string, params: any[] = []): Promise<boolean | null> {
  const normalized = normalizeSql(sql);
  if (!isSupabaseReady()) return null;

  try {
    // USERS
    if (normalized.startsWith('insert into users ')) {
      const [id, username, role, avatar, coins, totalGame, win, lose, status, lastSeen, device, browser, createdAt, updatedAt] = params;
      return await remoteUpsertRows(
        'users',
        {
          id,
          username,
          role,
          avatar,
          coins,
          totalGame,
          win,
          lose,
          status,
          lastSeen,
          device,
          browser,
          created_at: createdAt,
          updated_at: updatedAt,
        },
        'id'
      );
    }

    if (normalized.startsWith('update users set status = ?, lastseen = ?, avatar = ?, coins = ?, totalgame = ?, win = ?, lose = ?, device = ?, browser = ?, updated_at = ? where id = ?')) {
      const [status, lastSeen, avatar, coins, totalGame, win, lose, device, browser, updatedAt, id] = params;
      return await remoteUpdateRows(
        'users',
        { status, lastSeen, avatar, coins, totalGame, win, lose, device, browser, updated_at: updatedAt },
        [['id', 'eq', id]]
      );
    }

    if (normalized.startsWith('update users set username = ?, role = ?, avatar = ?, coins = ?, totalgame = ?, win = ?, lose = ?, status = ?, updated_at = ? where id = ?')) {
      const [username, role, avatar, coins, totalGame, win, lose, status, updatedAt, id] = params;
      return await remoteUpdateRows(
        'users',
        { username, role, avatar, coins, totalGame, win, lose, status, updated_at: updatedAt },
        [['id', 'eq', id]]
      );
    }

    if (normalized.startsWith('insert or replace into presence ')) {
      const [userId, status, lastActive] = params;
      return await remoteUpsertRows(
        'presence',
        { user_id: userId, status, last_active: lastActive },
        'user_id'
      );
    }

    if (normalized.startsWith('insert into activity_logs ')) {
      const [id, userId, userName, category, type, title, detail, time, timestamp, createdAt] = params;
      return await remoteInsertRows('activity_logs', {
        id,
        user_id: userId,
        user_name: userName,
        category,
        type,
        title,
        detail,
        time,
        timestamp,
        created_at: createdAt,
      });
    }

    if (normalized.startsWith('insert or replace into friends ')) {
      const [id, userId, friendId, username, avatar, bio, status, role, isOnline, createdAt, updatedAt] = params;
      return await remoteUpsertRows(
        'friends',
        {
          id,
          user_id: userId,
          friend_id: friendId,
          username,
          avatar,
          bio,
          status,
          role,
          isOnline,
          created_at: createdAt,
          updated_at: updatedAt,
        },
        'id'
      );
    }

    if (normalized.startsWith('delete from friends where user_id = ? and friend_id = ?')) {
      const [userId, friendId] = params;
      return await remoteDeleteRows('friends', [
        ['user_id', 'eq', userId],
        ['friend_id', 'eq', friendId],
      ]);
    }

    if (normalized.startsWith('insert into global_messages ')) {
      const [id, senderId, senderName, senderRole, senderAvatar, text, isDuelAnswer, time, timestamp, createdAt] = params;
      return await remoteInsertRows('global_messages', {
        id,
        sender_id: senderId,
        sender_name: senderName,
        sender_role: senderRole,
        sender_avatar: senderAvatar,
        text,
        is_duel_answer: isDuelAnswer,
        time,
        timestamp,
        created_at: createdAt,
      });
    }

    if (normalized.startsWith('insert into messages ')) {
      const [id, roomId, senderId, receiverId, text, time, timestamp, createdAt] = params;
      return await remoteInsertRows('messages', {
        id,
        room_id: roomId,
        sender_id: senderId,
        receiver_id: receiverId,
        text,
        time,
        timestamp,
        status: 'sent',
        is_read: 0,
        created_at: createdAt,
        updated_at: createdAt,
      });
    }

    if (normalized.startsWith('update messages set is_read = 1, status = "read" where room_id = ? and receiver_id = ?')) {
      const [roomId, receiverId] = params;
      return await remoteUpdateRows(
        'messages',
        { is_read: 1, status: 'read' },
        [
          ['room_id', 'eq', roomId],
          ['receiver_id', 'eq', receiverId],
        ]
      );
    }

    if (normalized.startsWith('insert into developer_settings ') && normalized.includes('on conflict(setting_key) do update')) {
      const [id, settingKey, settingValue, updatedAt] = params;
      return await remoteUpsertRows(
        'developer_settings',
        { id, setting_key: settingKey, setting_value: settingValue, updated_at: updatedAt, created_at: updatedAt },
        'setting_key'
      );
    }

    if (normalized.startsWith('insert or replace into duel ')) {
      const [id, status, challengerId, challengerName, opponentId, opponentName, currentRound, totalRounds, scoreP1, scoreP2, currentQuestion, updatedAt] = params;
      return await remoteUpsertRows(
        'duel',
        {
          id,
          status,
          challenger_id: challengerId,
          challenger_name: challengerName,
          opponent_id: opponentId,
          opponent_name: opponentName,
          current_round: currentRound,
          total_rounds: totalRounds,
          score_p1: scoreP1,
          score_p2: scoreP2,
          current_question: currentQuestion,
          updated_at: updatedAt,
        },
        'id'
      );
    }

    if (normalized.startsWith('update duel set status = coalesce(')) {
      const [status, scoreP1, scoreP2, currentRound, totalRounds, currentQuestion, winnerId, updatedAt, id] = params;
      return await remoteUpdateRows(
        'duel',
        {
          status,
          score_p1: scoreP1,
          score_p2: scoreP2,
          current_round: currentRound,
          total_rounds: totalRounds,
          current_question: currentQuestion,
          winner_id: winnerId,
          updated_at: updatedAt,
        },
        [['id', 'eq', id]]
      );
    }

    if (normalized.startsWith('insert into notifications ')) {
      const [id, userId, title, body, type, createdAt] = params;
      return await remoteInsertRows('notifications', {
        id,
        user_id: userId,
        title,
        body,
        type,
        is_read: 0,
        timestamp: createdAt,
        created_at: createdAt,
      });
    }

    if (normalized.startsWith('insert or replace into bot_profile ')) {
      const [name, avatar, bio, status, updatedAt] = params;
      return await remoteUpsertRows(
        'bot_profile',
        {
          id: 'default',
          name,
          avatar,
          bio,
          status,
          updated_at: updatedAt,
          created_at: updatedAt,
        },
        'id'
      );
    }

    if (normalized.startsWith('insert or replace into developer_badge ')) {
      const [userId, badgeName, themeId, icon, effect, updatedAt] = params;
      return await remoteUpsertRows(
        'developer_badge',
        {
          id: 'dev_badge_main',
          user_id: userId,
          badge_name: badgeName,
          theme_id: themeId,
          icon,
          effect,
          updated_at: updatedAt,
          created_at: updatedAt,
        },
        'id'
      );
    }

    if (normalized.startsWith('insert into shop_products ')) {
      const [id, name, description, duration, coins, stock, isActive, sortOrder, createdAt, updatedAt] = params;
      return await remoteUpsertRows(
        'shop_products',
        {
          id,
          name,
          description,
          duration,
          coins,
          stock,
          is_active: isActive,
          sort_order: sortOrder,
          created_at: createdAt,
          updated_at: updatedAt,
        },
        'id'
      );
    }

    if (normalized.startsWith('update shop_products set name = ?, description = ?, duration = ?, coins = ?, stock = ?, is_active = ?, sort_order = ?, updated_at = ? where id = ?')) {
      const [name, description, duration, coins, stock, isActive, sortOrder, updatedAt, id] = params;
      return await remoteUpdateRows(
        'shop_products',
        {
          name,
          description,
          duration,
          coins,
          stock,
          is_active: isActive,
          sort_order: sortOrder,
          updated_at: updatedAt,
        },
        [['id', 'eq', id]]
      );
    }

    if (normalized.startsWith('delete from shop_products where id = ?')) {
      const [id] = params;
      return await remoteDeleteRows('shop_products', [['id', 'eq', id]]);
    }

    if (normalized.startsWith('insert into shop_orders ')) {
      const [
        id,
        userId,
        userName,
        wibukuName,
        wibukuId,
        productId,
        productName,
        duration,
        coins,
        status,
        rejectionReason,
        refunded,
        timestamp,
        createdAt,
        updatedAt,
      ] = params;
      return await remoteInsertRows('shop_orders', {
        id,
        user_id: userId,
        user_name: userName,
        wibuku_name: wibukuName,
        wibuku_id: wibukuId,
        product_id: productId,
        product_name: productName,
        duration,
        coins,
        status,
        rejection_reason: rejectionReason,
        refunded,
        timestamp,
        created_at: createdAt,
        updated_at: updatedAt,
      });
    }

    if (normalized.startsWith('update shop_orders set status = ?, rejection_reason = ?, refunded = 1, updated_at = ? where id = ?')) {
      const [status, rejectionReason, updatedAt, id] = params;
      return await remoteUpdateRows(
        'shop_orders',
        { status, rejection_reason: rejectionReason, refunded: 1, updated_at: updatedAt },
        [['id', 'eq', id]]
      );
    }

    if (normalized.startsWith('update shop_orders set status = ?, rejection_reason = ?, updated_at = ? where id = ?')) {
      const [status, rejectionReason, updatedAt, id] = params;
      return await remoteUpdateRows(
        'shop_orders',
        { status, rejection_reason: rejectionReason, updated_at: updatedAt },
        [['id', 'eq', id]]
      );
    }

    if (normalized.startsWith('insert into coin_history ')) {
      const [id, userId, userName, type, title, amount, balanceAfter, detail, timestamp, createdAt] = params;
      return await remoteInsertRows('coin_history', {
        id,
        user_id: userId,
        user_name: userName,
        type,
        title,
        amount,
        balance_after: balanceAfter,
        detail,
        timestamp,
        created_at: createdAt,
      });
    }

    return null;
  } catch (err) {
    console.error(`[SUPABASE WRITE FALLBACK ERROR] SQL: "${sql}" Params:`, params, 'Error:', err);
    return null;
  }
}

/**
 * Helper to execute SELECT queries and return array of object rows
 */
export async function queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const remote = await querySupabaseAll<T>(sql, params);
  if (remote !== null) return remote;

  return queryLocalAll<T>(sql, params);
}

/**
 * Helper to execute SELECT single row
 */
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const remote = await querySupabaseAll<T>(sql, params);
  if (remote !== null) return remote.length > 0 ? remote[0] : null;

  return queryLocalOne<T>(sql, params);
}

/**
 * Helper to execute INSERT, UPDATE, DELETE queries
 */
export async function executeSql(sql: string, params: any[] = []): Promise<{ success: boolean; changes: number }> {
  let remoteSucceeded = false;
  const remote = await executeSupabaseSql(sql, params);

  if (remote === true) {
    remoteSucceeded = true;
  }

  try {
    const local = await executeLocalSql(sql, params);
    return {
      success: remoteSucceeded || local.success,
      changes: local.changes,
    };
  } catch (err) {
    if (remoteSucceeded) {
      return { success: true, changes: 0 };
    }
    console.error(`[D1 EXECUTE SQL ERROR] SQL: "${sql}" Params:`, params, 'Error:', err);
    throw err;
  }
}
