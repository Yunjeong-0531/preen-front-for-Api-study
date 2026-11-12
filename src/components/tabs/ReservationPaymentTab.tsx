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
import {
  openTossPaymentWindow,
  getTossClientKey,
  setTossClientKey,
  DEFAULT_TOSS_CLIENT_KEY,
} from '../../utils/tossPayments';
import { ExternalLink, CreditCard, CheckCircle2, AlertCircle, RefreshCw, KeyRound, Sparkles } from 'lucide-react';

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
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // 토스 클라이언트 키 설정
  const [clientKeyInput, setClientKeyInput] = useState<string>(getTossClientKey());
  const [showKeyConfig, setShowKeyConfig] = useState(false);

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

  // 토스 리다이렉트 콜백 자동 감지 (결제 승인 자동 완료)
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const tossStatus = query.get('toss_status');
    const paymentKeyParam = query.get('paymentKey');
    const orderIdParam = query.get('orderId');
    const amountParam = query.get('amount');

    if (tossStatus === 'success' && paymentKeyParam && orderIdParam && amountParam) {
      window.history.replaceState({}, document.title, window.location.pathname);
      handleAutoConfirm(orderIdParam, paymentKeyParam, Number(amountParam));
    } else if (tossStatus === 'fail') {
      const errorMsg = query.get('message') || '결제에 실패하였거나 사용자가 취소했습니다.';
      alert('토스 결제 실패: ' + errorMsg);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleAutoConfirm = async (orderId: string, pKey: string, amount: number) => {
    setIsProcessingPayment(true);
    try {
      const res = await paymentApi.confirm({
        orderId,
        paymentKey: pKey,
        amount,
      });
      if (res.success && res.data) {
        setPaidResult(res.data);
        alert(`🎉 토스 결제 승인 성공!\n주문번호: ${res.data.orderId}\n결제금액: ${res.data.amount.toLocaleString()}원\n상태: CONFIRMED (예약확정)`);
        loadMyReservations();
        if (res.data.reservationId) {
          handleSelectReservation(res.data.reservationId);
        }
      }
    } catch (err: any) {
      alert('토스 결제 승인 실패: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsProcessingPayment(false);
    }
  };

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
        alert(`예약이 생성되었습니다! [ID: ${res.data.id}, 상태: ${res.data.status}]. 15분 내에 결제를 완료해 주세요.`);
        setSelectedReservation(res.data);
        setPrepareResult(null);
        setPaidResult(null);
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
  const handlePreparePayment = async (): Promise<PaymentPrepareResponse | null> => {
    if (!selectedReservation) return null;
    try {
      const res = await paymentApi.prepare({ reservationId: selectedReservation.id });
      if (res.success && res.data) {
        setPrepareResult(res.data);
        setPaymentKey('test_payment_key_' + Math.floor(Math.random() * 100000));
        return res.data;
      }
    } catch (err: any) {
      alert('결제 준비 실패: ' + (err.response?.data?.message || err.message));
    }
    return null;
  };

  // 4-A. 토스 결제창 열기 (공식 SDK 팝업)
  const handleOpenTossPayment = async () => {
    if (!selectedReservation) return;

    // 결제 준비가 아직 안 되었다면 먼저 orderId 발급
    let prep = prepareResult;
    if (!prep) {
      prep = await handlePreparePayment();
      if (!prep) return;
    }

    try {
      await openTossPaymentWindow({
        orderId: prep.orderId,
        orderName: `${selectedReservation.accommodationName || '숙소'} - ${selectedReservation.roomName || '객실'}`,
        amount: prep.amount,
        customerName: selectedReservation.guestName || user?.name || '게스트',
      });
    } catch (err: any) {
      if (err.code !== 'USER_CANCEL') {
        alert('토스 결제창 호출 에러: ' + (err.message || err));
      }
    }
  };

  // 4-B. 결제 승인 직접 요청 (Fake PG 또는 수동 결제키 승인)
  const handleConfirmPayment = async () => {
    if (!prepareResult || !selectedReservation) return;
    setIsProcessingPayment(true);
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
    } finally {
      setIsProcessingPayment(false);
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

  const handleSaveClientKey = () => {
    setTossClientKey(clientKeyInput);
    alert('토스 클라이언트 키가 저장되었습니다.');
  };

  const handleResetClientKey = () => {
    setClientKeyInput(DEFAULT_TOSS_CLIENT_KEY);
    setTossClientKey(DEFAULT_TOSS_CLIENT_KEY);
    alert('토스 기본 테스트 클라이언트 키로 재설정되었습니다.');
  };

  return (
    <div className="tab-pane">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>💳 예약 & 토스 결제 사이클 (선점 → 토스 결제창 → 승인 → 확정 → 환불)</h2>
          <p className="section-desc">
            예약 생성(POST /api/reservations) $\rightarrow$ 결제 준비(POST /api/payments/prepare) $\rightarrow$ <strong>토스 결제창 SDK</strong> $\rightarrow$ 승인(POST /api/payments/confirm) $\rightarrow$ 취소/환불(POST /api/reservations/&#123;id&#125;/cancel)을 검증합니다.
          </p>
        </div>
        <button
          className="btn-outline-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          onClick={() => setShowKeyConfig(!showKeyConfig)}
        >
          <KeyRound size={14} /> 토스 키 설정 {showKeyConfig ? '▲' : '▼'}
        </button>
      </div>

      {/* 토스 클라이언트 키 설정 패널 */}
      {showKeyConfig && (
        <div className="card" style={{ marginBottom: '16px', background: '#f8fafc', border: '1px solid #cbd5e1' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <KeyRound size={15} color="#0284c7" /> 토스페이먼츠 클라이언트 키 설정 (Client Key)
          </h4>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px 0' }}>
            토스 개발자 센터의 테스트 클라이언트 키(기본값 제공)입니다. 백엔드(.env)에 매칭되는 시크릿 키(PG_SECRET_KEY)가 등록되어 있어야 최종 승인이 완료됩니다.
          </p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={clientKeyInput}
              onChange={(e) => setClientKeyInput(e.target.value)}
              style={{ flex: 1, padding: '6px 10px', fontSize: '12px', fontFamily: 'monospace' }}
            />
            <button className="btn-primary-sm" onClick={handleSaveClientKey}>저장</button>
            <button className="btn-outline-sm" onClick={handleResetClientKey}>기본값 복원</button>
          </div>
        </div>
      )}

      <div className="grid-2col">
        {/* 예약 생성 폼 */}
        <div className="card">
          <h3 className="card-title">📝 1단계: 새 예약 생성 (POST /api/reservations)</h3>
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
                * 호스트 탭 또는 탐색 탭에서 생성된 객실 ID를 입력하세요.
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
              {isLoggedIn ? '예약 신청하기 (재고 15분 선점)' : '로그인 필요'}
            </button>
          </form>
        </div>

        {/* 내 예약 목록 */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">📑 내 예약 내역 (GET /api/reservations/me)</h3>
            <button className="btn-outline-sm" onClick={loadMyReservations} disabled={!isLoggedIn}>
              <RefreshCw size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> 새로고침
            </button>
          </div>

          {!isLoggedIn ? (
            <p style={{ color: '#64748b' }}>로그인 후 내 예약 목록을 확인할 수 있습니다.</p>
          ) : myReservations.length === 0 ? (
            <p style={{ color: '#64748b' }}>아직 등록된 예약이 없습니다. 좌측에서 예약을 생성해 보세요.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto' }}>
              {myReservations.map((res) => {
                const isSelected = selectedReservation?.id === res.id;
                return (
                  <div
                    key={res.id}
                    onClick={() => handleSelectReservation(res.id)}
                    className={`reservation-item-box ${isSelected ? 'selected' : ''}`}
                    style={{ cursor: 'pointer', padding: '10px', border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0', borderRadius: '6px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>
                        예약 #{res.id} ({res.reservationNo})
                      </strong>
                      <span className={`status-pill status-${res.status.toLowerCase()}`}>
                        {res.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                      {res.accommodationName} - {res.roomName}
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      {res.checkIn} ~ {res.checkOut} ({res.guestCount}명) |{' '}
                      <strong style={{ color: '#0f172a' }}>{res.totalPrice.toLocaleString()}원</strong>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 className="card-title" style={{ marginBottom: '4px' }}>
                🔍 예약 상세 (ID: {selectedReservation.id} / 주문: {selectedReservation.reservationNo})
              </h3>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                현재 예약 상태:{' '}
                <span className={`status-pill status-${selectedReservation.status.toLowerCase()}`}>
                  {selectedReservation.status}
                </span>
                {selectedReservation.holdExpiresAt && selectedReservation.status === 'PENDING' && (
                  <span style={{ marginLeft: '8px', color: '#d97706', fontWeight: 500 }}>
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
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '2px 0' }}>
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
            <div className="payment-flow-box" style={{ marginTop: '16px', padding: '16px', border: '1px solid #bfdbfe', background: '#eff6ff', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={20} color="#2563eb" />
                <h4 style={{ margin: 0, color: '#1e40af' }}>토스페이먼츠 결제 연동 테스트 (PG Flow)</h4>
              </div>
              <p style={{ fontSize: '13px', color: '#334155', margin: '8px 0 16px 0' }}>
                1단계: <code>/api/payments/prepare</code>를 호출해 고유 orderId를 발급받은 뒤, 
                <strong> 토스페이먼츠 공식 결제창</strong>을 띄워 테스트 카드로 결제하거나, <strong>모의 승인</strong>으로 즉시 완료할 수 있습니다.
              </p>

              {/* 결제 준비 버튼 영역 */}
              {!prepareResult ? (
                <div>
                  <button className="btn-primary" onClick={handlePreparePayment}>
                    1단계: 결제 준비 (order_id 발급)
                  </button>
                </div>
              ) : (
                <div style={{ background: '#ffffff', padding: '14px', borderRadius: '6px', border: '1px solid #dbeafe' }}>
                  <div style={{ marginBottom: '12px', fontSize: '13px', color: '#0f172a' }}>
                    발급된 주문번호: <strong style={{ color: '#2563eb' }}>{prepareResult.orderId}</strong> | 결제금액: <strong>{prepareResult.amount.toLocaleString()}원</strong>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* 2-A: 토스 공식 결제창 열기 */}
                    <button
                      className="btn-primary"
                      style={{ background: '#0064FF', display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', fontWeight: 600 }}
                      onClick={handleOpenTossPayment}
                    >
                      <Sparkles size={16} /> 🚀 토스페이먼츠 결제창 열기 (공식 SDK 팝업)
                    </button>

                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>또는</span>

                    {/* 2-B: 모의 결제 승인 (Fake PG / 빠른 테스트) */}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={paymentKey}
                        onChange={(e) => setPaymentKey(e.target.value)}
                        placeholder="임의의 PaymentKey"
                        style={{ padding: '6px 10px', fontSize: '12px', width: '210px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      />
                      <button
                        className="btn-success"
                        onClick={handleConfirmPayment}
                        disabled={isProcessingPayment}
                        style={{ padding: '8px 14px' }}
                      >
                        {isProcessingPayment ? '승인 중...' : '🧪 모의 승인 완료'}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', padding: '10px', background: '#f8fafc', borderRadius: '6px', fontSize: '12px', color: '#64748b' }}>
                    💡 <strong>토스 결제창 테스트 팁</strong>:
                    <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                      <li>결제창에서 아무 카드나 선택 후 [다음] 클릭</li>
                      <li>생년월일(예: <code>900101</code>), 카드 비밀번호 앞 2자리(예: <code>12</code>) 아무거나 입력하면 테스트 승인됩니다.</li>
                      <li>실제 돈은 출금되지 않습니다!</li>
                    </ul>
                  </div>
                </div>
              )}

              {paidResult && (
                <div className="alert alert-success" style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={18} color="#16a34a" />
                  <div>
                    🎉 결제가 최종 승인되었습니다! 승인일시: {paidResult.paidAt}, 주문번호: {paidResult.orderId}
                  </div>
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
