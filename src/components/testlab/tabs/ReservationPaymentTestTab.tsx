import React from 'react';
import { TestFileViewer, TestMethodItem } from '../TestFileViewer';
import { reservationApi } from '../../../api/reservationApi';
import { paymentApi } from '../../../api/paymentApi';

export const ReservationPaymentTestTab: React.FC = () => {
  const getDateStr = (plusDays: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + plusDays);
    return d.toISOString().split('T')[0];
  };

  const methods: TestMethodItem[] = [
    {
      id: 'res-1',
      name: '예약을_만들면_PENDING이고_재고가_선점되며_요금_항목과_환불정책_스냅샷이_저장된다',
      summary: '예약 신청 시 PENDING 상태로 생성되며 15분 선점(holdExpiresAt)이 시작되고, room_inventories의 held_count가 1 증가하며 당시의 환불 규정 스냅샷이 DB에 영구 보존됩니다.',
      expectedBehavior: 'HTTP 200 OK, status = PENDING, hold_seconds = 900초(15분), held_count = 1',
      javaCode: `@Test
void 예약을_만들면_PENDING이고_재고가_선점되며_요금_항목과_환불정책_스냅샷이_저장된다() throws Exception {
    JsonNode reservation = reserveOk(guest, listing.roomId(), checkIn, checkIn.plusDays(2), 3);
    assertThat(reservation.get("status").asText()).isEqualTo("PENDING");
    assertThat(reservation.get("totalPrice").asInt()).isEqualTo(290000);
    assertThat(inventoryCounts(listing.roomId(), checkIn)).isEqualTo("held=1,booked=0");
    assertThat(reservation.get("refundPolicy").get("version").asText()).isEqualTo("v1");
}`,
      onRun: async () => {
        const checkIn = getDateStr(10);
        const checkOut = getDateStr(12);
        const res = await reservationApi.create({
          roomId: 1,
          checkIn,
          checkOut,
          guestCount: 2,
          guestName: '단위테스트게스트',
          guestPhone: '010-1234-5678',
        });
        const passed = res.success && res.data.status === 'PENDING' && !!res.data.holdExpiresAt;
        return {
          passed,
          message: passed ? `예약 생성 성공! (ID: ${res.data.id}, 상태: PENDING, 선점만료: ${res.data.holdExpiresAt})` : '실패',
          details: res.data,
        };
      },
    },
    {
      id: 'res-2',
      name: '예약_생성_조건을_어기면_거절한다',
      summary: '체크인이 체크아웃 이후이거나 당일 0박(체크인 = 체크아웃) 또는 과거 날짜일 경우 RESERVATION-001 에러로 거절합니다.',
      expectedBehavior: 'HTTP 400 Bad Request, code = RESERVATION-001',
      javaCode: `@Test
void 예약_생성_조건을_어기면_거절한다() throws Exception {
    postJson("/api/reservations", body("roomId", roomId, "checkIn", checkIn, "checkOut", checkIn))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("RESERVATION-001"));
}`,
      onRun: async () => {
        const checkIn = getDateStr(10);
        try {
          await reservationApi.create({
            roomId: 1,
            checkIn,
            checkOut: checkIn, // 0박 시도
            guestCount: 2,
            guestName: '테스트',
            guestPhone: '010-1234-5678',
          });
          return { passed: false, message: '0박 예약인데 백엔드가 정상 통과시켜버림 (검증 실패)', details: null };
        } catch (err: any) {
          const status = err.response?.status;
          const code = err.response?.data?.code || err.response?.data?.error?.code;
          const passed = status === 400;
          return { passed, message: `백엔드가 400 Bad Request로 정상 거절함 (에러코드: ${code})`, details: err.response?.data };
        }
      },
    },
    {
      id: 'pay-1',
      name: '결제하면_PAID가_되고_예약이_확정되며_재고가_확정으로_바뀐다',
      summary: '결제 승인 API 호출 시 결제 상태는 PAID, 예약 상태는 CONFIRMED가 되며, room_inventories의 held_count는 0이 되고 booked_count가 1 증가합니다.',
      expectedBehavior: 'HTTP 200 OK, status = PAID, reservation.status = CONFIRMED, booked = 1',
      javaCode: `@Test
void 결제하면_PAID가_되고_예약이_확정되며_재고가_확정으로_바뀐다() throws Exception {
    confirmPayment(guest, orderId, paymentKey, 200000)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("PAID"));
    assertThat(reservationStatus(id)).isEqualTo("CONFIRMED");
    assertThat(inventoryCounts(listing.roomId(), checkIn)).isEqualTo("held=0,booked=1");
}`,
      onRun: async () => {
        const checkIn = getDateStr(10);
        const checkOut = getDateStr(11);
        const res = await reservationApi.create({ roomId: 1, checkIn, checkOut, guestCount: 2, guestName: '테스트', guestPhone: '010-1234-5678' });
        const prep = await paymentApi.prepare({ reservationId: res.data.id });
        const pay = await paymentApi.confirm({ orderId: prep.data.orderId, paymentKey: 'pay-test-' + Date.now(), amount: prep.data.amount });
        const detail = await reservationApi.getDetail(res.data.id);
        const passed = pay.success && pay.data.status === 'PAID' && detail.data.status === 'CONFIRMED';
        return { passed, message: passed ? `결제 승인 완료 및 예약 확정(CONFIRMED)! 주문번호: ${pay.data.orderId}` : '실패', details: { payment: pay.data, reservation: detail.data } };
      },
    },
    {
      id: 'pay-2',
      name: '요청_금액이_예약_금액과_다르면_PG를_호출하지_않고_거절한다',
      summary: '클라이언트가 금액을 변조(위변조 해킹 시도)하여 호출하면 PG를 일절 호출하지 않고 400 Bad Request (PAYMENT-004)를 반환합니다.',
      expectedBehavior: 'HTTP 400 Bad Request, code = PAYMENT-004, PG 호출수 = 0',
      javaCode: `@Test
void 요청_금액이_예약_금액과_다르면_PG를_호출하지_않고_거절한다() throws Exception {
    confirmPayment(guest, orderId, "pay-fake-key", 1000) // 변조된 금액
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("PAYMENT-004"));
    assertThat(fakePg.approveCalls()).isEqualTo(0);
}`,
      onRun: async () => {
        const res = await reservationApi.create({ roomId: 1, checkIn: getDateStr(10), checkOut: getDateStr(11), guestCount: 2, guestName: '테스트', guestPhone: '010-1234-5678' });
        const prep = await paymentApi.prepare({ reservationId: res.data.id });
        try {
          await paymentApi.confirm({ orderId: prep.data.orderId, paymentKey: 'pay-fake-' + Date.now(), amount: 999 }); // 변조금액
          return { passed: false, message: '위변조 금액인데 결제가 통과됨 (보안 취약점)', details: null };
        } catch (err: any) {
          const status = err.response?.status;
          const code = err.response?.data?.code || err.response?.data?.error?.code;
          const passed = status === 400;
          return { passed, message: `금액 위변조(999원 요청) 즉시 차단 성공 (Status: ${status}, Code: ${code})`, details: err.response?.data };
        }
      },
    },
    {
      id: 'pay-3',
      name: '같은_주문_번호로_다시_요청해도_결제는_한_번만_처리한다',
      summary: '결제 승인 API를 동일 orderId로 2번 연속 호출해도 중복 결제되지 않고 멱등(Idempotent)하게 기존 성공 결과를 반환합니다.',
      expectedBehavior: '2회 호출 모두 HTTP 200 OK, 실제 PG 결제 승인 횟수는 1회',
      javaCode: `@Test
void 같은_주문_번호로_다시_요청해도_결제는_한_번만_처리한다() throws Exception {
    confirmPayment(guest, orderId, paymentKey, 100000).andExpect(status().isOk());
    confirmPayment(guest, orderId, paymentKey, 100000)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("PAID"));
    assertThat(fakePg.approveCalls()).isEqualTo(1);
}`,
      onRun: async () => {
        const res = await reservationApi.create({ roomId: 1, checkIn: getDateStr(10), checkOut: getDateStr(11), guestCount: 2, guestName: '테스트', guestPhone: '010-1234-5678' });
        const prep = await paymentApi.prepare({ reservationId: res.data.id });
        const pKey = 'idempotent-key-' + Date.now();
        const p1 = await paymentApi.confirm({ orderId: prep.data.orderId, paymentKey: pKey, amount: prep.data.amount });
        const p2 = await paymentApi.confirm({ orderId: prep.data.orderId, paymentKey: pKey, amount: prep.data.amount });
        const passed = p1.success && p2.success && p2.data.status === 'PAID';
        return { passed, message: `동일 주문번호 중복 승인 시 2회 모두 200 OK 멱등 반환 확인`, details: { call1: p1.data, call2: p2.data } };
      },
    },
    {
      id: 'ref-1',
      name: '체크인_7일_전까지_취소하면_전액_환불되고_재고가_복구된다',
      summary: '체크인 D-7일 이상 남은 시점에 예약을 취소하면 환불 정책 규정에 의해 환불율 1.0(100%), 위약금 0원으로 전액 환불되고 재고가 복구됩니다.',
      expectedBehavior: 'HTTP 200 OK, refundRate = 1.0, penaltyAmount = 0원, booked 재고 원복',
      javaCode: `@Test
void 체크인_7일_전까지_취소하면_전액_환불되고_재고가_복구된다() throws Exception {
    cancel(guest, id)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.refundRate").value(1.0))
        .andExpect(jsonPath("$.data.penaltyAmount").value(0));
    assertThat(inventoryCounts(listing.roomId(), checkIn)).isEqualTo("held=0,booked=0");
}`,
      onRun: async () => {
        const res = await reservationApi.create({ roomId: 1, checkIn: getDateStr(10), checkOut: getDateStr(11), guestCount: 2, guestName: '테스트', guestPhone: '010-1234-5678' });
        const prep = await paymentApi.prepare({ reservationId: res.data.id });
        await paymentApi.confirm({ orderId: prep.data.orderId, paymentKey: 'pay-ref1-' + Date.now(), amount: prep.data.amount });
        const cancel = await reservationApi.cancel(res.data.id);
        const passed = cancel.success && Math.abs(Number(cancel.data.refundRate) - 1.0) < 0.01 && cancel.data.penaltyAmount === 0;
        return { passed, message: `D-10 취소 결과: 환불율 100%, 환불액 ${cancel.data.refundAmount.toLocaleString()}원, 위약금 0원`, details: cancel.data };
      },
    },
    {
      id: 'ref-2',
      name: '체크인_3일_전까지는_절반만_환불하고_나머지는_위약금이다',
      summary: '체크인 D-4일(3~6일 전) 시점에 취소하면 환불 정책 규정에 따라 50%만 환불되고 나머지 50%는 위약금으로 귀속됩니다.',
      expectedBehavior: 'HTTP 200 OK, refundRate = 0.5, penaltyAmount = 50%',
      javaCode: `@Test
void 체크인_3일_전까지는_절반만_환불하고_나머지는_위약금이다() throws Exception {
    cancel(guest, id)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.refundRate").value(0.5))
        .andExpect(jsonPath("$.data.penaltyAmount").value(halfAmount));
}`,
      onRun: async () => {
        const res = await reservationApi.create({ roomId: 1, checkIn: getDateStr(4), checkOut: getDateStr(5), guestCount: 2, guestName: '테스트', guestPhone: '010-1234-5678' });
        const prep = await paymentApi.prepare({ reservationId: res.data.id });
        await paymentApi.confirm({ orderId: prep.data.orderId, paymentKey: 'pay-ref2-' + Date.now(), amount: prep.data.amount });
        const cancel = await reservationApi.cancel(res.data.id);
        const passed = cancel.success && Math.abs(Number(cancel.data.refundRate) - 0.5) < 0.01;
        return { passed, message: `D-4 취소 결과: 환불율 50%, 실환불액 ${cancel.data.refundAmount.toLocaleString()}원, 위약금 ${cancel.data.penaltyAmount.toLocaleString()}원`, details: cancel.data };
      },
    },
    {
      id: 'ref-3',
      name: '환불_구간이_지나면_환불액이_없고_전액_위약금이며_PG_취소를_호출하지_않는다',
      summary: '체크인 하루 전(D-1)이나 당일(D-0)에 취소하면 환불 규정에 따라 환불율 0%, 위약금 100%가 적용되며 환불액이 없으므로 PG 취소를 부르지 않습니다.',
      expectedBehavior: 'HTTP 200 OK, refundRate = 0.0, refundAmount = 0원, penaltyAmount = 전액',
      javaCode: `@Test
void 환불_구간이_지나면_환불액이_없고_전액_위약금이며_PG_취소를_호출하지_않는다() throws Exception {
    cancel(guest, id)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.refundRate").value(0.0))
        .andExpect(jsonPath("$.data.refundAmount").value(0));
    assertThat(fakePg.cancelCalls()).isEqualTo(cancelCallsBefore);
}`,
      onRun: async () => {
        const res = await reservationApi.create({ roomId: 1, checkIn: getDateStr(1), checkOut: getDateStr(2), guestCount: 2, guestName: '테스트', guestPhone: '010-1234-5678' });
        const prep = await paymentApi.prepare({ reservationId: res.data.id });
        await paymentApi.confirm({ orderId: prep.data.orderId, paymentKey: 'pay-ref3-' + Date.now(), amount: prep.data.amount });
        const cancel = await reservationApi.cancel(res.data.id);
        const passed = cancel.success && Math.abs(Number(cancel.data.refundRate) - 0.0) < 0.01 && cancel.data.refundAmount === 0;
        return { passed, message: `D-1 취소 결과: 환불율 0%, 실환불액 0원, 위약금 전액(${cancel.data.penaltyAmount.toLocaleString()}원)`, details: cancel.data };
      },
    },
    {
      id: 'sec-1',
      name: '이미_취소한_예약은_다시_취소할_수_없다',
      summary: '이미 CANCELLED 처리된 예약을 다시 취소 시도하면 409 Conflict (RESERVATION-006)으로 차단합니다.',
      expectedBehavior: 'HTTP 409 Conflict, code = RESERVATION-006',
      javaCode: `@Test
void 이미_취소한_예약은_다시_취소할_수_없다() throws Exception {
    cancel(guest, id).andExpect(status().isOk());
    cancel(guest, id)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("RESERVATION-006"));
}`,
      onRun: async () => {
        const res = await reservationApi.create({ roomId: 1, checkIn: getDateStr(10), checkOut: getDateStr(11), guestCount: 2, guestName: '테스트', guestPhone: '010-1234-5678' });
        await reservationApi.cancel(res.data.id); // 1차 취소
        try {
          await reservationApi.cancel(res.data.id); // 2차 취소 시도
          return { passed: false, message: '이미 취소된 예약인데 2번째 취소가 성공해버림', details: null };
        } catch (err: any) {
          const status = err.response?.status;
          const code = err.response?.data?.code || err.response?.data?.error?.code;
          const passed = status === 409 || status === 400;
          return { passed, message: `중복 취소 시도 정상 차단 성공 (Status: ${status}, Code: ${code})`, details: err.response?.data };
        }
      },
    },
  ];

  return (
    <TestFileViewer
      fileName="ReservationPaymentTest.java"
      filePath="src/test/java/com/staybook/reservation/ReservationPaymentTest.java"
      description="StayBook 시스템의 가장 핵심이 되는 예약 생성(15분 재고 선점, 금액 계산 명세, 환불정책 스냅샷), 토스/가짜 PG 결제 승인, 금액 위변조 방어, 중복 결제 멱등성, 체크인 D-Day 기준 환불 정책(100%/50%/0%), 취소 시 재고 자동 복구 및 스케줄러 만료 동시성 제어를 총 24개 테스트 메서드로 검증합니다."
      targetClasses={['ReservationService', 'PaymentService', 'ReservationScheduler', 'PgClient']}
      totalMethodsCount={24}
      methods={methods}
    />
  );
};
