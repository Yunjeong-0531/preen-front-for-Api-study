import React, { useState } from 'react';
import { reservationApi } from '../../api/reservationApi';
import { paymentApi } from '../../api/paymentApi';
import { useAuth } from '../../context/AuthContext';
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  Code2,
  Play,
  ShieldAlert,
  Calendar,
  CreditCard,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface TestCase {
  id: string;
  category: 'reservation' | 'payment' | 'refund' | 'security';
  title: string;
  summary: string;
  javaMethodName: string;
  javaCode: string;
  expectedBehavior: string;
  defaultParams: {
    roomId: number;
    daysBeforeCheckIn: number;
    stayNights: number;
    guestCount: number;
    tamperAmount?: number;
    isDuplicateCall?: boolean;
    useInvalidDate?: boolean;
  };
}

const TEST_CASES: TestCase[] = [
  {
    id: 'res-stock-hold',
    category: 'reservation',
    title: '예약 생성 시 15분 선점 및 요금 명세 스냅샷',
    summary: '정상 예약 시 status는 PENDING이 되고, inventory_holds에 레코드가 생기며, room_inventories의 held_count가 1 증가합니다.',
    javaMethodName: '예약을_만들면_PENDING이고_재고가_선점되며_요금_항목과_환불정책_스냅샷이_저장된다()',
    javaCode: `@Test
void 예약을_만들면_PENDING이고_재고가_선점되며_요금_항목과_환불정책_스냅샷이_저장된다() {
    JsonNode reservation = reserveOk(guest, roomId, checkIn, checkIn.plusDays(2), 2);
    assertThat(reservation.get("status").asText()).isEqualTo("PENDING");
    assertThat(inventoryCounts(roomId, checkIn)).isEqualTo("held=1,booked=0");
    assertThat(reservation.get("refundPolicy").get("version").asText()).isEqualTo("v1");
}`,
    expectedBehavior: 'HTTP 200 OK, status = PENDING, holdExpiresAt 발급 (15분 후)',
    defaultParams: { roomId: 1, daysBeforeCheckIn: 10, stayNights: 2, guestCount: 2 },
  },
  {
    id: 'res-invalid-date',
    category: 'reservation',
    title: '날짜 검증: 체크인 날짜가 체크아웃보다 늦거나 같으면 거부',
    summary: '체크인이 체크아웃 이후이거나 과거 날짜인 경우 예약 생성을 거절합니다.',
    javaMethodName: '예약_생성_조건을_어기면_거부한다()',
    javaCode: `@Test
void 예약_생성_조건을_어기면_거부한다() {
    // 체크인 = 체크아웃 (0박)
    postJson("/api/reservations", body("checkIn", checkIn, "checkOut", checkIn))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("RESERVATION-001"));
}`,
    expectedBehavior: 'HTTP 400 Bad Request (RESERVATION-001 에러코드 반환)',
    defaultParams: { roomId: 1, daysBeforeCheckIn: 10, stayNights: 0, guestCount: 2, useInvalidDate: true },
  },
  {
    id: 'pay-amount-mismatch',
    category: 'payment',
    title: '결제 위변조 방어: 요청 금액과 예약 금액 불일치 시 PG 차단',
    summary: '클라이언트가 금액을 임의로 조작(예: 15만원을 1,000원으로 변조)하여 승인을 요청하면 백엔드가 PG 승인 요청을 보내지 않고 즉시 거부합니다.',
    javaMethodName: '요청_금액이_예약_금액과_다르면_PG를_호출하지_않고_거부한다()',
    javaCode: `@Test
void 요청_금액이_예약_금액과_다르면_PG를_호출하지_않고_거부한다() {
    confirmPayment(guest, orderId, "pay-fake-key", 1000) // 1000원으로 변조
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("PAYMENT-004"));
    assertThat(fakePg.approveCalls()).isEqualTo(0); // PG 미호출 검증!
}`,
    expectedBehavior: 'HTTP 400 Bad Request (PAYMENT-004 또는 PAYMENT_AMOUNT_MISMATCH)',
    defaultParams: { roomId: 1, daysBeforeCheckIn: 10, stayNights: 1, guestCount: 2, tamperAmount: 1000 },
  },
  {
    id: 'pay-idempotency',
    category: 'payment',
    title: '결제 멱등성: 동일 주문번호로 중복 승인 요청 시 1회만 처리',
    summary: '네트워크 지연 등으로 사용자가 결제 버튼을 2번 연속 누르거나 중복 요청이 와도, 1회만 결제 승인하고 두 번째 요청은 기존 성공 결과를 반환합니다.',
    javaMethodName: '같은_주문_번호로_다시_요청해도_결제는_한_번만_처리한다()',
    javaCode: `@Test
void 같은_주문_번호로_다시_요청해도_결제는_한_번만_처리한다() {
    confirmPayment(guest, orderId, paymentKey, amount).andExpect(status().isOk());
    confirmPayment(guest, orderId, paymentKey, amount).andExpect(status().isOk());
    assertThat(fakePg.approveCalls()).isEqualTo(1); // 실제 PG 승인은 딱 1번만!
}`,
    expectedBehavior: '두 번째 호출도 HTTP 200 OK 반환 (중복 결제 방지 및 멱등성 보장)',
    defaultParams: { roomId: 1, daysBeforeCheckIn: 10, stayNights: 1, guestCount: 2, isDuplicateCall: true },
  },
  {
    id: 'pay-success',
    category: 'payment',
    title: '정상 결제 승인: PAID 및 CONFIRMED 확정 & 재고 이동',
    summary: '정상 승인 시 결제는 PAID, 예약은 CONFIRMED가 되며, room_inventories의 held_count는 줄어들고 booked_count가 1 증가합니다.',
    javaMethodName: '결제하면_PAID가_되고_예약이_확정되며_재고가_확정으로_바뀐다()',
    javaCode: `@Test
void 결제하면_PAID가_되고_예약이_확정되며_재고가_확정으로_바뀐다() {
    confirmPayment(guest, orderId, paymentKey, amount)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("PAID"));
    assertThat(reservationStatus(id)).isEqualTo("CONFIRMED");
    assertThat(inventoryCounts(roomId, checkIn)).isEqualTo("held=0,booked=1");
}`,
    expectedBehavior: 'HTTP 200 OK, status = PAID, 예약 상태 = CONFIRMED, held -> booked 이동',
    defaultParams: { roomId: 1, daysBeforeCheckIn: 10, stayNights: 1, guestCount: 2 },
  },
  {
    id: 'refund-7days',
    category: 'refund',
    title: '환불 정책: 체크인 7일 전 취소 시 100% 전액 환불',
    summary: '체크인 7일 전(D-7 이상) 취소하면 환불 정책 규정에 따라 위약금 0원, 환불율 1.0(100%)으로 전액 환불됩니다.',
    javaMethodName: '체크인_7일_전까지_취소하면_전액_환불되고_재고가_복구된다()',
    javaCode: `@Test
void 체크인_7일_전까지_취소하면_전액_환불되고_재고가_복구된다() {
    cancel(guest, id)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.refundRate").value(1.0))
        .andExpect(jsonPath("$.data.refundAmount").value(totalAmount))
        .andExpect(jsonPath("$.data.penaltyAmount").value(0));
    assertThat(inventoryCounts(roomId, checkIn)).isEqualTo("held=0,booked=0"); // 재고 복구!
}`,
    expectedBehavior: 'HTTP 200 OK, refundRate = 1.0, penaltyAmount = 0원, booked 재고 원복',
    defaultParams: { roomId: 1, daysBeforeCheckIn: 10, stayNights: 1, guestCount: 2 },
  },
  {
    id: 'refund-3days',
    category: 'refund',
    title: '환불 정책: 체크인 3~6일 전 취소 시 50% 부분 환불',
    summary: '체크인 3일~6일 전(D-3~D-6) 취소하면 환불율 0.5(50%)가 적용되며 나머지는 위약금으로 공제됩니다.',
    javaMethodName: '체크인_3일_전까지는_절반만_환불하고_나머지는_위약금이다()',
    javaCode: `@Test
void 체크인_3일_전까지는_절반만_환불하고_나머지는_위약금이다() {
    cancel(guest, id)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.refundRate").value(0.5))
        .andExpect(jsonPath("$.data.refundAmount").value(halfAmount))
        .andExpect(jsonPath("$.data.penaltyAmount").value(halfAmount));
}`,
    expectedBehavior: 'HTTP 200 OK, refundRate = 0.5, 위약금 50% 차감 후 50% 환불',
    defaultParams: { roomId: 1, daysBeforeCheckIn: 4, stayNights: 1, guestCount: 2 },
  },
  {
    id: 'refund-1day',
    category: 'refund',
    title: '환불 정책: 체크인 1일 전 / 당일 취소 시 0% 환불 (전액 위약금)',
    summary: '체크인 하루 전(D-1)이나 당일(D-0)에 취소하면 환불율 0.0, 위약금 100%가 적용되며 불필요한 PG 취소 호출을 하지 않습니다.',
    javaMethodName: '환불_구간이_지나면_환불액이_없고_전액_위약금이며_PG_취소를_호출하지_않는다()',
    javaCode: `@Test
void 환불_구간이_지나면_환불액이_없고_전액_위약금이며_PG_취소를_호출하지_않는다() {
    cancel(guest, id)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.refundRate").value(0.0))
        .andExpect(jsonPath("$.data.refundAmount").value(0))
        .andExpect(jsonPath("$.data.penaltyAmount").value(totalAmount));
}`,
    expectedBehavior: 'HTTP 200 OK, refundRate = 0.0, refundAmount = 0원, penaltyAmount = 전액',
    defaultParams: { roomId: 1, daysBeforeCheckIn: 1, stayNights: 1, guestCount: 2 },
  },
  {
    id: 'cancel-already-cancelled',
    category: 'security',
    title: '상태 검증: 이미 취소된 예약 중복 취소 시도 차단',
    summary: '이미 CANCELLED 처리된 예약을 다시 취소하려고 하면 409 Conflict 에러로 방어합니다.',
    javaMethodName: '이미_취소한_예약은_다시_취소할_수_없다()',
    javaCode: `@Test
void 이미_취소한_예약은_다시_취소할_수_없다() {
    cancel(guest, id).andExpect(status().isOk());
    // 2번째 취소 시도
    cancel(guest, id)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("RESERVATION-006"));
}`,
    expectedBehavior: 'HTTP 409 Conflict (RESERVATION-006 / CANNOT_CANCEL_ALREADY_CANCELLED)',
    defaultParams: { roomId: 1, daysBeforeCheckIn: 10, stayNights: 1, guestCount: 2 },
  },
];

