import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import { readFile, writeFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';

const DB_FILENAME = 'timesheet.db';
const STORAGE_KEY = 'timesheet-db-v1';

let db: SqlJsDatabase | null = null;
let dbPath: string | null = null;

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function getDbPath(): Promise<string> {
  if (dbPath) return dbPath;
  const dir = await appDataDir();
  dbPath = await join(dir, DB_FILENAME);
  return dbPath;
}

async function ensureDbDir(): Promise<void> {
  const dir = await appDataDir();
  try {
    await mkdir(dir, { recursive: true });
  } catch (e) {
    console.error('Failed to create app data dir:', e);
  }
}

async function ensureDb(): Promise<SqlJsDatabase> {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: (file) => `/${file}`,
  });

  if (isTauri()) {
    await ensureDbDir();
    const path = await getDbPath();
    try {
      const fileExists = await exists(path);
      if (fileExists) {
        const data = await readFile(path);
        db = new SQL.Database(data);
      } else {
        db = new SQL.Database();
      }
    } catch (e) {
      console.error('Failed to load DB from file, starting fresh:', e);
      db = new SQL.Database();
    }
  } else {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const binary = atob(saved);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      db = new SQL.Database(bytes);
    } else {
      db = new SQL.Database();
    }
  }

  db.run('PRAGMA foreign_keys = ON');
  runMigrations();

  return db;
}

function runMigrations() {
  const d = db!;

  d.run(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    archived INTEGER NOT NULL DEFAULT 0,
    createdAt INTEGER NOT NULL
  )`);

  d.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    projectId INTEGER NOT NULL,
    name TEXT NOT NULL,
    isFavorite INTEGER NOT NULL DEFAULT 0,
    createdAt INTEGER NOT NULL,
    lastUsedAt INTEGER NOT NULL DEFAULT 0
  )`);

  d.run(`CREATE TABLE IF NOT EXISTS timeEntries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    taskId INTEGER NOT NULL,
    date INTEGER NOT NULL,
    seconds INTEGER NOT NULL
  )`);

  try {
    d.run('ALTER TABLE tasks ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0');
  } catch (_e) {
  }

  // Migration v1: convert timeEntries.date from local midnight to UTC midnight
  const version = d.exec('PRAGMA user_version');
  const currentVersion = version.length > 0 ? Number(version[0].values[0][0]) : 0;
  if (currentVersion < 1) {
    const entries = d.exec('SELECT id, date FROM timeEntries');
    if (entries.length > 0) {
      for (const row of entries[0].values) {
        const id = row[0] as number;
        const oldDate = row[1] as number;
        // oldDate is local midnight epoch; extract the calendar date using local getters
        const local = new Date(oldDate);
        const utcMidnight = Date.UTC(local.getFullYear(), local.getMonth(), local.getDate());
        d.run('UPDATE timeEntries SET date = ? WHERE id = ?', [utcMidnight, id]);
      }
    }
    d.run('PRAGMA user_version = 1');
  }
}

async function persist() {
  if (!db) return;
  const data = db.export();
  if (isTauri()) {
    const path = await getDbPath();
    try {
      await writeFile(path, data);
    } catch (e) {
      console.error('Failed to persist DB to file:', e);
    }
  } else {
    let binary = '';
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    localStorage.setItem(STORAGE_KEY, btoa(binary));
  }
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const d = await ensureDb();
  const stmt = d.prepare(sql);
  if (params) stmt.bind(params as (string | number | null | Uint8Array)[]);

  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export async function execute(
  sql: string,
  params?: unknown[],
): Promise<{ changes: number; lastInsertRowid: number }> {
  const d = await ensureDb();
  d.run(sql, params as (string | number | null | Uint8Array)[]);

  // Query last_insert_rowid() before persist(), as db.export() in persist()
  // can reset the rowid context in sql.js
  const result = d.exec('SELECT last_insert_rowid() as id');
  const lastInsertRowid =
    result.length > 0 && result[0].values.length > 0
      ? Number(result[0].values[0][0])
      : 0;

  await persist();

  return { changes: d.getRowsModified(), lastInsertRowid };
}

export async function importDb(data: Uint8Array) {
  if (db) db.close();
  db = null;
  dbPath = null;
  if (!isTauri()) {
    localStorage.removeItem(STORAGE_KEY);
  }

  const SQL = await initSqlJs({
    locateFile: (file) => `/${file}`,
  });

  db = new SQL.Database(data);
  db.run('PRAGMA foreign_keys = ON');
  await persist();
}

export async function exportDb(): Promise<Uint8Array> {
  const d = await ensureDb();
  return d.export();
}

export async function clearDb() {
  if (db) db.close();
  db = null;
  dbPath = null;
  if (!isTauri()) {
    localStorage.removeItem(STORAGE_KEY);
  }

  const SQL = await initSqlJs({
    locateFile: (file) => `/${file}`,
  });

  db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');
  runMigrations();
  await persist();
}
