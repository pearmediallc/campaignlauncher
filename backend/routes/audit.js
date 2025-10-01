const express = require('express');
const router = express.Router();
const { AuditLog, User } = require('../models');
const { authenticate, requirePermission } = require('../middleware/auth');
const { Op } = require('sequelize');

/**
 * GET /api/audit/logs
 * Get audit logs with filtering and pagination
 * Required permission: audit:read (super_admin only)
 */
router.get('/logs', authenticate, requirePermission('audit', 'read'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      action,
      status,
      userEmail,
      dateFrom,
      dateTo,
      resourceType,
      resourceId
    } = req.query;

    const offset = (page - 1) * limit;

    // Build where clause for AuditLog
    const where = {};

    if (action) {
      where.action = { [Op.like]: `%${action}%` };
    }

    if (status) {
      where.status = status;
    }

    if (resourceType) {
      where.resourceType = resourceType;
    }

    if (resourceId) {
      where.resourceId = resourceId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = endDate;
      }
    }

    // Build where clause for User (if filtering by email)
    const userWhere = {};
    if (userEmail) {
      userWhere.email = { [Op.like]: `%${userEmail}%` };
    }

    // Query with user join
    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'firstName', 'lastName'],
        where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
        required: false // Left join - include logs even if user is null
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Format response to match frontend expectations
    const logs = rows.map(log => ({
      id: log.id,
      userId: log.userId,
      userEmail: log.user ? log.user.email : 'System',
      userName: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      status: log.status,
      details: log.details,
      ipAddress: log.ipAddress || 'N/A',
      userAgent: log.userAgent || 'N/A',
      createdAt: log.createdAt,
      // Extract key info from details JSON for easy display
      campaignName: log.details?.campaignName,
      campaignId: log.details?.campaignId,
      adAccountId: log.details?.adAccountId
    }));

    res.json({
      success: true,
      logs,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs',
      message: error.message
    });
  }
});

/**
 * GET /api/audit/stats
 * Get audit log statistics
 * Required permission: audit:read
 */
router.get('/stats', authenticate, requirePermission('audit', 'read'), async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const where = {};
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = endDate;
      }
    }

    // Get counts by action type
    const actionCounts = await AuditLog.findAll({
      where,
      attributes: [
        'action',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['action'],
      raw: true
    });

    // Get counts by status
    const statusCounts = await AuditLog.findAll({
      where,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Total logs
    const total = await AuditLog.count({ where });

    res.json({
      success: true,
      stats: {
        total,
        byAction: actionCounts,
        byStatus: statusCounts
      }
    });
  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/audit/export
 * Export audit logs to CSV
 * Required permission: audit:export
 */
router.get('/export', authenticate, requirePermission('audit', 'export'), async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const where = {};
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = endDate;
      }
    }

    const logs = await AuditLog.findAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['email', 'firstName', 'lastName'],
        required: false
      }],
      order: [['createdAt', 'DESC']]
    });

    // Generate CSV
    const csvRows = [];
    csvRows.push('Timestamp,User Email,User Name,Action,Resource Type,Resource ID,Status,IP Address,Campaign ID,Campaign Name,Ad Account ID');

    logs.forEach(log => {
      const userEmail = log.user ? log.user.email : 'System';
      const userName = log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System';
      const campaignId = log.details?.campaignId || '';
      const campaignName = log.details?.campaignName || '';
      const adAccountId = log.details?.adAccountId || '';

      csvRows.push([
        log.createdAt,
        userEmail,
        userName,
        log.action,
        log.resourceType || '',
        log.resourceId || '',
        log.status,
        log.ipAddress || '',
        campaignId,
        campaignName,
        adAccountId
      ].join(','));
    });

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export audit logs',
      message: error.message
    });
  }
});

module.exports = router;
