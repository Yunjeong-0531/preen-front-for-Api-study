import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBaseUrl, setBaseUrl } from '../api/client';
import { FlaskConical, ArrowRightLeft } from 'lucide-react';

export type TabType =
  // 일반 기능 모드
  | 'scenario'
  | 'auth'
  | 'host'
  | 'accommodation'
  | 'reservation'
  | 'review'
  | 'storage'
  // 테스트 코드 모드 (각 위치 1:1 매핑)
  | 'test-scenario'
  | 'test-auth'
  | 'test-host'
  | 'test-accommodation'
  | 'test-reservation'
  | 'test-review'
  | 'test-storage';

interface NavbarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  const { user, isLoggedIn, logout, refreshTokens, fetchMe } = useAuth();
  const [baseUrlInput, setBaseUrlInput] = useState(getBaseUrl());
  const [showConfig, setShowConfig] = useState(false);

  // 현재 탭이 테스트 모드인지 여부 판별
  const isTestMode = currentTab.startsWith('test-');

  const handleSaveBaseUrl = () => {
    setBaseUrl(baseUrlInput);
    alert(`백엔드 주소가 ${baseUrlInput}로 변경되었습니다.`);
    setShowConfig(false);
  };

  // 1:1 탭 전환 매핑 테이블
  const toggleMap: Record<string, TabType> = {
    scenario: 'test-scenario',
    auth: 'test-auth',
    host: 'test-host',
    accommodation: 'test-accommodation',
    reservation: 'test-reservation',
    review: 'test-review',
    storage: 'test-storage',
    'test-scenario': 'scenario',
    'test-auth': 'auth',
    'test-host': 'host',
    'test-accommodation': 'accommodation',
    'test-reservation': 'reservation',
    'test-review': 'review',
    'test-storage': 'storage',
  };

  const handleToggleMode = () => {
    const nextTab = toggleMap[currentTab] || (isTestMode ? 'scenario' : 'test-scenario');
    onSelectTab(nextTab);
  };

  // 일반 기능 메뉴
  const standardNavItems: { id: TabType; label: string; icon: string }[] = [
    { id: 'scenario', label: '전체 플로우 가이드', icon: '🚀' },
    { id: 'auth', label: '인증 / 회원', icon: '🔑' },
    { id: 'host', label: '호스트 관리', icon: '🏨' },
    { id: 'accommodation', label: '숙소 탐색', icon: '🔍' },
    { id: 'reservation', label: '예약 & 결제', icon: '💳' },
    { id: 'review', label: '리뷰 & Spotify', icon: '⭐' },
    { id: 'storage', label: '이미지 업로드', icon: '🖼️' },
  ];

  // 테스트 코드 메뉴 (각 위치에 정확히 1:1 매칭!)
  const testNavItems: { id: TabType; label: string; icon: string }[] = [
    { id: 'test-scenario', label: 'FullScenarioTest', icon: '🚀' },
    { id: 'test-auth', label: 'AuthFlowTest', icon: '🔑' },
    { id: 'test-host', label: 'HostAccommodationTest', icon: '🏨' },
    { id: 'test-accommodation', label: 'InventoryTest', icon: '🔍' },
    { id: 'test-reservation', label: 'ReservationPaymentTest', icon: '💳' },
    { id: 'test-review', label: 'ReviewFavoriteTest', icon: '⭐' },
    { id: 'test-storage', label: 'ImageUploadTest', icon: '🖼️' },
  ];

  const currentNavItems = isTestMode ? testNavItems : standardNavItems;

  return (
    <header className="navbar-container">
      <div className="navbar-top">
        <div className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span className="logo-icon">🌿</span>
          <div>
            <h1 className="brand-title">StayBook API Test Client</h1>
            <span className="brand-sub">Project Preen Backend Verification UI</span>
          </div>

          {/* 🌿 로고 옆 테스트 모드 토글 버튼 */}
          <button
            onClick={handleToggleMode}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: isTestMode ? '1px solid #38bdf8' : '1px solid #cbd5e1',
              background: isTestMode ? '#0284c7' : '#f1f5f9',
              color: isTestMode ? '#ffffff' : '#334155',
              boxShadow: isTestMode ? '0 0 12px rgba(2, 132, 199, 0.4)' : 'none',
            }}
            title={isTestMode ? '일반 API 기능 모드로 전환' : '백엔드 테스트 코드 실습 모드로 전환'}
          >
            <FlaskConical size={16} />
            <span>{isTestMode ? '🧪 테스트 코드 모드 ON' : '🧪 단위 테스트 보기'}</span>
            <ArrowRightLeft size={13} style={{ opacity: 0.7, marginLeft: '2px' }} />
          </button>
        </div>

        <div className="navbar-user-section">
          <button
            className="btn-outline-sm"
            onClick={() => setShowConfig(!showConfig)}
            title="서버 주소 설정"
          >
            ⚙️ 설정 ({getBaseUrl()})
          </button>

          {isLoggedIn ? (
            <div className="user-profile-badge">
              <span className={`role-pill role-${user?.role?.toLowerCase() || 'guest'}`}>
                {user?.role || 'USER'}
              </span>
              <span className="user-name">{user?.name || '사용자'}</span>
              <span className="user-email">({user?.email})</span>
              <button className="btn-sm btn-ghost" onClick={fetchMe} title="내 정보 새로고침">
                🔄
              </button>
              <button className="btn-sm btn-ghost" onClick={refreshTokens} title="토큰 갱신">
                🔑 토큰갱신
              </button>
              <button className="btn-sm btn-danger" onClick={logout}>
                로그아웃
              </button>
            </div>
          ) : (
            <div className="guest-badge">
              <span className="role-pill role-none">비로그인</span>
              <button className="btn-sm btn-primary" onClick={() => onSelectTab('auth')}>
                로그인 / 가입하기
              </button>
            </div>
          )}
        </div>
      </div>

      {showConfig && (
        <div className="config-banner">
          <label>백엔드 API Server Base URL:</label>
          <input
            type="text"
            value={baseUrlInput}
            onChange={(e) => setBaseUrlInput(e.target.value)}
            style={{ width: '280px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button className="btn-sm btn-primary" onClick={handleSaveBaseUrl}>
            저장
          </button>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            (기본값: http://localhost:8080)
          </span>
        </div>
      )}

      {/* 탭 네비게이션 (모드에 따라 해당 위치에 각각 1:1로 테스트 파일 매핑!) */}
      <nav
        className="tab-nav"
        style={{
          borderBottom: isTestMode ? '2px solid #0284c7' : '1px solid #e2e8f0',
          background: isTestMode ? '#f0f9ff' : 'transparent',
          transition: 'background 0.2s',
        }}
      >
        {currentNavItems.map((item) => (
          <button
            key={item.id}
            className={`tab-btn ${currentTab === item.id ? 'active' : ''}`}
            onClick={() => onSelectTab(item.id)}
            style={{
              borderColor: isTestMode && currentTab === item.id ? '#0284c7' : undefined,
              fontWeight: isTestMode ? 600 : undefined,
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
};
