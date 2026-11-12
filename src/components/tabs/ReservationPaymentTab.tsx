import React, { useEffect, useState } from 'react';
import { reservationApi } from '../../api/reservationApi';
import { paymentApi } from '../../api/paymentApi';
import {
  PaymentPrepareResponse,
  PaymentResponse,
  ReservationCancelResponse,
  ReservationResponse,
} from '../../api/types';
import { useAuth } from '../../context/AuthContext';

export const ReservationPaymentTab: React.FC = () => {
  const { isLoggedIn, user } = useAuth();

  // 예약 생성 폼
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [resForm, setResForm] = useState({
    roomId: 1,
    checkIn: tomorrow,
    checkOut: dayAfterTomorrow,
    guestCount: 2,
    guestName: user?.name || '홍길동',
    guestPhone: user?.phone || '010-1234-5678',
  });

  // 내 예약 목록
  const [myReservations, setMyReservations] = useState<ReservationResponse[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<ReservationResponse | null>(null);

  // 결제 관련 상태
  const [prepareResult, setPrepareResult] = useState<PaymentPrepareResponse | null>(null);
  const [paymentKey, setPaymentKey] = useState<string>('test_payment_key_' + Math.floor(Math.random() * 10000));
  const [paidResult, setPaidResult] = useState<PaymentResponse | null>(null);

  // 취소 결과
  const [cancelResult, setCancelResult] = useState<ReservationCancelResponse | null>(null);

  const loadMyReservations = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await reservationApi.getMine(0, 20);
      if (res.success && res.data) {
        setMyReservations(res.data.content);
        if (res.data.content.length > 0 && !selectedReservation) {
          setSelectedReservation(res.data.content[0]);
        }
      }
    } catch (err: any) {
      console.warn('예약 목록 로드 실패', err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadMyReservations();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (user) {
      setResForm((prev) => ({
        ...prev,
        guestName: user.name || prev.guestName,
        guestPhone: user.phone || prev.guestPhone,
      }));
    }
  }, [user]);

  // 1. 예약 생성
  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      alert('예약은 로그인이 필요합니다.');
      return;
    }
    try {
      const res = await reservationApi.create(resForm);
      if (res.success && res.data) {
        alert(`예약이 생성되었습니다! [ID: ${res.data.id}, 상태: ${res.data.status}]. 10분 내에 결제를 완료해 주세요.`);
        setSelectedReservation(res.data);
        loadMyReservations();
      }
    } catch (err: any) {
      alert('예약 생성 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  // 2. 예약 상세 새로고침
  const handleSelectReservation = async (id: number) => {
    try {
      const res = await reservationApi.getDetail(id);
      if (res.success && res.data) {
        setSelectedReservation(res.data);
        setPrepareResult(null);
        setPaidResult(null);
        setCancelResult(null);
      }
    } catch (err: any) {
      alert('예약 상세 조회 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  // 3. 결제 준비 (order_id 발급)
  const handlePreparePayment = async () => {
    if (!selectedReservation) return;
    try {
      const res = await paymentApi.prepare({ reservationId: selectedReservation.id });
      if (res.success && res.data) {
        setPrepareResult(res.data);
        setPaymentKey('fake_pg_key_' + Math.floor(Math.random() * 100000));
        alert('결제 준비 완료! 주문번호가 발급되었습니다: ' + res.data.orderId);
      }
    } catch (err: any) {
      alert('결제 준비 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  // 4. 결제 승인 (PG 확인 및 CONFIRMED)
  const handleConfirmPayment = async () => {
    if (!prepareResult || !selectedReservation) return;
    try {
      const res = await paymentApi.confirm({
        orderId: prepareResult.orderId,
        paymentKey,
        amount: prepareResult.amount,
      });
      if (res.success && res.data) {
        setPaidResult(res.data);
        alert('🎉 결제 성공 및 예약이 확정되었습니다! (상태: CONFIRMED)');
        handleSelectReservation(selectedReservation.id);
        loadMyReservations();
      }
    } catch (err: any) {
      alert('결제 승인 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  // 5. 예약 취소
  const handleCancelReservation = async () => {
    if (!selectedReservation) return;
    if (!confirm('정말 이 예약을 취소하시겠습니까? 환불 규정에 따라 환불액이 정산됩니다.')) return;
    try {
      const res = await reservationApi.cancel(selectedReservation.id);
      if (res.success && res.data) {
        setCancelResult(res.data);
        alert(`예약이 취소되었습니다. 환불액: ${res.data.refundAmount.toLocaleString()}원, 위약금: ${res.data.penaltyAmount.toLocaleString()}원`);
        setSelectedReservation(res.data.reservation);
        loadMyReservations();
      }
    } catch (err: any) {
      alert('예약 취소 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="tab-pane">
      <div className="section-header">
        <h2>💳 예약 & 결제 사이클 (선점 10분 → PG 결제승인 → 예약확정 → 취소/환불)</h2>
        <p className="section-desc">
          예약 생성(POST /api/reservations), 결제 준비(POST /api/payments/prepare), 결제 승인(POST /api/payments/confirm), 취소/환불(POST /api/reservations/&#123;id&#125;/cancel)을 검증합니다.
        </p>
      </div>

      <div className="grid-2col">
        {/* 예약 생성 폼 */}
        <div className="card">
          <h3 className="card-title">📝 새 예약 생성 (POST /api/reservations)</h3>
          <form onSubmit={handleCreateReservation} className="form-stack">
            <div className="form-group">
              <label>객실 ID (Room ID)</label>
              <input
                type="number"
                value={resForm.roomId}
                onChange={(e) => setResForm({ ...resForm, roomId: Number(e.target.value) })}
                required
              />
              <small style={{ color: '#64748b' }}>
                * 숙소 탐색 또는 호스트 탭에서 생성한 Room ID를 입력하세요.
              </small>
            </div>

            <div className="grid-2col">
              <div className="form-group">
                <label>체크인 날짜</label>
                <input
                  type="date"
                  value={resForm.checkIn}
                  onChange={(e) => setResForm({ ...resForm, checkIn: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>체크아웃 날짜</label>
                <input
                  type="date"
                  value={resForm.checkOut}
                  onChange={(e) => setResForm({ ...resForm, checkOut: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>숙박 인원</label>
              <input
                type="number"
                value={resForm.guestCount}
                onChange={(e) => setResForm({ ...resForm, guestCount: Number(e.target.value) })}
                min={1}
                required
              />
            </div>

            <div className="grid-2col">
              <div className="form-group">
                <label>예약자 성명</label>
                <input
                  type="text"
                  value={resForm.guestName}
                  onChange={(e) => setResForm({ ...resForm, guestName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>예약자 연락처</label>
                <input
                  type="text"
                  value={resForm.guestPhone}
                  onChange={(e) => setResForm({ ...resForm, guestPhone: e.target.value })}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={!isLoggedIn}>
              {isLoggedIn ? '예약 신청하기 (재고 10분 선점)' : '로그인 필요'}
            </button>
          </form>
        </div>

        {/* 내 예약 목록 */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">📑 내 예약 내역 (GET /api/reservations/me)</h3>
            <button className="btn-outline-sm" onClick={loadMyReservations} disabled={!isLoggedIn}>
              새로고침
            </button>
          </div>

          {!isLoggedIn ? (
            <p style={{ color: '#64748b' }}>로그인 후 내 예약 목록을 확인할 수 있습니다.</p>
          ) : myReservations.length === 0 ? (
            <p style={{ color: '#64748b' }}>아직 등록된 예약이 없습니다.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {myReservations.map((res) => {
                const isSelected = selectedReservation?.id === res.id;
                return (
                  <div
                    key={res.id}
                    onClick={() => handleSelectReservation(res.id)}
                    className={`reservation-item-box ${isSelected ? 'selected' : ''}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>
                        예약 #{res.id} ({res.reservationNo})
                      </strong>
                      <span className={`status-pill status-${res.status.toLowerCase()}`}>
                        {res.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {res.accommodationName} - {res.roomName}
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '2px' }}>
                      {res.checkIn} ~ {res.checkOut} ({res.guestCount}명) |{' '}
                      <strong>{res.totalPrice.toLocaleString()}원</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 선택된 예약 상세 및 결제 / 취소 패널 */}
      {selectedReservation && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 className="card-title" style={{ marginBottom: '4px' }}>
                🔍 예약 상세 (ID: {selectedReservation.id} / {selectedReservation.reservationNo})
              </h3>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                상태:{' '}
                <span className={`status-pill status-${selectedReservation.status.toLowerCase()}`}>
                  {selectedReservation.status}
                </span>
                {selectedReservation.holdExpiresAt && selectedReservation.status === 'PENDING' && (
                  <span style={{ marginLeft: '8px', color: '#d97706' }}>
                    ⏰ 선점 만료 시각: {selectedReservation.holdExpiresAt}
                  </span>
                )}
              </div>
            </div>
            <button
              className="btn-danger"
              onClick={handleCancelReservation}
              disabled={selectedReservation.status === 'CANCELLED'}
            >
              예약 취소 (POST /api/reservations/&#123;id&#125;/cancel)
            </button>
          </div>

          {/* 요금 항목 */}
          <div style={{ marginTop: '16px', background: '#f8fafc', padding: '12px', borderRadius: '6px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>💰 요금 계산 명세</h4>
            {selectedReservation.priceItems?.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>[{item.itemType}] {item.name}</span>
                <span>{item.amount.toLocaleString()}원</span>
              </div>
            ))}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 'bold',
                fontSize: '15px',
                borderTop: '1px solid #e2e8f0',
                marginTop: '8px',
                paddingTop: '8px',
                color: '#0f172a',
              }}
            >
              <span>총 결제 예정 금액</span>
              <span style={{ color: '#0284c7' }}>
                {selectedReservation.totalPrice.toLocaleString()}원
              </span>
            </div>
          </div>

          {/* 결제 진행 영역 (PENDING 상태일 때만) */}
          {selectedReservation.status === 'PENDING' && (
            <div className="payment-flow-box">
              <h4>💳 결제 승인 프로세스 (PG 연동 시뮬레이션)</h4>
              <p style={{ fontSize: '13px', color: '#475569', margin: '4px 0 12px 0' }}>
                1단계: <code>/api/payments/prepare</code>를 호출해 고유 orderId를 발급받은 뒤, 2단계: PG 승인 <code>/api/payments/confirm</code>을 요청합니다.
              </p>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={handlePreparePayment}>
                  1단계: 결제 준비 (order_id 발급)
                </button>

                {prepareResult && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#059669' }}>
                      orderId: <strong>{prepareResult.orderId}</strong> ({prepareResult.amount.toLocaleString()}원)
                    </span>
                    <input
                      type="text"
                      value={paymentKey}
                      onChange={(e) => setPaymentKey(e.target.value)}
                      placeholder="Payment Key"
                      style={{ padding: '4px 8px', fontSize: '12px', width: '200px' }}
                    />
                    <button className="btn-success" onClick={handleConfirmPayment}>
                      2단계: PG 결제 승인 완료
                    </button>
                  </div>
                )}
              </div>

              {paidResult && (
                <div className="alert alert-success" style={{ marginTop: '12px' }}>
                  🎉 결제가 승인되었습니다! 승인일시: {paidResult.paidAt}, 주문번호: {paidResult.orderId}
                </div>
              )}
            </div>
          )}

          {/* 취소 결과 표시 */}
          {cancelResult && (
            <div className="alert alert-warning" style={{ marginTop: '16px' }}>
              <h4>예약 취소 내역</h4>
              <div>적용 환불 비율: {cancelResult.refundRate ? `${Number(cancelResult.refundRate) * 100}%` : '해당없음'}</div>
              <div>실 환불 금액: <strong>{cancelResult.refundAmount.toLocaleString()}원</strong></div>
              <div>위약금: {cancelResult.penaltyAmount.toLocaleString()}원</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
