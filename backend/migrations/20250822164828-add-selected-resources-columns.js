'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add missing columns to facebook_auth table
    await queryInterface.addColumn('facebook_auth', 'selected_ad_account', {
      type: Sequelize.JSON,
      defaultValue: null,
      allowNull: true
    });
    
    await queryInterface.addColumn('facebook_auth', 'selected_page', {
      type: Sequelize.JSON,
      defaultValue: null,
      allowNull: true
    });
    
    await queryInterface.addColumn('facebook_auth', 'selected_pixel', {
      type: Sequelize.JSON,
      defaultValue: null,
      allowNull: true
    });
    
    await queryInterface.addColumn('facebook_auth', 'business_accounts', {
      type: Sequelize.JSON,
      defaultValue: [],
      allowNull: true
    });
    
    await queryInterface.addColumn('facebook_auth', 'storage_preference', {
      type: Sequelize.STRING,
      defaultValue: 'local',
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('facebook_auth', 'selected_ad_account');
    await queryInterface.removeColumn('facebook_auth', 'selected_page');
    await queryInterface.removeColumn('facebook_auth', 'selected_pixel');
    await queryInterface.removeColumn('facebook_auth', 'business_accounts');
    await queryInterface.removeColumn('facebook_auth', 'storage_preference');
  }
};
