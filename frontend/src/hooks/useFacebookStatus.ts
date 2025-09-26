import { useState, useEffect } from 'react';
import axios from 'axios';

interface FacebookStatus {
  connected: boolean;
  facebookUser?: {
    id: string;
    name: string;
  } | null;
  expiresAt?: string;
  loading: boolean;
}

export const useFacebookStatus = () => {
  const [status, setStatus] = useState<FacebookStatus>({
    connected: false,
    facebookUser: null,
    loading: true
  });

  const checkStatus = async () => {
    try {
      const response = await axios.get('/api/auth/facebook/status');
      if (response.data.success) {
        setStatus({
          connected: response.data.connected,
          facebookUser: response.data.facebookUser,
          expiresAt: response.data.expiresAt,
          loading: false
        });
      }
    } catch (error) {
      console.error('Error checking Facebook status:', error);
      setStatus({
        connected: false,
        facebookUser: null,
        loading: false
      });
    }
  };

  useEffect(() => {
    checkStatus();
    // Check status every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return { ...status, refreshStatus: checkStatus };
};