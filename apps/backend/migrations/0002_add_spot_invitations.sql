ALTER TABLE spots ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public', 'private'));

CREATE TABLE IF NOT EXISTS spot_invitations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  spot_id    INTEGER NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(spot_id, user_id)
);
