CREATE TABLE IF NOT EXISTS earnings_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  earnings_key TEXT NOT NULL UNIQUE,
  event_date DATE NOT NULL,
  period_end DATE NOT NULL,
  symbol TEXT NOT NULL,
  company_name TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  fiscal_quarter TEXT NOT NULL,
  eps_actual NUMERIC(12, 2) NOT NULL,
  eps_estimate NUMERIC(12, 2) NOT NULL,
  revenue_actual_cr NUMERIC(16, 2) NOT NULL,
  revenue_estimate_cr NUMERIC(16, 2) NOT NULL,
  surprise_percent NUMERIC(8, 2) NOT NULL,
  call_time TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'seed',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT earnings_calendar_quarter_check CHECK (fiscal_quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
  CONSTRAINT earnings_calendar_call_time_check CHECK (
    call_time IN ('pre-market', 'post-market', 'market-hours')
  ),
  CONSTRAINT earnings_calendar_positive_revenue_actual CHECK (revenue_actual_cr > 0),
  CONSTRAINT earnings_calendar_positive_revenue_estimate CHECK (revenue_estimate_cr > 0),
  CONSTRAINT earnings_calendar_period_before_event CHECK (period_end <= event_date)
);

CREATE INDEX IF NOT EXISTS idx_earnings_calendar_event_date
  ON earnings_calendar (event_date DESC);

CREATE INDEX IF NOT EXISTS idx_earnings_calendar_symbol_event_date
  ON earnings_calendar (symbol, event_date DESC);

CREATE INDEX IF NOT EXISTS idx_earnings_calendar_period_quarter
  ON earnings_calendar (period_end DESC, fiscal_quarter);

DROP TRIGGER IF EXISTS trg_earnings_calendar_updated_at ON earnings_calendar;
CREATE TRIGGER trg_earnings_calendar_updated_at
BEFORE UPDATE ON earnings_calendar
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
