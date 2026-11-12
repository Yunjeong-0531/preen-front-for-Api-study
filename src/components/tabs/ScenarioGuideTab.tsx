import React from 'react';
import { TabType } from '../Navbar';

interface ScenarioGuideTabProps {
  onNavigateTab: (tab: TabType) => void;
}

export const ScenarioGuideTab: React.FC<ScenarioGuideTabProps> = ({ onNavigateTab }) => {
  const steps = [
    {
      num: 1,
      title: '약관 확인 & 이메일 인증 & 회원가입',
      role: 'GUEST / HOST',
      desc: 'GET /api/terms로 약관을 조회하고, POST /api/auth/signup으로 회원가입을 진행합니다.',
      tab: 'auth' as TabType,
      apis: ['GET /api/terms', 'GET /api/auth/check-email', 'POST /api/auth/email/resend', 'POST /api/auth/signup'],
    },
    {
      num: 2,
      title: '로그인 및 토큰 발급',
      role: '공통',
      desc: 'POST /api/auth/login으로 JWT Access / Refresh Token을 발급받아 브라우저에 저장하고 인증 헤더를 활성화합니다.',
      tab: 'auth' as TabType,
      apis: ['POST /api/auth/login', 'GET /api/users/me', 'POST /api/auth/refresh'],
    },
    {
      num: 3,
      title: '사업자 등록 (호스트 권한 획득)',
      role: 'HOST 준비 회원',
      desc: 'POST /api/host-businesses로 사업자 번호를 등록하면 즉시 HOST 역할이 부여되고 호스트 권한의 새 토큰을 수령합니다.',
      tab: 'host' as TabType,
      apis: ['POST /api/host-businesses', 'GET /api/host/business'],
    },
    {
      num: 4,
      title: '숙소 / 객실 / 환불정책 등록',
      role: 'HOST',
      desc: '호스트가 새 숙소를 등록하고, 객실(가격/수용인원), 환불정책(일자별 환불율)을 설정합니다.',
      tab: 'host' as TabType,
      apis: ['POST /api/host/accommodations', 'POST /api/host/accommodations/{id}/rooms', 'PUT /api/host/accommodations/{id}/refund-policy'],
    },
    {
      num: 5,
      title: '객실 일자별 재고 / 요금 설정',
      role: 'HOST',
      desc: 'PUT /api/host/rooms/{roomId}/inventories를 통해 날짜 범위별 판매 수량과 박당 가격, 판매 마감 여부를 설정합니다.',
      tab: 'host' as TabType,
      apis: ['PUT /api/host/rooms/{roomId}/inventories'],
    },
    {
      num: 6,
      title: '게스트 숙소 탐색 & 날짜별 요금/예약가능 여부 조회',
      role: 'GUEST (공개 조회)',
      desc: '지역, 카테고리, 인원별로 숙소를 검색하고, 체크인/체크아웃 날짜별 객실의 잔여 수량 및 총 숙박 요금을 계산 조회합니다.',
      tab: 'accommodation' as TabType,
      apis: ['GET /api/accommodations', 'GET /api/accommodations/{id}', 'GET /api/accommodations/{id}/availability', 'POST/DELETE /api/favorites/{id}'],
    },
    {
      num: 7,
      title: '예약 생성 (PENDING & 재고 선점 10분)',
      role: 'GUEST (성인)',
      desc: 'POST /api/reservations로 원하는 객실과 날짜, 인원을 예약합니다. 재고가 10분 동안 HOLD되며 holdExpiresAt이 부여됩니다.',
      tab: 'reservation' as TabType,
      apis: ['POST /api/reservations', 'GET /api/reservations/me', 'GET /api/reservations/{id}'],
    },
    {
      num: 8,
      title: '결제 준비 & 승인 (예약 CONFIRMED 확정)',
      role: 'GUEST',
      desc: 'POST /api/payments/prepare로 orderId를 발급받고, POST /api/payments/confirm으로 PG 승인을 요청하여 결제 성공(PAID)과 예약 확정(CONFIRMED)을 마칩니다.',
      tab: 'reservation' as TabType,
      apis: ['POST /api/payments/prepare', 'POST /api/payments/confirm'],
    },
    {
      num: 9,
      title: '예약 취소 및 환불 계산 (선택)',
      role: 'GUEST',
      desc: 'POST /api/reservations/{id}/cancel을 호출하면 체크인 잔여 일수에 따른 환불 규정(환불율)에 맞춰 환불금과 위약금이 계산되고 자동 취소/환불됩니다.',
      tab: 'reservation' as TabType,
      apis: ['POST /api/reservations/{id}/cancel', 'GET /api/host/reservations'],
    },
    {
      num: 10,
      title: '체크아웃 완료 후 리뷰 작성 & 음악 태그',
      role: 'GUEST & HOST',
      desc: '숙박이 완료된(COMPLETED) 예약에 대해 Spotify 음악과 평점/사진이 담긴 리뷰를 작성하고 호스트가 답글을 남깁니다.',
      tab: 'review' as TabType,
      apis: ['GET /api/spotify/tracks/search', 'POST /api/reviews', 'GET /api/accommodations/{id}/reviews', 'POST /api/host/reviews/{id}/reply'],
    },
  ];

  return (
    <div className="tab-pane">
      <div className="section-header">
        <h2>🚀 StayBook 전체 API 라이프사이클 흐름</h2>
        <p className="section-desc">
          StayBook 백엔드의 모든 비즈니스 흐름을 단계별로 검증할 수 있는 로드맵입니다. 각 단계의 [해당 탭으로 이동] 버튼을 눌러 테스트해 보세요.
        </p>
      </div>

      <div className="flow-step-list">
        {steps.map((step) => (
          <div key={step.num} className="flow-step-card">
            <div className="step-badge">{step.num}</div>
            <div className="step-body">
              <div className="step-top">
                <h3 className="step-title">{step.title}</h3>
                <span className="step-role-tag">{step.role}</span>
              </div>
              <p className="step-desc">{step.desc}</p>
              <div className="step-apis">
                {step.apis.map((api, idx) => (
                  <span key={idx} className="api-chip">
                    {api}
                  </span>
                ))}
              </div>
            </div>
            <div className="step-action">
              <button className="btn-primary" onClick={() => onNavigateTab(step.tab)}>
                해당 탭으로 이동 →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
