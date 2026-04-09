CREATE TABLE IF NOT EXISTS stock_profile_details (
  symbol TEXT PRIMARY KEY,
  business_summary TEXT,
  company_history TEXT,
  management_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  website TEXT,
  headquarters TEXT,
  founded_year INTEGER,
  employees INTEGER,
  source TEXT NOT NULL DEFAULT 'manual',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stock_profile_details_founded_year_check CHECK (
    founded_year IS NULL
    OR (founded_year >= 1600 AND founded_year <= EXTRACT(YEAR FROM NOW())::INTEGER)
  ),
  CONSTRAINT stock_profile_details_employees_check CHECK (
    employees IS NULL OR employees >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_stock_profile_details_founded_year
  ON stock_profile_details (founded_year);

CREATE INDEX IF NOT EXISTS idx_stock_profile_details_source
  ON stock_profile_details (source);

DROP TRIGGER IF EXISTS trg_stock_profile_details_updated_at ON stock_profile_details;

CREATE TRIGGER trg_stock_profile_details_updated_at
BEFORE UPDATE ON stock_profile_details
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
