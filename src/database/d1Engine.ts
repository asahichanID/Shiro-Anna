/**
 * Local Cloudflare D1 Emulation Engine using sql.js
 * Reads schema.sql on startup and persists data to d1_database.sqlite
 */

import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_FILE_PATH = path.join(process.cwd(), 'd1_database.sqlite');
const SCHEMA_FILE_PATH = path.join(process.cwd(), 'schema.sql');

let dbInstance: Database | null = null;

/**
 * Initialize sql.js database and apply schema.sql
 */
export async function getD1Database(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    const SQL = await initSqlJs();

    if (fs.existsSync(DB_FILE_PATH)) {
      const fileBuffer = fs.readFileSync(DB_FILE_PATH);
      dbInstance = new SQL.Database(fileBuffer);
    } else {
      dbInstance = new SQL.Database();
    }

    // Apply schema.sql to ensure all tables exist
    if (fs.existsSync(SCHEMA_FILE_PATH)) {
      const schemaSql = fs.readFileSync(SCHEMA_FILE_PATH, 'utf-8');
      dbInstance.run(schemaSql);
      saveD1Database();
    }

    return dbInstance;
  } catch (err) {
    console.error('[D1 DATABASE ENGINE INITIALIZATION ERROR]:', err);
    throw err;
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

/**
 * Helper to execute SELECT queries and return array of object rows
 */
export async function queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
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
export async function executeSql(sql: string, params: any[] = []): Promise<{ success: boolean; changes: number }> {
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
