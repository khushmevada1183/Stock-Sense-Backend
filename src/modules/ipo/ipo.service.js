const {
  listIpoCalendarEntries,
  getIpoCalendarEntryById,
  upsertIpoCalendarEntries,
  upsertIpoSubscriptionSnapshots,
  listLatestIpoSubscriptionSnapshots,
  getLatestIpoSubscriptionByIpoId,
  listIpoSubscriptionHistoryByIpoId,
  upsertIpoGmpSnapshots,
  listLatestIpoGmpSnapshots,
  getLatestIpoGmpByIpoId,
  listIpoGmpHistoryByIpoId,
} = require('./ipo.repository');
const { IPO_SEED_DATA } = require('./ipo.seed-data');

const toDateOnly = (value) => {
  if (!value) {
    return null;
  }

  const raw = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
};

const deriveStatus = ({ biddingStartDate, biddingEndDate, listingDate }, todayIso) => {
  const start = toDateOnly(biddingStartDate);
  const end = toDateOnly(biddingEndDate);
  const listing = toDateOnly(listingDate);

  if (listing && listing <= todayIso) {
    return 'listed';
  }

  if (start && start > todayIso) {
    return 'upcoming';
  }

  if (start && end && start <= todayIso && end >= todayIso) {
    return 'active';
  }

  if (end && end < todayIso && !listing) {
    return 'closed';
  }

  return 'upcoming';
};

const withDerivedStatus = (entry) => {
  const todayIso = new Date().toISOString().slice(0, 10);

  return {
    ...entry,
    status: deriveStatus(entry, todayIso),
  };
};

const toGroupedCalendar = (entries) => {
  const groups = {
    upcoming: [],
    active: [],
    listed: [],
    closed: [],
  };

  for (const entry of entries) {
    const status = entry.status;
    if (groups[status]) {
      groups[status].push(entry);
    }
  }

  return {
    ...groups,
    total: entries.length,
  };
};

const listIpoCalendar = async (query) => {
  const entries = await listIpoCalendarEntries({
    status: query.status,
    fromDate: query.fromDate,
    toDate: query.toDate,
    limit: query.limit,
  });

  const normalized = entries.map((entry) => withDerivedStatus(entry));

  if (query.grouped) {
    return {
      grouped: true,
      ...toGroupedCalendar(normalized),
    };
  }

  return {
    grouped: false,
    total: normalized.length,
    entries: normalized,
  };
};

const getIpoById = async (ipoId) => {
  const entry = await getIpoCalendarEntryById(ipoId);
  return entry ? withDerivedStatus(entry) : null;
};

const toSeedExternalKey = (entry) => {
  return `${entry.symbol}:${toDateOnly(entry.biddingStartDate) || 'na'}`;
};

const stringHash = (value) => {
  const text = String(value || '');
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
};

const deterministicRange = (seed, min, max, decimals = 2) => {
  const normalized = (seed % 10000) / 10000;
  const value = min + normalized * (max - min);
  return Number(value.toFixed(decimals));
};

const toFiniteNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toIssuePrice = (ipo) => {
  const issuePrice = toFiniteNumberOrNull(ipo.issuePrice);
  if (Number.isFinite(issuePrice) && issuePrice > 0) {
    return issuePrice;
  }

  const priceMax = toFiniteNumberOrNull(ipo.priceMax);
  if (Number.isFinite(priceMax) && priceMax > 0) {
    return priceMax;
  }

  const priceMin = toFiniteNumberOrNull(ipo.priceMin);
  if (Number.isFinite(priceMin) && priceMin > 0) {
    return priceMin;
  }

  return 100;
};

const deriveGmpSentiment = (gmpPercent) => {
  if (gmpPercent >= 15) {
    return 'bullish';
  }

  if (gmpPercent >= 5) {
    return 'positive';
  }

  if (gmpPercent <= -5) {
    return 'bearish';
  }

  return 'neutral';
};

