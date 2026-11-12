import { apiClient } from './client';
import {
  AccommodationDetail,
  AccommodationSummary,
  AmenityResponse,
  ApiResponse,
  CategoryResponse,
  PageResponse,
  RegionResponse,
} from './types';

export const accommodationApi = {
  // 지역 목록
  getRegions: async () => {
    const res = await apiClient.get<ApiResponse<RegionResponse[]>>('/api/regions');
    return res.data;
  },

  // 편의시설 목록
  getAmenities: async () => {
    const res = await apiClient.get<ApiResponse<AmenityResponse[]>>('/api/amenities');
    return res.data;
  },

  // 카테고리 목록
  getCategories: async () => {
    const res = await apiClient.get<ApiResponse<CategoryResponse[]>>('/api/categories');
    return res.data;
  },

  // 숙소 목록 검색
  search: async (params?: {
    regionId?: number;
    categoryId?: number;
    guestCount?: number;
    page?: number;
    size?: number;
  }) => {
    const res = await apiClient.get<ApiResponse<PageResponse<AccommodationSummary>>>('/api/accommodations', {
      params,
    });
    return res.data;
  },

  // 숙소 상세
  getDetail: async (id: number) => {
    const res = await apiClient.get<ApiResponse<AccommodationDetail>>(`/api/accommodations/${id}`);
    return res.data;
  },
};
