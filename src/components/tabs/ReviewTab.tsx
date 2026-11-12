import React, { useEffect, useState } from 'react';
import { reviewApi } from '../../api/reviewApi';
import { spotifyApi } from '../../api/spotifyApi';
import { ReviewResponse, SpotifyTrack } from '../../api/types';
import { useAuth } from '../../context/AuthContext';

export const ReviewTab: React.FC = () => {
  const { isLoggedIn } = useAuth();

  // 숙소 리뷰 목록 조회
  const [targetAccId, setTargetAccId] = useState<number>(1);
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);

  // 리뷰 작성 폼
  const [reviewForm, setReviewForm] = useState({
    reservationId: 1,
    rating: 5,
    content: '바다 전망이 너무 환상적이고 침구류도 깨끗해서 편안하게 잘 쉬다 갑니다!',
    spotifyTrackId: '',
    imageUrls: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
  });

  // Spotify 음악 검색
  const [spotifyQuery, setSpotifyQuery] = useState('IU');
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);

  // 리뷰 수정 폼
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [editRating, setEditRating] = useState<number>(5);
  const [editContent, setEditContent] = useState<string>('');

  const loadReviews = async () => {
    try {
      const res = await reviewApi.getForAccommodation(targetAccId, 0, 20);
      if (res.success && res.data) {
        setReviews(res.data.content);
      }
    } catch (err: any) {
      alert('리뷰 로드 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSearchSpotify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      alert('음악 검색은 로그인이 필요합니다.');
      return;
    }
    try {
      const res = await spotifyApi.searchTracks(spotifyQuery);
      if (res.success && res.data) {
        setTracks(res.data);
      }
    } catch (err: any) {
      alert('Spotify 검색 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSelectTrack = (track: SpotifyTrack) => {
    setSelectedTrack(track);
    setReviewForm((prev) => ({ ...prev, spotifyTrackId: track.id }));
    alert(`음악이 선택되었습니다: ${track.name} - ${track.artist}`);
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      alert('리뷰 작성은 로그인이 필요합니다.');
      return;
    }
    try {
      const imageUrls = reviewForm.imageUrls
        ? reviewForm.imageUrls.split('\n').map((s) => s.trim()).filter(Boolean)
        : [];
      const res = await reviewApi.create({
        ...reviewForm,
        spotifyTrackId: reviewForm.spotifyTrackId || undefined,
        imageUrls,
      });
      if (res.success && res.data) {
        alert('🎉 리뷰가 성공적으로 등록되었습니다!');
        loadReviews();
      }
    } catch (err: any) {
      alert('리뷰 작성 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleStartEdit = (rev: ReviewResponse) => {
    setEditingReviewId(rev.id);
    setEditRating(rev.rating);
    setEditContent(rev.content);
  };

  const handleSaveEdit = async (id: number) => {
    try {
      const res = await reviewApi.update(id, {
        rating: editRating,
        content: editContent,
      });
      if (res.success) {
        alert('리뷰가 수정되었습니다.');
        setEditingReviewId(null);
        loadReviews();
      }
    } catch (err: any) {
      alert('리뷰 수정 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteReview = async (id: number) => {
    if (!confirm('정말 리뷰를 삭제하시겠습니까?')) return;
    try {
      await reviewApi.delete(id);
      alert('리뷰가 삭제되었습니다.');
      loadReviews();
    } catch (err: any) {
      alert('리뷰 삭제 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  useEffect(() => {
    loadReviews();
  }, [targetAccId]);

  return (
    <div className="tab-pane">
      <div className="section-header">
        <h2>⭐ 리뷰 작성 & 관리 & Spotify 음악 연동</h2>
        <p className="section-desc">
          체크아웃 완료된 예약에 대한 리뷰 작성(POST /api/reviews), 숙소별 리뷰 목록(GET /api/accommodations/&#123;id&#125;/reviews), Spotify 트랙 검색(GET /api/spotify/tracks/search)을 검증합니다.
        </p>
      </div>

      <div className="grid-2col">
        {/* 리뷰 작성 폼 */}
        <div className="card">
          <h3 className="card-title">✍️ 리뷰 작성 (POST /api/reviews)</h3>
          <p style={{ fontSize: '12px', color: '#64748b' }}>
            * 체크아웃이 완료된(COMPLETED) 본인 예약에 한해 예약당 1건 작성할 수 있습니다.
          </p>

          <form onSubmit={handleCreateReview} className="form-stack">
            <div className="form-group">
              <label>대상 예약 ID (Reservation ID)</label>
              <input
                type="number"
                value={reviewForm.reservationId}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, reservationId: Number(e.target.value) })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>별점 (1 ~ 5)</label>
              <select
                value={reviewForm.rating}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, rating: Number(e.target.value) })
                }
              >
                <option value={5}>⭐⭐⭐⭐⭐ (5점)</option>
                <option value={4}>⭐⭐⭐⭐ (4점)</option>
                <option value={3}>⭐⭐⭐ (3점)</option>
                <option value={2}>⭐⭐ (2점)</option>
                <option value={1}>⭐ (1점)</option>
              </select>
            </div>

            <div className="form-group">
              <label>리뷰 내용</label>
              <textarea
                value={reviewForm.content}
                onChange={(e) => setReviewForm({ ...reviewForm, content: e.target.value })}
                rows={3}
                required
              />
            </div>

            <div className="form-group">
              <label>선택된 Spotify 트랙 ID</label>
              <input
                type="text"
                value={reviewForm.spotifyTrackId}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, spotifyTrackId: e.target.value })
                }
                placeholder="우측 Spotify 검색에서 곡을 선택하거나 ID 22자 직접 입력"
              />
            </div>

            <div className="form-group">
              <label>이미지 URL</label>
              <input
                type="text"
                value={reviewForm.imageUrls}
                onChange={(e) => setReviewForm({ ...reviewForm, imageUrls: e.target.value })}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={!isLoggedIn}>
              {isLoggedIn ? '리뷰 등록하기' : '로그인 필요'}
            </button>
          </form>
        </div>

        {/* Spotify 음악 검색 연동 */}
        <div className="card">
          <h3 className="card-title">🎵 Spotify 트랙 검색 (GET /api/spotify/tracks/search)</h3>
          <form onSubmit={handleSearchSpotify} className="form-inline-group" style={{ marginBottom: '14px' }}>
            <input
              type="text"
              value={spotifyQuery}
              onChange={(e) => setSpotifyQuery(e.target.value)}
              placeholder="아티스트 또는 곡명 검색 (예: IU, NewJeans)"
              style={{ flex: 1 }}
              required
            />
            <button type="submit" className="btn-primary" disabled={!isLoggedIn}>
              음악 검색
            </button>
          </form>

          {tracks.length > 0 && (
            <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tracks.map((track) => (
                <div
                  key={track.id}
                  onClick={() => handleSelectTrack(track)}
                  className="spotify-track-card"
                >
                  {track.albumImageUrl && (
                    <img src={track.albumImageUrl} alt={track.name} className="track-cover" />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{track.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {track.artist} · {track.album}
                    </div>
                  </div>
                  <button className="btn-outline-sm">선택</button>
                </div>
              ))}
            </div>
          )}

          {selectedTrack && (
            <div style={{ marginTop: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
              <small style={{ color: '#059669', fontWeight: 'bold' }}>
                선택된 음악: {selectedTrack.name} ({selectedTrack.id})
              </small>
              {/* Spotify Embed Player */}
              <iframe
                title="Spotify Embed"
                src={`https://open.spotify.com/embed/track/${selectedTrack.id}?utm_source=generator`}
                width="100%"
                height="80"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                style={{ borderRadius: '8px', marginTop: '6px' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 숙소별 리뷰 목록 조회 */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 className="card-title" style={{ margin: 0 }}>
              💬 숙소 리뷰 목록 (GET /api/accommodations/&#123;id&#125;/reviews)
            </h3>
            <span style={{ fontSize: '13px', color: '#64748b' }}>숙소 ID:</span>
            <input
              type="number"
              value={targetAccId}
              onChange={(e) => setTargetAccId(Number(e.target.value))}
              style={{ width: '70px', padding: '2px 6px' }}
            />
            <button className="btn-outline-sm" onClick={loadReviews}>
              조회
            </button>
          </div>
        </div>

        {reviews.length === 0 ? (
          <p style={{ color: '#64748b' }}>작성된 리뷰가 없습니다.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {reviews.map((rev) => (
              <div key={rev.id} className="review-box">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                      {'⭐'.repeat(rev.rating)}
                    </span>
                    <strong style={{ marginLeft: '8px' }}>{rev.authorName}</strong>
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '8px' }}>
                      {rev.createdAt}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn-outline-sm" onClick={() => handleStartEdit(rev)}>
                      수정
                    </button>
                    <button className="btn-danger btn-sm" onClick={() => handleDeleteReview(rev.id)}>
                      삭제
                    </button>
                  </div>
                </div>

                {editingReviewId === rev.id ? (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                      <select
                        value={editRating}
                        onChange={(e) => setEditRating(Number(e.target.value))}
                      >
                        <option value={5}>5점</option>
                        <option value={4}>4점</option>
                        <option value={3}>3점</option>
                        <option value={2}>2점</option>
                        <option value={1}>1점</option>
                      </select>
                      <input
                        type="text"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        style={{ flex: 1 }}
                      />
                    </div>
                    <button className="btn-primary btn-sm" onClick={() => handleSaveEdit(rev.id)}>
                      저장
                    </button>
                    <button
                      className="btn-ghost btn-sm"
                      onClick={() => setEditingReviewId(null)}
                      style={{ marginLeft: '4px' }}
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <p style={{ margin: '8px 0', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                    {rev.content}
                  </p>
                )}

                {rev.spotifyTrackId && (
                  <div style={{ marginTop: '8px' }}>
                    <iframe
                      title={`Review Spotify ${rev.id}`}
                      src={`https://open.spotify.com/embed/track/${rev.spotifyTrackId}?utm_source=generator`}
                      width="100%"
                      height="80"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      style={{ borderRadius: '8px' }}
                    />
                  </div>
                )}

                {/* 호스트 답글 */}
                {rev.hostReply && (
                  <div className="host-reply-box">
                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#0369a1' }}>
                      호스트 답글 ({rev.hostRepliedAt}):
                    </div>
                    <div style={{ fontSize: '13px', marginTop: '2px' }}>{rev.hostReply}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
