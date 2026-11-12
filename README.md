# StayBook API Verification Client (pp-front)

`project-preen` 백엔드의 전체 API 비즈니스 흐름을 검증하고 테스트할 수 있는 **React + TypeScript** 기반의 경량화 테스트 프론트엔드입니다.

---

## 🚀 주요 기능 및 API 흐름 검증 탭

1. **전체 플로우 가이드 (Scenario Guide)**
   - 백엔드의 10단계 핵심 사이클 (가입 → 로그인 → 사업자등록/호스트전환 → 숙소/객실등록 → 재고설정 → 게스트 숙소조회 → 예약생성 → 결제승인/확정 → 취소/환불 → 체크아웃 후 리뷰/음악 등록)을 단계별로 안내 및 빠른 이동 지원

2. **인증 / 회원 (Auth & User & Terms)**
   - `GET /api/terms`: 약관 목록 조회 및 동의
   - `GET /api/auth/check-email`: 이메일 중복 확인
   - `POST /api/auth/email/resend`, `POST /api/auth/email/verify`: 이메일 인증코드 발송 및 검증
   - `POST /api/auth/signup`: 회원가입 (만 14세 이상 체크)
   - `POST /api/auth/login`: JWT Access/Refresh 토큰 수령 및 자동 헤더 주입
   - `GET /api/users/me`, `PATCH /api/users/me`, `DELETE /api/users/me`: 내 정보 조회/수정 및 탈퇴
   - `POST /api/auth/refresh`, `POST /api/auth/logout`: 토큰 재발급 및 로그아웃
   - `POST /api/auth/password/forgot`, `POST /api/auth/password/reset`: 비밀번호 찾기/재설정

3. **호스트 관리 (Host & Accommodation & Inventory)**
   - `POST /api/host-businesses`: 사업자 번호 등록 → 즉시 HOST 역할 승격 및 새 AccessToken 자동 반영
   - `GET /api/host/business`: 본인 사업자 등록 정보 조회
   - `POST /api/host/accommodations`: 숙소 신규 등록
   - `POST /api/host/accommodations/{id}/rooms`: 객실 등록 (기준/최대 인원, 1박 요금, 추가인원 요금)
   - `PUT /api/host/accommodations/{id}/refund-policy`: 환불 정책 설정 (일자별 환불율 규칙)
   - `PUT /api/host/rooms/{roomId}/inventories`: 일자 범위별 수량/가격/판매마감 일괄 설정
   - `GET /api/host/reservations`: 호스트 소유 숙소에 접수된 예약 목록 조회
   - `POST /api/host/reviews/{id}/reply`: 게스트 리뷰에 대한 호스트 답글 작성

4. **숙소 탐색 (Accommodation & Availability & Favorite)**
   - `GET /api/regions`, `GET /api/categories`, `GET /api/amenities`: 메타데이터 조회
   - `GET /api/accommodations`: 지역, 카테고리, 인원별 숙소 검색 (LISTED 숙소 및 최저가 표시)
   - `GET /api/accommodations/{id}`: 숙소 상세정보 (객실, 편의시설, 환불정책)
   - `GET /api/accommodations/{id}/availability`: 체크인/체크아웃 날짜별 객실 잔여 여부 및 총 요금 자동 계산
   - `POST /api/favorites/{id}`, `DELETE /api/favorites/{id}`, `GET /api/favorites/me`: 숙소 찜하기 / 찜 해제 / 내 찜 목록

5. **예약 & 결제 사이클 (Reservation & Payment)**
   - `POST /api/reservations`: 예약 생성 (PENDING 상태 및 10분 재고 HOLD)
   - `GET /api/reservations/me`, `GET /api/reservations/{id}`: 내 예약 목록 및 상세 명세 (객실 요금 + 추가인원 요금 항목 분리)
   - `POST /api/payments/prepare`: 결제 준비 및 고유 `orderId` 발급
   - `POST /api/payments/confirm`: PG 결제 승인 요청 → 결제 완료(PAID) 및 예약 확정(CONFIRMED)
   - `POST /api/reservations/{id}/cancel`: 예약 취소 → 체크인 잔여 일수에 따른 환불율, 환불액, 위약금 자동 계산 및 환불

6. **리뷰 & Spotify (Review & Spotify & Image)**
   - `GET /api/accommodations/{id}/reviews`: 숙소별 게스트 리뷰 및 호스트 답글 목록
   - `POST /api/reviews`: 숙박 완료(COMPLETED) 예약에 대한 평점, 내용, Spotify 음악 태그 리뷰 작성
   - `PATCH /api/reviews/{id}`, `DELETE /api/reviews/{id}`: 리뷰 수정 및 삭제
   - `GET /api/spotify/tracks/search`: Spotify 곡 검색 및 원클릭 태그 + Spotify Embed 플레이어 미리보기
   - `POST /api/images`: 멀티파트 이미지 업로드 및 URL 발급

7. **실시간 API Inspector 콘솔 (하단 도크)**
   - 모든 API 요청(Method, URL, Request Body, Headers)과 응답(Status Code, Response Body, 처리 시간 ms)을 실시간으로 감지하여 기록
   - 언제든지 클릭하여 원클릭 JSON 복사 및 통신 디버깅 가능

---

## 🏃 실행 방법

```bash
# 1. 의존성 설치 (최초 1회)
npm install

# 2. 개발 서버 구동 (기본 포트 3000)
npm run dev
```

브라우저에서 `http://localhost:3000`에 접속하면 바로 사용할 수 있습니다.
상단 네비게이션의 [설정] 버튼을 통해 백엔드 Base URL(`http://localhost:8080`)을 언제든 변경할 수 있습니다.
