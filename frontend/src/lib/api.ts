import axios, { AxiosInstance, AxiosError } from 'axios';
import { getAuth, setAuth, clearAuth } from './auth';

// NEXT_PUBLIC_API_URL is injected at build time via next.config.js
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://hospitable-insight-production-550c.up.railway.app/api/v1';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor: attach token
    this.client.interceptors.request.use((config) => {
      const auth = getAuth();
      if (auth?.accessToken) {
        config.headers.Authorization = `Bearer ${auth.accessToken}`;
      }
      return config;
    });

    // Response interceptor: refresh token on 401
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const auth = getAuth();
            if (auth?.refreshToken) {
              const response = await axios.post(`${API_URL}/auth/refresh`, {
                refreshToken: auth.refreshToken,
              });

              const newAuth = {
                ...auth,
                accessToken: response.data.accessToken,
              };
              setAuth(newAuth);

              return this.client(originalRequest);
            }
          } catch (_err) {
            clearAuth();
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  get = (url: string, config?: any) => this.client.get(url, config);
  post = (url: string, data?: any, config?: any) => this.client.post(url, data, config);
  put = (url: string, data?: any, config?: any) => this.client.put(url, data, config);
  patch = (url: string, data?: any, config?: any) => this.client.patch(url, data, config);
  delete = (url: string, config?: any) => this.client.delete(url, config);
}

export const api = new ApiClient();
