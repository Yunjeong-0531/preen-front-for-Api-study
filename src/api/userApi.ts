import { apiClient } from './client';
import { ApiResponse, UpdateMeRequest, UserMeResponse } from './types';

export const userApi = {
  // 내 정보 조회
  getMe: async () => {
    const res = await apiClient.get<ApiResponse<UserMeResponse>>('/api/users/me');
    return res.data;
  },

  // 내 정보 수정
  updateMe: async (data: UpdateMeRequest) => {
    const res = await apiClient.patch<ApiResponse<UserMeResponse>>('/api/users/me', data);
    return res.data;
  },

  // 회원 탈퇴
  withdraw: async () => {
    const res = await apiClient.delete<ApiResponse<void>>('/api/users/me');
    return res.data;
  },
};
