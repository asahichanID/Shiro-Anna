/**
 * Local Cloudflare D1 Emulation Engine using sql.js
 * Reads schema.sql on startup and persists data to d1_database.sqlite
 * Includes automatic database corruption recovery
 */

import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_FILE_PATH = path.join(process.cwd(), 'd1_database.sqlite');
const SCHEMA_FILE_PATH = path.join(process.cwd(), 'schema.sql');

let dbInstance: Database | null = null;
let sqlJsModule: any = null;

async function getSqlJs() {
  if (!sqlJsModule) {
    try {
      sqlJsModule = await initSqlJs({
        locateFile: (file: string) => path.join(process.cwd(), 'node_modules/sql.js/dist', file),
      });
    } catch (err) {
      console.warn('[D1 ENGINE] locateFile fallback for sql.js:', err);
      sqlJsModule = await initSqlJs();
    }
  }
  return sqlJsModule;
}

/**
 * Apply schema.sql to ensure all tables exist and apply incremental column migrations
 */
function applySchema(db: Database) {
  if (fs.existsSync(SCHEMA_FILE_PATH)) {
    const schemaSql = fs.readFileSync(SCHEMA_FILE_PATH, 'utf-8');
    db.run(schemaSql);
  }

  // Ensure user_sessions table exists
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_token TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        device TEXT,
        browser TEXT,
        started_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        last_heartbeat_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        ended_at INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        UNIQUE(user_id, session_token),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_updated ON user_sessions(updated_at);
    `);
  } catch (err) {
    console.warn('[D1 ENGINE] user_sessions setup check:', err);
  }

  // Safe ALTER TABLE for missing columns on legacy databases
  const alterColumns = [
    { table: 'users', col: 'account_code', type: 'TEXT DEFAULT ""' },
    { table: 'users', col: 'session_token', type: 'TEXT DEFAULT ""' },
    { table: 'users', col: 'session_active', type: 'INTEGER DEFAULT 0' },
    { table: 'activity_logs', col: 'updated_at', type: 'INTEGER DEFAULT 0' },
    { table: 'notifications', col: 'updated_at', type: 'INTEGER DEFAULT 0' },
    { table: 'global_messages', col: 'updated_at', type: 'INTEGER DEFAULT 0' },
    { table: 'duel_history', col: 'updated_at', type: 'INTEGER DEFAULT 0' },
    { table: 'presence', col: 'updated_at', type: 'INTEGER DEFAULT 0' },
    { table: 'coin_history', col: 'updated_at', type: 'INTEGER DEFAULT 0' },
    { table: 'jukebox_playlist', col: 'updated_at', type: 'INTEGER DEFAULT 0' },
    { table: 'jukebox_favorites', col: 'updated_at', type: 'INTEGER DEFAULT 0' },
    { table: 'jukebox_history', col: 'updated_at', type: 'INTEGER DEFAULT 0' },
    { table: 'jukebox_last_played', col: 'updated_at', type: 'INTEGER DEFAULT 0' },
    { table: 'jukebox_layout_settings', col: 'updated_at', type: 'INTEGER DEFAULT 0' },
  ];

  for (const { table, col, type } of alterColumns) {
    try {
      db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${type};`);
    } catch {
      // Column already exists or table doesn't exist yet, ignore
    }
  }
}

/**
 * Reset database when corrupted
 */
export async function resetD1Database(): Promise<Database> {
  console.warn('[D1 DATABASE ENGINE]: Resetting database due to corruption or explicit request.');
  dbInstance = null;
  if (fs.existsSync(DB_FILE_PATH)) {
    try {
      fs.unlinkSync(DB_FILE_PATH);
    } catch (e) {
      console.error('[D1 DATABASE UNLINK ERROR]:', e);
    }
  }
  const SQL = await getSqlJs();
  dbInstance = new SQL.Database();
  applySchema(dbInstance);
  saveD1Database();
  return dbInstance;
}

/**
 * Initialize sql.js database and apply schema.sql
 */
export async function getD1Database(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    const SQL = await getSqlJs();

    if (fs.existsSync(DB_FILE_PATH)) {
      try {
        const fileBuffer = fs.readFileSync(DB_FILE_PATH);
        const testDb = new SQL.Database(fileBuffer);
        // Verify database integrity
        testDb.exec('SELECT 1 FROM users LIMIT 1;');
        dbInstance = testDb;
      } catch (corruptErr) {
        console.error('[D1 DATABASE CORRUPTION DETECTED ON LOAD]:', corruptErr);
        return await resetD1Database();
      }
    } else {
      dbInstance = new SQL.Database();
    }

    // Apply schema.sql to ensure all tables exist
    applySchema(dbInstance);
    saveD1Database();

    return dbInstance;
  } catch (err) {
    console.error('[D1 DATABASE ENGINE INITIALIZATION ERROR]:', err);
    return await resetD1Database();
  }
}

/**
 * Persist database state to disk
 */
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

function isCorruptionError(err: any): boolean {
  const msg = (err && err.message ? err.message : String(err)).toLowerCase();
  return msg.includes('malformed') || msg.includes('corrupt') || msg.includes('disk image');
}

/**
 * Helper to execute SELECT queries and return array of object rows
 */
export async function queryAll<T = any>(sql: string, params: any[] = [], retry = true): Promise<T[]> {
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
    if (retry && isCorruptionError(err)) {
      console.warn('[D1 RECOVERY]: Attempting database reset and retry query...');
      await resetD1Database();
      return queryAll<T>(sql, params, false);
    }
    throw err;
  }
}

/**
 * Helper to execute SELECT single row
 */
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Helper to execute INSERT, UPDATE, DELETE queries
 */
export async function executeSql(sql: string, params: any[] = [], retry = true): Promise<{ success: boolean; changes: number }> {
  try {
    const db = await getD1Database();
    db.run(sql, params);
    saveD1Database();
    return { success: true, changes: db.getRowsModified() };
  } catch (err) {
    console.error(`[D1 EXECUTE SQL ERROR] SQL: "${sql}" Params:`, params, 'Error:', err);
    if (retry && isCorruptionError(err)) {
      console.warn('[D1 RECOVERY]: Attempting database reset and retry executeSql...');
      await resetD1Database();
      return executeSql(sql, params, false);
    }
    throw err;
  }
}

