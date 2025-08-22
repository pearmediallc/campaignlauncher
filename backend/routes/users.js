const express = require('express');
const router = express.Router();
const { User, Role, Resource } = require('../models');
const { authenticate, requirePermission } = require('../middleware/auth');
const PermissionService = require('../services/PermissionService');
const AuditService = require('../services/AuditService');
const { body, param, validationResult } = require('express-validator');

// Get all users (requires user:read permission)
router.get('/', authenticate, requirePermission('user', 'read'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (search) {
      where.$or = [
        { email: { $like: `%${search}%` } },
        { firstName: { $like: `%${search}%` } },
        { lastName: { $like: `%${search}%` } }
      ];
    }

    const users = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: ['id', 'email', 'firstName', 'lastName', 'isActive', 'lastLogin', 'createdAt'],
      include: [{
        model: Role,
        as: 'roles',
        attributes: ['id', 'name']
      }]
    });

    res.json({
      success: true,
      data: users.rows,
      total: users.count,
      page: parseInt(page),
      totalPages: Math.ceil(users.count / limit)
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get user by ID
router.get('/:id', authenticate, requirePermission('user', 'read'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'email', 'firstName', 'lastName', 'isActive', 'lastLogin', 'createdAt'],
      include: [
        {
          model: Role,
          as: 'roles',
          attributes: ['id', 'name', 'description']
        },
        {
          model: Resource,
          as: 'resources',
          attributes: ['id', 'type', 'externalId', 'name'],
          through: {
            attributes: ['permissions']
          }
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Create user (requires user:create permission)
router.post('/', authenticate, requirePermission('user', 'create'), [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('roleIds').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, roleIds } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      createdBy: req.userId
    });

    if (roleIds && roleIds.length > 0) {
      const roles = await Role.findAll({ where: { id: roleIds } });
      await user.setRoles(roles);
    }

    await AuditService.logRequest(req, 'user.create', 'user', user.id);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    await AuditService.logRequest(req, 'user.create', null, null, 'failure', error.message);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', authenticate, requirePermission('user', 'update'), [
  param('id').isInt(),
  body('firstName').optional().trim(),
  body('lastName').optional().trim(),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { firstName, lastName, isActive } = req.body;
    
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (isActive !== undefined) user.isActive = isActive;
    
    await user.save();

    await AuditService.logRequest(req, 'user.update', 'user', user.id);

    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    await AuditService.logRequest(req, 'user.update', 'user', req.params.id, 'failure', error.message);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/:id', authenticate, requirePermission('user', 'delete'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting yourself
    if (user.id === req.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await AuditService.logRequest(req, 'user.delete', 'user', user.id);
    await user.destroy();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    await AuditService.logRequest(req, 'user.delete', 'user', req.params.id, 'failure', error.message);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Assign roles to user
router.post('/:id/roles', authenticate, requirePermission('role', 'assign'), [
  param('id').isInt(),
  body('roleIds').isArray().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { roleIds } = req.body;
    const roles = await Role.findAll({ where: { id: roleIds } });
    
    if (roles.length !== roleIds.length) {
      return res.status(400).json({ error: 'Some roles not found' });
    }

    await user.setRoles(roles);
    await PermissionService.invalidateUserCache(user.id);

    await AuditService.logRequest(req, 'user.assignRoles', 'user', user.id);

    res.json({
      success: true,
      message: 'Roles assigned successfully'
    });
  } catch (error) {
    console.error('Assign roles error:', error);
    await AuditService.logRequest(req, 'user.assignRoles', 'user', req.params.id, 'failure', error.message);
    res.status(500).json({ error: 'Failed to assign roles' });
  }
});

// Get user permissions
router.get('/:id/permissions', authenticate, async (req, res) => {
  try {
    // Users can view their own permissions, or need user:read permission for others
    if (req.params.id != req.userId) {
      const hasPermission = await PermissionService.checkPermission(req.userId, 'user', 'read');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    const permissions = await PermissionService.getUserPermissions(req.params.id);
    const resources = await PermissionService.getUserResources(req.params.id);

    res.json({
      success: true,
      permissions,
      resources
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ error: 'Failed to get permissions' });
  }
});

// Grant resource access
router.post('/:id/resources', authenticate, requirePermission('resource', 'grant'), [
  param('id').isInt(),
  body('resourceId').isInt(),
  body('permissions').isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { resourceId, permissions } = req.body;
    
    await PermissionService.grantResourceAccess(
      req.params.id,
      resourceId,
      permissions,
      req.userId
    );

    await AuditService.logRequest(req, 'user.grantResource', 'resource', resourceId);

    res.json({
      success: true,
      message: 'Resource access granted successfully'
    });
  } catch (error) {
    console.error('Grant resource error:', error);
    await AuditService.logRequest(req, 'user.grantResource', 'resource', req.body.resourceId, 'failure', error.message);
    res.status(500).json({ error: 'Failed to grant resource access' });
  }
});

// Revoke resource access
router.delete('/:id/resources/:resourceId', authenticate, requirePermission('resource', 'revoke'), async (req, res) => {
  try {
    await PermissionService.revokeResourceAccess(
      req.params.id,
      req.params.resourceId
    );

    await AuditService.logRequest(req, 'user.revokeResource', 'resource', req.params.resourceId);

    res.json({
      success: true,
      message: 'Resource access revoked successfully'
    });
  } catch (error) {
    console.error('Revoke resource error:', error);
    await AuditService.logRequest(req, 'user.revokeResource', 'resource', req.params.resourceId, 'failure', error.message);
    res.status(500).json({ error: 'Failed to revoke resource access' });
  }
});

module.exports = router;