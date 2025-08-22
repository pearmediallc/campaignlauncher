const { AuditLog } = require('../models');

class AuditService {
  async log(data) {
    try {
      // If userId is null and it's a failed login, skip logging for now
      // This is a temporary workaround until migration runs
      if (!data.userId && data.action === 'user.login' && data.status === 'failure') {
        console.log('Skipping audit log for failed login (no userId) - migration pending');
        return null;
      }

      const logEntry = await AuditLog.create({
        userId: data.userId || null,  // Allow null userId for anonymous actions
        action: data.action,
        resourceType: data.resourceType || null,
        resourceId: data.resourceId || null,
        details: data.details || {},
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        status: data.status || 'success',
        errorMessage: data.errorMessage || null
      });
      
      return logEntry;
    } catch (error) {
      console.error('Audit logging error:', error);
      // Don't throw error to prevent disrupting the main flow
    }
  }

  async logRequest(req, action, resourceType = null, resourceId = null, status = 'success', errorMessage = null) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    const details = {
      method: req.method,
      path: req.path,
      query: req.query,
      body: this.sanitizeBody(req.body)
    };

    await this.log({
      userId: req.userId || req.user?.id,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress,
      userAgent,
      status,
      errorMessage
    });
  }

  sanitizeBody(body) {
    if (!body) return {};
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'accessToken', 'refreshToken', 'secret'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  async getUserAuditLogs(userId, options = {}) {
    const {
      limit = 100,
      offset = 0,
      startDate,
      endDate,
      action,
      resourceType,
      status
    } = options;

    const where = { userId };
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.$gte = startDate;
      if (endDate) where.createdAt.$lte = endDate;
    }
    
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;
    if (status) where.status = status;

    const logs = await AuditLog.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    return logs;
  }

  async getResourceAuditLogs(resourceType, resourceId, options = {}) {
    const {
      limit = 100,
      offset = 0,
      startDate,
      endDate
    } = options;

    const where = { resourceType, resourceId };
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.$gte = startDate;
      if (endDate) where.createdAt.$lte = endDate;
    }

    const logs = await AuditLog.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [{
        model: require('../models').User,
        as: 'user',
        attributes: ['id', 'email', 'firstName', 'lastName']
      }]
    });

    return logs;
  }

  async getSystemAuditLogs(options = {}) {
    const {
      limit = 100,
      offset = 0,
      startDate,
      endDate,
      action,
      resourceType,
      status,
      userId
    } = options;

    const where = {};
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.$gte = startDate;
      if (endDate) where.createdAt.$lte = endDate;
    }
    
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const logs = await AuditLog.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [{
        model: require('../models').User,
        as: 'user',
        attributes: ['id', 'email', 'firstName', 'lastName']
      }]
    });

    return logs;
  }
}

module.exports = new AuditService();