const buildSyntheticSubscriptionSnapshot = (ipo, snapshotDate) => {
  const status = deriveStatus(ipo, snapshotDate);
  const baseSeed = stringHash(`${ipo.symbol}:${snapshotDate}:${status}`);

  let qibBounds = [0.05, 0.8];
  let niiBounds = [0.05, 0.9];
  let retailBounds = [0.1, 1.2];
  let employeeBounds = [0, 0.3];

  if (status === 'active') {
    qibBounds = [0.8, 12];
    niiBounds = [0.5, 18];
    retailBounds = [0.4, 9];
    employeeBounds = [0.05, 2];
  }

  if (status === 'listed' || status === 'closed') {
    qibBounds = [1.2, 35];
    niiBounds = [0.8, 45];
    retailBounds = [0.6, 20];
    employeeBounds = [0.05, 3];
  }

  const qibSubscribed = deterministicRange(baseSeed + 101, qibBounds[0], qibBounds[1]);
  const niiSubscribed = deterministicRange(baseSeed + 202, niiBounds[0], niiBounds[1]);
  const retailSubscribed = deterministicRange(baseSeed + 303, retailBounds[0], retailBounds[1]);
  const employeeSubscribed = deterministicRange(
    baseSeed + 404,
    employeeBounds[0],
    employeeBounds[1]
  );

  const totalSubscribed = Number(
    (qibSubscribed + niiSubscribed + retailSubscribed + employeeSubscribed).toFixed(2)
  );

  return {
    qibSubscribed,
    niiSubscribed,
    retailSubscribed,
    employeeSubscribed,
    totalSubscribed,
    metadata: {
      generated: true,
      mode: 'synthetic_subscription_scraper',
      status,
    },
  };
};

const buildSyntheticGmpSnapshot = (ipo, snapshotDate) => {
  const status = deriveStatus(ipo, snapshotDate);
  const baseSeed = stringHash(`${ipo.symbol}:${snapshotDate}:gmp:${status}`);
  const issuePrice = toIssuePrice(ipo);

  let gmpPercentBounds = [-6, 18];

  if (status === 'active') {
    gmpPercentBounds = [2, 42];
  }

  if (status === 'listed') {
    gmpPercentBounds = [-12, 24];
  }

  if (status === 'closed') {
    gmpPercentBounds = [-20, 14];
  }

  const gmpPercent = deterministicRange(
    baseSeed + 808,
    gmpPercentBounds[0],
    gmpPercentBounds[1]
  );
  const gmpPrice = Number((issuePrice * (gmpPercent / 100)).toFixed(2));
  const expectedListingPrice = Number((issuePrice + gmpPrice).toFixed(2));
  const sentiment = deriveGmpSentiment(gmpPercent);

  return {
    gmpPrice,
    gmpPercent,
    expectedListingPrice,
    sentiment,
    metadata: {
      generated: true,
      mode: 'synthetic_gmp_scraper',
      status,
      issuePrice,
    },
  };
};

const seedIpoCalendar = async ({ source = 'seed_script', entries = IPO_SEED_DATA } = {}) => {
  const todayIso = new Date().toISOString().slice(0, 10);

  const normalizedEntries = entries.map((entry) => {
    const normalized = {
      externalKey: entry.externalKey || toSeedExternalKey(entry),
      companyName: entry.companyName,
      symbol: String(entry.symbol || '').trim().toUpperCase(),
      status: deriveStatus(entry, todayIso),
      priceMin: entry.priceMin || null,
      priceMax: entry.priceMax || null,
      issuePrice: entry.issuePrice || null,
      listingPrice: entry.listingPrice || null,
      listingGainsPercent: entry.listingGainsPercent || null,
      biddingStartDate: toDateOnly(entry.biddingStartDate),
      biddingEndDate: toDateOnly(entry.biddingEndDate),
      listingDate: toDateOnly(entry.listingDate),
      lotSize: entry.lotSize || null,
      issueSizeText: entry.issueSizeText || null,
      isSme: Boolean(entry.isSme),
      source,
      metadata: entry.metadata || {},
    };

    return normalized;
  });

  const saved = await upsertIpoCalendarEntries(normalizedEntries);

  return {
    source,
    requestedCount: normalizedEntries.length,
    savedCount: saved.length,
  };
};

