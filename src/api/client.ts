import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiLogItem } from './types';

// 기본 백엔드 URL (사용자가 설정에서 변경 가능하도록 로컬스토리지 지원)
export const getBaseUrl = (): string => {
  return localStorage.getItem('staybook_api_base_url') || 'http://localhost:8080';
};

export const setBaseUrl = (url: string) => {
  localStorage.setItem('staybook_api_base_url', url);
  apiClient.defaults.baseURL = url;
};

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
});

// API 로그 리스너 콜백
type LogListener = (log: ApiLogItem) => void;
let logListeners: LogListener[] = [];

export const registerLogListener = (listener: LogListener) => {
  logListeners.push(listener);
  return () => {
    logListeners = logListeners.filter((l) => l !== listener);
  };
};

const notifyLog = (log: ApiLogItem) => {
  logListeners.forEach((l) => l(log));
};

// 요청 인터셉터
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('staybook_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 메타데이터에 시작 시간 기록
    (config as any).__startTime = Date.now();
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터
apiClient.interceptors.response.use(
  (response) => {
    const startTime = (response.config as any).__startTime || Date.now();
    const duration = Date.now() - startTime;

    const logItem: ApiLogItem = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      method: (response.config.method || 'GET').toUpperCase(),
      url: response.config.url || '',
      requestHeaders: response.config.headers as any,
      requestData: response.config.data ? tryParseJson(response.config.data) : undefined,
      status: response.status,
      statusText: response.statusText,
      responseData: response.data,
      durationMs: duration,
      error: false,
    };
    notifyLog(logItem);

    return response;
  },
  (error: AxiosError) => {
    const config = error.config;
    const startTime = (config as any)?.__startTime || Date.now();
    const duration = Date.now() - startTime;

    const logItem: ApiLogItem = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      method: (config?.method || 'GET').toUpperCase(),
      url: config?.url || '',
      requestHeaders: config?.headers as any,
      requestData: config?.data ? tryParseJson(config.data) : undefined,
      status: error.response?.status || 0,
      statusText: error.response?.statusText || 'NETWORK_ERROR',
      responseData: error.response?.data,
      durationMs: duration,
      error: true,
    };
    notifyLog(logItem);

    return Promise.reject(error);
  }
);

function tryParseJson(data: any) {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
  return data;
}
