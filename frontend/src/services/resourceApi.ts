import api from './api';

export interface ResourceConfig {
  adAccountId?: string;
  pageId?: string;
  pixelId?: string;
  businessId?: string;
  configName?: string;
  lastUsedAt?: Date;
}

export interface ResourcePreset {
  id: number;
  name: string;
  adAccountId?: string;
  pageId?: string;
  pixelId?: string;
  businessId?: string;
  isActive: boolean;
  lastUsedAt?: Date;
}

export interface SwitchHistory {
  id: number;
  from: ResourceConfig;
  to: ResourceConfig;
  switchedAt: Date;
}

export const resourceApi = {
  /**
   * Get current active resource configuration
   * Falls back to originally selected resources if no active config
   */
  getCurrentResources: async (): Promise<{ success: boolean; source: string; data: ResourceConfig }> => {
    const response = await api.get('/resources/current');
    return response.data;
  },

  /**
   * Switch to a different resource configuration
   */
  switchResources: async (config: ResourceConfig): Promise<{ success: boolean; message: string; data: ResourceConfig }> => {
    const response = await api.post('/resources/switch', config);
    return response.data;
  },

  /**
   * Get saved resource presets
   */
  getPresets: async (): Promise<{ success: boolean; data: ResourcePreset[] }> => {
    const response = await api.get('/resources/presets');
    return response.data;
  },

  /**
   * Save a new preset
   */
  savePreset: async (name: string, config: ResourceConfig): Promise<{ success: boolean; message: string; data: ResourcePreset }> => {
    const response = await api.post('/resources/presets', {
      name,
      ...config
    });
    return response.data;
  },

  /**
   * Delete a preset
   */
  deletePreset: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/resources/presets/${id}`);
    return response.data;
  },

  /**
   * Get recent resource configurations
   */
  getRecentConfigs: async (limit: number = 5): Promise<{ success: boolean; data: ResourcePreset[] }> => {
    const response = await api.get(`/resources/recent?limit=${limit}`);
    return response.data;
  },

  /**
   * Get resource switch history
   */
  getSwitchHistory: async (limit: number = 10): Promise<{ success: boolean; data: SwitchHistory[] }> => {
    const response = await api.get(`/resources/history?limit=${limit}`);
    return response.data;
  }
};

export default resourceApi;