const scrapeAndStoreIpoSubscriptions = async ({
  source = 'synthetic_subscription_scraper',
  snapshotDate = null,
  limit = 500,
} = {}) => {
  const normalizedSnapshotDate = toDateOnly(snapshotDate) || new Date().toISOString().slice(0, 10);
  const ipos = await listIpoCalendarEntries({ limit });

  if (ipos.length === 0) {
    return {
      source,
      snapshotDate: normalizedSnapshotDate,
      ipoCount: 0,
      savedCount: 0,
    };
  }

  const snapshots = ipos.map((rawIpo) => {
    const ipo = withDerivedStatus(rawIpo);
    const synthetic = buildSyntheticSubscriptionSnapshot(ipo, normalizedSnapshotDate);

    return {
      ipoId: ipo.id,
      snapshotDate: normalizedSnapshotDate,
      source,
      retailSubscribed: synthetic.retailSubscribed,
      niiSubscribed: synthetic.niiSubscribed,
      qibSubscribed: synthetic.qibSubscribed,
      employeeSubscribed: synthetic.employeeSubscribed,
      totalSubscribed: synthetic.totalSubscribed,
      metadata: {
        ...synthetic.metadata,
        symbol: ipo.symbol,
        companyName: ipo.companyName,
      },
    };
  });

  const saved = await upsertIpoSubscriptionSnapshots(snapshots);

  return {
    source,
    snapshotDate: normalizedSnapshotDate,
    ipoCount: ipos.length,
    savedCount: saved.length,
  };
};

const scrapeAndStoreIpoGmp = async ({
  source = 'synthetic_gmp_scraper',
  snapshotDate = null,
  limit = 500,
} = {}) => {
  const normalizedSnapshotDate = toDateOnly(snapshotDate) || new Date().toISOString().slice(0, 10);
  const ipos = await listIpoCalendarEntries({ limit });

  if (ipos.length === 0) {
    return {
      source,
      snapshotDate: normalizedSnapshotDate,
      ipoCount: 0,
      savedCount: 0,
    };
  }

  const snapshots = ipos.map((rawIpo) => {
    const ipo = withDerivedStatus(rawIpo);
    const synthetic = buildSyntheticGmpSnapshot(ipo, normalizedSnapshotDate);

    return {
      ipoId: ipo.id,
      snapshotDate: normalizedSnapshotDate,
      source,
      gmpPrice: synthetic.gmpPrice,
      gmpPercent: synthetic.gmpPercent,
      expectedListingPrice: synthetic.expectedListingPrice,
      sentiment: synthetic.sentiment,
      metadata: {
        ...synthetic.metadata,
        symbol: ipo.symbol,
        companyName: ipo.companyName,
      },
    };
  });

  const saved = await upsertIpoGmpSnapshots(snapshots);

  return {
    source,
    snapshotDate: normalizedSnapshotDate,
    ipoCount: ipos.length,
    savedCount: saved.length,
  };
};

const listLatestIpoSubscriptions = async (query) => {
  const snapshots = await listLatestIpoSubscriptionSnapshots({
    status: query.status,
    limit: query.limit,
  });

  return {
    count: snapshots.length,
    snapshots,
  };
};

const getIpoSubscription = async (ipoId, query) => {
  const ipo = await getIpoById(ipoId);
  if (!ipo) {
    return null;
  }

  const latest = await getLatestIpoSubscriptionByIpoId(ipoId);
  const history = await listIpoSubscriptionHistoryByIpoId({
    ipoId,
    limit: query.limit,
  });

  return {
    ipo,
    latest,
    history,
  };
};

const listLatestIpoGmp = async (query) => {
  const snapshots = await listLatestIpoGmpSnapshots({
    status: query.status,
    limit: query.limit,
  });

  return {
    count: snapshots.length,
    snapshots,
  };
};

const getIpoGmp = async (ipoId, query) => {
  const ipo = await getIpoById(ipoId);
  if (!ipo) {
    return null;
  }

  const latest = await getLatestIpoGmpByIpoId(ipoId);
  const history = await listIpoGmpHistoryByIpoId({
    ipoId,
    limit: query.limit,
  });

  return {
    ipo,
    latest,
    history,
  };
};

module.exports = {
  listIpoCalendar,
  getIpoById,
  seedIpoCalendar,
  scrapeAndStoreIpoSubscriptions,
  scrapeAndStoreIpoGmp,
  listLatestIpoSubscriptions,
  getIpoSubscription,
  listLatestIpoGmp,
  getIpoGmp,
};
