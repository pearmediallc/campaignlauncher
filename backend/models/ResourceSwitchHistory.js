'use strict';

module.exports = (sequelize, DataTypes) => {
  const ResourceSwitchHistory = sequelize.define('ResourceSwitchHistory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    fromConfig: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'from_config'
    },
    toConfig: {
      type: DataTypes.JSON,
      allowNull: false,
      field: 'to_config'
    },
    switchedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'switched_at'
    }
  }, {
    tableName: 'resource_switch_history',
    timestamps: false,
    underscored: true
  });

  ResourceSwitchHistory.associate = function(models) {
    ResourceSwitchHistory.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  // Helper method to log a switch
  ResourceSwitchHistory.logSwitch = async function(userId, fromConfig, toConfig) {
    return ResourceSwitchHistory.create({
      userId,
      fromConfig,
      toConfig,
      switchedAt: new Date()
    });
  };

  // Get recent switch history for a user
  ResourceSwitchHistory.getRecentHistory = async function(userId, limit = 10) {
    return ResourceSwitchHistory.findAll({
      where: { userId },
      order: [['switched_at', 'DESC']],
      limit
    });
  };

  return ResourceSwitchHistory;
};