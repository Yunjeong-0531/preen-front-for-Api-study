import { apiClient } from './client';
import { ApiResponse, FavoriteResponse, PageResponse } from './types';

export const favoriteApi = {
  // 찜 추가
  add: async (accommodationId: number) => {
    const res = await apiClient.post<ApiResponse<void>>(`/api/favorites/${accommodationId}`);
    return res.data;
  },

  // 찜 삭제
  remove: async (accommodationId: number) => {
    const res = await apiClient.delete<ApiResponse<void>>(`/api/favorites/${accommodationId}`);
    return res.data;
  },

  // 내 찜 목록
  getMine: async (page = 0, size = 20) => {
    const res = await apiClient.get<ApiResponse<PageResponse<FavoriteResponse>>>('/api/favorites/me', {
      params: { page, size },
    });
    return res.data;
  },
};
