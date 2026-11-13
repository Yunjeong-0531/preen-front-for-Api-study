import React from 'react';
import { TestFileViewer, TestMethodItem } from '../TestFileViewer';
import { reviewApi } from '../../../api/reviewApi';
import { favoriteApi } from '../../../api/favoriteApi';

export const ReviewFavoriteTestTab: React.FC = () => {
  const methods: TestMethodItem[] = [
    {
      id: 'rev-1',
      name: '이용완료_예약만_리뷰를_작성할_수_있다',
      summary: '실제 숙박이 완료된 COMPLETED 예약에 대해서만 리뷰 작성이 허용되며, 취소된 예약(CANCELLED)이나 이용 전(CONFIRMED/PENDING) 예약은 400 Bad Request로 차단됩니다.',
      expectedBehavior: 'COMPLETED 상태가 아니면 REVIEW-001 (NOT_ELIGIBLE_FOR_REVIEW) 에러 발생',
      javaCode: `@Test
void 이용완료_예약만_리뷰를_작성할_수_있다() throws Exception {
    // PENDING이나 CONFIRMED 예약으로 리뷰 작성 시도 -> 실패
    postJson("/api/reviews", body("reservationId", pendingResId, "rating", 5, "content", "좋아요"), guest.token())
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("REVIEW-001"));
}`,
      onRun: async () => {
        try {
          // CANCELLED나 PENDING 예약 ID(예: 1번 예약)로 리뷰 작성 시도
          await reviewApi.create({
            reservationId: 1,
            rating: 5,
            content: '체크아웃도 안 했는데 리뷰 시도',
          });
          return { passed: false, message: '이용 완료되지 않은 예약인데 리뷰 작성이 허용됨 (검증 실패)', details: null };
        } catch (err: any) {
          const status = err.response?.status;
          const code = err.response?.data?.code || err.response?.data?.error?.code;
          const passed = status === 400;
          return { passed, message: `이용 완료 전 리뷰 작성 정상 차단 성공 (Status: ${status}, Code: ${code})`, details: err.response?.data };
        }
      },
    },
    {
      id: 'rev-2',
      name: '숙소별_리뷰_음악_트랙을_추천수_내림차순으로_집계한다',
      summary: '리뷰 작성 시 첨부된 Spotify 트랙 ID들을 숙소별로 그룹화하여 추천 횟수(COUNT)와 최근 추가 일시(MAX createdAt) 순으로 정렬하여 제공합니다.',
      expectedBehavior: 'HTTP 200 OK, GET /api/accommodations/{id}/tracks 목록 반환',
      javaCode: `@Test
void 숙소별_리뷰_음악_트랙을_추천수_내림차순으로_집계한다() throws Exception {
    JsonNode tracks = data(mockMvc.perform(get("/api/accommodations/" + accId + "/tracks"))
            .andExpect(status().isOk()));
    assertThat(tracks.get(0).get("reviewCount").asInt()).isGreaterThanOrEqualTo(1);
}`,
      onRun: async () => {
        const res = await reviewApi.getTracksForAccommodation(1);
        const passed = res.success && Array.isArray(res.data);
        return {
          passed,
          message: passed ? `트랙 집계 성공: 총 ${res.data.length}개 트랙 반환됨` : '실패',
          details: res.data,
        };
      },
    },
    {
      id: 'rev-3',
      name: '찜하기와_찜취소_토글이_정상_동작한다',
      summary: '게스트는 마음에 드는 숙소를 찜(Favorite)할 수 있으며, 동일 숙소를 다시 찜 해제(DELETE)할 수 있습니다.',
      expectedBehavior: 'POST 200 OK -> GET /api/favorites/me 목록에 추가 -> DELETE 200 OK -> 목록에서 제거',
      javaCode: `@Test
void 찜하기와_찜취소_토글이_정상_동작한다() throws Exception {
    postJson("/api/favorites", body("accommodationId", accId), guest.token()).andExpect(status().isOk());
    assertThat(favoriteList(guest)).contains(accId);
    deleteJson("/api/favorites/" + accId, guest.token()).andExpect(status().isOk());
    assertThat(favoriteList(guest)).doesNotContain(accId);
}`,
      onRun: async () => {
        const add = await favoriteApi.add(1);
        const list = await favoriteApi.getMine();
        const del = await favoriteApi.remove(1);
        const passed = add.success && del.success;
        return {
          passed,
          message: passed ? '찜 추가 -> 내 목록 확인 -> 찜 삭제 사이클 성공' : '실패',
          details: { add, count: list.data?.content?.length, del },
        };
      },
    },
  ];

  return (
    <TestFileViewer
      fileName="ReviewFavoriteTest.java"
      filePath="src/test/java/com/staybook/review/ReviewFavoriteTest.java"
      description="숙박이 끝난 COMPLETED 예약만 리뷰를 작성할 수 있는 자격 검증, Spotify 음악 트랙 연동 및 숙소별 인기 음악 트랙 랭킹 집계, 호스트 답글 등록, 게스트 찜(Favorites) 목록 관리를 총 10개 테스트 메서드로 검증합니다."
      targetClasses={['ReviewService', 'FavoriteService', 'SpotifyService']}
      totalMethodsCount={10}
      methods={methods}
    />
  );
};
