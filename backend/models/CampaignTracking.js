'use strict';

module.exports = (sequelize, DataTypes) => {
  const CampaignTracking = sequelize.define('CampaignTracking', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    campaign_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'campaign_id'
    },
    campaign_name: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'campaign_name'
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id'
    },
    ad_account_id: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'ad_account_id'
    },
    strategy_type: {
      type: DataTypes.STRING,
      defaultValue: '1-50-1',
      field: 'strategy_type'
    },
    post_id: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'post_id'
    },
    ad_set_count: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
      field: 'ad_set_count'
    },
    last_fetched: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_fetched'
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'ACTIVE',
      field: 'status'
    },
    learning_phase_summary: {
      type: DataTypes.JSON,
      defaultValue: {},
      field: 'learning_phase_summary'
    }
  }, {
    tableName: 'campaign_tracking',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  CampaignTracking.associate = function(models) {
    // Association with User model
    CampaignTracking.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE'
    });
  };

  // Instance methods
  CampaignTracking.prototype.updateLastFetched = function() {
    return this.update({ last_fetched: new Date() });
  };

  CampaignTracking.prototype.updateLearningPhase = function(learningData) {
    return this.update({
      learning_phase_summary: learningData,
      last_fetched: new Date()
    });
  };

  // Class methods
  CampaignTracking.findByUserId = function(userId) {
    return this.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });
  };

  CampaignTracking.findByCampaignId = function(campaignId) {
    return this.findOne({
      where: { campaign_id: campaignId }
    });
  };

  return CampaignTracking;
};