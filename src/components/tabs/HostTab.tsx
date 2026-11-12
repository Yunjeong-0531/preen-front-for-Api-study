import React, { useEffect, useState } from 'react';
import { hostApi } from '../../api/hostApi';
import { accommodationApi } from '../../api/accommodationApi';
import { inventoryApi } from '../../api/inventoryApi';
import { useAuth } from '../../context/AuthContext';
import {
  AccommodationDetail,
  AmenityResponse,
  CategoryResponse,
  HostBusinessResponse,
  RefundRule,
  RegionResponse,
  ReservationResponse,
} from '../../api/types';

export const HostTab: React.FC = () => {
  const { user, updateAccessToken } = useAuth();

  // 사업자 정보
  const [businessInfo, setBusinessInfo] = useState<HostBusinessResponse | null>(null);
  const [businessForm, setBusinessForm] = useState({
    businessName: '프린스테이',
    businessRegistrationNo: '123-45-67890',
  });

  // 메타데이터
  const [regions, setRegions] = useState<RegionResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [amenities, setAmenities] = useState<AmenityResponse[]>([]);

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
  const [createdAccommodation, setCreatedAccommodation] = useState<AccommodationDetail | null>(null);

  // 객실 등록 폼
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

  // 환불정책 폼
  const [targetAccIdForRefund, setTargetAccIdForRefund] = useState<number>(1);
  const [policyText, setPolicyText] = useState('체크인 7일 전 무료 취소, 3일 전 50%, 당일 취소 불가');
  const [rules, setRules] = useState<RefundRule[]>([
    { daysBefore: 7, refundRate: 1.0 },
    { daysBefore: 3, refundRate: 0.5 },
    { daysBefore: 0, refundRate: 0.0 },
  ]);
  const [refundStatusMsg, setRefundStatusMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // 재고 설정 폼
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

  // 호스트 내 숙소 목록
  const [myAccommodations, setMyAccommodations] = useState<AccommodationDetail[]>([]);

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

  const loadMyAccommodations = async () => {
    try {
      const res = await hostApi.getMyAccommodations();
      if (res.success && res.data) {
        setMyAccommodations(res.data);
      }
    } catch (err: any) {
      console.warn('내 숙소 목록 로드 실패', err);
    }
  };

  const handleToggleListingStatus = async (acc: AccommodationDetail) => {
    const nextStatus = acc.listingStatus === 'LISTED' ? 'UNLISTED' : 'LISTED';
    try {
      const res = await hostApi.updateAccommodation(acc.id, { listingStatus: nextStatus });
      if (res.success) {
        alert(`숙소 상태가 [${nextStatus}]로 변경되었습니다! ${nextStatus === 'LISTED' ? '이제 [숙소 탐색] 탭에서 게스트에게 노출됩니다.' : ''}`);
        loadMyAccommodations();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.response?.data?.code || err.message;
      alert(`상태 변경 실패: ${errMsg}\n\n* 안내: 공개(LISTED)하려면 최소 1개 이상의 객실과 환불 정책이 등록되어 있어야 합니다.`);
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
        setCreatedAccommodation(res.data);
        loadMyAccommodations();
        // 생성된 숙소 ID를 자동으로 다른 폼들에 동기화
        setTargetAccIdForRoom(res.data.id);
        setTargetAccIdForRefund(res.data.id);
        alert(`🎉 숙소 등록 성공! [숙소 ID: ${res.data.id}]\n객실 등록과 환불 정책 대상 숙소 ID가 ${res.data.id}번으로 자동 설정되었습니다.`);
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
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.response?.data?.code || err.message;
      alert('객실 등록 실패: ' + errMsg);
    }
  };

  // 4. 환불 규칙 편집
  const handleAddRule = () => {
    setRules([...rules, { daysBefore: 1, refundRate: 0.8 }]);
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleRuleChange = (index: number, field: 'daysBefore' | 'refundRate', value: number) => {
    const updated = [...rules];
    updated[index] = { ...updated[index], [field]: value };
    setRules(updated);
  };

  const applyTemplate = (type: 'standard' | 'strict' | 'flexible') => {
    if (type === 'standard') {
      setPolicyText('체크인 7일 전 100% 환불, 3일 전 50% 환불, 당일 취소 불가');
      setRules([
        { daysBefore: 7, refundRate: 1.0 },
        { daysBefore: 3, refundRate: 0.5 },
        { daysBefore: 0, refundRate: 0.0 },
      ]);
    } else if (type === 'strict') {
      setPolicyText('체크인 14일 전 100% 환불, 7일 전 50% 환불, 3일 전부터 환불 불가');
      setRules([
        { daysBefore: 14, refundRate: 1.0 },
        { daysBefore: 7, refundRate: 0.5 },
        { daysBefore: 3, refundRate: 0.0 },
      ]);
    } else {
      setPolicyText('체크인 1일 전까지 100% 전액 무료 취소');
      setRules([
        { daysBefore: 1, refundRate: 1.0 },
        { daysBefore: 0, refundRate: 0.0 },
      ]);
    }
  };

  // 4. 환불 정책 PUT 전송
  const handlePutRefundPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setRefundStatusMsg(null);

    if (rules.length === 0) {
      alert('환불 규칙을 최소 1개 이상 추가해 주세요.');
      return;
    }

    // 중복 daysBefore 검사
    const daysSet = new Set(rules.map((r) => r.daysBefore));
    if (daysSet.size !== rules.length) {
      alert('동일한 일수(daysBefore)를 가진 규칙이 중복되었습니다. 일수를 서로 다르게 설정해 주세요.');
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
        setRefundStatusMsg({
          text: `✅ 환불 정책 반영 성공! (버전: ${res.data.version}, 정책ID: ${res.data.id})`,
          error: false,
        });
        alert(`환불 정책이 성공적으로 반영되었습니다! (버전: ${res.data.version})`);
      }
    } catch (err: any) {
      const errData = err.response?.data;
      const errMsg = errData?.message || errData?.code || err.message;
      setRefundStatusMsg({
        text: `❌ 실패 [${errData?.code || 'ERROR'}]: ${errMsg}`,
        error: true,
      });
      alert(`환불 정책 설정 실패:\n[${errData?.code || 'ERROR'}] ${errMsg}\n\n* 안내: 본인이 등록한 숙소 ID인지 확인해 주세요.`);
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
        alert(`성공! 총 ${res.data.length}개 일자의 객실 재고가 설정되었습니다.`);
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
        <h2>🏨 호스트 관리 (사업자 & 숙소 & 객실 & 재고 & 예약 관리)</h2>
        <p className="section-desc">
          사업자 등록을 거쳐 HOST 권한을 얻고, 숙소 등록(POST /api/host/accommodations), 객실 등록, 환불정책 및 일자별 재고 설정을 수행합니다.
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
          ⚠️ 현재 회원은 <strong>HOST</strong> 권한이 아닙니다. 숙소/객실 등록 및 재고 설정을 수행하려면 위에서 사업자를 등록해 주세요.
        </div>
      )}

      {/* 내 숙소 목록 카드 */}
      {isHost && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 className="card-title" style={{ margin: 0 }}>
              🏠 내가 등록한 숙소 관리 목록 ({myAccommodations.length}개)
            </h3>
            <button className="btn-outline-sm" onClick={loadMyAccommodations}>
              목록 새로고침
            </button>
          </div>

          {myAccommodations.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '13px' }}>
              아직 등록된 숙소가 없습니다. 아래 2단계에서 새 숙소를 등록해 보세요!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {myAccommodations.map((acc) => {
                const isListed = acc.listingStatus === 'LISTED';
                const hasRooms = acc.rooms && acc.rooms.length > 0;
                const hasPolicy = !!acc.refundPolicy;

                return (
                  <div
                    key={acc.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '15px' }}>{acc.name}</strong>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>[숙소 ID: {acc.id}]</span>
                        <span className={`status-pill status-${isListed ? 'confirmed' : 'pending'}`}>
                          {acc.listingStatus} ({isListed ? '공개 중' : '비공개 DRAFT'})
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                        {acc.address} · {acc.categoryName} ({acc.regionName})
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', gap: '12px' }}>
                        <span>🛏️ 등록 객실: <strong>{acc.rooms?.length || 0}개</strong></span>
                        <span>📜 환불 정책: <strong>{hasPolicy ? '설정 완료' : '미설정'}</strong></span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn-outline-sm"
                        onClick={() => {
                          setTargetAccIdForRoom(acc.id);
                          setTargetAccIdForRefund(acc.id);
                          if (acc.rooms && acc.rooms.length > 0) {
                            setInventoryForm((prev) => ({ ...prev, roomId: acc.rooms[0].id }));
                          }
                          alert(`숙소 [ID: ${acc.id} - ${acc.name}]가 선택되었습니다.\n아래 객실/환불정책/재고 폼에 ID가 반영되었습니다.`);
                        }}
                      >
                        👇 이 숙소 선택하기
                      </button>

                      <button
                        type="button"
                        className={isListed ? 'btn-danger btn-sm' : 'btn-success btn-sm'}
                        onClick={() => handleToggleListingStatus(acc)}
                        title={!hasRooms || !hasPolicy ? '객실과 환불정책이 모두 등록되어야 공개할 수 있습니다' : ''}
                      >
                        {isListed ? '🔒 비공개 전환' : '🌐 공개(LISTED) 전환'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="grid-2col">
        {/* 숙소 등록 */}
        <div className="card">
          <h3 className="card-title">🏡 2단계: 숙소 등록 (POST /api/host/accommodations)</h3>
          <form onSubmit={handleCreateAccommodation} className="form-stack">
            <div className="grid-2col">
              <div className="form-group">
                <label>지역 선택 (Region)</label>
                <select
                  value={accForm.regionId}
                  onChange={(e) => setAccForm({ ...accForm, regionId: Number(e.target.value) })}
                >
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (ID: {r.id})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>카테고리 선택 (Category)</label>
                <select
                  value={accForm.categoryId}
                  onChange={(e) => setAccForm({ ...accForm, categoryId: Number(e.target.value) })}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (ID: {c.id})
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
                  placeholder="15:00:00"
                  required
                />
              </div>
              <div className="form-group">
                <label>체크아웃 시간</label>
                <input
                  type="text"
                  value={accForm.checkOutTime}
                  onChange={(e) => setAccForm({ ...accForm, checkOutTime: e.target.value })}
                  placeholder="11:00:00"
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

            <div className="form-group">
              <label>대표 이미지 URL</label>
              <input
                type="text"
                value={accForm.imageUrls}
                onChange={(e) => setAccForm({ ...accForm, imageUrls: e.target.value })}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={!isHost}>
              숙소 등록하기
            </button>
          </form>

          {createdAccommodation && (
            <div className="alert alert-success" style={{ marginTop: '12px' }}>
              숙소 생성 완료! ID: <strong>{createdAccommodation.id}</strong> (명칭:{' '}
              {createdAccommodation.name})
            </div>
          )}
        </div>

        {/* 객실 등록 */}
        <div className="card">
          <h3 className="card-title">🛏️ 3단계: 객실 등록 (POST /api/host/accommodations/&#123;id&#125;/rooms)</h3>
          <form onSubmit={handleAddRoom} className="form-stack">
            <div className="form-group">
              <label>대상 숙소 ID (내 소유 숙소)</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="number"
                  value={targetAccIdForRoom}
                  onChange={(e) => setTargetAccIdForRoom(Number(e.target.value))}
                  required
                  style={{ flex: 1 }}
                />
                {createdAccommodation && (
                  <button
                    type="button"
                    className="btn-outline-sm"
                    onClick={() => setTargetAccIdForRoom(createdAccommodation.id)}
                  >
                    방금 만든 숙소(ID: {createdAccommodation.id}) 넣기
                  </button>
                )}
              </div>
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
                <label>기본 1박 요금 (원)</label>
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
              객실 생성 완료! Room ID: <strong>{createdRoomId}</strong>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2col" style={{ marginTop: '20px' }}>
        {/* 환불 정책 등록 */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">📜 4단계: 환불 정책 설정 (PUT /api/host/accommodations/&#123;id&#125;/refund-policy)</h3>
          </div>

          <form onSubmit={handlePutRefundPolicy} className="form-stack">
            <div className="form-group">
              <label>대상 숙소 ID (반드시 본인이 등록한 숙소 ID)</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="number"
                  value={targetAccIdForRefund}
                  onChange={(e) => setTargetAccIdForRefund(Number(e.target.value))}
                  required
                  style={{ flex: 1 }}
                />
                {createdAccommodation && (
                  <button
                    type="button"
                    className="btn-outline-sm"
                    onClick={() => setTargetAccIdForRefund(createdAccommodation.id)}
                  >
                    내 숙소(ID: {createdAccommodation.id}) 채우기
                  </button>
                )}
              </div>
              <small style={{ color: '#64748b' }}>
                * 다른 호스트의 숙소 ID를 입력하면 <code>ACCOMMODATION-002 (본인 소유 아님)</code> 에러가 발생합니다.
              </small>
            </div>

            <div className="form-group">
              <label>환불 정책 안내 문구</label>
              <input
                type="text"
                value={policyText}
                onChange={(e) => setPolicyText(e.target.value)}
                required
              />
            </div>

            {/* 템플릿 버튼 */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>빠른 템플릿:</span>
              <button type="button" className="btn-outline-sm" onClick={() => applyTemplate('standard')}>
                표준 정책 (7일전 100%, 3일전 50%)
              </button>
              <button type="button" className="btn-outline-sm" onClick={() => applyTemplate('strict')}>
                엄격 정책 (14일전 100%)
              </button>
              <button type="button" className="btn-outline-sm" onClick={() => applyTemplate('flexible')}>
                유연 정책 (1일전 100%)
              </button>
            </div>

            {/* 규칙 목록 테이블 */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label>환불 규칙 목록 (daysBefore 일수 & refundRate 환불비율 0~1)</label>
                <button type="button" className="btn-outline-sm" onClick={handleAddRule}>
                  + 규칙 행 추가
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {rules.map((rule, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', minWidth: '45px' }}>
                      체크인
                    </span>
                    <input
                      type="number"
                      value={rule.daysBefore}
                      onChange={(e) => handleRuleChange(idx, 'daysBefore', Number(e.target.value))}
                      min={0}
                      style={{ width: '80px' }}
                      required
                    />
                    <span style={{ fontSize: '12px', color: '#64748b' }}>일 전까지</span>

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={rule.refundRate}
                      onChange={(e) => handleRuleChange(idx, 'refundRate', Number(e.target.value))}
                      style={{ width: '90px' }}
                      required
                    />
                    <span style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600, minWidth: '60px' }}>
                      ({Math.round(rule.refundRate * 100)}% 환불)
                    </span>

                    {rules.length > 1 && (
                      <button
                        type="button"
                        className="btn-danger btn-sm"
                        onClick={() => handleRemoveRule(idx)}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={!isHost}>
              환불 정책 반영 (PUT)
            </button>
          </form>

          {refundStatusMsg && (
            <div
              className={`alert ${refundStatusMsg.error ? 'alert-warning' : 'alert-success'}`}
              style={{ marginTop: '12px' }}
            >
              {refundStatusMsg.text}
            </div>
          )}
        </div>

        {/* 재고 & 가격 일괄 설정 */}
        <div className="card">
          <h3 className="card-title">📅 5단계: 객실 재고 & 요금 설정 (PUT /api/host/rooms/&#123;roomId&#125;/inventories)</h3>
          <form onSubmit={handleSetInventories} className="form-stack">
            <div className="form-group">
              <label>대상 객실 Room ID</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="number"
                  value={inventoryForm.roomId}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, roomId: Number(e.target.value) })}
                  required
                  style={{ flex: 1 }}
                />
                {createdRoomId && (
                  <button
                    type="button"
                    className="btn-outline-sm"
                    onClick={() => setInventoryForm({ ...inventoryForm, roomId: createdRoomId })}
                  >
                    방금 만든 객실(ID: {createdRoomId}) 넣기
                  </button>
                )}
              </div>
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
                <label>일자별 판매 수량 (totalCount)</label>
                <input
                  type="number"
                  value={inventoryForm.totalCount}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, totalCount: Number(e.target.value) })}
                  min={1}
                />
              </div>
              <div className="form-group">
                <label>1박 가격 (price)</label>
                <input
                  type="number"
                  value={inventoryForm.price}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, price: Number(e.target.value) })}
                />
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={!isHost}>
              재고/요금 일괄 등록
            </button>
          </form>
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
