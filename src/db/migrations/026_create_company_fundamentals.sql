-- Persist computed fundamentals and financial statements for stock symbols.
CREATE TABLE IF NOT EXISTS company_fundamentals (
  symbol TEXT NOT NULL,
  as_of_date DATE NOT NULL,
  ratios JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'stock-nse-india',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (symbol, as_of_date)
);

CREATE INDEX IF NOT EXISTS idx_company_fundamentals_symbol_asof_desc
  ON company_fundamentals (symbol, as_of_date DESC);

DROP TRIGGER IF EXISTS trg_company_fundamentals_updated_at ON company_fundamentals;

CREATE TRIGGER trg_company_fundamentals_updated_at
BEFORE UPDATE ON company_fundamentals
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

CREATE TABLE IF NOT EXISTS company_financial_statements (
  symbol TEXT NOT NULL,
  statement_type TEXT NOT NULL CHECK (statement_type IN ('cashflow', 'yoy_results', 'quarter_results', 'balancesheet')),
  as_of_date DATE NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'stock-nse-india',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (symbol, statement_type, as_of_date)
);

CREATE INDEX IF NOT EXISTS idx_company_financial_statements_symbol_type_asof_desc
  ON company_financial_statements (symbol, statement_type, as_of_date DESC);

DROP TRIGGER IF EXISTS trg_company_financial_statements_updated_at ON company_financial_statements;

CREATE TRIGGER trg_company_financial_statements_updated_at
BEFORE UPDATE ON company_financial_statements
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
