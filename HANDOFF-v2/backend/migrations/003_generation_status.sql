ALTER TABLE project_versions ADD COLUMN status TEXT NOT NULL DEFAULT 'complete';
ALTER TABLE project_versions ADD COLUMN warning TEXT;
ALTER TABLE project_versions ADD COLUMN planned_credits INTEGER NOT NULL DEFAULT 0;
UPDATE project_versions SET planned_credits = credits_charged WHERE planned_credits = 0;
