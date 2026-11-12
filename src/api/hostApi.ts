import { apiClient } from './client';
import {
  AccommodationCreateRequest,
  AccommodationDetail,
  AccommodationUpdateRequest,
  ApiResponse,
  HostBusinessResponse,
  HostRegisterRequest,
  HostRegisterResponse,
  PageResponse,
  RefundPolicyRequest,
  RefundPolicyResponse,
  ReservationResponse,
  ReviewReplyRequest,
  ReviewResponse,
  RoomCreateRequest,
  RoomResponse,
  RoomUpdateRequest,
} from './types';

export const hostApi = {
  // 사업자 등록 (로그인 회원 누구나 가능 -> 승인 시 HOST 권한 및 새 토큰 발급)
  registerBusiness: async (data: HostRegisterRequest) => {
    const res = await apiClient.post<ApiResponse<HostRegisterResponse>>('/api/host-businesses', data);
    return res.data;
  },

  // 본인 사업자 정보 조회
  getMyBusiness: async () => {
    const res = await apiClient.get<ApiResponse<HostBusinessResponse>>('/api/host/business');
    return res.data;
  },

  // 호스트 본인이 등록한 숙소 목록 조회 (GET /api/host/accommodations)
  getMyAccommodations: async () => {
    const res = await apiClient.get<ApiResponse<AccommodationDetail[]>>('/api/host/accommodations');
    return res.data;
  },

  // 숙소 등록
  createAccommodation: async (data: AccommodationCreateRequest) => {
    const res = await apiClient.post<ApiResponse<AccommodationDetail>>('/api/host/accommodations', data);
    return res.data;
  },

  // 숙소 수정
  updateAccommodation: async (id: number, data: AccommodationUpdateRequest) => {
    const res = await apiClient.patch<ApiResponse<AccommodationDetail>>(`/api/host/accommodations/${id}`, data);
    return res.data;
  },

  // 객실 추가
  addRoom: async (accommodationId: number, data: RoomCreateRequest) => {
    const res = await apiClient.post<ApiResponse<RoomResponse>>(
      `/api/host/accommodations/${accommodationId}/rooms`,
      data
    );
    return res.data;
  },

  // 객실 수정
  updateRoom: async (accommodationId: number, roomId: number, data: RoomUpdateRequest) => {
    const res = await apiClient.patch<ApiResponse<RoomResponse>>(
      `/api/host/accommodations/${accommodationId}/rooms/${roomId}`,
      data
    );
    return res.data;
  },

  // 환불 정책 설정
  putRefundPolicy: async (accommodationId: number, data: RefundPolicyRequest) => {
    const res = await apiClient.put<ApiResponse<RefundPolicyResponse>>(
      `/api/host/accommodations/${accommodationId}/refund-policy`,
      data
    );
    return res.data;
  },

  // 호스트 숙소 예약 목록 조회
  getHostReservations: async (page = 0, size = 20) => {
    const res = await apiClient.get<ApiResponse<PageResponse<ReservationResponse>>>('/api/host/reservations', {
      params: { page, size },
    });
    return res.data;
  },

  // 호스트 리뷰 답글 작성
  replyReview: async (reviewId: number, data: ReviewReplyRequest) => {
    const res = await apiClient.post<ApiResponse<ReviewResponse>>(`/api/host/reviews/${reviewId}/reply`, data);
    return res.data;
  },
};
