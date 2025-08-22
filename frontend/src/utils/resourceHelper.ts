import resourceApi, { ResourceConfig } from '../services/resourceApi';

/**
 * Helper function to get the current active resources
 * This function provides backward compatibility:
 * 1. First checks for switched resources (new feature)
 * 2. Falls back to originally selected resources (existing behavior)
 * 3. Falls back to environment variables as last resort
 */
export const getCurrentResources = async (): Promise<ResourceConfig> => {
  try {
    // Try to get current resources from the new resource manager
    const response = await resourceApi.getCurrentResources();
    
    if (response.success) {
      return response.data;
    }
  } catch (error) {
    console.warn('Failed to fetch current resources, using defaults:', error);
  }
  
  // Fallback to environment variables (original behavior)
  return {
    adAccountId: process.env.REACT_APP_FB_AD_ACCOUNT_ID,
    pageId: process.env.REACT_APP_FB_PAGE_ID,
    pixelId: process.env.REACT_APP_FB_PIXEL_ID
  };
};

/**
 * Cache the current resources in session storage for quick access
 * This avoids multiple API calls on the same page
 */
export const getCachedResources = (): ResourceConfig | null => {
  const cached = sessionStorage.getItem('current_resources');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      // Check if cache is still valid (5 minutes)
      if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
        return parsed.data;
      }
    } catch (error) {
      console.error('Failed to parse cached resources:', error);
    }
  }
  return null;
};

export const setCachedResources = (resources: ResourceConfig): void => {
  sessionStorage.setItem('current_resources', JSON.stringify({
    data: resources,
    timestamp: Date.now()
  }));
};

/**
 * Get resources with caching for performance
 */
export const getResourcesWithCache = async (): Promise<ResourceConfig> => {
  // Check cache first
  const cached = getCachedResources();
  if (cached) {
    return cached;
  }
  
  // Fetch fresh resources
  const resources = await getCurrentResources();
  
  // Cache for next use
  setCachedResources(resources);
  
  return resources;
};

/**
 * Clear the resource cache (useful after switching)
 */
export const clearResourceCache = (): void => {
  sessionStorage.removeItem('current_resources');
};