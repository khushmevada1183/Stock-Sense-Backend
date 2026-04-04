const {
  listPortfoliosByUser,
  createPortfolio,
  getPortfolioById,
  updatePortfolio,
  deletePortfolio,
  addPortfolioTransaction,
  listPortfolioTransactions,
  listHoldings,
} = require('./portfolio.repository');

const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
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
      const investedValue = holding.quantity * holding.buyPrice;
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
  const holdings = await listHoldings({ userId, portfolioId });

  return holdings.map((holding) => ({
    symbol: holding.symbol,
    lastPrice: round(holding.lastPrice, 2),
    change: round(holding.change, 2),
    changePercent: round(holding.changePercent, 2),
    quantity: round(holding.quantity, 6),
    marketValue: round(holding.marketValue, 2),
    profitLoss: round(holding.profitLoss, 2),
    profitLossPercent: round(holding.profitLossPercent, 2),
    pe: holding.pe,
    buyPrice: round(holding.buyPrice, 2),
    buyDate: holding.buyDate,
    realizedPnl: round(holding.realizedPnl, 2),
  }));
};

const getUserPortfolioSummary = async (userId, portfolioId = null) => {
  const holdings = await getUserPortfolioHoldings(userId, portfolioId);
  return buildPortfolioSummary(holdings);
};

const getUserPortfolioDetails = async (userId, portfolioId) => {
  const portfolio = await getPortfolioById({ userId, portfolioId });
  if (!portfolio) {
    return null;
  }

  const holdings = await getUserPortfolioHoldings(userId, portfolioId);
  const summary = buildPortfolioSummary(holdings);
  const transactions = await listPortfolioTransactions({ userId, portfolioId });

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
  getUserPortfolioDetails,
  createPortfolioTransaction,
};
