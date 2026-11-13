import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBaseUrl, setBaseUrl } from '../api/client';

export type TabType =
  | 'scenario'
  | 'auth'
  | 'host'
  | 'accommodation'
  | 'reservation'
  | 'test-lab'
  | 'review'
  | 'storage';

interface NavbarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  const { user, isLoggedIn, logout, refreshTokens, fetchMe } = useAuth();
  const [baseUrlInput, setBaseUrlInput] = useState(getBaseUrl());
  const [showConfig, setShowConfig] = useState(false);

  const handleSaveBaseUrl = () => {
    setBaseUrl(baseUrlInput);
    alert(`백엔드 주소가 ${baseUrlInput}로 변경되었습니다.`);
    setShowConfig(false);
  };

  const navItems: { id: TabType; label: string; icon: string }[] = [
    { id: 'scenario', label: '전체 플로우 가이드', icon: '🚀' },
    { id: 'auth', label: '인증 / 회원', icon: '🔑' },
    { id: 'host', label: '호스트 관리', icon: '🏨' },
    { id: 'accommodation', label: '숙소 탐색', icon: '🔍' },
    { id: 'reservation', label: '예약 & 결제', icon: '💳' },
    { id: 'test-lab', label: '🧪 예약·결제 테스트 랩', icon: '🧪' },
    { id: 'review', label: '리뷰 & Spotify', icon: '⭐' },
    { id: 'storage', label: '이미지 업로드', icon: '🖼️' },
  ];

  return (
    <header className="navbar-container">
      <div className="navbar-top">
        <div className="navbar-brand">
          <span className="logo-icon">🌿</span>
          <div>
            <h1 className="brand-title">StayBook API Test Client</h1>
            <span className="brand-sub">Project Preen Backend Verification UI</span>
          </div>
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

      {/* 탭 네비게이션 */}
      <nav className="tab-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`tab-btn ${currentTab === item.id ? 'active' : ''}`}
            onClick={() => onSelectTab(item.id)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
};
