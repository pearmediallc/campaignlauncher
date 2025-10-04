const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../models');
const { Op } = require('sequelize');

// Get all templates for the user
router.get('/', authenticate, async (req, res) => {
  try {
    const { category, search, includeShared } = req.query;
    const userId = req.user.id;

    const whereClause = {
      [Op.or]: [
        { userId },
        ...(includeShared === 'true' ? [{ category: 'shared' }] : [])
      ]
    };

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause[Op.or] = [
        { templateName: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const templates = await db.CampaignTemplate.findAll({
      where: whereClause,
      order: [
        ['isDefault', 'DESC'],
        ['usageCount', 'DESC'],
        ['createdAt', 'DESC']
      ],
      attributes: [
        'id',
        'templateName',
        'description',
        'category',
        'isDefault',
        'usageCount',
        'lastUsedAt',
        'createdAt',
        'updatedAt'
      ]
    });

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
});

// Get single template with full data
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const template = await db.CampaignTemplate.findOne({
      where: {
        id,
        [Op.or]: [
          { userId },
          { category: 'shared' }
        ]
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Increment usage count
    await template.incrementUsage();

    // DEBUG: Log what's being returned
    console.log('🔍 DEBUG - Backend Template Load:');
    console.log('  📦 Template ID:', template.id);
    console.log('  📦 Template Name:', template.templateName);
    console.log('  📦 templateData keys:', template.templateData ? Object.keys(template.templateData) : 'NULL');
    console.log('  📦 templateData.primaryText:', template.templateData?.primaryText);
    console.log('  📦 templateData.headline:', template.templateData?.headline);
    console.log('  📦 templateData.description:', template.templateData?.description);
    console.log('  📦 templateData.callToAction:', template.templateData?.callToAction);

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template',
      error: error.message
    });
  }
});

// Create new template
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      templateName,
      templateData,
      mediaUrls,
      description,
      category = 'personal',
      setAsDefault = false
    } = req.body;

    // DEBUG: Log incoming template save request
    console.log('🔍 DEBUG - Backend Template Save:');
    console.log('  📦 templateName:', templateName);
    console.log('  📦 templateData keys:', templateData ? Object.keys(templateData) : 'NULL');
    console.log('  📦 templateData.primaryText:', templateData?.primaryText);
    console.log('  📦 templateData.headline:', templateData?.headline);
    console.log('  📦 templateData.description:', templateData?.description);
    console.log('  📦 templateData.callToAction:', templateData?.callToAction);
    console.log('  📦 Full templateData:', JSON.stringify(templateData, null, 2));

    if (!templateName || !templateData) {
      return res.status(400).json({
        success: false,
        message: 'Template name and data are required'
      });
    }

    // If setting as default, unset other defaults first
    if (setAsDefault) {
      await db.CampaignTemplate.update(
        { isDefault: false },
        { where: { userId, isDefault: true } }
      );
    }

    const template = await db.CampaignTemplate.create({
      userId,
      templateName,
      templateData,
      mediaUrls: mediaUrls || [],
      description,
      category,
      isDefault: setAsDefault
    });

    // DEBUG: Log what was saved
    console.log('🔍 DEBUG - Backend Template Saved:');
    console.log('  ✅ Template ID:', template.id);
    console.log('  ✅ Saved templateData keys:', template.templateData ? Object.keys(template.templateData) : 'NULL');
    console.log('  ✅ Saved templateData.primaryText:', template.templateData?.primaryText);
    console.log('  ✅ Saved templateData.headline:', template.templateData?.headline);
    console.log('  ✅ Saved templateData.description:', template.templateData?.description);

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create template',
      error: error.message
    });
  }
});

// Update template
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      templateName,
      templateData,
      mediaUrls,
      description,
      category
    } = req.body;

    const template = await db.CampaignTemplate.findOne({
      where: { id, userId }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Update fields if provided
    if (templateName !== undefined) template.templateName = templateName;
    if (templateData !== undefined) template.templateData = templateData;
    if (mediaUrls !== undefined) template.mediaUrls = mediaUrls;
    if (description !== undefined) template.description = description;
    if (category !== undefined) template.category = category;

    await template.save();

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: template
    });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update template',
      error: error.message
    });
  }
});

// Set template as default
router.put('/:id/default', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const template = await db.CampaignTemplate.findOne({
      where: { id, userId }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    await db.CampaignTemplate.setUserDefault(userId, id);

    // Audit log
    const AuditService = require('../services/AuditService');
    await AuditService.log({
      userId,
      action: 'template.setDefault',
      resource: 'template',
      resourceId: id,
      details: {
        templateId: id,
        templateName: template.templateName
      },
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Template set as default',
      data: template
    });
  } catch (error) {
    console.error('Set default template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set default template',
      error: error.message
    });
  }
});

// Delete template
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const template = await db.CampaignTemplate.findOne({
      where: { id, userId }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    await template.destroy();

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete template',
      error: error.message
    });
  }
});

// Get default template for user
router.get('/user/default', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const template = await db.CampaignTemplate.findOne({
      where: {
        userId,
        isDefault: true
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'No default template found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Get default template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch default template',
      error: error.message
    });
  }
});

module.exports = router;