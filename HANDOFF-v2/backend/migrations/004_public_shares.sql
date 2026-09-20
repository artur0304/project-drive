CREATE TABLE public_result_shares (
  id TEXT PRIMARY KEY,
  version_id TEXT UNIQUE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  created_at TEXT NOT NULL,
  disabled_at TEXT,
  FOREIGN KEY (version_id) REFERENCES project_versions(id) ON DELETE CASCADE
);
CREATE INDEX idx_public_result_shares_token_enabled ON public_result_shares(token, enabled);
