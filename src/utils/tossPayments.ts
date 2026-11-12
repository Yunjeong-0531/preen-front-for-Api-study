import { loadTossPayments } from '@tosspayments/payment-sdk';

// 토스 공식 개발자 문서에 안내된 테스트용 기본 클라이언트 키
export const DEFAULT_TOSS_CLIENT_KEY = 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';

export const getTossClientKey = (): string => {
  return localStorage.getItem('toss_client_key') || DEFAULT_TOSS_CLIENT_KEY;
};

export const setTossClientKey = (key: string): void => {
  localStorage.setItem('toss_client_key', key.trim());
};

export interface RequestTossPaymentParams {
  orderId: string;
  orderName: string;
  amount: number;
  customerName?: string;
  successUrl?: string;
  failUrl?: string;
}

/**
 * 토스페이먼츠 공식 SDK를 로드하여 결제창(모달)을 엽니다.
 */
export const openTossPaymentWindow = async (params: RequestTossPaymentParams): Promise<void> => {
  const clientKey = getTossClientKey();
  const tossPayments = await loadTossPayments(clientKey);

  const currentOrigin = window.location.origin + window.location.pathname;
  const successUrl = params.successUrl || `${currentOrigin}?toss_status=success`;
  const failUrl = params.failUrl || `${currentOrigin}?toss_status=fail`;

  await tossPayments.requestPayment('카드', {
    amount: params.amount,
    orderId: params.orderId,
    orderName: params.orderName,
    customerName: params.customerName || '게스트',
    successUrl,
    failUrl,
  });
};
