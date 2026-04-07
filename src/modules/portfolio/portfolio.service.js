const {
  listPortfoliosByUser,
  createPortfolio,
  getPortfolioById,
  updatePortfolio,
  deletePortfolio,
  addPortfolioTransaction,
  listPortfolioTransactions,
  getLatestPricesBySymbols,
  getDailyCloseSeriesBySymbols,
} = require('./portfolio.repository');

const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
};

const EPSILON = 1e-9;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toIsoDate = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

const toDateObject = (value) => {
  const date = value instanceof Date ? new Date(value) : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const getDateRangeDays = (from, to) => {
  const fromDate = toDateObject(from);
  const toDate = toDateObject(to);

  if (!fromDate || !toDate || fromDate > toDate) {
    return [];
  }

  const result = [];
  for (let cursor = fromDate; cursor <= toDate; cursor = addDays(cursor, 1)) {
    result.push(toIsoDate(cursor));
  }

  return result;
};

const uniqueSymbolsFromTransactions = (transactions = []) => {
  return Array.from(
    new Set(
      transactions
        .map((transaction) => String(transaction.symbol || '').trim().toUpperCase())
        .filter(Boolean)
    )
  );
};

const createSymbolState = () => ({
  lots: [],
  realizedPnl: 0,
  firstBuyDate: null,
});

const applyTransactionToState = (stateBySymbol, transaction) => {
  const symbol = String(transaction.symbol || '').trim().toUpperCase();
  if (!symbol) {
    return;
  }

  const transactionType = String(transaction.transactionType || '').trim().toLowerCase();
  const quantity = toNumber(transaction.quantity);
  const price = toNumber(transaction.price);
  const fees = Math.max(0, toNumber(transaction.fees));
  const transactionDate = toIsoDate(transaction.transactionDate) || toIsoDate(new Date());

  if (quantity <= 0 || price <= 0) {
    return;
  }

  const state = stateBySymbol.get(symbol) || createSymbolState();

  if (transactionType === 'buy') {
    const unitCost = ((quantity * price) + fees) / quantity;
    state.lots.push({
      remainingQty: quantity,
      unitCost,
      buyDate: transactionDate,
    });

    if (!state.firstBuyDate || new Date(transactionDate) < new Date(state.firstBuyDate)) {
      state.firstBuyDate = transactionDate;
    }

    stateBySymbol.set(symbol, state);
    return;
  }

  if (transactionType !== 'sell') {
    stateBySymbol.set(symbol, state);
    return;
  }

  let remainingSellQty = quantity;
  let consumedCostBasis = 0;

  while (remainingSellQty > EPSILON && state.lots.length > 0) {
    const lot = state.lots[0];
    const consumedQty = Math.min(lot.remainingQty, remainingSellQty);

    consumedCostBasis += consumedQty * lot.unitCost;
    lot.remainingQty -= consumedQty;
    remainingSellQty -= consumedQty;

    if (lot.remainingQty <= EPSILON) {
      state.lots.shift();
    }
  }

  const sellProceeds = (quantity * price) - fees;
  state.realizedPnl += sellProceeds - consumedCostBasis;

  stateBySymbol.set(symbol, state);
};

const buildStateFromTransactions = (transactions = []) => {
  const stateBySymbol = new Map();

  transactions.forEach((transaction) => {
    applyTransactionToState(stateBySymbol, transaction);
  });

  return stateBySymbol;
};

const buildPriceMap = (rows = []) => {
  const map = new Map();

  rows.forEach((row) => {
    const symbol = String(row.symbol || '').trim().toUpperCase();
    if (!symbol) {
      return;
    }

    map.set(symbol, {
      lastPrice: toNumber(row.lastPrice, null),
      prevClose: toNumber(row.prevClose, null),
      asOf: row.asOf || null,
    });
  });

  return map;
};

const buildHoldingsFromState = (stateBySymbol, latestPriceMap) => {
  const holdings = [];

  for (const [symbol, state] of stateBySymbol.entries()) {
    const quantity = state.lots.reduce((sum, lot) => sum + lot.remainingQty, 0);
    if (quantity <= EPSILON) {
      continue;
    }

    const totalCostBasis = state.lots.reduce((sum, lot) => sum + (lot.remainingQty * lot.unitCost), 0);
    const avgBuyPrice = quantity > EPSILON ? totalCostBasis / quantity : 0;

    const latestPrice = latestPriceMap.get(symbol) || {};
    const lastPrice = latestPrice.lastPrice !== null && latestPrice.lastPrice !== undefined
      ? latestPrice.lastPrice
      : avgBuyPrice;
    const prevClose = latestPrice.prevClose !== null && latestPrice.prevClose !== undefined
      ? latestPrice.prevClose
      : lastPrice;

    const change = lastPrice - prevClose;
    const marketValue = lastPrice * quantity;
    const profitLoss = marketValue - totalCostBasis;

    holdings.push({
      symbol,
      lastPrice: round(lastPrice, 2),
      change: round(change, 2),
      changePercent: round(prevClose > 0 ? (change / prevClose) * 100 : 0, 2),
      quantity: round(quantity, 6),
      marketValue: round(marketValue, 2),
      profitLoss: round(profitLoss, 2),
      profitLossPercent: round(totalCostBasis > 0 ? (profitLoss / totalCostBasis) * 100 : 0, 2),
      pe: null,
      buyPrice: round(avgBuyPrice, 2),
      buyDate: state.lots[0]?.buyDate || state.firstBuyDate,
      realizedPnl: round(state.realizedPnl, 2),
      costBasis: round(totalCostBasis, 2),
    });
  }

  return holdings.sort((a, b) => b.marketValue - a.marketValue);
};

const buildSectorAllocation = (holdings, totalValue) => {
  if (!holdings.length || totalValue <= 0) {
    return [];
  }

  const topHoldings = [...holdings]
    .sort((a, b) => b.marketValue - a.marketValue)
    .slice(0, 3);

  const allocation = topHoldings.map((holding) => ({
    name: holding.symbol,
    percentage: round((holding.marketValue / totalValue) * 100, 2),
  }));

  const covered = allocation.reduce((sum, item) => sum + item.percentage, 0);
  if (covered < 100) {
    allocation.push({
      name: 'Others',
      percentage: round(Math.max(0, 100 - covered), 2),
    });
  }

  return allocation;
};

const classifyRiskProfile = (holdings, totalValue) => {
  if (!holdings.length || totalValue <= 0) {
    return 'Low';
  }

  const maxWeight = Math.max(...holdings.map((h) => (h.marketValue / totalValue) * 100));

  if (maxWeight >= 60) {
    return 'Aggressive';
  }

  if (maxWeight >= 40) {
    return 'Moderately Aggressive';
  }

  if (maxWeight >= 25) {
    return 'Moderate';
  }

  return 'Low';
};

const buildPortfolioSummary = (holdings) => {
  const totals = holdings.reduce(
    (acc, holding) => {
      const investedValue = holding.costBasis !== undefined
        ? holding.costBasis
        : (holding.quantity * holding.buyPrice);
      const dayContribution = holding.quantity * holding.change;

      acc.totalValue += holding.marketValue;
      acc.totalInvestment += investedValue;
      acc.totalProfitLoss += holding.profitLoss;
      acc.dayGain += dayContribution;
      acc.realizedGain += holding.realizedPnl || 0;

      if (holding.profitLoss >= 0) {
        acc.winnerCount += 1;
      }

      return acc;
    },
    {
      totalValue: 0,
      totalInvestment: 0,
      totalProfitLoss: 0,
      dayGain: 0,
      realizedGain: 0,
      winnerCount: 0,
    }
  );

  const previousCloseValue = totals.totalValue - totals.dayGain;
  const totalProfitLossPercent =
    totals.totalInvestment > 0 ? (totals.totalProfitLoss / totals.totalInvestment) * 100 : 0;
  const dayGainPercent =
    previousCloseValue > 0 ? (totals.dayGain / previousCloseValue) * 100 : 0;

  const performanceScoreBase = holdings.length
    ? (totals.winnerCount / holdings.length) * 4 + (totalProfitLossPercent > 0 ? 1 : 0.5)
    : 0;

  const summary = {
    totalValue: round(totals.totalValue),
    totalInvestment: round(totals.totalInvestment),
    totalProfitLoss: round(totals.totalProfitLoss),
    totalProfitLossPercent: round(totalProfitLossPercent),
    dayGain: round(totals.dayGain),
    dayGainPercent: round(dayGainPercent),
    holdings: holdings.length,
    unrealizedGain: round(totals.totalProfitLoss),
    realizedGain: round(totals.realizedGain),
    totalReturn: round(totals.totalProfitLoss + totals.realizedGain),
    totalReturnPercent: round(
      totals.totalInvestment > 0
        ? ((totals.totalProfitLoss + totals.realizedGain) / totals.totalInvestment) * 100
        : 0
    ),
    riskProfile: classifyRiskProfile(holdings, totals.totalValue),
    valuationScore: round(Math.min(5, Math.max(1, performanceScoreBase)), 1),
    sectorAllocation: buildSectorAllocation(holdings, totals.totalValue),
  };

  return summary;
};

const getUserPortfolios = async (userId) => {
  const portfolios = await listPortfoliosByUser(userId);
  return portfolios;
};

const getScopedTransactions = async (userId, portfolioId = null) => {
  return listPortfolioTransactions({
    userId,
    portfolioId,
    sort: 'asc',
  });
};

const buildPortfolioSnapshot = async (userId, portfolioId = null) => {
  const transactions = await getScopedTransactions(userId, portfolioId);
  const symbols = uniqueSymbolsFromTransactions(transactions);
  const latestPrices = symbols.length > 0 ? await getLatestPricesBySymbols(symbols) : [];
  const priceMap = buildPriceMap(latestPrices);
  const stateBySymbol = buildStateFromTransactions(transactions);
  const holdings = buildHoldingsFromState(stateBySymbol, priceMap);

  return {
    transactions,
    holdings,
    symbols,
    latestPrices,
  };
};

const createUserPortfolio = async (userId, payload) => {
  const portfolio = await createPortfolio({
    userId,
    portfolioName: payload.portfolioName,
    description: payload.description,
    stocks: payload.stocks || [],
  });

  return portfolio;
};

const updateUserPortfolio = async (userId, portfolioId, payload) => {
  return updatePortfolio({
    userId,
    portfolioId,
    portfolioName: payload.portfolioName,
    description: payload.description,
    stocks: payload.stocks,
  });
};

const deleteUserPortfolio = async (userId, portfolioId) => {
  const deleted = await deletePortfolio({ userId, portfolioId });
  return !!deleted;
};

const getUserPortfolioHoldings = async (userId, portfolioId = null) => {
  const snapshot = await buildPortfolioSnapshot(userId, portfolioId);
  return snapshot.holdings;
};

const buildCashFlows = (transactions, terminalValue, asOfDate) => {
  const flows = transactions
    .map((transaction) => {
      const quantity = toNumber(transaction.quantity);
      const price = toNumber(transaction.price);
      const fees = Math.max(0, toNumber(transaction.fees));
      const gross = quantity * price;

      const amount = String(transaction.transactionType || '').toLowerCase() === 'sell'
        ? gross - fees
        : -(gross + fees);

      return {
        date: toIsoDate(transaction.transactionDate),
        amount,
      };
    })
    .filter((flow) => flow.date && Number.isFinite(flow.amount) && Math.abs(flow.amount) > EPSILON);

  if (terminalValue > EPSILON) {
    flows.push({
      date: asOfDate,
      amount: terminalValue,
    });
  }

  return flows;
};

const yearFraction = (startDate, endDate) => {
  const start = toDateObject(startDate);
  const end = toDateObject(endDate);

  if (!start || !end) {
    return 0;
  }

  const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return days / 365;
};

const computeXirrRate = (cashFlows = []) => {
  if (!Array.isArray(cashFlows) || cashFlows.length < 2) {
    return null;
  }

  const datedFlows = cashFlows
    .map((flow) => ({
      date: toIsoDate(flow.date),
      amount: toNumber(flow.amount),
    }))
    .filter((flow) => flow.date && Number.isFinite(flow.amount) && Math.abs(flow.amount) > EPSILON)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (datedFlows.length < 2) {
    return null;
  }

  const hasPositive = datedFlows.some((flow) => flow.amount > 0);
  const hasNegative = datedFlows.some((flow) => flow.amount < 0);
  if (!hasPositive || !hasNegative) {
    return null;
  }

  const firstDate = datedFlows[0].date;

  const npv = (rate) => {
    if (!Number.isFinite(rate) || rate <= -0.999999999) {
      return Number.POSITIVE_INFINITY;
    }

    return datedFlows.reduce((sum, flow) => {
      const t = yearFraction(firstDate, flow.date);
      return sum + (flow.amount / Math.pow(1 + rate, t));
    }, 0);
  };

  const derivative = (rate) => {
    if (!Number.isFinite(rate) || rate <= -0.999999999) {
      return Number.POSITIVE_INFINITY;
    }

    return datedFlows.reduce((sum, flow) => {
      const t = yearFraction(firstDate, flow.date);
      if (t === 0) {
        return sum;
      }

      return sum - ((t * flow.amount) / Math.pow(1 + rate, t + 1));
    }, 0);
  };

  let guess = 0.12;

  for (let index = 0; index < 80; index += 1) {
    const value = npv(guess);
    if (Math.abs(value) < 1e-7) {
      return guess;
    }

    const slope = derivative(guess);
    if (!Number.isFinite(slope) || Math.abs(slope) < 1e-12) {
      break;
    }

    const next = guess - (value / slope);
    if (!Number.isFinite(next) || next <= -0.9999 || next > 10000) {
      break;
    }

    if (Math.abs(next - guess) < 1e-9) {
      return next;
    }

    guess = next;
  }

  let low = -0.9999;
  let high = 2;
  let lowValue = npv(low);
  let highValue = npv(high);

  while (lowValue * highValue > 0 && high < 10000) {
    high *= 2;
    highValue = npv(high);
  }

  if (!Number.isFinite(lowValue) || !Number.isFinite(highValue) || lowValue * highValue > 0) {
    return null;
  }

  for (let index = 0; index < 200; index += 1) {
    const mid = (low + high) / 2;
    const midValue = npv(mid);

    if (Math.abs(midValue) < 1e-7) {
      return mid;
    }

    if (lowValue * midValue < 0) {
      high = mid;
      highValue = midValue;
    } else {
      low = mid;
      lowValue = midValue;
    }
  }

  return (low + high) / 2;
};

const getUserPortfolioXirr = async (userId, portfolioId = null, options = {}) => {
  const asOfDate = toIsoDate(options.asOf) || toIsoDate(new Date());
  const asOfDateObject = toDateObject(asOfDate);
  const allTransactions = await getScopedTransactions(userId, portfolioId);
  const scopedTransactions = allTransactions.filter((transaction) => {
    const txDate = toDateObject(transaction.transactionDate);
    if (!txDate || !asOfDateObject) {
      return false;
    }

    return txDate <= asOfDateObject;
  });

  const symbols = uniqueSymbolsFromTransactions(scopedTransactions);
  const stateBySymbol = buildStateFromTransactions(scopedTransactions);

  let valuationPriceMap = new Map();

  if (symbols.length > 0) {
    if (options.asOf) {
      const asOfRows = await getDailyCloseSeriesBySymbols({
        symbols,
        from: asOfDate,
        to: asOfDate,
      });

      valuationPriceMap = new Map(
        asOfRows.map((row) => [
          String(row.symbol || '').trim().toUpperCase(),
          {
            lastPrice: toNumber(row.close, null),
            prevClose: toNumber(row.close, null),
          },
        ])
      );
    } else {
      const latestRows = await getLatestPricesBySymbols(symbols);
      valuationPriceMap = buildPriceMap(latestRows);
    }
  }

  const holdings = buildHoldingsFromState(stateBySymbol, valuationPriceMap);
  const terminalValue = holdings.reduce((sum, holding) => sum + toNumber(holding.marketValue), 0);
  const cashFlows = buildCashFlows(scopedTransactions, terminalValue, asOfDate);
  const xirrRate = computeXirrRate(cashFlows);

  return {
    asOf: asOfDate,
    scope: portfolioId || 'all-portfolios',
    annualizedRate: xirrRate,
    xirrPercent: xirrRate === null ? null : round(xirrRate * 100, 4),
    terminalValue: round(terminalValue, 2),
    cashFlowCount: cashFlows.length,
  };
};

const downsampleSeries = (points = [], maxPoints = 180) => {
  if (!Array.isArray(points) || points.length <= maxPoints) {
    return points;
  }

  const sampled = [];
  const lastIndex = points.length - 1;
  const step = lastIndex / Math.max(1, maxPoints - 1);
  const seen = new Set();

  for (let index = 0; index < maxPoints; index += 1) {
    const pointIndex = Math.round(index * step);
    if (seen.has(pointIndex)) {
      continue;
    }

    seen.add(pointIndex);
    sampled.push(points[pointIndex]);
  }

  if (!seen.has(lastIndex)) {
    sampled.push(points[lastIndex]);
  }

  return sampled;
};

const getUserPortfolioPerformance = async (userId, portfolioId = null, query = {}) => {
  const transactions = await getScopedTransactions(userId, portfolioId);
  if (transactions.length === 0) {
    return {
      scope: portfolioId || 'all-portfolios',
      from: query.from || null,
      to: query.to || toIsoDate(new Date()),
      points: [],
      count: 0,
    };
  }

  const earliestDate = toIsoDate(transactions[0].transactionDate) || toIsoDate(new Date());
  const toDate = query.to || toIsoDate(new Date());

  const derivedDefaultFrom = (() => {
    const to = toDateObject(toDate);
    if (!to) {
      return earliestDate;
    }

    const ninetyDaysBack = addDays(to, -89);
    const earliest = toDateObject(earliestDate) || ninetyDaysBack;
    return toIsoDate(earliest > ninetyDaysBack ? earliest : ninetyDaysBack);
  })();

  const fromDate = query.from || derivedDefaultFrom;
  const symbols = uniqueSymbolsFromTransactions(transactions);
  const dailyCloseRows = await getDailyCloseSeriesBySymbols({
    symbols,
    from: fromDate,
    to: toDate,
  });

  const priceBySymbolDate = new Map();
  dailyCloseRows.forEach((row) => {
    const symbol = String(row.symbol || '').trim().toUpperCase();
    const date = toIsoDate(row.tradeDate);
    if (!symbol || !date) {
      return;
    }

    if (!priceBySymbolDate.has(symbol)) {
      priceBySymbolDate.set(symbol, new Map());
    }

    priceBySymbolDate.get(symbol).set(date, toNumber(row.close, null));
  });

  const stateBySymbol = new Map();
  const rollingPriceBySymbol = new Map();
  let cumulativeRealizedPnl = 0;

  const transactionsByDate = new Map();
  const fromDateObject = toDateObject(fromDate);

  transactions.forEach((transaction) => {
    const date = toIsoDate(transaction.transactionDate);
    const txDate = toDateObject(transaction.transactionDate);

    if (!date || !txDate) {
      return;
    }

    if (fromDateObject && txDate < fromDateObject) {
      const symbol = String(transaction.symbol || '').trim().toUpperCase();
      const before = (stateBySymbol.get(symbol) || createSymbolState()).realizedPnl;
      applyTransactionToState(stateBySymbol, transaction);
      const after = (stateBySymbol.get(symbol) || createSymbolState()).realizedPnl;
      cumulativeRealizedPnl += after - before;
      return;
    }

    if (!transactionsByDate.has(date)) {
      transactionsByDate.set(date, []);
    }

    transactionsByDate.get(date).push(transaction);
  });

  const points = [];
  const rangeDays = getDateRangeDays(fromDate, toDate);

  rangeDays.forEach((date) => {
    const dayTransactions = transactionsByDate.get(date) || [];
    dayTransactions.forEach((transaction) => {
      const before = (stateBySymbol.get(String(transaction.symbol || '').trim().toUpperCase()) || createSymbolState()).realizedPnl;
      applyTransactionToState(stateBySymbol, transaction);
      const after = (stateBySymbol.get(String(transaction.symbol || '').trim().toUpperCase()) || createSymbolState()).realizedPnl;
      cumulativeRealizedPnl += after - before;
    });

    let totalMarketValue = 0;
    let totalCostBasis = 0;
    let activeHoldings = 0;

    for (const [symbol, state] of stateBySymbol.entries()) {
      const openQty = state.lots.reduce((sum, lot) => sum + lot.remainingQty, 0);
      if (openQty <= EPSILON) {
        continue;
      }

      const costBasis = state.lots.reduce((sum, lot) => sum + (lot.remainingQty * lot.unitCost), 0);
      const symbolPriceMap = priceBySymbolDate.get(symbol);

      if (symbolPriceMap && symbolPriceMap.has(date)) {
        rollingPriceBySymbol.set(symbol, symbolPriceMap.get(date));
      }

      const marketPrice = rollingPriceBySymbol.has(symbol)
        ? rollingPriceBySymbol.get(symbol)
        : (openQty > EPSILON ? costBasis / openQty : 0);

      totalCostBasis += costBasis;
      totalMarketValue += marketPrice * openQty;
      activeHoldings += 1;
    }

    const unrealizedPnl = totalMarketValue - totalCostBasis;
    const totalPnl = unrealizedPnl + cumulativeRealizedPnl;

    points.push({
      date,
      marketValue: round(totalMarketValue, 2),
      costBasis: round(totalCostBasis, 2),
      unrealizedPnl: round(unrealizedPnl, 2),
      realizedPnl: round(cumulativeRealizedPnl, 2),
      totalPnl: round(totalPnl, 2),
      returnPercent: round(totalCostBasis > EPSILON ? (totalPnl / totalCostBasis) * 100 : 0, 2),
      holdings: activeHoldings,
    });
  });

  const normalizedPoints = downsampleSeries(points, query.maxPoints || 180);

  return {
    scope: portfolioId || 'all-portfolios',
    from: fromDate,
    to: toDate,
    count: normalizedPoints.length,
    points: normalizedPoints,
  };
};

const getUserPortfolioSummary = async (userId, portfolioId = null) => {
  const snapshot = await buildPortfolioSnapshot(userId, portfolioId);
  const summary = buildPortfolioSummary(snapshot.holdings);
  const xirr = await getUserPortfolioXirr(userId, portfolioId);

  return {
    ...summary,
    xirrPercent: xirr.xirrPercent,
    xirrAsOf: xirr.asOf,
  };
};

const getUserPortfolioDetails = async (userId, portfolioId) => {
  const portfolio = await getPortfolioById({ userId, portfolioId });
  if (!portfolio) {
    return null;
  }

  const holdings = await getUserPortfolioHoldings(userId, portfolioId);
  const summary = await getUserPortfolioSummary(userId, portfolioId);
  const transactions = await listPortfolioTransactions({ userId, portfolioId, sort: 'desc' });

  return {
    ...portfolio,
    holdings,
    summary,
    transactions,
  };
};

const createPortfolioTransaction = async (userId, portfolioId, payload) => {
  const portfolio = await getPortfolioById({ userId, portfolioId });
  if (!portfolio) {
    return null;
  }

  const transaction = await addPortfolioTransaction({
    portfolioId,
    transaction: payload,
  });

  return transaction;
};

module.exports = {
  getUserPortfolios,
  createUserPortfolio,
  updateUserPortfolio,
  deleteUserPortfolio,
  getUserPortfolioHoldings,
  getUserPortfolioSummary,
  getUserPortfolioXirr,
  getUserPortfolioPerformance,
  getUserPortfolioDetails,
  createPortfolioTransaction,
};
