-- Durable generation reservations. A row is created in the same transaction
-- that removes credits, so a server restart can safely return credits left in
-- a stale pending job.
CREATE TABLE generation_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  credits_reserved INTEGER NOT NULL CHECK (credits_reserved > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'failed')),
  error TEXT,
  version_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  recovered_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES car_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES project_versions(id) ON DELETE SET NULL
);

CREATE INDEX idx_generation_jobs_status_created
  ON generation_jobs(status, created_at);
CREATE INDEX idx_generation_jobs_user_created
  ON generation_jobs(user_id, created_at DESC);
