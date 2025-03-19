const joi = require('joi');
const models = require('../models');
const Abstract = require('./Abstract');

module.exports = class Logs extends Abstract {
  constructor (options = {}) {
    super(models.Logs);
    this.issuerId = options.issuerId;
    this.source = options.source;
    this.type = options.type || 'BUG';
    this.message = options.message;
  }

  static getSchema () {
    return joi.object({
      issuerId: joi.string().length(36),
      source: joi.string().valid('ACCOUNT', 'PAYMENT', 'PURCHASE', 'SYSTEM', 'GESTOR', 'DOCUSIGN').required(),
      type: joi.string().valid('BUG', 'VALIDATION', 'ERROR', 'OTHER').required(),
      message: joi.string().max(2048).required(),
      createdAt: joi.date().required(),
      updatedAt: joi.date().required(),
    })
  }

  static async fromError (error) {
    console.log('\x1b[35m', `\n\n🪲\t${error.response?.data || error.message}\t🪲\n\n`, '\x1b[0m');
    const logs = new Logs({
      source: 'DOCUSIGN',
      type: 'ERROR',
      message: error.response?.data || error.message,
    });
    await logs.create();
  }
}