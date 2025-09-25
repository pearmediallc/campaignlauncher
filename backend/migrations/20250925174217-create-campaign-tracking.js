'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('campaign_tracking', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      campaign_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Facebook campaign ID'
      },
      campaign_name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Campaign name for display'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'User who created the campaign'
      },
      ad_account_id: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Facebook ad account ID'
      },
      strategy_type: {
        type: Sequelize.STRING,
        defaultValue: '1-50-1',
        comment: 'Campaign creation strategy used'
      },
      post_id: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Facebook post ID used in campaign'
      },
      ad_set_count: {
        type: Sequelize.INTEGER,
        defaultValue: 50,
        comment: 'Number of ad sets in campaign'
      },
      last_fetched: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last time campaign details were fetched from Facebook'
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: 'ACTIVE',
        comment: 'Current campaign status'
      },
      learning_phase_summary: {
        type: Sequelize.JSON,
        defaultValue: {},
        comment: 'Summary of learning phase status for ad sets'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for faster queries
    await queryInterface.addIndex('campaign_tracking', ['user_id']);
    await queryInterface.addIndex('campaign_tracking', ['campaign_id']);
    await queryInterface.addIndex('campaign_tracking', ['ad_account_id']);
    await queryInterface.addIndex('campaign_tracking', ['created_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('campaign_tracking');
  }
};