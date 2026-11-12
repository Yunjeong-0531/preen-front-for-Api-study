import React, { useEffect, useState } from 'react';
import { hostApi } from '../../api/hostApi';
import { accommodationApi } from '../../api/accommodationApi';
import { inventoryApi } from '../../api/inventoryApi';
import { useAuth } from '../../context/AuthContext';
import {
  AccommodationDetail,
  AmenityResponse,
  CategoryResponse,
  HostAccommodationSummary,
  HostBusinessResponse,
  InventoryResponse,
  ListingStatus,
  RefundRule,
  RegionResponse,
  ReservationResponse,
} from '../../api/types';
import { InventoryCalendar } from '../common/InventoryCalendar';

export const HostTab: React.FC = () => {
  const { user, updateAccessToken } = useAuth();

  // 1. 사업자 정보
  const [businessInfo, setBusinessInfo] = useState<HostBusinessResponse | null>(null);
  const [businessForm, setBusinessForm] = useState({
    businessName: '프린스테이',
    businessRegistrationNo: '123-45-67890',
  });

  // 메타데이터
  const [regions, setRegions] = useState<RegionResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [amenities, setAmenities] = useState<AmenityResponse[]>([]);

  // 2. 호스트 내 숙소 목록 (GET /api/host/accommodations)
  const [myAccommodations, setMyAccommodations] = useState<HostAccommodationSummary[]>([]);
  const [selectedAccId, setSelectedAccId] = useState<number | null>(null);
  const [selectedAccDetail, setSelectedAccDetail] = useState<AccommodationDetail | null>(null);

  // 숙소 등록 폼
  const [accForm, setAccForm] = useState({
    regionId: 1,
    categoryId: 1,
    name: '제주 바다빛 감성 펜션',
    description: '탁 트인 오션뷰와 자쿠지가 있는 최고급 힐링 숙소',
    address: '제주특별자치도 제주시 애월읍 애월해안로 100',
    checkInTime: '15:00:00',
    checkOutTime: '11:00:00',
    imageUrls: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    amenityIds: [1, 2],
  });

  // 3. 객실 등록 폼
  const [targetAccIdForRoom, setTargetAccIdForRoom] = useState<number>(1);
  const [roomForm, setRoomForm] = useState({
    name: '디럭스 오션뷰 룸',
    capacity: 2,
    maxCapacity: 4,
    nightlyPrice: 150000,
    extraPersonFee: 20000,
    imageUrls: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
  });
  const [createdRoomId, setCreatedRoomId] = useState<number | null>(null);

  // 4. 환불정책 폼
  const [targetAccIdForRefund, setTargetAccIdForRefund] = useState<number>(1);
  const [policyText, setPolicyText] = useState('체크인 7일 전 무료 취소, 3일 전 50%, 당일 취소 불가');
  const [rules, setRules] = useState<RefundRule[]>([
    { daysBefore: 7, refundRate: 1.0 },
    { daysBefore: 3, refundRate: 0.5 },
    { daysBefore: 0, refundRate: 0.0 },
  ]);

  // 5. 재고 설정 & 조회 (GET & PUT /api/host/rooms/{roomId}/inventories)
  const todayStr = new Date().toISOString().split('T')[0];
  const nextMonthStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [inventoryForm, setInventoryForm] = useState({
    roomId: 1,
    startDate: todayStr,
    endDate: nextMonthStr,
    totalCount: 5,
    price: 150000,
    closed: false,
  });
  const [roomInventories, setRoomInventories] = useState<InventoryResponse[]>([]);

  // 호스트 예약 목록
  const [hostReservations, setHostReservations] = useState<ReservationResponse[]>([]);

  // 리뷰 답글 폼
  const [replyReviewId, setReplyReviewId] = useState<number>(1);
  const [replyContent, setReplyContent] = useState('소중한 후기 감사드립니다! 다음에도 또 방문해 주세요 :)');

  const loadMetadata = async () => {
    try {
      const [regRes, catRes, ameRes] = await Promise.all([
        accommodationApi.getRegions(),
        accommodationApi.getCategories(),
        accommodationApi.getAmenities(),
      ]);
      if (regRes.success) {
        setRegions(regRes.data);
        if (regRes.data.length > 0) setAccForm((prev) => ({ ...prev, regionId: regRes.data[0].id }));
      }
      if (catRes.success) {
        setCategories(catRes.data);
        if (catRes.data.length > 0) setAccForm((prev) => ({ ...prev, categoryId: catRes.data[0].id }));
      }
      if (ameRes.success) setAmenities(ameRes.data);
    } catch (err: any) {
      console.warn('메타데이터 로드 실패', err);
    }
  };

  const loadMyBusiness = async () => {
    try {
      const res = await hostApi.getMyBusiness();
      if (res.success) setBusinessInfo(res.data);
    } catch {
      // 사업자 미등록일 수 있음
    }
  };

  // 내 숙소 목록 조회 (GET /api/host/accommodations)
  const loadMyAccommodations = async () => {
    try {
      const res = await hostApi.getMyAccommodations();
      if (res.success && res.data) {
        setMyAccommodations(res.data);
        if (res.data.length > 0 && !selectedAccId) {
          handleSelectAccommodation(res.data[0].id);
        }
      }
    } catch (err: any) {
      console.warn('내 숙소 목록 로드 실패', err);
    }
  };

  // 내 숙소 상세 조회 (GET /api/host/accommodations/{id})
  const handleSelectAccommodation = async (id: number) => {
    setSelectedAccId(id);
    setTargetAccIdForRoom(id);
    setTargetAccIdForRefund(id);
    try {
      const res = await hostApi.getMyAccommodationDetail(id);
      if (res.success && res.data) {
        setSelectedAccDetail(res.data);
        if (res.data.rooms && res.data.rooms.length > 0) {
          const firstRoomId = res.data.rooms[0].id;
          setInventoryForm((prev) => ({ ...prev, roomId: firstRoomId }));
          loadRoomInventories(firstRoomId, inventoryForm.startDate, inventoryForm.endDate);
        }
      }
    } catch (err: any) {
      alert('숙소 상세 조회 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  // 숙소 공개 상태 변경 (PATCH /api/host/accommodations/{id}/listing-status)
  const handleChangeListingStatus = async (id: number, nextStatus: ListingStatus) => {
    try {
      const res = await hostApi.changeListingStatus(id, nextStatus);
      if (res.success) {
        alert(`🎉 상태 변경 완료! [${res.data.listingStatus}]\n${res.data.listingStatus === 'LISTED' ? '이제 [숙소 탐색] 탭에서 게스트에게 노출됩니다.' : ''}`);
        loadMyAccommodations();
        handleSelectAccommodation(id);
      }
    } catch (err: any) {
      const errData = err.response?.data;
      const errMsg = errData?.message || errData?.code || err.message;
      alert(`상태 변경 실패 [${errData?.code || 'ERROR'}]:\n${errMsg}\n\n* 안내: 공개(LISTED)하려면 최소 1개 이상의 ACTIVE 객실과 환불 정책이 등록되어 있어야 합니다.`);
    }
  };

  // 객실 판매 상태(ACTIVE / INACTIVE) 변경 (PATCH /api/host/accommodations/{id}/rooms/{roomId})
  const handleToggleRoomStatus = async (roomId: number, currentStatus: 'ACTIVE' | 'INACTIVE') => {
    if (!selectedAccId) return;
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await hostApi.updateRoom(selectedAccId, roomId, { status: nextStatus });
      if (res.success) {
        alert(`객실 상태가 [${res.data.status}]로 변경되었습니다.`);
        handleSelectAccommodation(selectedAccId);
        loadMyAccommodations();
      }
    } catch (err: any) {
      const errData = err.response?.data;
      const errMsg = errData?.message || errData?.code || err.message;
      alert(`객실 상태 변경 실패 [${errData?.code || 'ERROR'}]:\n${errMsg}\n\n* 안내: 공개 중인 숙소의 마지막 ACTIVE 객실은 INACTIVE로 바꿀 수 없습니다.`);
    }
  };

  // 기간별 재고 조회 (GET /api/host/rooms/{roomId}/inventories)
  const loadRoomInventories = async (roomId: number, start: string, end: string) => {
    try {
      const res = await inventoryApi.getInventories(roomId, start, end);
      if (res.success && res.data) {
        setRoomInventories(res.data);
      }
    } catch (err: any) {
      console.warn('재고 조회 실패', err);
    }
  };

  const loadHostReservations = async () => {
    try {
      const res = await hostApi.getHostReservations();
      if (res.success) setHostReservations(res.data.content);
    } catch (err: any) {
      alert('호스트 예약 로드 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  useEffect(() => {
    loadMetadata();
    if (user?.role === 'HOST') {
      loadMyBusiness();
      loadMyAccommodations();
      loadHostReservations();
    }
  }, [user]);

  // 1. 사업자 등록
  const handleRegisterBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await hostApi.registerBusiness(businessForm);
      if (res.success && res.data) {
        setBusinessInfo(res.data.business);
        if (res.data.accessToken) {
          await updateAccessToken(res.data.accessToken);
        }
        alert('🎉 사업자 등록 성공! 호스트(HOST) 권한으로 즉시 전환되었습니다.');
        loadMyAccommodations();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.response?.data?.code || err.message;
      alert('사업자 등록 실패: ' + errMsg);
    }
  };

  // 2. 숙소 등록
  const handleCreateAccommodation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const imageUrls = accForm.imageUrls
        ? accForm.imageUrls.split('\n').map((s) => s.trim()).filter(Boolean)
        : [];
      const res = await hostApi.createAccommodation({
        ...accForm,
        imageUrls,
      });
      if (res.success && res.data) {
        alert(`🎉 숙소 등록 성공! [숙소 ID: ${res.data.id}, 상태: ${res.data.listingStatus}]\n객실과 환불정책을 등록하면 LISTED(공개)로 전환할 수 있습니다.`);
        loadMyAccommodations();
        handleSelectAccommodation(res.data.id);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.response?.data?.code || err.message;
      alert('숙소 등록 실패: ' + errMsg);
    }
  };

  // 3. 객실 등록
  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const imageUrls = roomForm.imageUrls
        ? roomForm.imageUrls.split('\n').map((s) => s.trim()).filter(Boolean)
        : [];
      const res = await hostApi.addRoom(targetAccIdForRoom, {
        ...roomForm,
        imageUrls,
      });
      if (res.success && res.data) {
        setCreatedRoomId(res.data.id);
        setInventoryForm((prev) => ({ ...prev, roomId: res.data.id }));
        alert(`🎉 객실 등록 성공! [Room ID: ${res.data.id}]\n재고 설정의 대상 객실 ID가 ${res.data.id}번으로 자동 설정되었습니다.`);
        loadMyAccommodations();
        if (selectedAccId) handleSelectAccommodation(selectedAccId);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.response?.data?.code || err.message;
      alert('객실 등록 실패: ' + errMsg);
    }
  };

  // 4. 환불 정책 PUT 전송
  const handlePutRefundPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rules.length === 0) {
      alert('환불 규칙을 최소 1개 이상 추가해 주세요.');
      return;
    }

    try {
      const payload = {
        policyText,
        rules: rules.map((r) => ({
          daysBefore: Number(r.daysBefore),
          refundRate: Number(Number(r.refundRate).toFixed(2)),
        })),
      };

      const res = await hostApi.putRefundPolicy(targetAccIdForRefund, payload);
      if (res.success && res.data) {
        alert(`🎉 환불 정책 반영 성공! (버전: ${res.data.version}, 정책ID: ${res.data.id})`);
        loadMyAccommodations();
        if (selectedAccId) handleSelectAccommodation(selectedAccId);
      }
    } catch (err: any) {
      const errData = err.response?.data;
      const errMsg = errData?.message || errData?.code || err.message;
      alert(`환불 정책 설정 실패 [${errData?.code || 'ERROR'}]:\n${errMsg}`);
    }
  };

  // 5. 재고/가격 설정
  const handleSetInventories = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await inventoryApi.setInventories(inventoryForm.roomId, {
        startDate: inventoryForm.startDate,
        endDate: inventoryForm.endDate,
        totalCount: inventoryForm.totalCount,
        price: inventoryForm.price,
        closed: inventoryForm.closed,
      });
      if (res.success) {
        alert(`🎉 성공! 총 ${res.data.length}개 일자의 객실 재고가 설정되었습니다.`);
        loadRoomInventories(inventoryForm.roomId, inventoryForm.startDate, inventoryForm.endDate);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.response?.data?.code || err.message;
      alert('재고 설정 실패: ' + errMsg);
    }
  };

  // 6. 호스트 리뷰 답글
  const handleReplyReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await hostApi.replyReview(replyReviewId, { reply: replyContent });
      if (res.success) {
        alert('호스트 답글 등록 완료!');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.response?.data?.code || err.message;
      alert('답글 등록 실패: ' + errMsg);
    }
  };

  const isHost = user?.role === 'HOST';

  return (
    <div className="tab-pane">
      <div className="section-header">
        <h2>🏨 호스트 관리 (신규 5개 API 연동: 숙소목록/상세/공개전환/기간별재고/객실판매상태)</h2>
        <p className="section-desc">
          내 숙소 목록(GET /api/host/accommodations), 내 숙소 상세(GET /api/host/accommodations/&#123;id&#125;), 공개 상태 변경(PATCH /listing-status), 기간별 재고 조회/설정(GET/PUT /inventories), 객실 판매 중지/수정을 검증합니다.
        </p>
      </div>

      {/* 사업자 등록 카드 */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 className="card-title">🏢 1단계: 사업자 등록 (POST /api/host-businesses)</h3>
        {businessInfo ? (
          <div className="alert alert-success">
            <strong>등록된 호스트 사업자 정보:</strong> {businessInfo.businessName} (사업자번호:{' '}
            {businessInfo.businessRegistrationNo}, 승인상태: {businessInfo.approvalStatus})
          </div>
        ) : (
          <form onSubmit={handleRegisterBusiness} className="form-inline-group">
            <div className="form-group" style={{ flex: 1 }}>
              <label>상호명</label>
              <input
                type="text"
                value={businessForm.businessName}
                onChange={(e) => setBusinessForm({ ...businessForm, businessName: e.target.value })}
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>사업자 등록번호</label>
              <input
                type="text"
                value={businessForm.businessRegistrationNo}
                onChange={(e) =>
                  setBusinessForm({ ...businessForm, businessRegistrationNo: e.target.value })
                }
                placeholder="10~20자 형식 (예: 123-45-67890)"
                required
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              style={{ alignSelf: 'flex-end', height: '40px' }}
            >
              사업자 등록 및 호스트 전환
            </button>
          </form>
        )}
      </div>

      {!isHost && (
        <div className="alert alert-warning" style={{ marginBottom: '20px' }}>
          ⚠️ 현재 회원은 <strong>HOST</strong> 권한이 아닙니다. 먼저 사업자 등록을 진행해 주세요.
        </div>
      )}

      {/* [신규 API 1] 내 숙소 목록 카드 (GET /api/host/accommodations) */}
      {isHost && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 className="card-title" style={{ margin: 0 }}>
              🏠 내 숙소 목록 (GET /api/host/accommodations) - 총 {myAccommodations.length}개
            </h3>
            <button className="btn-outline-sm" onClick={loadMyAccommodations}>
              새로고침
            </button>
          </div>

          {myAccommodations.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '13px' }}>
              아직 등록된 숙소가 없습니다. 아래 2단계에서 새 숙소를 등록해 보세요!
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '12px' }}>
              {myAccommodations.map((acc) => {
                const isSelected = selectedAccId === acc.id;
                return (
                  <div
                    key={acc.id}
                    onClick={() => handleSelectAccommodation(acc.id)}
                    style={{
                      border: isSelected ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong style={{ fontSize: '15px' }}>{acc.name}</strong>
                      <span className={`status-pill status-${acc.listingStatus.toLowerCase()}`}>
                        {acc.listingStatus}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      ID: #{acc.id} · {acc.categoryName} · {acc.regionName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
                      {acc.address}
                    </div>

                    <div style={{ marginTop: '8px', fontSize: '11px', display: 'flex', gap: '8px', color: '#475569' }}>
                      <span>🛏️ 객실: {acc.activeRoomCount}/{acc.roomCount}개</span>
                      <span>📜 환불정책: {acc.hasRefundPolicy ? '✅' : '❌'}</span>
                      <span>공개준비: {acc.readyToList ? '🟢 가능' : '🔴 불가'}</span>
                    </div>

                    {/* [신규 API 3] 공개 상태 변경 버튼 (PATCH /api/host/accommodations/{id}/listing-status) */}
                    <div style={{ marginTop: '10px', display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-outline-sm"
                        style={{ fontSize: '11px', padding: '2px 6px', backgroundColor: acc.listingStatus === 'DRAFT' ? '#e2e8f0' : 'transparent' }}
                        onClick={() => handleChangeListingStatus(acc.id, 'DRAFT')}
                      >
                        DRAFT
                      </button>
                      <button
                        className="btn-success"
                        style={{ fontSize: '11px', padding: '2px 6px' }}
                        disabled={acc.listingStatus === 'LISTED'}
                        onClick={() => handleChangeListingStatus(acc.id, 'LISTED')}
                        title={!acc.readyToList ? '판매 중인 객실과 환불정책이 있어야 합니다' : ''}
                      >
                        🌐 LISTED (공개)
                      </button>
                      <button
                        className="btn-danger"
                        style={{ fontSize: '11px', padding: '2px 6px' }}
                        disabled={acc.listingStatus === 'HIDDEN'}
                        onClick={() => handleChangeListingStatus(acc.id, 'HIDDEN')}
                      >
                        🔒 HIDDEN (숨김)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* [신규 API 2] 선택된 내 숙소 상세 보기 (GET /api/host/accommodations/{id}) */}
      {selectedAccDetail && (
        <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 className="card-title" style={{ margin: 0 }}>
                🔍 [선택된 숙소 상세] #{selectedAccDetail.id} {selectedAccDetail.name}
              </h3>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                체크인: {selectedAccDetail.checkInTime} ~ 체크아웃: {selectedAccDetail.checkOutTime} | 공개상태: <strong>{selectedAccDetail.listingStatus}</strong>
              </div>
            </div>
            <button className="btn-outline-sm" onClick={() => handleSelectAccommodation(selectedAccDetail.id)}>
              상세 새로고침
            </button>
          </div>

          {/* 객실 목록 & [신규 API 5] 객실 판매 상태(ACTIVE / INACTIVE) 변경 */}
          <div style={{ marginTop: '14px' }}>
            <h4 style={{ fontSize: '13px', color: '#334155' }}>
              🛏️ 등록된 객실 목록 ({selectedAccDetail.rooms?.length || 0}개) - 판매 상태 변경 (PATCH /rooms/&#123;roomId&#125;)
            </h4>
            {selectedAccDetail.rooms?.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>등록된 객실이 없습니다. 아래 3단계에서 객실을 추가하세요.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                {selectedAccDetail.rooms.map((room) => {
                  const isActive = room.status === 'ACTIVE';
                  return (
                    <div
                      key={room.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: '#f8fafc',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div>
                        <strong>{room.name}</strong> (Room ID: #{room.id}) | 기준 {room.capacity}명 / 최대 {room.maxCapacity}명 | 1박 {room.nightlyPrice.toLocaleString()}원
                        <span className={`status-pill status-${isActive ? 'confirmed' : 'cancelled'}`} style={{ marginLeft: '8px' }}>
                          {room.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn-outline-sm"
                          onClick={() => {
                            setInventoryForm((prev) => ({ ...prev, roomId: room.id }));
                            loadRoomInventories(room.id, inventoryForm.startDate, inventoryForm.endDate);
                          }}
                        >
                          📅 재고 조회/설정
                        </button>
                        <button
                          type="button"
                          className={isActive ? 'btn-danger btn-sm' : 'btn-success btn-sm'}
                          onClick={() => handleToggleRoomStatus(room.id, room.status)}
                        >
                          {isActive ? '판매 중지 (INACTIVE)' : '판매 재개 (ACTIVE)'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid-2col">
        {/* 2단계: 숙소 신규 등록 */}
        <div className="card">
          <h3 className="card-title">🏡 2단계: 새 숙소 등록 (POST /api/host/accommodations)</h3>
          <form onSubmit={handleCreateAccommodation} className="form-stack">
            <div className="grid-2col">
              <div className="form-group">
                <label>지역 선택</label>
                <select
                  value={accForm.regionId}
                  onChange={(e) => setAccForm({ ...accForm, regionId: Number(e.target.value) })}
                >
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>카테고리 선택</label>
                <select
                  value={accForm.categoryId}
                  onChange={(e) => setAccForm({ ...accForm, categoryId: Number(e.target.value) })}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>숙소명</label>
              <input
                type="text"
                value={accForm.name}
                onChange={(e) => setAccForm({ ...accForm, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>주소</label>
              <input
                type="text"
                value={accForm.address}
                onChange={(e) => setAccForm({ ...accForm, address: e.target.value })}
                required
              />
            </div>

            <div className="grid-2col">
              <div className="form-group">
                <label>체크인 시간</label>
                <input
                  type="text"
                  value={accForm.checkInTime}
                  onChange={(e) => setAccForm({ ...accForm, checkInTime: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>체크아웃 시간</label>
                <input
                  type="text"
                  value={accForm.checkOutTime}
                  onChange={(e) => setAccForm({ ...accForm, checkOutTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>설명</label>
              <textarea
                value={accForm.description}
                onChange={(e) => setAccForm({ ...accForm, description: e.target.value })}
                rows={2}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={!isHost}>
              숙소 등록하기 (생성 시 DRAFT 상태)
            </button>
          </form>
        </div>

        {/* 3단계: 객실 등록 */}
        <div className="card">
          <h3 className="card-title">🛏️ 3단계: 객실 추가 (POST /api/host/accommodations/&#123;id&#125;/rooms)</h3>
          <form onSubmit={handleAddRoom} className="form-stack">
            <div className="form-group">
              <label>대상 숙소 ID</label>
              <input
                type="number"
                value={targetAccIdForRoom}
                onChange={(e) => setTargetAccIdForRoom(Number(e.target.value))}
                required
              />
            </div>

            <div className="form-group">
              <label>객실명</label>
              <input
                type="text"
                value={roomForm.name}
                onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                required
              />
            </div>

            <div className="grid-2col">
              <div className="form-group">
                <label>기준 인원</label>
                <input
                  type="number"
                  value={roomForm.capacity}
                  onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })}
                  min={1}
                  required
                />
              </div>
              <div className="form-group">
                <label>최대 인원</label>
                <input
                  type="number"
                  value={roomForm.maxCapacity}
                  onChange={(e) => setRoomForm({ ...roomForm, maxCapacity: Number(e.target.value) })}
                  min={1}
                  required
                />
              </div>
            </div>

            <div className="grid-2col">
              <div className="form-group">
                <label>1박 기본 요금 (원)</label>
                <input
                  type="number"
                  value={roomForm.nightlyPrice}
                  onChange={(e) => setRoomForm({ ...roomForm, nightlyPrice: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="form-group">
                <label>추가 인원 요금 (원)</label>
                <input
                  type="number"
                  value={roomForm.extraPersonFee}
                  onChange={(e) => setRoomForm({ ...roomForm, extraPersonFee: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={!isHost}>
              객실 추가하기
            </button>
          </form>

          {createdRoomId && (
            <div className="alert alert-success" style={{ marginTop: '12px' }}>
              객실 생성 완료! Room ID: <strong>#{createdRoomId}</strong>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2col" style={{ marginTop: '20px' }}>
        {/* 4단계: 환불 정책 설정 */}
        <div className="card">
          <h3 className="card-title">📜 4단계: 환불 정책 설정 (PUT /api/host/accommodations/&#123;id&#125;/refund-policy)</h3>
          <form onSubmit={handlePutRefundPolicy} className="form-stack">
            <div className="form-group">
              <label>대상 숙소 ID</label>
              <input
                type="number"
                value={targetAccIdForRefund}
                onChange={(e) => setTargetAccIdForRefund(Number(e.target.value))}
                required
              />
            </div>
            <div className="form-group">
              <label>환불 정책 텍스트</label>
              <input
                type="text"
                value={policyText}
                onChange={(e) => setPolicyText(e.target.value)}
                required
              />
            </div>

            {/* 규칙 목록 */}
            <div className="form-group">
              <label>환불 규칙 (daysBefore 일수 & refundRate 비율 0~1)</label>
              {rules.map((rule, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                  <span>체크인</span>
                  <input
                    type="number"
                    value={rule.daysBefore}
                    onChange={(e) => {
                      const updated = [...rules];
                      updated[idx].daysBefore = Number(e.target.value);
                      setRules(updated);
                    }}
                    style={{ width: '70px' }}
                  />
                  <span>일 전까지:</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={rule.refundRate}
                    onChange={(e) => {
                      const updated = [...rules];
                      updated[idx].refundRate = Number(e.target.value);
                      setRules(updated);
                    }}
                    style={{ width: '80px' }}
                  />
                  <span>({Math.round(rule.refundRate * 100)}% 환불)</span>
                </div>
              ))}
            </div>

            <button type="submit" className="btn-primary" disabled={!isHost}>
              환불 정책 반영
            </button>
          </form>
        </div>

        {/* 5단계: [신규 API 4] 기간별 재고 조회 & 설정 (GET & PUT /api/host/rooms/{roomId}/inventories) */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title" style={{ margin: 0 }}>
              📅 5단계: 기간별 재고 조회 & 요금 설정
            </h3>
            <button
              className="btn-outline-sm"
              onClick={() => loadRoomInventories(inventoryForm.roomId, inventoryForm.startDate, inventoryForm.endDate)}
              disabled={!isHost}
            >
              재고 조회 (GET)
            </button>
          </div>

          <form onSubmit={handleSetInventories} className="form-stack" style={{ marginTop: '12px' }}>
            <div className="form-group">
              <label>대상 객실 ID (Room ID)</label>
              <input
                type="number"
                value={inventoryForm.roomId}
                onChange={(e) => setInventoryForm({ ...inventoryForm, roomId: Number(e.target.value) })}
                required
              />
            </div>
            <div className="grid-2col">
              <div className="form-group">
                <label>시작일</label>
                <input
                  type="date"
                  value={inventoryForm.startDate}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>종료일</label>
                <input
                  type="date"
                  value={inventoryForm.endDate}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, endDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid-2col">
              <div className="form-group">
                <label>총 수량</label>
                <input
                  type="number"
                  value={inventoryForm.totalCount}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, totalCount: Number(e.target.value) })}
                  min={1}
                />
              </div>
              <div className="form-group">
                <label>1박 가격 (원)</label>
                <input
                  type="number"
                  value={inventoryForm.price}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, price: Number(e.target.value) })}
                />
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={!isHost}>
              재고/요금 일괄 설정 (PUT)
            </button>
          </form>

          {/* 📅 인터랙티브 재고 달력 (월별 캘린더 뷰) */}
          <div style={{ marginTop: '16px' }}>
            <InventoryCalendar
              roomId={inventoryForm.roomId}
              inventories={roomInventories}
              onRefresh={(start, end) => {
                setInventoryForm((prev) => ({ ...prev, startDate: start, endDate: end }));
                loadRoomInventories(inventoryForm.roomId, start, end);
              }}
            />
          </div>
        </div>
      </div>

      {/* 호스트 전용 예약 목록 & 리뷰 답글 */}
      <div className="grid-2col" style={{ marginTop: '20px' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">📋 내 숙소 접수 예약 (GET /api/host/reservations)</h3>
            <button className="btn-outline-sm" onClick={loadHostReservations} disabled={!isHost}>
              새로고침
            </button>
          </div>
          {hostReservations.length === 0 ? (
            <p style={{ color: '#64748b' }}>접수된 예약이 없습니다.</p>
          ) : (
            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {hostReservations.map((r) => (
                <div key={r.id} className="reservation-item-box">
                  <div>
                    <strong>예약 #{r.id}</strong> ({r.reservationNo}) - <span className={`status-pill status-${r.status.toLowerCase()}`}>{r.status}</span>
                  </div>
                  <div>숙소: {r.accommodationName} | 객실: {r.roomName}</div>
                  <div>일정: {r.checkIn} ~ {r.checkOut} ({r.guestCount}명)</div>
                  <div>예약자: {r.guestName} ({r.guestPhone}) | 총 {r.totalPrice.toLocaleString()}원</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="card-title">💬 호스트 리뷰 답글 (POST /api/host/reviews/&#123;id&#125;/reply)</h3>
          <form onSubmit={handleReplyReview} className="form-stack">
            <div className="form-group">
              <label>답글을 달 리뷰 ID</label>
              <input
                type="number"
                value={replyReviewId}
                onChange={(e) => setReplyReviewId(Number(e.target.value))}
                required
              />
            </div>
            <div className="form-group">
              <label>답글 내용</label>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={3}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={!isHost}>
              답글 등록
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
