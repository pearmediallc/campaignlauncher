/**
 * Local storage service for Facebook authentication persistence
 */

const FB_AUTH_KEY = 'fb_auth_data';
const FB_TOKEN_KEY = 'fb_token_data';

export interface StoredAuthData {
  selectedAdAccount?: any;
  selectedPage?: any;
  selectedPixel?: any;
  tokenExpiresAt?: string;
  storagePreference?: 'local' | 'session';
  timestamp: number;
}

export interface StoredTokenData {
  accessToken: string;
  expiresAt: string;
  timestamp: number;
}

class LocalStorageAuth {
  /**
   * Store authentication data locally
   */
  saveAuthData(data: Omit<StoredAuthData, 'timestamp'>): void {
    try {
      const storageData: StoredAuthData = {
        ...data,
        timestamp: Date.now()
      };
      localStorage.setItem(FB_AUTH_KEY, JSON.stringify(storageData));
    } catch (error) {
      console.error('Failed to save auth data to localStorage:', error);
    }
  }

  /**
   * Retrieve stored authentication data
   */
  getAuthData(): StoredAuthData | null {
    try {
      const data = localStorage.getItem(FB_AUTH_KEY);
      if (!data) return null;
      
      const parsed = JSON.parse(data) as StoredAuthData;
      
      // Check if token is expired
      if (parsed.tokenExpiresAt && new Date(parsed.tokenExpiresAt) < new Date()) {
        this.clearAuthData();
        return null;
      }
      
      return parsed;
    } catch (error) {
      console.error('Failed to get auth data from localStorage:', error);
      return null;
    }
  }

  /**
   * Clear stored authentication data
   */
  clearAuthData(): void {
    try {
      localStorage.removeItem(FB_AUTH_KEY);
      localStorage.removeItem(FB_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to clear auth data from localStorage:', error);
    }
  }

  /**
   * Check if authentication is stored locally
   */
  hasStoredAuth(): boolean {
    const data = this.getAuthData();
    return data !== null && data.storagePreference === 'local';
  }

  /**
   * Store token data (encrypted on backend, but stored reference locally)
   */
  saveTokenReference(tokenId: string, expiresAt: string): void {
    try {
      const tokenData: StoredTokenData = {
        accessToken: tokenId,
        expiresAt,
        timestamp: Date.now()
      };
      sessionStorage.setItem(FB_TOKEN_KEY, JSON.stringify(tokenData));
    } catch (error) {
      console.error('Failed to save token reference:', error);
    }
  }

  /**
   * Get token reference
   */
  getTokenReference(): StoredTokenData | null {
    try {
      const data = sessionStorage.getItem(FB_TOKEN_KEY);
      if (!data) return null;
      
      const parsed = JSON.parse(data) as StoredTokenData;
      
      // Check if token is expired
      if (new Date(parsed.expiresAt) < new Date()) {
        sessionStorage.removeItem(FB_TOKEN_KEY);
        return null;
      }
      
      return parsed;
    } catch (error) {
      console.error('Failed to get token reference:', error);
      return null;
    }
  }

  /**
   * Check if we should auto-reconnect based on stored preferences
   */
  shouldAutoReconnect(): boolean {
    const authData = this.getAuthData();
    return authData !== null && 
           authData.storagePreference === 'local' &&
           authData.tokenExpiresAt !== undefined &&
           new Date(authData.tokenExpiresAt) > new Date();
  }

  /**
   * Get days until token expiry
   */
  getDaysUntilExpiry(): number | null {
    const authData = this.getAuthData();
    if (!authData || !authData.tokenExpiresAt) return null;
    
    const expiryDate = new Date(authData.tokenExpiresAt);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  }
}

export const localStorageAuth = new LocalStorageAuth();