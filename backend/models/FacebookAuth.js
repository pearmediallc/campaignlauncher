'use strict';
const crypto = require('crypto');

module.exports = (sequelize, DataTypes) => {
  const FacebookAuth = sequelize.define('FacebookAuth', {
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
  facebookUserId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  accessToken: {
    type: DataTypes.TEXT,
    allowNull: false,
    // Getter to decrypt token
    get() {
      const rawValue = this.getDataValue('accessToken');
      if (!rawValue) return null;
      return this.constructor.decrypt(rawValue);
    },
    // Setter to encrypt token
    set(value) {
      if (value) {
        this.setDataValue('accessToken', this.constructor.encrypt(value));
      }
    }
  },
  refreshToken: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('refreshToken');
      if (!rawValue) return null;
      return this.constructor.decrypt(rawValue);
    },
    set(value) {
      if (value) {
        this.setDataValue('refreshToken', this.constructor.encrypt(value));
      }
    }
  },
  tokenExpiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  permissions: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of granted Facebook permissions'
  },
  adAccounts: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of accessible ad accounts'
  },
  selectedAdAccount: {
    type: DataTypes.JSON,
    defaultValue: null,
    comment: 'Currently selected ad account for campaigns'
  },
  pages: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of manageable pages'
  },
  selectedPage: {
    type: DataTypes.JSON,
    defaultValue: null,
    comment: 'Currently selected page for campaigns'
  },
  pixels: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of accessible pixels'
  },
  selectedPixel: {
    type: DataTypes.JSON,
    defaultValue: null,
    comment: 'Currently selected pixel for tracking'
  },
  businessAccounts: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of business accounts'
  },
  storagePreference: {
    type: DataTypes.ENUM('local', 'session'),
    defaultValue: 'session',
    comment: 'User preference for token storage'
  },
  lastVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'facebook_auth',
  underscored: true,  // Automatically maps camelCase to snake_case
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['facebookUserId'] },
    { fields: ['isActive'] }
  ]
});

// Static methods for encryption/decryption
FacebookAuth.encrypt = function(text) {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'), 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    encrypted,
    authTag: authTag.toString('hex'),
    iv: iv.toString('hex')
  });
};

FacebookAuth.decrypt = function(data) {
  try {
    const { encrypted, authTag, iv } = JSON.parse(data);
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'), 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

  // Define associations
  FacebookAuth.associate = function(models) {
    FacebookAuth.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return FacebookAuth;
};