// errorMiddleware.js
const Logs = require('../classes/Logs.class');

module.exports = (err, _req, res, _next) => {
  // Logs.fromError(err);
  res.status(err.status || 500).json({
    error: err.message,
    details: err.response?.data || 'An unexpected error occurred'
  });
};
