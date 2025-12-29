// Use relative URL to automatically connect to the same server that served the web UI.
// This ensures the frontend works regardless of the port or hostname configured.
const API_URL = "";

export async function apiGet<T>(path: string): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${path}`);
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
    const response = await fetch(`${API_URL}${path}`, {
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
    const response = await fetch(`${API_URL}${path}`, {
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

export { API_URL };
