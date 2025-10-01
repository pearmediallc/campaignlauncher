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
      users: users.rows,
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
  body('isActive').optional().isBoolean(),
  body('roleId').optional().isInt(),
  body('roleIds').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findByPk(req.params.id, {
      include: [{
        model: Role,
        as: 'roles',
        attributes: ['id', 'name']
      }]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { firstName, lastName, isActive, roleId, roleIds } = req.body;

    // Update basic user info
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    // Handle role assignment (supports both single roleId and multiple roleIds)
    let rolesUpdated = false;
    if (roleId !== undefined) {
      // Single role assignment (from frontend)
      const role = await Role.findByPk(roleId);
      if (!role) {
        return res.status(400).json({ error: 'Role not found' });
      }
      await user.setRoles([role]);
      rolesUpdated = true;
    } else if (roleIds !== undefined && Array.isArray(roleIds)) {
      // Multiple roles assignment
      const roles = await Role.findAll({ where: { id: roleIds } });
      if (roles.length !== roleIds.length) {
        return res.status(400).json({ error: 'Some roles not found' });
      }
      await user.setRoles(roles);
      rolesUpdated = true;
    }

    // Invalidate user cache if roles were updated
    if (rolesUpdated) {
      await PermissionService.invalidateUserCache(user.id);
    }

    // Fetch updated user with roles
    const updatedUser = await User.findByPk(user.id, {
      attributes: ['id', 'email', 'firstName', 'lastName', 'isActive'],
      include: [{
        model: Role,
        as: 'roles',
        attributes: ['id', 'name']
      }]
    });

    await AuditService.logRequest(req, 'user.update', 'user', user.id, 'success', null, {
      userId: user.id,
      email: user.email,
      fieldsUpdated: {
        firstName: firstName !== undefined,
        lastName: lastName !== undefined,
        isActive: isActive !== undefined,
        roles: rolesUpdated
      },
      newRoles: rolesUpdated ? updatedUser.roles.map(r => r.name) : undefined
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        isActive: updatedUser.isActive,
        roles: updatedUser.roles
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    await AuditService.logRequest(req, 'user.update', 'user', req.params.id, 'failure', error.message);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Admin reset user password (no current password required)
router.put('/:id/reset-password', authenticate, requirePermission('user', 'update'), [
  param('id').isInt(),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { newPassword } = req.body;

    // Prevent admin from resetting their own password this way
    if (id == req.userId) {
      return res.status(400).json({
        error: 'Use the change password endpoint to update your own password'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Set new password (will be hashed by User model beforeSave hook)
    user.password = newPassword;
    await user.save();

    // Audit log
    await AuditService.logRequest(req, 'user.resetPassword', 'user', id, 'success', null, {
      adminUserId: req.userId,
      targetUserId: id,
      targetEmail: user.email
    });

    res.json({
      success: true,
      message: `Password reset successfully for ${user.email}`
    });
  } catch (error) {
    console.error('Admin password reset error:', error);
    await AuditService.logRequest(req, 'user.resetPassword', 'user', req.params.id, 'failure', error.message);
    res.status(500).json({ error: 'Failed to reset password' });
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

    // Clean up related records before deleting user
    const {
      FacebookAuth,
      EligibilityCheck,
      CampaignTemplate,
      CampaignTracking,
      AuditLog
    } = require('../models');

    console.log(`🗑️ Deleting user ${user.email} (ID: ${user.id})`);

    // 1. Delete eligibility checks (child of FacebookAuth)
    const eligibilityDeleted = await EligibilityCheck.destroy({
      where: { userId: user.id }
    });
    console.log(`  ✅ Deleted ${eligibilityDeleted} eligibility check(s)`);

    // 2. Delete Facebook auth records
    const facebookAuthDeleted = await FacebookAuth.destroy({
      where: { userId: user.id }
    });
    console.log(`  ✅ Deleted ${facebookAuthDeleted} Facebook auth record(s)`);

    // 3. Delete user resource configs (if exists)
    try {
      const { UserResourceConfig } = require('../models');
      const resourceConfigDeleted = await UserResourceConfig.destroy({
        where: { userId: user.id }
      });
      console.log(`  ✅ Deleted ${resourceConfigDeleted} resource config(s)`);
    } catch (e) {
      // UserResourceConfig might not exist in all deployments
      console.log('  ⚠️ UserResourceConfig not found or error:', e.message);
    }

    // 4. Delete user's templates
    const templatesDeleted = await CampaignTemplate.destroy({
      where: { userId: user.id }
    });
    console.log(`  ✅ Deleted ${templatesDeleted} template(s)`);

    // 5. Delete campaign tracking records
    const trackingDeleted = await CampaignTracking.destroy({
      where: { user_id: user.id }
    });
    console.log(`  ✅ Deleted ${trackingDeleted} campaign tracking record(s)`);

    // 6. Keep audit logs but nullify userId (for compliance/history)
    const auditLogsUpdated = await AuditLog.update(
      {
        userId: null,
        metadata: db.sequelize.literal(
          `COALESCE(metadata, '{}')::jsonb || '{"deletedUser": "${user.email}"}'::jsonb`
        )
      },
      { where: { userId: user.id } }
    );
    console.log(`  ✅ Anonymized ${auditLogsUpdated[0]} audit log(s)`);

    // 7. Log the deletion before deleting user
    await AuditService.logRequest(req, 'user.delete', 'user', user.id, 'success', null, {
      deletedEmail: user.email,
      deletedBy: req.userId,
      deletedFirstName: user.firstName,
      deletedLastName: user.lastName
    });

    // 8. Now delete the user
    await user.destroy();
    console.log(`  ✅ User ${user.email} deleted successfully`);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    await AuditService.logRequest(req, 'user.delete', 'user', req.params.id, 'failure', error.message);
    res.status(500).json({
      error: 'Failed to delete user',
      details: error.message
    });
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