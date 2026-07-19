import axios, { AxiosInstance, AxiosError } from 'axios';
import { getAuth, setAuth, clearAuth } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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

  get = this.client.get;
  post = this.client.post;
  put = this.client.put;
  patch = this.client.patch;
  delete = this.client.delete;
}

export const api = new ApiClient();
