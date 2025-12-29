// Runtime API URL detection
// Priority:
// 1. window.API_URL (injected via script tag for Docker/separate deployments)
// 2. Fetch from /api-config endpoint (for separate deployments)
// 3. Relative URL "" (works for Electron and same-origin serving)

let cachedApiUrl: string | null = null;
let configPromise: Promise<string> | null = null;

async function getApiUrl(): Promise<string> {
  // If already cached, return it
  if (cachedApiUrl !== null) {
    return cachedApiUrl;
  }

  // Check if injected via script tag (for Docker builds)
  if (typeof window !== "undefined" && (window as any).API_URL) {
    cachedApiUrl = (window as any).API_URL;
    return cachedApiUrl;
  }

  // Check if we're on the same origin (Electron or server serving static files)
  // In this case, relative URLs work perfectly
  if (typeof window !== "undefined") {
    const currentOrigin = window.location.origin;
    // Try to fetch config - if it works, we're on same origin
    try {
      if (!configPromise) {
        configPromise = fetch("/api-config")
          .then(res => res.json())
          .then((config: { apiUrl: string; port: number }) => {
            // If config returns same origin, use relative URLs
            if (config.apiUrl === currentOrigin || config.apiUrl.startsWith(currentOrigin)) {
              cachedApiUrl = "";
            } else {
              // Different origin, use the configured URL
              cachedApiUrl = config.apiUrl;
            }
            return cachedApiUrl;
          })
          .catch(() => {
            // If fetch fails, assume same origin and use relative URLs
            cachedApiUrl = "";
            return cachedApiUrl;
          });
      }
      return await configPromise;
    } catch {
      // Fallback to relative URLs
      cachedApiUrl = "";
      return cachedApiUrl;
    }
  }

  // Default to relative URLs
  cachedApiUrl = "";
  return cachedApiUrl;
}

// Initialize API URL on module load (non-blocking)
if (typeof window !== "undefined") {
  getApiUrl().catch(() => {
    // Silently fail - will use relative URLs as fallback
  });
}

export async function apiGet<T>(path: string): Promise<T> {
  try {
    const apiUrl = await getApiUrl();
    const response = await fetch(`${apiUrl}${path}`);
    if (!response.ok) {
      let errorDetails = `${response.status} ${response.statusText}`;
      
      // Try to get error body for more details
      try {
        const text = await response.text();
        if (text) {
          errorDetails += ` - ${text.substring(0, 200)}`;
        }
      } catch {
        // Ignore error reading response body
      }
      
      console.error(`[API GET Error] ${path}:`, errorDetails);
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error(`[API GET Error] ${path}: Expected JSON but got ${contentType}`, text.substring(0, 200));
      throw new Error(`Expected JSON response but got ${contentType || 'unknown content type'}`);
    }
    
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[API GET Error] ${path}:`, error.message);
    }
    throw error;
  }
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  try {
    const apiUrl = await getApiUrl();
    const response = await fetch(`${apiUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      let errorDetails = `${response.status} ${response.statusText}`;
      
      try {
        const text = await response.text();
        if (text) {
          errorDetails += ` - ${text.substring(0, 200)}`;
        }
      } catch {
        // Ignore error reading response body
      }
      
      console.error(`[API POST Error] ${path}:`, errorDetails);
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error(`[API POST Error] ${path}: Expected JSON but got ${contentType}`, text.substring(0, 200));
      throw new Error(`Expected JSON response but got ${contentType || 'unknown content type'}`);
    }
    
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[API POST Error] ${path}:`, error.message);
    }
    throw error;
  }
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  try {
    const apiUrl = await getApiUrl();
    const response = await fetch(`${apiUrl}${path}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      let errorDetails = `${response.status} ${response.statusText}`;
      
      try {
        const text = await response.text();
        if (text) {
          errorDetails += ` - ${text.substring(0, 200)}`;
        }
      } catch {
        // Ignore error reading response body
      }
      
      console.error(`[API PUT Error] ${path}:`, errorDetails);
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error(`[API PUT Error] ${path}: Expected JSON but got ${contentType}`, text.substring(0, 200));
      throw new Error(`Expected JSON response but got ${contentType || 'unknown content type'}`);
    }
    
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[API PUT Error] ${path}:`, error.message);
    }
    throw error;
  }
}

// Export getApiUrl for use in SSE and other places that need the API URL
export { getApiUrl };
