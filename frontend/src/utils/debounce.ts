export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return function debounced(...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  };
}

// Cache for API calls to prevent duplicate requests
const apiCallCache = new Map<string, Promise<any>>();
const CACHE_DURATION = 5000; // 5 seconds

export async function cacheFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  cacheDuration: number = CACHE_DURATION
): Promise<T> {
  // Check if we have a pending or recent request
  if (apiCallCache.has(key)) {
    return apiCallCache.get(key)!;
  }
  
  // Create new request
  const promise = fetcher();
  apiCallCache.set(key, promise);
  
  // Clear cache after duration
  setTimeout(() => {
    apiCallCache.delete(key);
  }, cacheDuration);
  
  // Also clear on error
  promise.catch(() => {
    apiCallCache.delete(key);
  });
  
  return promise;
}