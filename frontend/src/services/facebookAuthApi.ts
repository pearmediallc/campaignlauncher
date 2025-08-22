import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

// Create axios instance with auth headers
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const facebookAuthApi = {
  /**
   * Initiate Facebook OAuth login
   */
  login: async () => {
    const response = await api.get('/auth/facebook/login');
    return response.data;
  },
  
  // Alias for backward compatibility
  initiateLogin: async () => {
    const response = await api.get('/auth/facebook/login');
    return response.data;
  },

  /**
   * Get current authentication status
   */
  getStatus: async () => {
    const response = await api.get('/auth/facebook/status');
    return response.data;
  },

  /**
   * Verify/reverify eligibility
   */
  verifyEligibility: async () => {
    const response = await api.post('/auth/facebook/verify-eligibility');
    return response.data;
  },

  /**
   * Logout from Facebook
   */
  logout: async () => {
    const response = await api.post('/auth/facebook/logout');
    return response.data;
  },

  /**
   * Get audit logs
   */
  getAuditLogs: async (limit = 50, offset = 0) => {
    const response = await api.get('/auth/facebook/audit-logs', {
      params: { limit, offset }
    });
    return response.data;
  },

  /**
   * Get user's Facebook resources (ad accounts, pages, pixels)
   */
  getResources: async () => {
    const response = await api.get('/auth/facebook/resources');
    return response.data;
  },

  /**
   * Select resources for campaign creation
   */
  selectResources: async (data: {
    adAccountId: string;
    pageId: string;
    pixelId?: string;
    storagePreference?: 'local' | 'session';
  }) => {
    const response = await api.post('/auth/facebook/resources/select', data);
    return response.data;
  },

  /**
   * Disconnect Facebook account completely
   */
  disconnect: async () => {
    const response = await api.post('/auth/facebook/disconnect');
    return response.data;
  }
};