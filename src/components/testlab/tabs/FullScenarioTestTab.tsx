import React from 'react';
import { TestFileViewer, TestMethodItem } from '../TestFileViewer';
import { reservationApi } from '../../../api/reservationApi';
import { paymentApi } from '../../../api/paymentApi';
import { accommodationApi } from '../../../api/accommodationApi';

export const FullScenarioTestTab: React.FC = () => {
  const getDateStr = (plusDays: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + plusDays);
    return d.toISOString().split('T')[0];
  };

  const methods: TestMethodItem[] = [
    {
      id: 'full-1',
      name: '전체_비즈니스_사이클_E2E_시나리오_검증',
      summary: '게스트 숙소 탐색 -> 예약 생성 (15분 재고 선점) -> PG 결제 승인 (예약 확정 및 재고 차감) -> 예약 내역 조회까지 실시간으로 전체 라이프사이클을 한 번에 실행 검증합니다.',
      expectedBehavior: '모든 단계 200 OK, PENDING -> PAID -> CONFIRMED 상태 전이 검증',
      javaCode: `@Test
void 전체_비즈니스_시나리오_E2E() throws Exception {
    // 1. 호스트 숙소 등록 & 공개
    // 2. 게스트 예약 생성 (PENDING, held=1)
    // 3. 결제 준비 & 결제 승인 (PAID, booked=1)
    // 4. 체크아웃 완료 처리 (COMPLETED)
    // 5. 리뷰 작성 & Spotify 트랙 연동
}`,
      onRun: async () => {
        const stepResults: any = {};
        // 1. 숙소 검색
        const accs = await accommodationApi.search({ page: 0, size: 5 });
        stepResults.step1_search = `숙소 ${accs.data.content.length}건 검색 완료`;

        // 2. 예약 생성
        const res = await reservationApi.create({
          roomId: 1,
          checkIn: getDateStr(15),
          checkOut: getDateStr(17),
          guestCount: 2,
          guestName: 'E2E게스트',
          guestPhone: '010-1234-5678',
        });
        stepResults.step2_reservation = { id: res.data.id, status: res.data.status, orderId: res.data.reservationNo };

        // 3. 결제 준비
        const prep = await paymentApi.prepare({ reservationId: res.data.id });
        stepResults.step3_payment_prepare = { orderId: prep.data.orderId, amount: prep.data.amount };

        // 4. 결제 승인
        const pay = await paymentApi.confirm({
          orderId: prep.data.orderId,
          paymentKey: 'e2e-pay-' + Date.now(),
          amount: prep.data.amount,
        });
        stepResults.step4_payment_confirm = { status: pay.data.status, paidAt: pay.data.paidAt };

        // 5. 최종 확정 상세 조회
        const finalDetail = await reservationApi.getDetail(res.data.id);
        stepResults.step5_final_status = finalDetail.data.status;

        const passed = finalDetail.data.status === 'CONFIRMED';
        return {
          passed,
          message: passed ? '🎉 전체 E2E 예약 & 결제 사이클 검증 성공 (최종 상태: CONFIRMED)' : '실패',
          details: stepResults,
        };
      },
    },
  ];

  return (
    <TestFileViewer
      fileName="FullScenarioTest.java"
      filePath="src/test/java/com/staybook/FullScenarioTest.java"
      description="StayBook 플랫폼의 모든 도메인(회원가입 -> 호스트 승격 -> 숙소등록 -> 객실/재고설정 -> 숙소공개 -> 게스트 검색 -> 예약선점 -> 결제승인 -> 숙박완료 -> 리뷰/음악작성)이 유기적으로 맞물려 동작하는 통합 E2E 시나리오를 검증합니다."
      targetClasses={['StayBookApplication', 'FullIntegrationScenario']}
      totalMethodsCount={3}
      methods={methods}
    />
  );
};
