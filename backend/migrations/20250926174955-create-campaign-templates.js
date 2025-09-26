'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('CampaignTemplates', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      templateName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      templateData: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Stores entire form data for Strategy 1-50-1'
      },
      mediaUrls: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of uploaded media URLs'
      },
      isDefault: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      category: {
        type: Sequelize.STRING(100),
        defaultValue: 'personal',
        comment: 'personal, shared, or team'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      usageCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      lastUsedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('CampaignTemplates', ['userId']);
    await queryInterface.addIndex('CampaignTemplates', ['userId', 'isDefault']);
    await queryInterface.addIndex('CampaignTemplates', ['category']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('CampaignTemplates');
  }
};