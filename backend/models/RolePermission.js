'use strict';

module.exports = (sequelize, DataTypes) => {
  const RolePermission = sequelize.define('RolePermission', {
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'role_id',
      references: {
        model: 'roles',
        key: 'id'
      }
    },
    permissionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'permission_id',
      references: {
        model: 'permissions',
        key: 'id'
      }
    }
  }, {
    tableName: 'role_permissions',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['role_id', 'permission_id']
      }
    ]
  });

  return RolePermission;
};