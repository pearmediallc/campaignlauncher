'use strict';

module.exports = (sequelize, DataTypes) => {
  const Resource = sequelize.define('Resource', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type: {
      type: DataTypes.ENUM('ad_account', 'campaign', 'page'),
      allowNull: false
    },
    externalId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'external_id'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    metadata: {
      type: DataTypes.JSON
    }
  }, {
    tableName: 'resources',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['type', 'external_id']
      }
    ]
  });

  Resource.associate = function(models) {
    Resource.belongsToMany(models.User, {
      through: models.UserResource,
      foreignKey: 'resourceId',
      otherKey: 'userId',
      as: 'users'
    });
  };

  return Resource;
};