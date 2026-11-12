import { apiClient } from './client';
import { ApiResponse, AuthTokenResponse, LoginRequest, SignupRequest } from './types';

export const authApi = {
  // 이메일 중복 확인
  checkEmail: async (email: string) => {
    const res = await apiClient.get<ApiResponse<{ available: boolean }>>('/api/auth/check-email', {
      params: { email },
    });
    return res.data;
  },

  // 이메일 인증코드 발송
  sendEmailCode: async (email: string) => {
    const res = await apiClient.post<ApiResponse<void>>('/api/auth/email/resend', { email });
    return res.data;
  },

  // 이메일 인증코드 검증
  verifyEmailCode: async (email: string, code: string) => {
    const res = await apiClient.post<ApiResponse<void>>('/api/auth/email/verify', { email, code });
    return res.data;
  },

  // 회원가입
  signup: async (data: SignupRequest) => {
    const res = await apiClient.post<ApiResponse<{ userId: number }>>('/api/auth/signup', data);
    return res.data;
  },

  // 로그인
  login: async (data: LoginRequest) => {
    const res = await apiClient.post<ApiResponse<AuthTokenResponse>>('/api/auth/login', data);
    return res.data;
  },

  // 토큰 갱신
  refresh: async (refreshToken: string) => {
    const res = await apiClient.post<ApiResponse<AuthTokenResponse>>('/api/auth/refresh', { refreshToken });
    return res.data;
  },

  // 로그아웃
  logout: async (refreshToken: string) => {
    const res = await apiClient.post<ApiResponse<void>>('/api/auth/logout', { refreshToken });
    return res.data;
  },

  // 비밀번호 재설정 요청
  forgotPassword: async (email: string) => {
    const res = await apiClient.post<ApiResponse<void>>('/api/auth/password/forgot', { email });
    return res.data;
  },

  // 비밀번호 재설정
  resetPassword: async (token: string, newPassword: string) => {
    const res = await apiClient.post<ApiResponse<void>>('/api/auth/password/reset', { token, newPassword });
    return res.data;
  },
};
