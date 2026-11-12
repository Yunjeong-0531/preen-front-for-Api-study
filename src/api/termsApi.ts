import { apiClient } from './client';
import { ApiResponse, TermItem } from './types';

export const termsApi = {
  getCurrentTerms: async () => {
    const res = await apiClient.get<ApiResponse<TermItem[]>>('/api/terms');
    return res.data;
  },
};
