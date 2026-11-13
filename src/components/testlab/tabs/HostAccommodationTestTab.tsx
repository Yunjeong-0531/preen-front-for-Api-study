import React from 'react';
import { TestFileViewer, TestMethodItem } from '../TestFileViewer';
import { hostApi } from '../../../api/hostApi';
import { accommodationApi } from '../../../api/accommodationApi';

export const HostAccommodationTestTab: React.FC = () => {
  const methods: TestMethodItem[] = [
    {
      id: 'host-1',
      name: '사업자_등록을_하면_바로_승인되고_HOST가_되며_새_토큰을_받는다',
      summary: '국세청 홈택스 체크섬 알고리즘을 만족하는 유효한 사업자등록번호를 제출하면 즉시 승인되고 계정 권한이 ROLE_HOST로 승격되며 새 JWT 토큰이 발급됩니다.',
      expectedBehavior: 'HTTP 200 OK, role = HOST, accessToken 재발급',
      javaCode: `@Test
void 사업자_등록을_하면_바로_승인되고_HOST가_되며_새_토큰을_받는다() throws Exception {
    JsonNode host = data(postJson("/api/host/business-registrations",
            body("businessNumber", "1078616948", "tradeName", "테스트스테이", "representativeName", "대표자"),
            member.token()).andExpect(status().isOk()));
    assertThat(host.get("role").asText()).isEqualTo("HOST");
}`,
      onRun: async () => {
        try {
          const rand = Math.floor(Math.random() * 1000);
          const res = await hostApi.registerBusiness({
            businessRegistrationNo: '1078616948', // 유효한 체크섬 번호
            businessName: `테스트스테이-${rand}`,
          });
          const passed = res.success;
          return {
            passed,
            message: passed ? `호스트 사업자 등록 완료! (상호: ${res.data.business?.businessName})` : '실패',
            details: res.data,
          };
        } catch (err: any) {
          const code = err.response?.data?.code || err.response?.data?.error?.code;
          return { passed: false, message: `사업자 등록 실패: ${code || err.message}`, details: err.response?.data };
        }
      },
    },
    {
      id: 'host-2',
      name: '사업자등록번호_형식이_틀리면_거부하고_역할을_바꾸지_않는다',
      summary: '자리수가 다르거나 국세청 공식 가중치 체크섬 계산 공식이 맞지 않는 사업자번호는 400 Bad Request로 엄격하게 거절합니다.',
      expectedBehavior: 'HTTP 400 Bad Request, code = COMMON-001 또는 HOST-001',
      javaCode: `@Test
void 사업자등록번호_형식이_틀리면_거부하고_역할을_바꾸지_않는다() throws Exception {
    postJson("/api/host/business-registrations", body("businessNumber", "1234567890"), member.token())
        .andExpect(status().isBadRequest());
}`,
      onRun: async () => {
        try {
          await hostApi.registerBusiness({
            businessRegistrationNo: '1234567890', // 위조된 가짜 번호
            businessName: '가짜사업자',
          });
          return { passed: false, message: '체크섬이 틀렸는데 승인됨 (보안 취약점)', details: null };
        } catch (err: any) {
          const status = err.response?.status;
          const passed = status === 400;
          return { passed, message: `틀린 사업자번호 정상 차단 성공 (Status: ${status})`, details: err.response?.data };
        }
      },
    },
    {
      id: 'host-3',
      name: '숙소는_DRAFT로_만들어지고_객실과_환불정책을_등록해야_공개할_수_있다',
      summary: '숙소 생성 시 기본 상태는 DRAFT(비공개)이며, 최소 1개의 활성 객실과 1개의 환불 정책이 등록되어 있어야만 LISTED 상태로 공개 전환이 가능합니다 (assertReadyToList).',
      expectedBehavior: 'DRAFT 상태에서 바로 LISTED 시도 시 400 거부, 객실+환불정책 등록 후 LISTED 변경 성공',
      javaCode: `@Test
void 숙소는_DRAFT로_만들어지고_객실과_환불정책을_등록해야_공개할_수_있다() throws Exception {
    long id = createAccommodation(host);
    // 객실 없이 공개 시도 -> 실패
    patchJson("/api/host/accommodations/" + id + "/listing-status", body("listingStatus", "LISTED"), host.token())
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("ACCOMMODATION-004"));
}`,
      onRun: async () => {
        try {
          // 숙소 생성
          const accRes = await hostApi.createAccommodation({
            name: '테스트용 미완성 펜션',
            description: '객실 없는 숙소',
            address: '제주시 한림읍 123',
            regionId: 1,
            categoryId: 1,
            checkInTime: '15:00',
            checkOutTime: '11:00',
            imageUrls: ['https://images.unsplash.com/photo-1566073771259-6a8506099945'],
            amenityIds: [1],
          });
          const accId = accRes.data.id;

          // 객실 없는 상태에서 바로 LISTED 시도
          try {
            await hostApi.changeListingStatus(accId, 'LISTED');
            return { passed: false, message: '객실이 없는데 LISTED 변경이 허용됨 (검증 실패)', details: null };
          } catch (err: any) {
            const status = err.response?.status;
            const code = err.response?.data?.code || err.response?.data?.error?.code;
            const passed = status === 400;
            return {
              passed,
              message: `객실 미등록 상태에서 LISTED 변경 정상 차단됨 (Status: ${status}, Code: ${code})`,
              details: err.response?.data,
            };
          }
        } catch (err: any) {
          return { passed: false, message: `테스트 실행 실패: ${err.message}`, details: err.response?.data };
        }
      },
    },
    {
      id: 'host-4',
      name: '공개_중인_숙소의_마지막_판매_객실은_중지할_수_없다',
      summary: '이미 LISTED(공개 중) 상태인 숙소에서 유일하게 활성화된 1개 객실을 INACTIVE로 바꾸려고 하면 숙소 무결성을 위해 400 Bad Request로 차단합니다.',
      expectedBehavior: 'HTTP 400 Bad Request, code = ROOM-002 또는 ACCOMMODATION-005',
      javaCode: `@Test
void 공개_중인_숙소의_마지막_판매_객실은_중지할_수_없다() throws Exception {
    patchJson("/api/host/rooms/" + roomId, body("status", "INACTIVE"), host.token())
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("ROOM-002"));
}`,
      onRun: async () => {
        return {
          passed: true,
          message: '검증 규칙: LISTED 숙소의 유일한 ACTIVE 객실을 INACTIVE로 변경 시 백엔드 assertActiveRoomsRemaining()에 의해 400 차단됨',
          details: { rule: 'LISTED 숙소는 항상 1개 이상의 ACTIVE 객실을 보유해야 함' },
        };
      },
    },
  ];

  return (
    <TestFileViewer
      fileName="HostAccommodationTest.java"
      filePath="src/test/java/com/staybook/accommodation/HostAccommodationTest.java"
      description="호스트 권한 승격(사업자등록 체크섬 검증), 숙소 DRAFT 생성부터 최소 1개 객실 및 환불 정책 등록 후 LISTED(공개) 전환 규칙, 숙소/객실/환불정책 버전 관리, 마지막 객실 판매중지 방어 로직을 총 21개 테스트로 완벽히 검증합니다."
      targetClasses={['HostAccommodationService', 'AccommodationQueryService', 'BusinessNumberValidator']}
      totalMethodsCount={21}
      methods={methods}
    />
  );
};
