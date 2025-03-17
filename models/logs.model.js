'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Logs extends Model {};

  Logs.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    issuerId: DataTypes.STRING(36),
    source: DataTypes.ENUM('ACCOUNT', 'PAYMENT', 'PURCHASE', 'SYSTEM', 'GESTOR','DOCUSIGN'),
    type: {
      type: DataTypes.ENUM('BUG', 'VALIDATION', 'ERROR', 'OTHER'),
      defaultValue: 'BUG',
    },
    message: DataTypes.STRING(2048),
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
  }, {
    sequelize,
    modelName: 'Logs',
    tableName: 'Logs',
    underscored: true,
    timestamps: false,
  });

  return Logs;
};
