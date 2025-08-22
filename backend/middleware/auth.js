const jwt = require('jsonwebtoken');
const { User } = require('../models');
const PermissionService = require('../services/PermissionService');

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'email', 'firstName', 'lastName', 'isActive']
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'User account is deactivated' });
    }

    req.user = user;
    req.userId = user.id;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      const hasPermission = await PermissionService.checkPermission(
        req.userId,
        resource,
        action
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: `${resource}:${action}`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

const requireResourceAccess = (resourceType, resourceIdParam = 'id', permission = 'read') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam] || req.body[resourceIdParam];
      
      if (!resourceId) {
        return res.status(400).json({ error: 'Resource ID not provided' });
      }

      const hasAccess = await PermissionService.checkResourceAccess(
        req.userId,
        resourceType,
        resourceId,
        permission
      );

      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Access denied to this resource',
          resourceType,
          resourceId
        });
      }

      req.resourceId = resourceId;
      next();
    } catch (error) {
      console.error('Resource access check error:', error);
      return res.status(500).json({ error: 'Resource access check failed' });
    }
  };
};

const requireAnyPermission = (...permissions) => {
  return async (req, res, next) => {
    try {
      const userPermissions = await PermissionService.getUserPermissions(req.userId);
      
      const hasAnyPermission = permissions.some(permission => {
        const [resource, action] = permission.split(':');
        const permissionString = `${resource}:${action}`;
        const wildcardPermission = `${resource}:*`;
        const superPermission = '*:*';
        
        return userPermissions.includes(permissionString) || 
               userPermissions.includes(wildcardPermission) ||
               userPermissions.includes(superPermission);
      });

      if (!hasAnyPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          requiredAny: permissions
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

const requireAllPermissions = (...permissions) => {
  return async (req, res, next) => {
    try {
      const userPermissions = await PermissionService.getUserPermissions(req.userId);
      
      const hasAllPermissions = permissions.every(permission => {
        const [resource, action] = permission.split(':');
        const permissionString = `${resource}:${action}`;
        const wildcardPermission = `${resource}:*`;
        const superPermission = '*:*';
        
        return userPermissions.includes(permissionString) || 
               userPermissions.includes(wildcardPermission) ||
               userPermissions.includes(superPermission);
      });

      if (!hasAllPermissions) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          requiredAll: permissions
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

module.exports = {
  authenticate,
  requirePermission,
  requireResourceAccess,
  requireAnyPermission,
  requireAllPermissions
};