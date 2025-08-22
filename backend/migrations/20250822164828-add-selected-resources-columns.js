'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Check which columns already exist
    const tableDescription = await queryInterface.describeTable('facebook_auth');
    
    // Add missing columns to facebook_auth table
    if (!tableDescription.selected_ad_account) {
      await queryInterface.addColumn('facebook_auth', 'selected_ad_account', {
        type: Sequelize.JSON,
        defaultValue: null,
        allowNull: true
      });
    }
    
    if (!tableDescription.selected_page) {
      await queryInterface.addColumn('facebook_auth', 'selected_page', {
        type: Sequelize.JSON,
        defaultValue: null,
        allowNull: true
      });
    }
    
    if (!tableDescription.selected_pixel) {
      await queryInterface.addColumn('facebook_auth', 'selected_pixel', {
        type: Sequelize.JSON,
        defaultValue: null,
        allowNull: true
      });
    }
    
    if (!tableDescription.pixels) {
      await queryInterface.addColumn('facebook_auth', 'pixels', {
        type: Sequelize.JSON,
        defaultValue: [],
        allowNull: true
      });
    }
    
    if (!tableDescription.storage_preference) {
      await queryInterface.addColumn('facebook_auth', 'storage_preference', {
        type: Sequelize.STRING,
        defaultValue: 'local',
        allowNull: true
      });
    }
  },

  async down (queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('facebook_auth');
    
    if (tableDescription.selected_ad_account) {
      await queryInterface.removeColumn('facebook_auth', 'selected_ad_account');
    }
    if (tableDescription.selected_page) {
      await queryInterface.removeColumn('facebook_auth', 'selected_page');
    }
    if (tableDescription.selected_pixel) {
      await queryInterface.removeColumn('facebook_auth', 'selected_pixel');
    }
    if (tableDescription.pixels) {
      await queryInterface.removeColumn('facebook_auth', 'pixels');
    }
    if (tableDescription.storage_preference) {
      await queryInterface.removeColumn('facebook_auth', 'storage_preference');
    }
  }
};
