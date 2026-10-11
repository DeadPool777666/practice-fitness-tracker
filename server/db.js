import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const databasePath = resolve(process.env.DB_PATH || '.data/fitnesstracker.sqlite')
mkdirSync(dirname(databasePath), { recursive: true })

export const db = new Database(databasePath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (age BETWEEN 16 AND 99),
    height_cm REAL NOT NULL CHECK (height_cm BETWEEN 100 AND 250),
    weight_kg REAL NOT NULL CHECK (weight_kg BETWEEN 30 AND 350),
    gender TEXT NOT NULL DEFAULT 'Не указано',
    skill_level TEXT NOT NULL DEFAULT 'Новичок',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    duration INTEGER NOT NULL CHECK (duration BETWEEN 1 AND 600),
    intensity TEXT NOT NULL CHECK (intensity IN ('Низкая', 'Средняя', 'Высокая', 'Экстремальная')),
    exercises TEXT NOT NULL DEFAULT '[]',
    notes TEXT NOT NULL DEFAULT '',
    completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS workouts_user_date ON workouts(user_id, date DESC);
`)

export function closeDatabase() {
  if (db.open) db.close()
}