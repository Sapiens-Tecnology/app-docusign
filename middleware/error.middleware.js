const Logs = require('../classes/Logs.class');

module.exports = (err, _req, res, _next) => {
  Logs.fromError(err);
  res.status(err.status || 400).json({
    error: err.message || 'Error na criação do contrato'
  });
};
