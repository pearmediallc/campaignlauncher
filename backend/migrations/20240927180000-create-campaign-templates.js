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
        allowNull: false
      },
      mediaUrls: {
        type: Sequelize.JSON,
        allowNull: true
      },
      isDefault: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      category: {
        type: Sequelize.STRING(100),
        defaultValue: 'personal'
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
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('CampaignTemplates', ['userId'], {
      name: 'idx_campaign_templates_user_id'
    });

    await queryInterface.addIndex('CampaignTemplates', ['userId', 'isDefault'], {
      name: 'idx_campaign_templates_user_default'
    });

    await queryInterface.addIndex('CampaignTemplates', ['category'], {
      name: 'idx_campaign_templates_category'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('CampaignTemplates');
  }
};