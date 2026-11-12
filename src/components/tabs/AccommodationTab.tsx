import React, { useEffect, useState } from 'react';
import { accommodationApi } from '../../api/accommodationApi';
import { inventoryApi } from '../../api/inventoryApi';
import { favoriteApi } from '../../api/favoriteApi';
import { reviewApi } from '../../api/reviewApi';
import {
  AccommodationDetail,
  AccommodationSummary,
  AmenityResponse,
  CategoryResponse,
  FavoriteResponse,
  RegionResponse,
  RoomAvailability,
  ReviewResponse,
  AccommodationTrackResponse,
} from '../../api/types';
import { useAuth } from '../../context/AuthContext';
import { Star, MessageSquare, Music, Image as ImageIcon } from 'lucide-react';

export const AccommodationTab: React.FC = () => {
  const { isLoggedIn } = useAuth();

  // 메타데이터
  const [regions, setRegions] = useState<RegionResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [amenities, setAmenities] = useState<AmenityResponse[]>([]);

  // 검색 조건
  const [selectedRegionId, setSelectedRegionId] = useState<number | undefined>(undefined);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [guestCount, setGuestCount] = useState<number>(2);

  // 검색 결과
  const [accommodations, setAccommodations] = useState<AccommodationSummary[]>([]);
  const [totalElements, setTotalElements] = useState<number>(0);

  // 상세 조회
  const [selectedAccId, setSelectedAccId] = useState<number | null>(null);
  const [accDetail, setAccDetail] = useState<AccommodationDetail | null>(null);

  // 숙소 리뷰 및 트랙
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [tracks, setTracks] = useState<AccommodationTrackResponse[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  // 예약 가능 여부 및 요금 계산 폼
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [checkIn, setCheckIn] = useState<string>(tomorrow);
  const [checkOut, setCheckOut] = useState<string>(dayAfterTomorrow);
  const [availabilities, setAvailabilities] = useState<RoomAvailability[]>([]);

  // 찜 목록
  const [favorites, setFavorites] = useState<FavoriteResponse[]>([]);

  const loadMetadata = async () => {
    try {
      const [rRes, cRes, aRes] = await Promise.all([
        accommodationApi.getRegions(),
        accommodationApi.getCategories(),
        accommodationApi.getAmenities(),
      ]);
      if (rRes.success) setRegions(rRes.data);
      if (cRes.success) setCategories(cRes.data);
      if (aRes.success) setAmenities(aRes.data);
    } catch (err: any) {
      console.warn('메타데이터 로드 실패', err);
    }
  };

  const handleSearch = async () => {
    try {
      const res = await accommodationApi.search({
        regionId: selectedRegionId,
        categoryId: selectedCategoryId,
        guestCount: guestCount || undefined,
        page: 0,
        size: 20,
      });
      if (res.success && res.data) {
        setAccommodations(res.data.content);
        setTotalElements(res.data.totalElements);
      }
    } catch (err: any) {
      alert('숙소 검색 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSelectAccommodation = async (id: number) => {
    setSelectedAccId(id);
    try {
      const res = await accommodationApi.getDetail(id);
      if (res.success && res.data) {
        setAccDetail(res.data);
      }
      // 자동으로 날짜별 재고/요금도 조회
      checkAvailability(id, checkIn, checkOut);
      // 숙소 리뷰 및 트랙 조회
      loadReviewsAndTracks(id);
    } catch (err: any) {
      alert('상세 조회 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  const loadReviewsAndTracks = async (id: number) => {
    setIsLoadingReviews(true);
    try {
      const [revRes, trkRes] = await Promise.all([
        reviewApi.getForAccommodation(id, 0, 20),
        reviewApi.getTracksForAccommodation(id),
      ]);
      if (revRes.success && revRes.data) {
        setReviews(revRes.data.content);
      } else {
        setReviews([]);
      }
      if (trkRes.success && trkRes.data) {
        setTracks(trkRes.data);
      } else {
        setTracks([]);
      }
    } catch (err: any) {
      console.warn('숙소 리뷰/트랙 로드 실패', err);
      setReviews([]);
      setTracks([]);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const checkAvailability = async (id: number, inDate: string, outDate: string) => {
    try {
      const res = await inventoryApi.getAvailability(id, inDate, outDate);
      if (res.success && res.data) {
        setAvailabilities(res.data);
      }
    } catch (err: any) {
      console.warn('재고 확인 실패', err);
    }
  };

  const handleCheckAvailabilitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAccId) {
      checkAvailability(selectedAccId, checkIn, checkOut);
    }
  };

  // 찜 토글
  const handleToggleFavorite = async (accId: number) => {
    if (!isLoggedIn) {
      alert('찜 기능은 로그인이 필요합니다.');
      return;
    }
    try {
      await favoriteApi.add(accId);
      alert('❤️ 찜 목록에 추가되었습니다.');
      loadFavorites();
    } catch (err: any) {
      alert('찜 처리 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleRemoveFavorite = async (accId: number) => {
    try {
      await favoriteApi.remove(accId);
      alert('찜이 삭제되었습니다.');
      loadFavorites();
    } catch (err: any) {
      alert('찜 삭제 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  const loadFavorites = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await favoriteApi.getMine();
      if (res.success && res.data) {
        setFavorites(res.data.content);
      }
    } catch (err: any) {
      console.warn('찜 목록 로드 실패', err);
    }
  };

  useEffect(() => {
    loadMetadata();
    handleSearch();
    if (isLoggedIn) {
      loadFavorites();
    }
  }, [isLoggedIn]);

  return (
    <div className="tab-pane">
      <div className="section-header">
        <h2>🔍 숙소 탐색 & 객실 예약 가능 조회 & 찜하기</h2>
        <p className="section-desc">
          공개 조회 API(GET /api/accommodations, GET /api/accommodations/&#123;id&#125;, GET /api/accommodations/&#123;id&#125;/availability) 및 찜 API를 검증합니다.
        </p>
      </div>

      {/* 검색 필터 */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 className="card-title">🔎 숙소 검색 조건 (GET /api/accommodations)</h3>
        <div className="form-inline-group">
          <div className="form-group">
            <label>지역</label>
            <select
              value={selectedRegionId || ''}
              onChange={(e) => setSelectedRegionId(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">전체 지역</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>카테고리</label>
            <select
              value={selectedCategoryId || ''}
              onChange={(e) => setSelectedCategoryId(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">전체 카테고리</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>인원 수</label>
            <input
              type="number"
              value={guestCount}
              onChange={(e) => setGuestCount(Number(e.target.value))}
              min={1}
              style={{ width: '80px' }}
            />
          </div>

          <button
            className="btn-primary"
            onClick={handleSearch}
            style={{ alignSelf: 'flex-end', height: '40px' }}
          >
            검색 실행
          </button>
        </div>
      </div>

      <div className="grid-2col">
        {/* 숙소 목록 리스트 */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">목록 ({totalElements}건)</h3>
            <button className="btn-outline-sm" onClick={handleSearch}>
              새로고침
            </button>
          </div>

          {accommodations.length === 0 ? (
            <p style={{ color: '#64748b' }}>
              검색 조건에 맞는 숙소가 없습니다. 호스트 탭에서 숙소를 먼저 등록해 보세요.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {accommodations.map((acc) => (
                <div
                  key={acc.id}
                  onClick={() => handleSelectAccommodation(acc.id)}
                  className={`accommodation-card ${selectedAccId === acc.id ? 'selected' : ''}`}
                >
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {acc.thumbnailUrl ? (
                      <img src={acc.thumbnailUrl} alt={acc.name} className="acc-thumb" />
                    ) : (
                      <div className="acc-thumb-placeholder">🏡</div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>{acc.name}</h4>
                        <button
                          className="btn-ghost btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(acc.id);
                          }}
                          title="찜하기"
                        >
                          ❤️ 찜
                        </button>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                        {acc.regionName} · {acc.categoryName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#334155' }}>{acc.address}</div>
                      <div style={{ marginTop: '6px', fontWeight: 'bold', color: '#0284c7' }}>
                        {acc.minNightlyPrice
                          ? `1박 최저 ${acc.minNightlyPrice.toLocaleString()}원~`
                          : '가격 미설정'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 내 찜 목록 */}
          {isLoggedIn && (
            <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4>❤️ 내 찜 목록 (GET /api/favorites/me)</h4>
                <button className="btn-ghost btn-sm" onClick={loadFavorites}>
                  새로고침
                </button>
              </div>
              {favorites.length === 0 ? (
                <small style={{ color: '#64748b' }}>찜한 숙소가 없습니다.</small>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  {favorites.map((fav) => (
                    <div key={fav.id} className="favorite-item">
                      <span>{fav.accommodationName}</span>
                      <button
                        className="btn-danger btn-sm"
                        onClick={() => handleRemoveFavorite(fav.accommodationId)}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 선택 숙소 상세 & 객실별 재고/요금 */}
        <div className="card">
          <h3 className="card-title">📖 숙소 상세 및 예약 가능 여부 조회</h3>

          {accDetail ? (
            <div>
              <div style={{ marginBottom: '14px' }}>
                <span className="badge badge-info">{accDetail.categoryName}</span>
                <span className="badge badge-secondary" style={{ marginLeft: '4px' }}>
                  {accDetail.regionName}
                </span>
                <h3 style={{ margin: '8px 0 4px 0' }}>{accDetail.name}</h3>
                <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>{accDetail.address}</p>
                <div style={{ fontSize: '12px', marginTop: '6px' }}>
                  체크인: {accDetail.checkInTime} | 체크아웃: {accDetail.checkOutTime}
                </div>
                {accDetail.description && (
                  <p style={{ fontSize: '13px', marginTop: '8px', whiteSpace: 'pre-wrap' }}>
                    {accDetail.description}
                  </p>
                )}
              </div>

              {/* 편의시설 */}
              {accDetail.amenities && accDetail.amenities.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <strong style={{ fontSize: '13px' }}>편의시설:</strong>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {accDetail.amenities.map((a) => (
                      <span key={a.id} className="badge badge-light">
                        {a.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 날짜별 객실 예약 가능 여부 조회 (GET /api/accommodations/{id}/availability) */}
              <div className="availability-box">
                <h4>📅 날짜별 객실 요금 & 예약 가능 여부 조회</h4>
                <form onSubmit={handleCheckAvailabilitySubmit} className="form-inline-group">
                  <div className="form-group">
                    <label>체크인</label>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>체크아웃</label>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-end' }}>
                    조회
                  </button>
                </form>

                {/* 객실별 조회 결과 */}
                <div style={{ marginTop: '14px' }}>
                  {availabilities.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: '13px' }}>
                      해당 기간에 조회된 객실 정보가 없습니다. (재고가 등록되어 있는지 확인해 주세요)
                    </div>
                  ) : (
                    availabilities.map((room) => (
                      <div key={room.roomId} className="room-availability-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong>
                            {room.roomName} (Room ID: {room.roomId})
                          </strong>
                          <span
                            className={`badge ${room.available ? 'badge-success' : 'badge-danger'}`}
                          >
                            {room.available ? '예약 가능' : '예약 불가 (매진)'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          기준 {room.capacity}명 / 최대 {room.maxCapacity}명 (추가인원 요금: +
                          {room.extraPersonFee.toLocaleString()}원)
                        </div>
                        <div
                          style={{
                            marginTop: '6px',
                            fontWeight: 'bold',
                            color: room.available ? '#059669' : '#dc2626',
                          }}
                        >
                          {room.nights}박 총 합계: {room.totalPrice?.toLocaleString() || 0}원
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 숙소 리뷰 목록 (GET /api/accommodations/{id}/reviews) */}
              <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Star size={16} color="#eab308" fill="#eab308" />
                    숙소 리뷰 ({reviews.length}개)
                  </h4>
                  {selectedAccId && (
                    <button
                      className="btn-outline-sm"
                      onClick={() => loadReviewsAndTracks(selectedAccId)}
                      disabled={isLoadingReviews}
                    >
                      {isLoadingReviews ? '로딩 중...' : '리뷰 새로고침'}
                    </button>
                  )}
                </div>

                {reviews.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '13px', margin: '8px 0' }}>
                    아직 등록된 숙소 리뷰가 없습니다. (숙박 완료된 예약 건에 대해 리뷰 탭에서 작성할 수 있습니다.)
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {reviews.map((rev) => (
                      <div
                        key={rev.id}
                        style={{
                          background: '#f8fafc',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{ fontSize: '13px' }}>{rev.authorName || '게스트'}</strong>
                            <span style={{ marginLeft: '8px', color: '#eab308', fontWeight: 600 }}>
                              {'★'.repeat(rev.rating)}
                              {'☆'.repeat(5 - rev.rating)}
                            </span>
                            <span style={{ marginLeft: '4px', fontSize: '12px', color: '#64748b' }}>
                              ({rev.rating}점)
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : ''}
                          </span>
                        </div>

                        <p style={{ margin: '8px 0', fontSize: '13px', color: '#334155', whiteSpace: 'pre-wrap' }}>
                          {rev.content}
                        </p>

                        {/* 리뷰 이미지 */}
                        {rev.imageUrls && rev.imageUrls.length > 0 && (
                          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                            {rev.imageUrls.map((imgUrl, i) => (
                              <img
                                key={i}
                                src={imgUrl}
                                alt="리뷰 이미지"
                                style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                              />
                            ))}
                          </div>
                        )}

                        {/* 등록된 Spotify 트랙 정보 */}
                        {rev.spotifyTrackId && (
                          <div
                            style={{
                              marginTop: '8px',
                              padding: '6px 10px',
                              background: '#ecfdf5',
                              border: '1px solid #a7f3d0',
                              borderRadius: '4px',
                              fontSize: '12px',
                              color: '#065f46',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <Music size={14} color="#059669" />
                            <span>추천 배경음악: Spotify Track ID <code>{rev.spotifyTrackId}</code></span>
                          </div>
                        )}

                        {/* 호스트 답글 */}
                        {rev.hostReply && (
                          <div
                            style={{
                              marginTop: '8px',
                              padding: '8px 10px',
                              background: '#eff6ff',
                              borderLeft: '3px solid #3b82f6',
                              borderRadius: '0 4px 4px 0',
                              fontSize: '12px',
                            }}
                          >
                            <strong style={{ color: '#1d4ed8' }}>호스트 답변:</strong>
                            <p style={{ margin: '2px 0 0 0', color: '#1e3a8a' }}>{rev.hostReply}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 숙소 추천 트랙 모음 (GET /api/accommodations/{id}/tracks) */}
              {tracks.length > 0 && (
                <div style={{ marginTop: '16px', background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Music size={15} color="#16a34a" /> 이 숙소의 추천 음악 리스트 (총 {tracks.length}곡)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {tracks.map((trk, i) => (
                      <div key={i} style={{ fontSize: '12px', color: '#15803d', display: 'flex', justifyContent: 'space-between' }}>
                        <span>🎵 Spotify Track: <code>{trk.spotifyTrackId}</code></span>
                        <span>리뷰 {trk.reviewCount}회 추천</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: '#64748b', textAlign: 'center', marginTop: '40px' }}>
              좌측 목록에서 숙소를 선택하면 상세 정보 및 날짜별 요금 계산 결과가 표시됩니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
