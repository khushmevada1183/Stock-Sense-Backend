const express = require('express');
const healthRoutes = require('../../modules/health/health.routes');
const stockTickRoutes = require('../../modules/stocks/ticks/ticks.routes');
const portfolioRoutes = require('../../modules/portfolio/portfolio.routes');
const watchlistRoutes = require('../../modules/watchlists/watchlists.routes');
const alertsRoutes = require('../../modules/alerts/alerts.routes');
const notificationsRoutes = require('../../modules/notifications/notifications.routes');
const ipoRoutes = require('../../modules/ipo/ipo.routes');
const institutionalRoutes = require('../../modules/institutional/institutional.routes');
const marketRoutes = require('../../modules/market/market.routes');
const authRoutes = require('../../modules/auth/auth.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/stocks', stockTickRoutes);
router.use('/portfolios', portfolioRoutes);
router.use('/watchlists', watchlistRoutes);
router.use('/alerts', alertsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/ipo', ipoRoutes);
router.use('/institutional', institutionalRoutes);
router.use('/market', marketRoutes);

module.exports = router;
