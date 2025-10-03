const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../models');
const { FacebookAuth, UserResourceConfig, ResourceSwitchHistory } = db;
const FacebookAuthService = require('../services/FacebookAuthService');
const AuditService = require('../services/AuditService');

/**
 * Get current active resource configuration for the user
 * Falls back to originally selected resources if no active config
 */
router.get('/current', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user.id;
    
    // First check if user has an active configuration
    const activeConfig = await UserResourceConfig.getActiveConfig(userId);
    
    if (activeConfig) {
      return res.json({
        success: true,
        source: 'switched',
        data: {
          adAccountId: activeConfig.adAccountId,
          pageId: activeConfig.pageId,
          pixelId: activeConfig.pixelId,
          businessId: activeConfig.businessId,
          configName: activeConfig.configName,
          lastUsedAt: activeConfig.lastUsedAt
        }
      });
    }
    
    // Fallback to originally selected resources from FacebookAuth
    const facebookAuth = await FacebookAuth.findOne({
      where: { userId }
    });
    
    if (!facebookAuth) {
      return res.status(404).json({
        success: false,
        message: 'No Facebook authentication found'
      });
    }
    
    // Return the originally selected resources (current behavior)
    // Extract IDs from the JSON objects
    res.json({
      success: true,
      source: 'original',
      data: {
        adAccountId: facebookAuth.selectedAdAccount?.id || null,
        pageId: facebookAuth.selectedPage?.id || null,
        pixelId: facebookAuth.selectedPixel?.id || null,
        businessId: facebookAuth.businessAccounts?.[0]?.id || null
      }
    });
  } catch (error) {
    console.error('Get current resources error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get current resources',
      error: error.message
    });
  }
});

/**
 * Switch to a different resource configuration
 * Validates that user has access to these resources
 */
router.post('/switch', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user.id;
    const { adAccountId, pageId, pixelId, businessId, configName } = req.body;
    
    // Validate that at least one resource is provided
    if (!adAccountId && !pageId && !pixelId && !businessId) {
      return res.status(400).json({
        success: false,
        message: 'At least one resource must be provided'
      });
    }
    
    // Get Facebook auth to validate access
    const facebookAuth = await FacebookAuth.findOne({
      where: { userId }
    });

    if (!facebookAuth) {
      return res.status(404).json({
        success: false,
        message: 'No Facebook authentication found. Please authenticate with Facebook first.'
      });
    }

    // Verify user has access to these resources
    // Use cached resources from facebookAuth instead of fetching again to avoid API calls
    const resources = {
      adAccounts: facebookAuth.adAccounts || [],
      pages: facebookAuth.pages || [],
      pixels: facebookAuth.pixels || [],
      businessAccounts: facebookAuth.businessAccounts || []
    };
    
    // Validate each provided resource
    if (adAccountId && !resources.adAccounts.find(acc => acc.id === adAccountId)) {
      return res.status(403).json({
        success: false,
        message: `No access to ad account: ${adAccountId}`
      });
    }
    
    if (pageId && !resources.pages.find(page => page.id === pageId)) {
      return res.status(403).json({
        success: false,
        message: `No access to page: ${pageId}`
      });
    }
    
    if (pixelId && !resources.pixels.find(pixel => pixel.id === pixelId)) {
      return res.status(403).json({
        success: false,
        message: `No access to pixel: ${pixelId}`
      });
    }
    
    // Get current configuration for history
    const currentConfig = await UserResourceConfig.getActiveConfig(userId);
    const fromConfig = currentConfig ? {
      adAccountId: currentConfig.adAccountId,
      pageId: currentConfig.pageId,
      pixelId: currentConfig.pixelId,
      businessId: currentConfig.businessId
    } : {
      adAccountId: facebookAuth.selectedAdAccount?.id || null,
      pageId: facebookAuth.selectedPage?.id || null,
      pixelId: facebookAuth.selectedPixel?.id || null,
      businessId: facebookAuth.businessAccounts?.[0]?.id || null
    };
    
    // Create or update the configuration
    let config = await UserResourceConfig.findOne({
      where: {
        userId,
        adAccountId: adAccountId || null,
        pageId: pageId || null,
        pixelId: pixelId || null,
        businessId: businessId || null
      }
    });
    
    if (!config) {
      config = await UserResourceConfig.create({
        userId,
        configName: configName || `Config ${new Date().toLocaleDateString()}`,
        adAccountId,
        pageId,
        pixelId,
        businessId,
        isActive: false
      });
    }
    
    // Activate the configuration
    await config.activate();
    
    // IMPORTANT: Also update the FacebookAuth table so campaigns use the new resources
    // We need to store complete resource objects (not just IDs) for backward compatibility
    const selectedAdAccount = adAccountId ? resources.adAccounts.find(acc => acc.id === adAccountId) : facebookAuth.selectedAdAccount;
    const selectedPage = pageId ? resources.pages.find(page => page.id === pageId) : facebookAuth.selectedPage;
    const selectedPixel = pixelId ? resources.pixels.find(pixel => pixel.id === pixelId) : facebookAuth.selectedPixel;

    await FacebookAuth.update({
      selectedAdAccount: selectedAdAccount || null,
      selectedPage: selectedPage || null,
      selectedPixel: selectedPixel || null
    }, {
      where: { userId }
    });
    
    // Log the switch in history
    await ResourceSwitchHistory.logSwitch(userId, fromConfig, {
      adAccountId,
      pageId,
      pixelId,
      businessId
    });
    
    // Log audit event
    await AuditService.log({
      userId,
      action: 'resource_switch',
      resourceType: 'resource_config',
      resourceId: config.id,
      details: `Switched resources`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: {
        from: fromConfig,
        to: { adAccountId, pageId, pixelId, businessId }
      }
    });
    
    res.json({
      success: true,
      message: 'Resources switched successfully',
      data: {
        adAccountId: config.adAccountId,
        pageId: config.pageId,
        pixelId: config.pixelId,
        businessId: config.businessId,
        configName: config.configName
      }
    });
  } catch (error) {
    console.error('Switch resources error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to switch resources',
      error: error.message
    });
  }
});

