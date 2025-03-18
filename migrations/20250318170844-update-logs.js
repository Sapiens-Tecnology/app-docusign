'use strict';
const TABLE_NAME = 'Logs';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn(TABLE_NAME, 'source', {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.changeColumn(TABLE_NAME, 'source', {
      type: Sequelize.ENUM(['ACCOUNT', 'PAYMENT', 'PURCHASE', 'SYSTEM', 'GESTOR', 'DOCUSIGN']),
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn(TABLE_NAME, 'source', {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.changeColumn(TABLE_NAME, 'source', {
      type: Sequelize.ENUM(['ACCOUNT', 'PAYMENT', 'PURCHASE', 'SYSTEM', 'GESTOR']),
      allowNull: false,
    });
  },
};
