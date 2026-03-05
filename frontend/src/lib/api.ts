// API base helper for making requests to the backend
const API_BASE = '/api';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

async function request<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;
  
  let url = `${API_BASE}${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const config: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers
    },
    ...fetchOptions
  };

  // Don't set Content-Type for FormData
  if (config.body instanceof FormData) {
    delete (config.headers as Record<string, string>)['Content-Type'];
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || errorData.error || `Error ${response.status}`);
    (error as any).status = response.status;
    (error as any).data = errorData;
    throw error;
  }

  return response.json();
}

export const api = {
  get: <T = unknown>(endpoint: string, params?: Record<string, string>) =>
    request<T>(endpoint, { method: 'GET', params }),

  post: <T = unknown>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),

  put: <T = unknown>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),

  delete: <T = unknown>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' })
};

export default api;
