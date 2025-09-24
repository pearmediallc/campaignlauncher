import axios from 'axios';
import { CampaignFormData, BulkCampaignData, CampaignResponse, LinkPreview } from '../types/campaign';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('No auth token found - user may need to login');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Authentication failed - token may be expired');
      // Optionally redirect to login
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const campaignApi = {
  createCampaign: async (data: CampaignFormData): Promise<CampaignResponse> => {
    const formData = new FormData();
    
    // Append basic campaign data
    Object.keys(data).forEach((key) => {
      if (!['image', 'images', 'video', 'schedule', 'targeting', 'placements'].includes(key)) {
        const value = data[key as keyof CampaignFormData];
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      }
    });
    
    // Handle media based on type
    if (data.mediaType === 'single_image' && data.image) {
      formData.append('image', data.image);
    } else if (data.mediaType === 'carousel' && data.images) {
      data.images.forEach((img, index) => {
        formData.append(`images`, img);
      });
    } else if (data.mediaType === 'single_video' && data.video) {
      formData.append('video', data.video);
    }
    
    // Handle complex objects
    if (data.schedule) {
      formData.append('schedule', JSON.stringify(data.schedule));
    }
    if (data.targeting) {
      formData.append('targeting', JSON.stringify(data.targeting));
    }
    if (data.placements) {
      formData.append('placements', JSON.stringify(data.placements));
    }

    const response = await api.post('/campaigns/create', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  createBulkCampaign: async (data: BulkCampaignData): Promise<CampaignResponse> => {
    const formData = new FormData();
    
    const campaignData = {
      campaignName: data.campaignName,
      dailyBudget: data.dailyBudget,
      urlType: data.urlType,
      url: data.url,
      primaryText: data.primaryText,
      headline: data.headline,
      description: data.description,
      mediaType: data.mediaType,
      callToAction: data.callToAction,
      conversionLocation: data.conversionLocation,
      schedule: data.schedule,
    };
    
    formData.append('campaignData', JSON.stringify(campaignData));
    
    // Process variations with their media
    const variationsData = data.variations.map(v => ({
      headline: v.headline,
      description: v.description,
      primaryText: v.primaryText,
      url: v.url,
      mediaType: v.mediaType || data.mediaType,
      callToAction: v.callToAction || data.callToAction,
    }));
    formData.append('variations', JSON.stringify(variationsData));
    
    // Handle main campaign media
    if (data.mediaType === 'single_image' && data.image) {
      formData.append('mainImage', data.image);
    } else if (data.mediaType === 'carousel' && data.images) {
      data.images.forEach(img => {
        formData.append('mainImages', img);
      });
    } else if (data.mediaType === 'single_video' && data.video) {
      formData.append('mainVideo', data.video);
    }
    
    // Handle variation media
    data.variations.forEach((variation, index) => {
      if (variation.mediaType === 'single_image' && variation.image) {
        formData.append(`variationImage_${index}`, variation.image);
      } else if (variation.mediaType === 'carousel' && variation.images) {
        variation.images.forEach(img => {
          formData.append(`variationImages_${index}`, img);
        });
      } else if (variation.mediaType === 'single_video' && variation.video) {
        formData.append(`variationVideo_${index}`, variation.video);
      }
    });

    const response = await api.post('/campaigns/create-bulk', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  validateToken: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.get('/campaigns/validate-token');
    return response.data;
  },

  uploadMedia: async (file: File): Promise<{ success: boolean; data: { hash: string } }> => {
    const formData = new FormData();
    formData.append('media', file);
    
    const response = await api.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },
  
  fetchLinkPreview: async (url: string): Promise<{ success: boolean; data: LinkPreview }> => {
    const response = await api.post('/campaigns/link-preview', { url });
    return response.data;
  },
};

export const facebookAuthApi = {
  login: async (): Promise<{ success: boolean; data: { authUrl: string } }> => {
    const response = await api.get('/auth/facebook/login');
    return response.data;
  },

  callback: async (code: string, state: string): Promise<{ success: boolean; data: any }> => {
    const response = await api.get(`/auth/facebook/callback?code=${code}&state=${state}`);
    return response.data;
  },

  verifyEligibility: async (): Promise<{ success: boolean; data: any }> => {
    const response = await api.post('/auth/facebook/verify-eligibility');
    return response.data;
  },

  getStatus: async (): Promise<{ success: boolean; data: any }> => {
    const response = await api.get('/auth/facebook/status');
    return response.data;
  },

  getResources: async (): Promise<{ success: boolean; data: any }> => {
    const response = await api.get('/auth/facebook/resources');
    return response.data;
  },

  selectResources: async (data: {
    adAccountId: string;
    pageId: string;
    pixelId?: string;
    storagePreference?: 'local' | 'session';
  }): Promise<{ success: boolean; data: any }> => {
    const response = await api.post('/auth/facebook/resources/select', data);
    return response.data;
  },

  logout: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/auth/facebook/logout');
    return response.data;
  },

  disconnect: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/auth/facebook/disconnect');
    return response.data;
  }
};

export default api;