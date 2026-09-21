CREATE TABLE product_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT,
  version_id TEXT,
  event_name TEXT NOT NULL,
  details_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES car_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES project_versions(id) ON DELETE SET NULL
);

CREATE INDEX idx_product_events_name_created ON product_events(event_name, created_at DESC);
CREATE INDEX idx_product_events_user_created ON product_events(user_id, created_at DESC);
