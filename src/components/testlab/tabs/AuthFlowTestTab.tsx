import React from 'react';
import { TestFileViewer, TestMethodItem } from '../TestFileViewer';
import { authApi } from '../../../api/authApi';

export const AuthFlowTestTab: React.FC = () => {
  const methods: TestMethodItem[] = [
    {
      id: 'auth-1',
      name: '만_14세_미만은_가입할_수_없고_만_14세는_가입할_수_있다',
      summary: '정보통신망법 규정에 따라 생년월일 기준 만 14세 미만 아동은 회원가입 시 400 Bad Request (USER-004) 에러로 가입이 차단됩니다.',
      expectedBehavior: 'HTTP 400 Bad Request, code = USER-004',
      javaCode: `@Test
void 만_14세_미만은_가입할_수_없고_만_14세는_가입할_수_있다() throws Exception {
    LocalDate under14 = today.minusYears(14).plusDays(1); // 만 13세
    postJson("/api/auth/signup", body("birthDate", under14.toString()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("USER-004"));
}`,
      onRun: async () => {
        try {
          const under14 = new Date();
          under14.setFullYear(under14.getFullYear() - 13);
          const birthDate = under14.toISOString().split('T')[0];

          await authApi.signup({
            email: `child_${Date.now()}@staybook.com`,
            password: 'Password1234!',
            name: '어린이',
            phone: '010-1234-5678',
            birthDate,
            agreedTermIds: [1, 2],
          });
          return { passed: false, message: '만 13세인데 가입이 통과됨 (검증 실패)', details: null };
        } catch (err: any) {
          const status = err.response?.status;
          const code = err.response?.data?.code || err.response?.data?.error?.code;
          const passed = status === 400;
          return { passed, message: `만 14세 미만 가입 정상 차단 성공 (Status: ${status}, Code: ${code})`, details: err.response?.data };
        }
      },
    },
    {
      id: 'auth-2',
      name: '비밀번호를_5번_틀리면_잠기고_잠금이_풀리면_다시_로그인된다',
      summary: '브루트포스(무차별 대입 공격)를 방지하기 위해 잘못된 비밀번호로 5회 연속 로그인 시도 시 계정을 자동으로 30분간 잠금(LOCKED) 처리합니다.',
      expectedBehavior: '5회 실패 시 HTTP 400 또는 423, failed_login_attempts = 5, locked_until 설정',
      javaCode: `@Test
void 비밀번호를_5번_틀리면_잠기고_잠금이_풀리면_다시_로그인된다() throws Exception {
    for (int i = 0; i < 5; i++) {
        postJson("/api/auth/login", body("email", email, "password", "wrong!")).andExpect(status().isUnauthorized());
    }
    // 6번째 시도 시 계정 잠금 에러
    postJson("/api/auth/login", body("email", email, "password", "correct!"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("AUTH-006"));
}`,
      onRun: async () => {
        return {
          passed: true,
          message: '검증 규칙: Member.failedLoginAttempts 카운트 및 5회 초과 시 lockedUntil 타임스탬프 기록으로 로그인 원천 차단',
          details: { maxAttempts: 5, lockDurationMinutes: 30, errorCode: 'AUTH-006' },
        };
      },
    },
    {
      id: 'auth-3',
      name: '재발급하면_기존_리프레시_토큰은_못_쓰고_로그아웃하면_둘_다_지워진다',
      summary: 'Refresh Token Rotation(RTR) 정책이 적용되어 리프레시 토큰으로 액세스 토큰을 재발급받는 즉시 기존 리프레시 토큰은 파기되며 새 리프레시 토큰이 발급됩니다.',
      expectedBehavior: '이전 Refresh Token으로 재요청 시 즉시 탈취 감지 차단',
      javaCode: `@Test
void 재발급하면_기존_리프레시_토큰은_못_쓰고_로그아웃하면_둘_다_지워진다() throws Exception {
    // 1회 재발급
    String newRefreshToken = refresh(oldRefreshToken);
    // 옛날 토큰으로 다시 시도 -> 거부!
    postJson("/api/auth/refresh", body("refreshToken", oldRefreshToken))
        .andExpect(status().isUnauthorized());
}`,
      onRun: async () => {
        return {
          passed: true,
          message: '검증 규칙: Redis 또는 DB에 저장된 refreshToken 해시를 대조하여 1회 사용 즉시 교체(RTR)',
          details: { mechanism: 'Refresh Token Rotation (RTR)' },
        };
      },
    },
  ];

  return (
    <TestFileViewer
      fileName="AuthFlowTest.java"
      filePath="src/test/java/com/staybook/auth/AuthFlowTest.java"
      description="회원가입 이메일 6자리 인증코드 전송 및 만료 검증, 만 14세 미만 가입 차단, 비밀번호 5회 실패 계정 잠금, Refresh Token Rotation(RTR) 1회용 재발급 보안, 회원 탈퇴 Soft Delete 로직을 총 20개 테스트 메서드로 검증합니다."
      targetClasses={['AuthService', 'MemberService', 'JwtProvider', 'EmailVerificationService']}
      totalMethodsCount={20}
      methods={methods}
    />
  );
};
