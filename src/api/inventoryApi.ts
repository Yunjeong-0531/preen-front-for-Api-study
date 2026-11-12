import { apiClient } from './client';
import { ApiResponse, InventoryResponse, RoomAvailability, SetInventoriesRequest } from './types';

export const inventoryApi = {
  // 객실별 예약 가능 여부 & 요금 조회 (공개 조회)
  getAvailability: async (accommodationId: number, checkIn: string, checkOut: string) => {
    const res = await apiClient.get<ApiResponse<RoomAvailability[]>>(
      `/api/accommodations/${accommodationId}/availability`,
      {
        params: { checkIn, checkOut },
      }
    );
    return res.data;
  },

  // 기간별 재고 조회 (호스트 전용, GET /api/host/rooms/{roomId}/inventories)
  getInventories: async (roomId: number, startDate: string, endDate: string) => {
    const res = await apiClient.get<ApiResponse<InventoryResponse[]>>(
      `/api/host/rooms/${roomId}/inventories`,
      {
        params: { startDate, endDate },
      }
    );
    return res.data;
  },

  // 기간별 수량/가격/판매 마감 설정 (호스트 전용)
  setInventories: async (roomId: number, data: SetInventoriesRequest) => {
    const res = await apiClient.put<ApiResponse<InventoryResponse[]>>(
      `/api/host/rooms/${roomId}/inventories`,
      data
    );
    return res.data;
  },
};
