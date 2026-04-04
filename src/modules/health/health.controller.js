const asyncHandler = require('../../shared/middleware/asyncHandler');
const { getDatabaseHealth } = require('./health.repository');

const getServiceHealth = (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'UP',
      service: 'stock-sense-backend-v1',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    },
  });
};

const getDatabaseHealthStatus = asyncHandler(async (req, res) => {
  const data = await getDatabaseHealth();

  res.status(200).json({
    success: true,
    data: {
      ...data,
      timestamp: new Date().toISOString(),
    },
  });
});

module.exports = {
  getServiceHealth,
  getDatabaseHealthStatus,
};
