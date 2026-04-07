import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import * as schema from './schema'

const sqlite = new Database('local.db', { create: true })

// Create tables on startup
sqlite.exec(`
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

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS spots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

sqlite.exec(`
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

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS schedules (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    date       TEXT NOT NULL,
    spot_id    INTEGER NOT NULL REFERENCES spots(id),
    status     TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'open', 'confirmed', 'cancelled')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id   INTEGER NOT NULL REFERENCES schedules(id),
    user_id       INTEGER NOT NULL REFERENCES users(id),
    selected_slots TEXT NOT NULL,
    cart_prepare  TEXT NOT NULL DEFAULT 'no' CHECK(cart_prepare IN ('yes', 'no')),
    cart_cleanup  TEXT NOT NULL DEFAULT 'no' CHECK(cart_cleanup IN ('yes', 'no')),
    car_transport TEXT NOT NULL DEFAULT 'no' CHECK(car_transport IN ('yes', 'no')),
    notes         TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(schedule_id, user_id)
  )
`)

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS special_assignments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id     INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    assignment_type TEXT NOT NULL CHECK(assignment_type IN ('cart_prepare', 'cart_cleanup', 'transport_go', 'transport_return')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(schedule_id, user_id, assignment_type)
  )
`)

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS rotation_assignments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    time_slot   TEXT NOT NULL,
    column_key  TEXT NOT NULL,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(schedule_id, time_slot, column_key)
  )
`)

// Migrate existing tables
try { sqlite.exec(`ALTER TABLE users ADD COLUMN gender TEXT`) } catch { /* already exists */ }

// Migrate schedules CHECK constraint to include 'cancelled'
{
  const row = sqlite.query(`SELECT sql FROM sqlite_master WHERE type='table' AND name='schedules'`).get() as { sql: string } | null
  if (row && !row.sql.includes("'cancelled'")) {
    sqlite.exec(`PRAGMA foreign_keys = OFF`)
    sqlite.exec(`
      CREATE TABLE schedules_new (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        date            TEXT NOT NULL,
        spot_id         INTEGER NOT NULL REFERENCES spots(id),
        status          TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'open', 'confirmed', 'cancelled')),
        slot_granularity INTEGER NOT NULL DEFAULT 30,
        mc_user_id      INTEGER REFERENCES users(id),
        rotation_notes  TEXT,
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
    sqlite.exec(`INSERT INTO schedules_new SELECT id, date, spot_id, status, COALESCE(slot_granularity, 30), mc_user_id, rotation_notes, created_at, updated_at FROM schedules`)
    sqlite.exec(`DROP TABLE schedules`)
    sqlite.exec(`ALTER TABLE schedules_new RENAME TO schedules`)
    sqlite.exec(`PRAGMA foreign_keys = ON`)
  }
}
try { sqlite.exec(`ALTER TABLE schedules ADD COLUMN slot_granularity INTEGER NOT NULL DEFAULT 30`) } catch { /* already exists */ }
try { sqlite.exec(`ALTER TABLE applications ADD COLUMN participation_status TEXT NOT NULL DEFAULT 'pending' CHECK(participation_status IN ('pending', 'approved', 'rejected'))`) } catch { /* already exists */ }
try { sqlite.exec(`ALTER TABLE applications ADD COLUMN approved_slots TEXT`) } catch { /* already exists */ }
try { sqlite.exec(`ALTER TABLE schedules ADD COLUMN rotation_notes TEXT`) } catch { /* already exists */ }
try { sqlite.exec(`ALTER TABLE schedules ADD COLUMN mc_user_id INTEGER REFERENCES users(id)`) } catch { /* already exists */ }

export const db = drizzle(sqlite, { schema })
