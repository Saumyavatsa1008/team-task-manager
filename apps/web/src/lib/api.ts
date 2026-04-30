import axios, { AxiosError } from 'axios';
import { firebaseAuth } from './firebase';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const user = firebaseAuth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(payload: ApiErrorPayload, status: number) {
    super(payload.message);
    this.name = 'ApiClientError';
    this.code = payload.code;
    this.status = status;
    this.details = payload.details;
  }
}

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError<{ error: ApiErrorPayload }>) => {
    if (err.response?.data?.error) {
      return Promise.reject(new ApiClientError(err.response.data.error, err.response.status));
    }
    return Promise.reject(err);
  },
);
