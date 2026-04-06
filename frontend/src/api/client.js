import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const tokens = JSON.parse(localStorage.getItem('tokens') || 'null');
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const tokens = JSON.parse(localStorage.getItem('tokens') || 'null');
      if (tokens?.refresh) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/token/refresh/`, {
            refresh: tokens.refresh,
          });
          localStorage.setItem('tokens', JSON.stringify({
            access: data.access,
            refresh: data.refresh || tokens.refresh,
          }));
          originalRequest.headers.Authorization = `Bearer ${data.access}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('tokens');
          localStorage.removeItem('user');
          // Redirect to appropriate login page
          const isAppRoute = window.location.pathname.startsWith('/app');
          window.location.href = isAppRoute ? '/app/login' : '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
