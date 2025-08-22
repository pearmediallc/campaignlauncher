'use strict';

module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,  // Allow null for anonymous actions like failed logins
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    resourceType: {
      type: DataTypes.STRING(50),
      field: 'resource_type'
    },
    resourceId: {
      type: DataTypes.STRING(255),
      field: 'resource_id'
    },
    details: {
      type: DataTypes.JSON
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      field: 'ip_address'
    },
    userAgent: {
      type: DataTypes.TEXT,
      field: 'user_agent'
    },
    status: {
      type: DataTypes.ENUM('success', 'failure', 'partial'),
      defaultValue: 'success'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      field: 'error_message'
    }
  }, {
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        fields: ['user_id', 'created_at']
      },
      {
        fields: ['resource_type', 'resource_id']
      },
      {
        fields: ['action', 'created_at']
      }
    ]
  });

  AuditLog.associate = function(models) {
    AuditLog.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return AuditLog;
};