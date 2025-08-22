const redis = require('./redisClient');
const { User, Role, Permission, Resource, UserResource, RolePermission } = require('../models');

class PermissionService {
  constructor() {
    this.cachePrefix = 'perms:';
    this.cacheTTL = 300; // 5 minutes
  }

  async getUserPermissions(userId) {
    const cacheKey = `${this.cachePrefix}user:${userId}`;
    
    // Only use cache if Redis is available
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.error('Redis get error:', error);
      }
    }

    const user = await User.findByPk(userId, {
      include: [
        {
          model: Role,
          as: 'roles',
          include: [
            {
              model: Permission,
              as: 'permissions'
            }
          ]
        }
      ]
    });

    if (!user) {
      return [];
    }

    const permissions = new Set();
    
    user.roles.forEach(role => {
      role.permissions.forEach(permission => {
        permissions.add(`${permission.resource}:${permission.action}`);
      });
    });

    const permissionArray = Array.from(permissions);

    if (redis) {
      try {
        await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(permissionArray));
      } catch (error) {
        console.error('Redis set error:', error);
      }
    }

    return permissionArray;
  }

  async getUserResources(userId, resourceType = null) {
    const cacheKey = `${this.cachePrefix}resources:${userId}:${resourceType || 'all'}`;
    
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.error('Redis get error:', error);
      }
    }

    const whereClause = resourceType ? { type: resourceType } : {};
    
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Resource,
          as: 'resources',
          where: whereClause,
          required: false,
          through: {
            attributes: ['permissions']
          }
        }
      ]
    });

    if (!user) {
      return [];
    }

    const resources = user.resources.map(resource => ({
      id: resource.id,
      type: resource.type,
      externalId: resource.externalId,
      name: resource.name,
      permissions: resource.UserResource.permissions,
      metadata: resource.metadata
    }));

    if (redis) {
      try {
        await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(resources));
      } catch (error) {
        console.error('Redis set error:', error);
      }
    }

    return resources;
  }

  async checkPermission(userId, resource, action) {
    const permissions = await this.getUserPermissions(userId);
    const permissionString = `${resource}:${action}`;
    const wildcardPermission = `${resource}:*`;
    const superPermission = '*:*';
    
    return permissions.includes(permissionString) || 
           permissions.includes(wildcardPermission) ||
           permissions.includes(superPermission);
  }

  async checkResourceAccess(userId, resourceType, resourceId, requiredPermission = 'read') {
    const resources = await this.getUserResources(userId, resourceType);
    const resource = resources.find(r => r.externalId === resourceId);
    
    if (!resource) {
      return false;
    }
    
    return resource.permissions.includes(requiredPermission) || 
           resource.permissions.includes('*');
  }

  async grantResourceAccess(userId, resourceId, permissions, grantedBy) {
    const userResource = await UserResource.findOne({
      where: { userId, resourceId }
    });

    if (userResource) {
      const existingPerms = userResource.permissions || [];
      const newPerms = [...new Set([...existingPerms, ...permissions])];
      
      await userResource.update({
        permissions: newPerms,
        grantedBy,
        grantedAt: new Date()
      });
    } else {
      await UserResource.create({
        userId,
        resourceId,
        permissions,
        grantedBy,
        grantedAt: new Date()
      });
    }

    await this.invalidateUserCache(userId);
  }

  async revokeResourceAccess(userId, resourceId) {
    await UserResource.destroy({
      where: { userId, resourceId }
    });
    
    await this.invalidateUserCache(userId);
  }

  async assignRole(userId, roleId, assignedBy) {
    const user = await User.findByPk(userId);
    const role = await Role.findByPk(roleId);
    
    if (!user || !role) {
      throw new Error('User or Role not found');
    }

    await user.addRole(role, {
      through: {
        assignedBy,
        assignedAt: new Date()
      }
    });

    await this.invalidateUserCache(userId);
  }

  async removeRole(userId, roleId) {
    const user = await User.findByPk(userId);
    const role = await Role.findByPk(roleId);
    
    if (!user || !role) {
      throw new Error('User or Role not found');
    }

    await user.removeRole(role);
    await this.invalidateUserCache(userId);
  }

  async invalidateUserCache(userId) {
    if (!redis) return;
    
    const patterns = [
      `${this.cachePrefix}user:${userId}`,
      `${this.cachePrefix}resources:${userId}:*`
    ];
    
    for (const pattern of patterns) {
      try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } catch (error) {
        console.error('Redis delete error:', error);
      }
    }
  }

  async invalidateAllCache() {
    if (!redis) return;
    
    try {
      const keys = await redis.keys(`${this.cachePrefix}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Redis delete all error:', error);
    }
  }

  async createDefaultRolesAndPermissions() {
    const defaultRoles = [
      { name: 'super_admin', description: 'Full system access', isSystem: true },
      { name: 'admin', description: 'Administrative access', isSystem: true },
      { name: 'manager', description: 'Campaign management access', isSystem: true },
      { name: 'media_buyer', description: 'Campaign creation and viewing', isSystem: true },
      { name: 'viewer', description: 'Read-only access', isSystem: true }
    ];

    const defaultPermissions = [
      // User management
      { resource: 'user', action: 'create', description: 'Create users' },
      { resource: 'user', action: 'read', description: 'View users' },
      { resource: 'user', action: 'update', description: 'Update users' },
      { resource: 'user', action: 'delete', description: 'Delete users' },
      
      // Role management
      { resource: 'role', action: 'create', description: 'Create roles' },
      { resource: 'role', action: 'read', description: 'View roles' },
      { resource: 'role', action: 'update', description: 'Update roles' },
      { resource: 'role', action: 'delete', description: 'Delete roles' },
      { resource: 'role', action: 'assign', description: 'Assign roles to users' },
      
      // Campaign management
      { resource: 'campaign', action: 'create', description: 'Create campaigns' },
      { resource: 'campaign', action: 'read', description: 'View campaigns' },
      { resource: 'campaign', action: 'update', description: 'Update campaigns' },
      { resource: 'campaign', action: 'delete', description: 'Delete campaigns' },
      { resource: 'campaign', action: 'approve', description: 'Approve campaigns' },
      { resource: 'campaign', action: 'pause', description: 'Pause campaigns' },
      { resource: 'campaign', action: 'resume', description: 'Resume campaigns' },
      
      // Ad Account management
      { resource: 'ad_account', action: 'create', description: 'Add ad accounts' },
      { resource: 'ad_account', action: 'read', description: 'View ad accounts' },
      { resource: 'ad_account', action: 'update', description: 'Update ad accounts' },
      { resource: 'ad_account', action: 'delete', description: 'Remove ad accounts' },
      { resource: 'ad_account', action: 'grant_access', description: 'Grant ad account access' },
      
      // Page management
      { resource: 'page', action: 'create', description: 'Add pages' },
      { resource: 'page', action: 'read', description: 'View pages' },
      { resource: 'page', action: 'update', description: 'Update pages' },
      { resource: 'page', action: 'delete', description: 'Remove pages' },
      
      // Resource management
      { resource: 'resource', action: 'grant', description: 'Grant resource access' },
      { resource: 'resource', action: 'revoke', description: 'Revoke resource access' },
      
      // Audit logs
      { resource: 'audit', action: 'read', description: 'View audit logs' },
      { resource: 'audit', action: 'export', description: 'Export audit logs' }
    ];

    // Create permissions
    for (const perm of defaultPermissions) {
      await Permission.findOrCreate({
        where: { resource: perm.resource, action: perm.action },
        defaults: perm
      });
    }

    // Create roles
    for (const roleData of defaultRoles) {
      const [role] = await Role.findOrCreate({
        where: { name: roleData.name },
        defaults: roleData
      });

      // Assign permissions based on role
      const permissions = await Permission.findAll();
      let rolePermissions = [];

      switch (role.name) {
        case 'super_admin':
          rolePermissions = permissions;
          break;
        
        case 'admin':
          rolePermissions = permissions.filter(p => 
            !['user:delete', 'role:delete'].includes(`${p.resource}:${p.action}`)
          );
          break;
        
        case 'manager':
          rolePermissions = permissions.filter(p => 
            ['campaign', 'ad_account', 'page', 'audit'].includes(p.resource) ||
            (p.resource === 'user' && p.action === 'read') ||
            (p.resource === 'role' && p.action === 'read')
          );
          break;
        
        case 'media_buyer':
          rolePermissions = permissions.filter(p => 
            (p.resource === 'campaign' && ['create', 'read', 'update'].includes(p.action)) ||
            (p.resource === 'ad_account' && p.action === 'read') ||
            (p.resource === 'page' && p.action === 'read')
          );
          break;
        
        case 'viewer':
          rolePermissions = permissions.filter(p => 
            p.action === 'read' && ['campaign', 'ad_account', 'page'].includes(p.resource)
          );
          break;
      }

      await role.setPermissions(rolePermissions);
    }
  }
}

module.exports = new PermissionService();