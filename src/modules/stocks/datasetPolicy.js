const normalizeLower = (value) => String(value || '').trim().toLowerCase();

const normalizeDatasetType = (value) => {
  const normalized = normalizeLower(value);
  if (normalized === 'prod' || normalized === 'test') {
    return normalized;
  }

  return null;
};

const normalizeDatasetScope = (value) => {
  const normalized = normalizeLower(value);
  return normalized === 'all' ? 'all' : 'prod';
};

const getDatasetScope = () => normalizeDatasetScope(process.env.STOCKS_V1_DEFAULT_DATASET_SCOPE);

const isProdOnlyDatasetScope = () => getDatasetScope() === 'prod';

const getDefaultReadDatasetType = () => {
  if (!isProdOnlyDatasetScope()) {
    return null;
  }

  return 'prod';
};

const getDatasetFilterClause = (columnReference = 'dataset_type') => {
  if (isProdOnlyDatasetScope()) {
    return `${columnReference} = 'prod'`;
  }

  return 'TRUE';
};

module.exports = {
  normalizeDatasetType,
  normalizeDatasetScope,
  getDatasetScope,
  isProdOnlyDatasetScope,
  getDefaultReadDatasetType,
  getDatasetFilterClause,
};
