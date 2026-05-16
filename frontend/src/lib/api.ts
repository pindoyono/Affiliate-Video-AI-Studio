import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  profile: () => api.get('/auth/profile'),
};

export const productsApi = {
  import: (data: { url: string; platform?: string }) =>
    api.post('/products/import', data),
  list: () => api.get('/products'),
  get: (id: string) => api.get(`/products/${id}`),
  trending: () => api.get('/products/trending'),
};

export const trendsApi = {
  list: () => api.get('/trends'),
  byProduct: (productId: string) => api.get(`/trends/${productId}`),
  analyze: (productId: string) => api.post(`/trends/analyze/${productId}`),
  dashboard: () => api.get('/trends/dashboard'),
};

export const videosApi = {
  create: (data: any) => api.post('/videos', data),
  list: () => api.get('/videos'),
  get: (id: string) => api.get(`/videos/${id}`),
  render: (id: string) => api.post(`/videos/${id}/render`),
  status: (id: string) => api.get(`/videos/${id}/status`),
};

export const aiContentApi = {
  generate: (data: { productId: string; mode: string }) =>
    api.post('/ai-content/generate', data),
};

export const presentersApi = {
  create: (data: any) => api.post('/presenters', data),
  list: () => api.get('/presenters'),
  get: (id: string) => api.get(`/presenters/${id}`),
  update: (id: string, data: any) => api.put(`/presenters/${id}`, data),
  delete: (id: string) => api.delete(`/presenters/${id}`),
};

export const knowledgeApi = {
  create: (data: any) => api.post('/knowledge', data),
  list: () => api.get('/knowledge'),
  search: (query: string) => api.post('/knowledge/search', { query }),
  delete: (id: string) => api.delete(`/knowledge/${id}`),
};
