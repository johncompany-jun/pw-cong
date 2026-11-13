CREATE TABLE IF NOT EXISTS permits (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  spot_id     INTEGER NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  start_date  TEXT NOT NULL,
  end_date    TEXT NOT NULL,
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_permits_period ON permits(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_permits_spot ON permits(spot_id);

CREATE TABLE IF NOT EXISTS permit_files (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  permit_id  INTEGER NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  file_key   TEXT NOT NULL,
  file_name  TEXT NOT NULL,
  mime_type  TEXT NOT NULL,
  file_size  INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_permit_files_permit ON permit_files(permit_id, sort_order);
