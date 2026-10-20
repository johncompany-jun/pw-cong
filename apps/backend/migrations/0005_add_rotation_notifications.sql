CREATE TABLE IF NOT EXISTS rotation_notifications (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id     INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  subject         TEXT NOT NULL,
  body            TEXT NOT NULL,
  recipient_count INTEGER NOT NULL,
  sent_by         INTEGER NOT NULL REFERENCES users(id),
  sent_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rotation_notifications_schedule_id ON rotation_notifications(schedule_id);
