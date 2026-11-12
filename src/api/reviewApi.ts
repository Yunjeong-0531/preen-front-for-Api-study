import { apiClient } from './client';
import { ApiResponse, PageResponse, ReviewCreateRequest, ReviewResponse, ReviewUpdateRequest, AccommodationTrackResponse } from './types';

export const reviewApi = {
  // 숙소 리뷰 목록 (공개)
  getForAccommodation: async (accommodationId: number, page = 0, size = 20) => {
    const res = await apiClient.get<ApiResponse<PageResponse<ReviewResponse>>>(
      `/api/accommodations/${accommodationId}/reviews`,
      {
        params: { page, size },
      }
    );
    return res.data;
  },

  // 숙소별 트랙 목록 (공개)
  getTracksForAccommodation: async (accommodationId: number) => {
    const res = await apiClient.get<ApiResponse<AccommodationTrackResponse[]>>(
      `/api/accommodations/${accommodationId}/tracks`
    );
    return res.data;
  },

  // 리뷰 작성 (COMPLETED 예약에 대해)
  create: async (data: ReviewCreateRequest) => {
    const res = await apiClient.post<ApiResponse<ReviewResponse>>('/api/reviews', data);
    return res.data;
  },

  // 리뷰 수정
  update: async (id: number, data: ReviewUpdateRequest) => {
    const res = await apiClient.patch<ApiResponse<ReviewResponse>>(`/api/reviews/${id}`, data);
    return res.data;
  },

  // 리뷰 삭제
  delete: async (id: number) => {
    const res = await apiClient.delete<ApiResponse<void>>(`/api/reviews/${id}`);
    return res.data;
  },
};
