import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: any[];  // Can be string[] or Role[]
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  permissions: string[];
  resources: any[];
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  hasPermission: (resource: string, action: string) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
  hasAllPermissions: (...permissions: string[]) => boolean;
  hasResourceAccess: (resourceType: string, resourceId: string, permission?: string) => boolean;
  loading: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [permissions, setPermissions] = useState<string[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      loadUserData();
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadUserData = async () => {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';
      
      // Get user info
      const userResponse = await axios.get(`${baseURL}/auth/me`);
      setUser(userResponse.data.user);
      
      // Get user permissions
      const permResponse = await axios.get(`${baseURL}/users/${userResponse.data.user.id}/permissions`);
      setPermissions(permResponse.data.permissions || []);
      setResources(permResponse.data.resources || []);
    } catch (error: any) {
      console.error('Failed to load user data:', error);
      // Only logout if it's an authentication error, not rate limiting or network issues
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
      }
      // For other errors (429 rate limit, 500 server error, network issues), keep the user logged in
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';
    const response = await axios.post(`${baseURL}/auth/login`, { email, password });
    
    if (response.data.success) {
      const { token: newToken, user: userData } = response.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      // Load permissions after login
      const permResponse = await axios.get(`${baseURL}/users/${userData.id}/permissions`);
      setPermissions(permResponse.data.permissions || []);
      setResources(permResponse.data.resources || []);
    }
  };

  const register = async (data: RegisterData) => {
    const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';
    const response = await axios.post(`${baseURL}/auth/register`, data);
    
    if (response.data.success) {
      const { token: newToken, user: userData } = response.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setPermissions([]);
    setResources([]);
    delete axios.defaults.headers.common['Authorization'];
  };

  const hasPermission = (resource: string, action: string): boolean => {
    const permissionString = `${resource}:${action}`;
    const wildcardPermission = `${resource}:*`;
    const superPermission = '*:*';
    
    return permissions.includes(permissionString) || 
           permissions.includes(wildcardPermission) ||
           permissions.includes(superPermission);
  };

  const hasAnyPermission = (...requiredPermissions: string[]): boolean => {
    return requiredPermissions.some(perm => {
      const [resource, action] = perm.split(':');
      return hasPermission(resource, action);
    });
  };

  const hasAllPermissions = (...requiredPermissions: string[]): boolean => {
    return requiredPermissions.every(perm => {
      const [resource, action] = perm.split(':');
      return hasPermission(resource, action);
    });
  };

  const hasResourceAccess = (resourceType: string, resourceId: string, permission: string = 'read'): boolean => {
    const resource = resources.find(r => 
      r.type === resourceType && r.externalId === resourceId
    );
    
    if (!resource) return false;
    
    return resource.permissions.includes(permission) || 
           resource.permissions.includes('*');
  };

  const value: AuthContextType = {
    user,
    token,
    permissions,
    resources,
    login,
    register,
    logout,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasResourceAccess,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};