interface ExecutionLog {
  timestamp: string;
  testId: string;
  passed: boolean;
  message: string;
  details: any;
}

export const ReservationTestLabTab: React.FC = () => {
  const { isLoggedIn, user } = useAuth();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>({});
  const [testParams, setTestParams] = useState<Record<string, any>>({});
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);

  const toggleCode = (id: string) => {
    setExpandedCodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getParam = (test: TestCase, key: string, fallback: any) => {
    return testParams[test.id]?.[key] ?? test.defaultParams[key as keyof typeof test.defaultParams] ?? fallback;
  };

  const updateParam = (testId: string, key: string, value: any) => {
    setTestParams((prev) => ({
      ...prev,
      [testId]: {
        ...(prev[testId] || {}),
        [key]: value,
      },
    }));
  };

  const getDateStr = (plusDays: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + plusDays);
    return d.toISOString().split('T')[0];
  };

  // 테스트 실행 핸들러
  const runTest = async (tc: TestCase) => {
    if (!isLoggedIn) {
      alert('테스트를 실행하려면 먼저 로그인(게스트 계정)이 필요합니다.');
      return;
    }

    setRunningTestId(tc.id);
    const now = new Date().toLocaleTimeString();
    const roomId = getParam(tc, 'roomId', 1);
    const daysBefore = getParam(tc, 'daysBeforeCheckIn', 10);
    const nights = getParam(tc, 'stayNights', 1);
    const guestCount = getParam(tc, 'guestCount', 2);

    let checkIn = getDateStr(daysBefore);
    let checkOut = getDateStr(daysBefore + (tc.defaultParams.useInvalidDate ? 0 : nights));

    try {
      if (tc.id === 'res-stock-hold') {
        // 1. 예약 생성 및 선점 검증
        const res = await reservationApi.create({
          roomId,
          checkIn,
          checkOut,
          guestCount,
          guestName: user?.name || '테스트게스트',
          guestPhone: user?.phone || '010-1234-5678',
        });

        const passed = res.success && res.data?.status === 'PENDING' && !!res.data?.holdExpiresAt;
        addLog(now, tc.id, passed, passed ? `✅ PASSED! 예약 생성 완료 (ID: ${res.data.id}, 상태: PENDING, 선점만료: ${res.data.holdExpiresAt})` : '❌ FAILED', res.data);
      } else if (tc.id === 'res-invalid-date') {
        // 2. 날짜 검증 에러 유도
        try {
          await reservationApi.create({
            roomId,
            checkIn,
            checkOut: checkIn, // 체크인 = 체크아웃 (0박)
            guestCount,
            guestName: user?.name || '테스트게스트',
            guestPhone: user?.phone || '010-1234-5678',
          });
          addLog(now, tc.id, false, '❌ FAILED! 0박 예약인데 백엔드가 에러를 발생시키지 않았습니다.', null);
        } catch (err: any) {
          const status = err.response?.status;
          const code = err.response?.data?.code || err.response?.data?.error?.code;
          const passed = status === 400;
          addLog(now, tc.id, passed, passed ? `✅ PASSED! 백엔드가 정상 차단함 (Status: 400, Code: ${code})` : '❌ FAILED', err.response?.data);
        }
      } else if (tc.id === 'pay-amount-mismatch') {
        // 3. 결제 금액 변조 테스트
        const res = await reservationApi.create({
          roomId,
          checkIn,
          checkOut,
          guestCount,
          guestName: user?.name || '테스트게스트',
          guestPhone: user?.phone || '010-1234-5678',
        });
        const prep = await paymentApi.prepare({ reservationId: res.data.id });
        const tampered = tc.defaultParams.tamperAmount || 1000;

        try {
          await paymentApi.confirm({
            orderId: prep.data.orderId,
            paymentKey: 'fake_tamper_key_' + Date.now(),
            amount: tampered, // 변조된 금액!
          });
          addLog(now, tc.id, false, '❌ FAILED! 금액이 다른데 결제가 승인되었습니다 (보안 취약점)', null);
        } catch (err: any) {
          const status = err.response?.status;
          const code = err.response?.data?.code || err.response?.data?.error?.code;
          const passed = status === 400;
          addLog(now, tc.id, passed, passed ? `✅ PASSED! 위변조 금액 정상 차단 (Status: 400, 원래금액: ${prep.data.amount}원 != 요청: ${tampered}원)` : '❌ FAILED', err.response?.data);
        }
      } else if (tc.id === 'pay-idempotency') {
        // 4. 결제 중복 승인 멱등성 테스트
        const res = await reservationApi.create({
          roomId,
          checkIn,
          checkOut,
          guestCount,
          guestName: user?.name || '테스트게스트',
          guestPhone: user?.phone || '010-1234-5678',
        });
        const prep = await paymentApi.prepare({ reservationId: res.data.id });
        const pKey = 'fake_idempotent_key_' + Date.now();

        // 1차 결제
        const pay1 = await paymentApi.confirm({
          orderId: prep.data.orderId,
          paymentKey: pKey,
          amount: prep.data.amount,
        });

        // 2차 중복 결제 (동일 orderId, 동일 pKey)
        const pay2 = await paymentApi.confirm({
          orderId: prep.data.orderId,
          paymentKey: pKey,
          amount: prep.data.amount,
        });

        const passed = pay1.success && pay2.success && pay2.data?.status === 'PAID';
        addLog(now, tc.id, passed, passed ? `✅ PASSED! 동일 주문번호 2회 호출 모두 200 OK로 멱등 처리됨 (Status: PAID)` : '❌ FAILED', { pay1: pay1.data, pay2: pay2.data });
      } else if (tc.id === 'pay-success') {
        // 5. 정상 결제 및 CONFIRMED 확정
        const res = await reservationApi.create({
          roomId,
          checkIn,
          checkOut,
          guestCount,
          guestName: user?.name || '테스트게스트',
          guestPhone: user?.phone || '010-1234-5678',
        });
        const prep = await paymentApi.prepare({ reservationId: res.data.id });
        const pay = await paymentApi.confirm({
          orderId: prep.data.orderId,
          paymentKey: 'fake_success_key_' + Date.now(),
          amount: prep.data.amount,
        });

        const detail = await reservationApi.getDetail(res.data.id);
        const passed = pay.success && detail.data.status === 'CONFIRMED';
        addLog(now, tc.id, passed, passed ? `✅ PASSED! 결제 성공 및 예약 상태 CONFIRMED 확정 완료 (결제금액: ${pay.data.amount}원)` : '❌ FAILED', { payment: pay.data, reservation: detail.data });
      } else if (tc.id.startsWith('refund-')) {
        // 6, 7, 8: 환불 규정 D-Day 테스트
        const res = await reservationApi.create({
          roomId,
          checkIn,
          checkOut,
          guestCount,
          guestName: user?.name || '테스트게스트',
          guestPhone: user?.phone || '010-1234-5678',
        });
        const prep = await paymentApi.prepare({ reservationId: res.data.id });
        await paymentApi.confirm({
          orderId: prep.data.orderId,
          paymentKey: 'fake_refund_test_' + Date.now(),
          amount: prep.data.amount,
        });

        // 취소 요청
        const cancelRes = await reservationApi.cancel(res.data.id);
        const { refundRate, refundAmount, penaltyAmount } = cancelRes.data;

        let expectedRate = tc.id === 'refund-7days' ? 1.0 : tc.id === 'refund-3days' ? 0.5 : 0.0;
        const passed = cancelRes.success && Math.abs(Number(refundRate) - expectedRate) < 0.01;

        addLog(now, tc.id, passed, passed
          ? `✅ PASSED! D-${daysBefore} 환불율 일치! [환불율: ${Number(refundRate) * 100}%, 실환불: ${refundAmount.toLocaleString()}원, 위약금: ${penaltyAmount.toLocaleString()}원]`
          : `❌ FAILED! 기대 환불율(${expectedRate * 100}%)과 실제(${Number(refundRate) * 100}%) 불일치`, cancelRes.data);
      } else if (tc.id === 'cancel-already-cancelled') {
        // 9. 중복 취소 차단 검증
        const res = await reservationApi.create({
          roomId,
          checkIn,
          checkOut,
          guestCount,
          guestName: user?.name || '테스트게스트',
          guestPhone: user?.phone || '010-1234-5678',
        });
        // 1차 취소
        await reservationApi.cancel(res.data.id);

        // 2차 취소 시도
        try {
          await reservationApi.cancel(res.data.id);
          addLog(now, tc.id, false, '❌ FAILED! 이미 취소된 예약인데 2번째 취소가 성공해버렸습니다.', null);
        } catch (err: any) {
          const status = err.response?.status;
          const code = err.response?.data?.code || err.response?.data?.error?.code;
          const passed = status === 409 || status === 400;
          addLog(now, tc.id, passed, passed ? `✅ PASSED! 중복 취소 정상 차단됨 (Status: ${status}, Code: ${code})` : '❌ FAILED', err.response?.data);
        }
      }
    } catch (err: any) {
      addLog(now, tc.id, false, `❌ 실행 중 예외 발생: ${err.response?.data?.message || err.message}`, err.response?.data || err);
    } finally {
      setRunningTestId(null);
    }
  };

  const addLog = (time: string, testId: string, passed: boolean, message: string, details: any) => {
    setExecutionLogs((prev) => [
      { timestamp: time, testId, passed, message, details },
      ...prev.slice(0, 19), // 최근 20개 유지
    ]);
  };

  const filteredTests = TEST_CASES.filter((tc) => {
    if (filterCategory === 'all') return true;
    return tc.category === filterCategory;
  });

  return (
    <div className="tab-pane">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>🧪 예약·결제 단위 테스트 랩 (Reservation & Payment Test Lab)</h2>
          <p className="section-desc">
            백엔드 핵심 검증 코드인 <code>ReservationPaymentTest.java</code>의 테스트 시나리오를 읽고, 브라우저에서 <strong>직접 API를 호출해 Assertions를 실습·검증</strong>합니다.
          </p>
        </div>
      </div>

      {/* 카테고리 필터 탭 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: '전체 보기', icon: <FlaskConical size={15} /> },
          { id: 'reservation', label: '1. 예약 & 재고 선점', icon: <Calendar size={15} /> },
          { id: 'payment', label: '2. 결제 & 위변조 방어', icon: <CreditCard size={15} /> },
          { id: 'refund', label: '3. 환불 정책 & D-Day', icon: <RotateCcw size={15} /> },
          { id: 'security', label: '4. 상태 전이 & 방어', icon: <ShieldAlert size={15} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`btn-sm ${filterCategory === tab.id ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setFilterCategory(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="grid-2col">
        {/* 좌측: 테스트 케이스 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredTests.map((tc) => {
            const isRunning = runningTestId === tc.id;
            const isCodeExpanded = !!expandedCodes[tc.id];

            return (
              <div
                key={tc.id}
                className="card"
                style={{
                  borderLeft: tc.category === 'payment' ? '4px solid #2563eb' : tc.category === 'refund' ? '4px solid #059669' : tc.category === 'security' ? '4px solid #dc2626' : '4px solid #0284c7',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <span className="badge badge-secondary" style={{ fontSize: '11px' }}>
                      {tc.category.toUpperCase()}
                    </span>
                    <h3 style={{ margin: '6px 0 4px 0', fontSize: '15px' }}>{tc.title}</h3>
                  </div>
                  <button
                    className="btn-primary-sm"
                    style={{ background: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                    onClick={() => runTest(tc)}
                    disabled={isRunning}
                  >
                    <Play size={13} fill="currentColor" /> {isRunning ? '실행 중...' : '실습 실행'}
                  </button>
                </div>

                <p style={{ fontSize: '13px', color: '#475569', margin: '8px 0' }}>
                  {tc.summary}
                </p>

                <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', fontSize: '12px', color: '#0f172a', marginBottom: '8px' }}>
                  <strong>기대 결과 (Assertion):</strong> {tc.expectedBehavior}
                </div>

                {/* 실습 파라미터 조절 바 */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', fontSize: '12px', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                  <span>Room ID:</span>
                  <input
                    type="number"
                    value={getParam(tc, 'roomId', 1)}
                    onChange={(e) => updateParam(tc.id, 'roomId', Number(e.target.value))}
                    style={{ width: '60px', padding: '2px 4px', fontSize: '12px' }}
                  />

                  {tc.defaultParams.daysBeforeCheckIn !== undefined && (
                    <>
                      <span>체크인 기준:</span>
                      <select
                        value={getParam(tc, 'daysBeforeCheckIn', tc.defaultParams.daysBeforeCheckIn)}
                        onChange={(e) => updateParam(tc.id, 'daysBeforeCheckIn', Number(e.target.value))}
                        style={{ padding: '2px 4px', fontSize: '12px' }}
                      >
                        <option value={10}>D-10 (7일 전 이상 / 100% 환불)</option>
                        <option value={4}>D-4 (3~6일 전 / 50% 환불)</option>
                        <option value={1}>D-1 (1일 전 / 당일 취소 불가 0%)</option>
                      </select>
                    </>
                  )}
                </div>

                {/* Java 테스트 코드 보기 토글 */}
                <div style={{ marginTop: '8px' }}>
                  <button
                    className="btn-ghost btn-sm"
                    style={{ padding: 0, fontSize: '11px', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => toggleCode(tc.id)}
                  >
                    <Code2 size={13} /> {isCodeExpanded ? 'Java 테스트 코드 닫기' : 'Java 원본 테스트 코드 보기'}
                    {isCodeExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {isCodeExpanded && (
                    <div style={{ marginTop: '8px', background: '#0f172a', color: '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '12px', overflowX: 'auto', fontFamily: 'monospace' }}>
                      <div style={{ color: '#38bdf8', marginBottom: '6px' }}>// ReservationPaymentTest.java: {tc.javaMethodName}</div>
                      <pre style={{ margin: 0 }}>{tc.javaCode}</pre>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 우측: 실시간 테스트 실행 결과 로그 */}
        <div>
          <div className="card" style={{ position: 'sticky', top: '80px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} color="#0284c7" /> 실시간 실습 실행 리포트
              </h3>
              {executionLogs.length > 0 && (
                <button className="btn-ghost btn-sm" onClick={() => setExecutionLogs([])}>
                  로그 지우기
                </button>
              )}
            </div>

            {executionLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8' }}>
                <FlaskConical size={36} style={{ margin: '0 auto 10px auto', display: 'block', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '13px' }}>
                  좌측 시나리오 카드에서 <strong>[실습 실행]</strong> 버튼을 누르면
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                  실제 API 응답과 테스트 Assertions 통과 여부가 여기에 즉시 표시됩니다.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '650px', overflowY: 'auto' }}>
                {executionLogs.map((log, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: log.passed ? '#f0fdf4' : '#fef2f2',
                      border: log.passed ? '1px solid #bbf7d0' : '1px solid #fecaca',
                      padding: '12px',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {log.passed ? (
                          <CheckCircle2 size={16} color="#16a34a" />
                        ) : (
                          <XCircle size={16} color="#dc2626" />
                        )}
                        <strong style={{ fontSize: '13px', color: log.passed ? '#15803d' : '#b91c1c' }}>
                          {log.passed ? 'TEST PASSED' : 'TEST FAILED'}
                        </strong>
                      </div>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{log.timestamp}</span>
                    </div>

                    <div style={{ margin: '8px 0', fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>
                      {log.message}
                    </div>

                    {log.details && (
                      <div style={{ background: '#ffffff', padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '11px', maxHeight: '180px', overflowY: 'auto' }}>
                        <pre style={{ margin: 0, fontFamily: 'monospace' }}>
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
