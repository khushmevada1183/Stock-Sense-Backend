const express = require('express');
const healthRoutes = require('../../modules/health/health.routes');
const stockTickRoutes = require('../../modules/stocks/ticks/ticks.routes');
const portfolioRoutes = require('../../modules/portfolio/portfolio.routes');
const marketRoutes = require('../../modules/market/market.routes');
const authRoutes = require('../../modules/auth/auth.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/stocks', stockTickRoutes);
router.use('/portfolios', portfolioRoutes);
router.use('/market', marketRoutes);

module.exports = router;
