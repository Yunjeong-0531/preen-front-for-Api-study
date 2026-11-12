import { apiClient } from './client';
import {
  ApiResponse,
  PaymentConfirmRequest,
  PaymentPrepareRequest,
  PaymentPrepareResponse,
  PaymentResponse,
} from './types';

export const paymentApi = {
  // 결제 준비 (order_id 발급, READY 상태)
  prepare: async (data: PaymentPrepareRequest) => {
    const res = await apiClient.post<ApiResponse<PaymentPrepareResponse>>('/api/payments/prepare', data);
    return res.data;
  },

  // 결제 승인 (PG 승인 및 예약 확정)
  confirm: async (data: PaymentConfirmRequest) => {
    const res = await apiClient.post<ApiResponse<PaymentResponse>>('/api/payments/confirm', data);
    return res.data;
  },
};
