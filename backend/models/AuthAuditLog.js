'use strict';

module.exports = (sequelize, DataTypes) => {
  const AuthAuditLog = sequelize.define('AuthAuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'user_id',  // Map to snake_case column name
    references: {
      model: 'users',
      key: 'id'
    }
  },
  eventType: {
    field: 'event_type',  // Map to snake_case
    type: DataTypes.ENUM(
      'login_attempt',
      'login_success',
      'login_failure',
      'token_refresh',
      'eligibility_check',
      'permission_grant',
      'permission_revoke',
      'logout',
      'token_expired',
      'suspicious_activity',
      'resources_selected',
      'sdk_login_attempt',
      'sdk_login_failure',
      'sdk_login_success',
      'sdk_login_error',
      'data_deletion_request'
    ),
    allowNull: false
  },
  eventStatus: {
    field: 'event_status',
    type: DataTypes.ENUM('success', 'failure', 'pending'),
    allowNull: false
  },
  ipAddress: {
    field: 'ip_address',
    type: DataTypes.STRING,
    allowNull: true
  },
  userAgent: {
    field: 'user_agent',
    type: DataTypes.TEXT,
    allowNull: true
  },
  facebookUserId: {
    field: 'facebook_user_id',
    type: DataTypes.STRING,
    allowNull: true
  },
  errorMessage: {
    field: 'error_message',
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Additional event metadata'
  },
  createdAt: {
    field: 'created_at',
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'auth_audit_logs',
  timestamps: false,
  indexes: [
    { fields: ['userId'] },
    { fields: ['eventType'] },
    { fields: ['eventStatus'] },
    { fields: ['createdAt'] },
    { fields: ['facebookUserId'] }
  ]
});

  // Static method to log authentication event
  AuthAuditLog.logEvent = async function(data) {
    try {
      return await this.create(data);
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw error to prevent breaking the main flow
    }
  };

  // Define associations
  AuthAuditLog.associate = function(models) {
    AuthAuditLog.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return AuthAuditLog;
};