CREATE INDEX IF NOT EXISTS idx_source_assets_project_type_created
  ON source_assets(project_id, type, created_at DESC);
