import { apiClient } from './client';
import {
  ApiResponse,
  PageResponse,
  ReservationCancelResponse,
  ReservationCreateRequest,
  ReservationResponse,
} from './types';

export const reservationApi = {
  // 예약 생성 (PENDING + 재고 선점)
  create: async (data: ReservationCreateRequest) => {
    const res = await apiClient.post<ApiResponse<ReservationResponse>>('/api/reservations', data);
    return res.data;
  },

  // 내 예약 목록
  getMine: async (page = 0, size = 20) => {
    const res = await apiClient.get<ApiResponse<PageResponse<ReservationResponse>>>('/api/reservations/me', {
      params: { page, size },
    });
    return res.data;
  },

  // 예약 상세
  getDetail: async (id: number) => {
    const res = await apiClient.get<ApiResponse<ReservationResponse>>(`/api/reservations/${id}`);
    return res.data;
  },

  // 예약 취소
  cancel: async (id: number) => {
    const res = await apiClient.post<ApiResponse<ReservationCancelResponse>>(`/api/reservations/${id}/cancel`);
    return res.data;
  },
};
