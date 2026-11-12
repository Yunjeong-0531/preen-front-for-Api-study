import { loadTossPayments } from '@tosspayments/payment-sdk';

// 토스 공식 개발자 문서에 안내된 테스트용 기본 클라이언트 키
export const DEFAULT_TOSS_CLIENT_KEY = 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';

export const getTossClientKey = (): string => {
  const stored = localStorage.getItem('toss_client_key');
  // 만약 결제위젯 전용 키(test_gck_...)가 들어가 있다면 일반 결제창 키로 자동 보정
  if (!stored || stored.startsWith('test_gck_')) {
    localStorage.setItem('toss_client_key', DEFAULT_TOSS_CLIENT_KEY);
    return DEFAULT_TOSS_CLIENT_KEY;
  }
  return stored;
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

  // orderName은 최대 100자, 공백 및 일반 텍스트 보장
  const safeOrderName = (params.orderName || '숙소 예약 결제').replace(/[^\w\s가-힣0-9\-_]/g, '').trim().slice(0, 50) || '숙소 예약 결제';

  console.log('[TossPayments] Requesting payment with params:', {
    amount: params.amount,
    orderId: params.orderId,
    orderName: safeOrderName,
    customerName: params.customerName || '게스트',
    clientKey,
  });

  await tossPayments.requestPayment('카드', {
    amount: params.amount,
    orderId: params.orderId,
    orderName: safeOrderName,
    customerName: params.customerName || '게스트',
    successUrl,
    failUrl,
  });
};
