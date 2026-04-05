CREATE TABLE IF NOT EXISTS ipo_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming',
  price_min NUMERIC(12, 2),
  price_max NUMERIC(12, 2),
  issue_price NUMERIC(12, 2),
  listing_price NUMERIC(12, 2),
  listing_gains_percent NUMERIC(8, 2),
  bidding_start_date DATE,
  bidding_end_date DATE,
  listing_date DATE,
  lot_size INTEGER,
  issue_size_text TEXT,
  is_sme BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT NOT NULL DEFAULT 'seed',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ipo_calendar_status_check CHECK (
    status IN ('upcoming', 'active', 'listed', 'closed')
  )
);

CREATE INDEX IF NOT EXISTS idx_ipo_calendar_status_dates
  ON ipo_calendar (status, bidding_start_date, listing_date);

CREATE INDEX IF NOT EXISTS idx_ipo_calendar_symbol
  ON ipo_calendar (symbol);

DROP TRIGGER IF EXISTS trg_ipo_calendar_updated_at ON ipo_calendar;
CREATE TRIGGER trg_ipo_calendar_updated_at
BEFORE UPDATE ON ipo_calendar
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
