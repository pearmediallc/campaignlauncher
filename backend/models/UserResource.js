'use strict';

module.exports = (sequelize, DataTypes) => {
  const UserResource = sequelize.define('UserResource', {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'resource_id',
      references: {
        model: 'resources',
        key: 'id'
      }
    },
    permissions: {
      type: DataTypes.JSON,
      defaultValue: ['read']
    },
    grantedBy: {
      type: DataTypes.INTEGER,
      field: 'granted_by',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    grantedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'granted_at'
    }
  }, {
    tableName: 'user_resources',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'resource_id']
      }
    ]
  });

  return UserResource;
};