'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create user_resource_configs table for storing multiple resource configurations
    await queryInterface.createTable('user_resource_configs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      config_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      ad_account_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      page_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      pixel_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      business_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_preset: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      last_used_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Create resource_switch_history table for audit trail
    await queryInterface.createTable('resource_switch_history', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      from_config: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Previous resource configuration'
      },
      to_config: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'New resource configuration'
      },
      switched_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('user_resource_configs', ['user_id']);
    await queryInterface.addIndex('user_resource_configs', ['user_id', 'is_active']);
    await queryInterface.addIndex('user_resource_configs', ['user_id', 'is_preset']);
    await queryInterface.addIndex('resource_switch_history', ['user_id']);
    await queryInterface.addIndex('resource_switch_history', ['switched_at']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove tables in reverse order
    await queryInterface.dropTable('resource_switch_history');
    await queryInterface.dropTable('user_resource_configs');
  }
};