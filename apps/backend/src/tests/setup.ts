import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import * as schema from '../db/schema'

export function createTestDb() {
  const sqlite = new Database(':memory:')

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      gender TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS spots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS spot_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      spot_id INTEGER NOT NULL REFERENCES spots(id),
      name TEXT NOT NULL,
      lat REAL,
      lng REAL,
      address TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `)

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS schedules (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      date             TEXT NOT NULL,
      spot_id          INTEGER NOT NULL REFERENCES spots(id),
      status           TEXT NOT NULL DEFAULT 'draft',
      slot_granularity INTEGER NOT NULL DEFAULT 30,
      mc_user_id       INTEGER REFERENCES users(id),
      rotation_notes   TEXT,
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS applications (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id          INTEGER NOT NULL REFERENCES schedules(id),
      user_id              INTEGER NOT NULL REFERENCES users(id),
      selected_slots       TEXT NOT NULL,
      cart_prepare         TEXT NOT NULL DEFAULT 'no',
      cart_cleanup         TEXT NOT NULL DEFAULT 'no',
      car_transport        TEXT NOT NULL DEFAULT 'no',
      notes                TEXT,
      participation_status TEXT NOT NULL DEFAULT 'pending',
      approved_slots       TEXT,
      created_at           TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(schedule_id, user_id)
    )
  `)

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS special_assignments (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id     INTEGER NOT NULL REFERENCES schedules(id),
      user_id         INTEGER NOT NULL REFERENCES users(id),
      assignment_type TEXT NOT NULL,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(schedule_id, user_id, assignment_type)
    )
  `)

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS rotation_assignments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER NOT NULL REFERENCES schedules(id),
      time_slot   TEXT NOT NULL,
      column_key  TEXT NOT NULL,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(schedule_id, time_slot, column_key)
    )
  `)

  return drizzle(sqlite, { schema })
}
