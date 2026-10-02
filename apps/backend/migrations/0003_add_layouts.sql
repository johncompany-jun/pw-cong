CREATE TABLE IF NOT EXISTS layouts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  spot_id     INTEGER NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  comment     TEXT,
  start_date  TEXT NOT NULL,
  end_date    TEXT NOT NULL,
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_layouts_period ON layouts(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_layouts_spot ON layouts(spot_id);

CREATE TABLE IF NOT EXISTS layout_files (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  layout_id  INTEGER NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
  file_key   TEXT NOT NULL,
  file_name  TEXT NOT NULL,
  mime_type  TEXT NOT NULL,
  file_size  INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_layout_files_layout ON layout_files(layout_id, sort_order);
