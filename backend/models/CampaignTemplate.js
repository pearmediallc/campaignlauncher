module.exports = (sequelize, DataTypes) => {
  const CampaignTemplate = sequelize.define('CampaignTemplate', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    templateName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    templateData: {
      type: DataTypes.JSON,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    mediaUrls: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    category: {
      type: DataTypes.STRING(100),
      defaultValue: 'personal',
      validate: {
        isIn: [['personal', 'shared', 'team']]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'CampaignTemplates',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['userId', 'isDefault']
      },
      {
        fields: ['category']
      }
    ]
  });

  CampaignTemplate.associate = function(models) {
    CampaignTemplate.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  // Instance methods
  CampaignTemplate.prototype.incrementUsage = async function() {
    this.usageCount += 1;
    this.lastUsedAt = new Date();
    return await this.save();
  };

  // Class methods
  CampaignTemplate.setUserDefault = async function(userId, templateId) {
    // First, unset any existing defaults for this user
    await CampaignTemplate.update(
      { isDefault: false },
      { where: { userId, isDefault: true } }
    );

    // Then set the new default
    return await CampaignTemplate.update(
      { isDefault: true },
      { where: { id: templateId, userId } }
    );
  };

  CampaignTemplate.getUserTemplates = async function(userId, options = {}) {
    const where = { userId };

    if (options.category) {
      where.category = options.category;
    }

    return await CampaignTemplate.findAll({
      where,
      order: [
        ['isDefault', 'DESC'],
        ['usageCount', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });
  };

  return CampaignTemplate;
};