/**
 * Get saved resource presets for the user
 */
router.get('/presets', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user.id;
    
    const presets = await UserResourceConfig.getPresets(userId);
    
    res.json({
      success: true,
      data: presets.map(preset => ({
        id: preset.id,
        name: preset.configName,
        adAccountId: preset.adAccountId,
        pageId: preset.pageId,
        pixelId: preset.pixelId,
        businessId: preset.businessId,
        isActive: preset.isActive,
        lastUsedAt: preset.lastUsedAt
      }))
    });
  } catch (error) {
    console.error('Get presets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get presets',
      error: error.message
    });
  }
});

/**
 * Save a resource configuration as a preset
 */
router.post('/presets', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user.id;
    const { name, adAccountId, pageId, pixelId, businessId } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Preset name is required'
      });
    }
    
    // Check preset limit (max 10 per user)
    const existingPresets = await UserResourceConfig.count({
      where: { userId, isPreset: true }
    });
    
    if (existingPresets >= 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum preset limit (10) reached. Please delete an existing preset.'
      });
    }
    
    // Check if preset with same name exists
    const existingPreset = await UserResourceConfig.findOne({
      where: { userId, configName: name, isPreset: true }
    });
    
    if (existingPreset) {
      return res.status(400).json({
        success: false,
        message: 'A preset with this name already exists'
      });
    }
    
    // Create the preset
    const preset = await UserResourceConfig.create({
      userId,
      configName: name,
      adAccountId,
      pageId,
      pixelId,
      businessId,
      isPreset: true,
      isActive: false
    });
    
    // Log audit event
    await AuditService.log({
      userId,
      action: 'create_preset',
      resourceType: 'resource_preset',
      resourceId: preset.id,
      details: `Created preset: ${name}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.json({
      success: true,
      message: 'Preset saved successfully',
      data: {
        id: preset.id,
        name: preset.configName,
        adAccountId: preset.adAccountId,
        pageId: preset.pageId,
        pixelId: preset.pixelId,
        businessId: preset.businessId
      }
    });
  } catch (error) {
    console.error('Save preset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save preset',
      error: error.message
    });
  }
});

/**
 * Delete a preset
 */
router.delete('/presets/:id', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user.id;
    const presetId = req.params.id;
    
    const preset = await UserResourceConfig.findOne({
      where: { id: presetId, userId, isPreset: true }
    });
    
    if (!preset) {
      return res.status(404).json({
        success: false,
        message: 'Preset not found'
      });
    }
    
    await preset.destroy();
    
    // Log audit event
    await AuditService.log({
      userId,
      action: 'delete_preset',
      resourceType: 'resource_preset',
      resourceId: presetId,
      details: `Deleted preset: ${preset.configName}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.json({
      success: true,
      message: 'Preset deleted successfully'
    });
  } catch (error) {
    console.error('Delete preset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete preset',
      error: error.message
    });
  }
});

/**
 * Get recent resource configurations
 */
router.get('/recent', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user.id;
    const limit = parseInt(req.query.limit) || 5;
    
    const recentConfigs = await UserResourceConfig.getRecentConfigs(userId, limit);
    
    res.json({
      success: true,
      data: recentConfigs.map(config => ({
        id: config.id,
        name: config.configName,
        adAccountId: config.adAccountId,
        pageId: config.pageId,
        pixelId: config.pixelId,
        businessId: config.businessId,
        isActive: config.isActive,
        isPreset: config.isPreset,
        lastUsedAt: config.lastUsedAt
      }))
    });
  } catch (error) {
    console.error('Get recent configs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recent configurations',
      error: error.message
    });
  }
});

/**
 * Get resource switch history
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    
    const history = await ResourceSwitchHistory.getRecentHistory(userId, limit);
    
    res.json({
      success: true,
      data: history.map(entry => ({
        id: entry.id,
        from: entry.fromConfig,
        to: entry.toConfig,
        switchedAt: entry.switchedAt
      }))
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get switch history',
      error: error.message
    });
  }
});

module.exports = router;