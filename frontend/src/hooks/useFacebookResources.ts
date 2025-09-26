import { useState, useEffect } from 'react';
import { facebookAuthApi } from '../services/api';

interface AdAccount {
  id: string;
  name: string;
  currency: string;
  status: number;
}

interface Page {
  id: string;
  name: string;
  category: string;
  picture?: string | { data?: { url?: string } };
}

interface Pixel {
  id: string;
  name: string;
}

interface FacebookResources {
  adAccounts: AdAccount[];
  pages: Page[];
  pixels: Pixel[];
  selectedAdAccount?: AdAccount;
  selectedPage?: Page;
  selectedPixel?: Pixel;
}

export const useFacebookResources = () => {
  const [resources, setResources] = useState<FacebookResources>({
    adAccounts: [],
    pages: [],
    pixels: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const fetchResources = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await facebookAuthApi.getResources();

      if (response.success) {
        setResources(response.data);
      } else {
        setError('Failed to fetch Facebook resources');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch Facebook resources';
      setError(errorMsg);
      console.error('Error fetching Facebook resources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  return {
    resources,
    loading,
    error,
    refetch: fetchResources
  };
};