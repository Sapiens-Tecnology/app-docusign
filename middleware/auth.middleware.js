const DsJwtAuth = require('../classes/DSJwtAuth');

module.exports = async (req, _res, next) => {
  req.dsAuth = new DsJwtAuth(req);
  req.user = await req.dsAuth.getToken();
  next();
}