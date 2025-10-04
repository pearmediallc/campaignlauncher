/**
 * Resource Helper - Universal Active Resources Provider
 *
 * This service provides a single source of truth for getting the user's active resources.
 * It checks UserResourceConfig (Active Resources dropdown) first, then falls back to
 * FacebookAuth.selectedAdAccount/selectedPage.
 *
 * Returns both IDs (for API calls) and full objects (for UI display).
 */

const db = require('../models');
const { FacebookAuth, UserResourceConfig } = db;

class ResourceHelper {
  /**
   * Get active resources for a user
   * This is the ONLY function that should be used to get active resources across the app
   *
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Active resources with IDs and full objects
   */
  static async getActiveResources(userId) {
    try {
      // Step 1: Get FacebookAuth (contains all available resources)
      const facebookAuth = await FacebookAuth.findOne({
        where: { userId, isActive: true }
      });

      if (!facebookAuth) {
        throw new Error('No Facebook authentication found');
      }

      // Step 2: Check UserResourceConfig for active selection
      let activeConfig = null;
      try {
        if (UserResourceConfig && typeof UserResourceConfig.getActiveConfig === 'function') {
          activeConfig = await UserResourceConfig.getActiveConfig(userId);
        }
      } catch (configError) {
        console.log('⚠️ Could not fetch active config:', configError.message);
        // Continue with fallback
      }

      // Step 3: If active config exists, use it and find full objects
      if (activeConfig && (activeConfig.adAccountId || activeConfig.pageId)) {
        console.log('📋 Using Active Resource Configuration from UserResourceConfig');

        // Find full resource objects from the IDs
        const selectedAdAccount = facebookAuth.adAccounts?.find(
          acc => acc.id === activeConfig.adAccountId
        ) || null;

        const selectedPage = facebookAuth.pages?.find(
          page => page.id === activeConfig.pageId
        ) || null;

        const selectedPixel = facebookAuth.pixels?.find(
          pixel => pixel.id === activeConfig.pixelId
        ) || null;

        console.log('  ✓ Ad Account:', selectedAdAccount?.name || activeConfig.adAccountId);
        console.log('  ✓ Page:', selectedPage?.name || activeConfig.pageId);
        console.log('  ✓ Pixel:', selectedPixel?.name || activeConfig.pixelId || 'None');

        return {
          // IDs (for API calls)
          selectedAdAccountId: activeConfig.adAccountId,
          selectedPageId: activeConfig.pageId,
          selectedPixelId: activeConfig.pixelId,

          // Full objects (for UI display)
          selectedAdAccount: selectedAdAccount,
          selectedPage: selectedPage,
          selectedPixel: selectedPixel,

          // Metadata
          source: 'active_config',
          facebookAuth: facebookAuth // In case caller needs other data
        };
      }

      // Step 4: Fallback to FacebookAuth.selectedAdAccount/selectedPage
      console.log('📋 Using resources from FacebookAuth (no active config)');

      const selectedAdAccount = facebookAuth.selectedAdAccount || null;
      const selectedPage = facebookAuth.selectedPage || null;
      const selectedPixel = facebookAuth.selectedPixel || null;

      console.log('  ✓ Ad Account:', selectedAdAccount?.name || 'None');
      console.log('  ✓ Page:', selectedPage?.name || 'None');
      console.log('  ✓ Pixel:', selectedPixel?.name || 'None');

      return {
        // IDs (for API calls)
        selectedAdAccountId: selectedAdAccount?.id || null,
        selectedPageId: selectedPage?.id || null,
        selectedPixelId: selectedPixel?.id || null,

        // Full objects (for UI display)
        selectedAdAccount: selectedAdAccount,
        selectedPage: selectedPage,
        selectedPixel: selectedPixel,

        // Metadata
        source: 'facebook_auth',
        facebookAuth: facebookAuth
      };

    } catch (error) {
      console.error('Error getting active resources:', error);
      throw error;
    }
  }

  /**
   * Get active resources with guaranteed values (uses first available as last resort)
   * This ensures we always have resources to work with
   *
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Active resources with fallback to first available
   */
  static async getActiveResourcesWithFallback(userId) {
    const resources = await this.getActiveResources(userId);

    // If we don't have resources, use first available from facebookAuth
    if (!resources.selectedAdAccountId && resources.facebookAuth.adAccounts?.length > 0) {
      console.log('⚠️ No ad account selected, using first available');
      resources.selectedAdAccountId = resources.facebookAuth.adAccounts[0].id;
      resources.selectedAdAccount = resources.facebookAuth.adAccounts[0];
    }

    if (!resources.selectedPageId && resources.facebookAuth.pages?.length > 0) {
      console.log('⚠️ No page selected, using first available');
      resources.selectedPageId = resources.facebookAuth.pages[0].id;
      resources.selectedPage = resources.facebookAuth.pages[0];
    }

    return resources;
  }
}

module.exports = ResourceHelper;
