import { apiClient } from './client';
import { ApiResponse } from './types';

export const storageApi = {
  // 이미지 파일 업로드
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<ApiResponse<{ url: string }>>('/api/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
};
