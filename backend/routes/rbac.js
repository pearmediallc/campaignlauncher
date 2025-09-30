const express = require('express');
const router = express.Router();
const { Role, Permission } = require('../models');
const { authenticate, requirePermission } = require('../middleware/auth');

/**
 * GET /api/rbac/roles
 * Get all roles
 * Required for UserManagement.tsx to populate role dropdown
 */
router.get('/roles', authenticate, async (req, res) => {
  try {
    const roles = await Role.findAll({
      attributes: ['id', 'name', 'description', 'isSystem'],
      order: [['name', 'ASC']]
    });

    // Return array directly (not wrapped in object)
    // This matches what UserManagement.tsx expects: response.data directly
    res.json(roles);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch roles',
      message: error.message
    });
  }
});

/**
 * GET /api/rbac/roles/:id
 * Get single role with permissions
 */
router.get('/roles/:id', authenticate, async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id, {
      attributes: ['id', 'name', 'description', 'isSystem'],
      include: [{
        model: Permission,
        as: 'permissions',
        attributes: ['id', 'resource', 'action', 'description'],
        through: { attributes: [] }
      }]
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }

    res.json({
      success: true,
      data: role
    });
  } catch (error) {
    console.error('Get role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch role',
      message: error.message
    });
  }
});

/**
 * GET /api/rbac/permissions
 * Get all permissions
 */
router.get('/permissions', authenticate, async (req, res) => {
  try {
    const permissions = await Permission.findAll({
      attributes: ['id', 'resource', 'action', 'description'],
      order: [['resource', 'ASC'], ['action', 'ASC']]
    });

    res.json(permissions);
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch permissions',
      message: error.message
    });
  }
});

/**
 * POST /api/rbac/roles
 * Create new role (admin only)
 */
router.post('/roles', authenticate, requirePermission('role', 'create'), async (req, res) => {
  try {
    const { name, description, permissionIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Role name is required'
      });
    }

    // Check if role already exists
    const existingRole = await Role.findOne({ where: { name } });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        error: 'Role with this name already exists'
      });
    }

    const role = await Role.create({
      name: name.trim(),
      description: description || null,
      isSystem: false
    });

    // Assign permissions if provided
    if (permissionIds && Array.isArray(permissionIds) && permissionIds.length > 0) {
      const permissions = await Permission.findAll({
        where: { id: permissionIds }
      });
      await role.setPermissions(permissions);
    }

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: role
    });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create role',
      message: error.message
    });
  }
});

/**
 * PUT /api/rbac/roles/:id
 * Update role (admin only)
 */
router.put('/roles/:id', authenticate, requirePermission('role', 'update'), async (req, res) => {
  try {
    const { name, description, permissionIds } = req.body;

    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }

    // Prevent modifying system roles
    if (role.isSystem) {
      return res.status(403).json({
        success: false,
        error: 'Cannot modify system roles'
      });
    }

    // Update role details
    if (name && name.trim()) {
      role.name = name.trim();
    }
    if (description !== undefined) {
      role.description = description;
    }
    await role.save();

    // Update permissions if provided
    if (permissionIds && Array.isArray(permissionIds)) {
      const permissions = await Permission.findAll({
        where: { id: permissionIds }
      });
      await role.setPermissions(permissions);
    }

    res.json({
      success: true,
      message: 'Role updated successfully',
      data: role
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update role',
      message: error.message
    });
  }
});

/**
 * DELETE /api/rbac/roles/:id
 * Delete role (admin only)
 */
router.delete('/roles/:id', authenticate, requirePermission('role', 'delete'), async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);

    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }

    // Prevent deleting system roles
    if (role.isSystem) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete system roles'
      });
    }

    await role.destroy();

    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete role',
      message: error.message
    });
  }
});

module.exports = router;
