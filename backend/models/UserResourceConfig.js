'use strict';

module.exports = (sequelize, DataTypes) => {
  const UserResourceConfig = sequelize.define('UserResourceConfig', {
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
    configName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'config_name'
    },
    adAccountId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'ad_account_id'
    },
    pageId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'page_id'
    },
    pixelId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'pixel_id'
    },
    businessId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'business_id'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_active'
    },
    isPreset: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_preset'
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_used_at'
    }
  }, {
    tableName: 'user_resource_configs',
    timestamps: true,
    underscored: true
  });

  UserResourceConfig.associate = function(models) {
    UserResourceConfig.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  // Helper methods
  UserResourceConfig.prototype.activate = async function() {
    // Deactivate all other configs for this user
    await UserResourceConfig.update(
      { isActive: false },
      { where: { userId: this.userId } }
    );
    
    // Activate this config
    this.isActive = true;
    this.lastUsedAt = new Date();
    return this.save();
  };

  UserResourceConfig.getActiveConfig = async function(userId) {
    return UserResourceConfig.findOne({
      where: {
        userId,
        isActive: true
      }
    });
  };

  UserResourceConfig.getPresets = async function(userId) {
    return UserResourceConfig.findAll({
      where: {
        userId,
        isPreset: true
      },
      order: [['last_used_at', 'DESC']]
    });
  };

  UserResourceConfig.getRecentConfigs = async function(userId, limit = 5) {
    return UserResourceConfig.findAll({
      where: { userId },
      order: [['last_used_at', 'DESC']],
      limit
    });
  };

  return UserResourceConfig;
};