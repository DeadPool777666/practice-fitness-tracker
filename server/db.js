import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { challengeSeed, exerciseSeed } from './seed-data.js'

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

function addColumn(table, column, ddl) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((item) => item.name)
  if (!columns.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`)
}
// Миграции существующих таблиц (старые данные сохраняются)
addColumn('workouts', 'type', "TEXT NOT NULL DEFAULT 'Другое'")
addColumn('workouts', 'mood', 'INTEGER')
addColumn('workouts', 'shared', 'INTEGER NOT NULL DEFAULT 0')
addColumn('users', 'role', "TEXT NOT NULL DEFAULT 'user'")
addColumn('users', 'blocked', 'INTEGER NOT NULL DEFAULT 0')
addColumn('users', 'is_public', 'INTEGER NOT NULL DEFAULT 1')

db.exec(`
  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    muscle TEXT NOT NULL,
    equipment TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    instructions TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS favorites (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, exercise_id)
  );
  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    target INTEGER NOT NULL,
    deadline TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS user_achievements (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    unlocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, code)
  );
  CREATE TABLE IF NOT EXISTS challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    kind TEXT NOT NULL,
    target INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS challenge_progress (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    PRIMARY KEY (user_id, challenge_id)
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id, id DESC);
  CREATE TABLE IF NOT EXISTS quest_claims (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day TEXT NOT NULL,
    code TEXT NOT NULL,
    PRIMARY KEY (user_id, day, code)
  );
  CREATE TABLE IF NOT EXISTS workout_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Другое',
    duration INTEGER NOT NULL,
    intensity TEXT NOT NULL,
    exercises TEXT NOT NULL DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS planner (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    duration INTEGER NOT NULL,
    intensity TEXT NOT NULL,
    PRIMARY KEY (user_id, weekday)
  );
  CREATE TABLE IF NOT EXISTS friends (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, friend_id)
  );
  CREATE TABLE IF NOT EXISTS subscriptions (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    started_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`)

const seedExercises = db.prepare('INSERT OR IGNORE INTO exercises (name, muscle, equipment, difficulty, description, instructions) VALUES (?, ?, ?, ?, ?, ?)')
if (!db.prepare('SELECT 1 FROM exercises LIMIT 1').get()) for (const row of exerciseSeed) seedExercises.run(...row)
const seedChallenge = db.prepare('INSERT INTO challenges (title, description, kind, target) VALUES (?, ?, ?, ?)')
if (!db.prepare('SELECT 1 FROM challenges LIMIT 1').get()) for (const row of challengeSeed) seedChallenge.run(...row)

export function closeDatabase() {
  if (db.open) db.close()
}