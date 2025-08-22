'use strict';

module.exports = (sequelize, DataTypes) => {
  const EligibilityCheck = sequelize.define('EligibilityCheck', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  facebookAuthId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'facebook_auth',
      key: 'id'
    }
  },
  checkType: {
    type: DataTypes.ENUM('initial', 'periodic', 'manual'),
    defaultValue: 'initial'
  },
  status: {
    type: DataTypes.ENUM('pending', 'eligible', 'ineligible', 'review_required'),
    defaultValue: 'pending'
  },
  criteria: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Detailed criteria check results'
  },
  hasActiveAdAccount: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  hasNoRestrictions: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  accountAge: {
    type: DataTypes.INTEGER,
    comment: 'Account age in days'
  },
  hasSpendingHistory: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  hasPaymentMethod: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  businessVerificationStatus: {
    type: DataTypes.STRING,
    allowNull: true
  },
  totalSpend: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  adAccountCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  failureReasons: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of reasons why eligibility check failed'
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Additional metadata from Facebook API'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'When this eligibility check expires and needs renewal'
  },
  checkedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'eligibility_checks',
  underscored: true,  // Automatically maps camelCase to snake_case
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['facebookAuthId'] },
    { fields: ['status'] },
    { fields: ['expiresAt'] },
    { fields: ['checkedAt'] }
  ]
});

// Instance method to check if verification is still valid
EligibilityCheck.prototype.isValid = function() {
  return this.status === 'eligible' && new Date() < new Date(this.expiresAt);
};

// Static method to get latest check for user
EligibilityCheck.getLatestForUser = async function(userId) {
  return await this.findOne({
    where: { userId },
    order: [['checkedAt', 'DESC']]
  });
};

  // Define associations
  EligibilityCheck.associate = function(models) {
    EligibilityCheck.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    EligibilityCheck.belongsTo(models.FacebookAuth, {
      foreignKey: 'facebookAuthId',
      as: 'facebookAuth'
    });
  };

  return EligibilityCheck;
};