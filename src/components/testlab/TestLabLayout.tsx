import React, { useState } from 'react';
import { ReservationPaymentTestTab } from './tabs/ReservationPaymentTestTab';
import { HostAccommodationTestTab } from './tabs/HostAccommodationTestTab';
import { InventoryTestTab } from './tabs/InventoryTestTab';
import { AuthFlowTestTab } from './tabs/AuthFlowTestTab';
import { ReviewFavoriteTestTab } from './tabs/ReviewFavoriteTestTab';
import { ImageUploadTestTab } from './tabs/ImageUploadTestTab';
import { FullScenarioTestTab } from './tabs/FullScenarioTestTab';
import {
  CreditCard,
  Building,
  Package,
  KeyRound,
  Star,
  Image as ImageIcon,
  Workflow,
  ArrowLeft,
  FlaskConical,
} from 'lucide-react';

export type TestLabTabType =
  | 'reservation-payment'
  | 'host-accommodation'
  | 'inventory'
  | 'auth-flow'
  | 'review-favorite'
  | 'image-upload'
  | 'full-scenario';

interface TestLabLayoutProps {
  onBackToMainApp: () => void;
}

export const TestLabLayout: React.FC<TestLabLayoutProps> = ({ onBackToMainApp }) => {
  const [activeTab, setActiveTab] = useState<TestLabTabType>('reservation-payment');

  const testLabNavItems: {
    id: TestLabTabType;
    label: string;
    subLabel: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      id: 'reservation-payment',
      label: 'ReservationPaymentTest',
      subLabel: '예약·결제·환불 (24)',
      icon: <CreditCard size={18} />,
      color: '#0284c7',
    },
    {
      id: 'host-accommodation',
      label: 'HostAccommodationTest',
      subLabel: '숙소·공개규칙 (21)',
      icon: <Building size={18} />,
      color: '#8b5cf6',
    },
    {
      id: 'inventory',
      label: 'InventoryTest',
      subLabel: '재고·동시성 락 (15)',
      icon: <Package size={18} />,
      color: '#059669',
    },
    {
      id: 'auth-flow',
      label: 'AuthFlowTest',
      subLabel: '인증·계정잠금 (20)',
      icon: <KeyRound size={18} />,
      color: '#d97706',
    },
    {
      id: 'review-favorite',
      label: 'ReviewFavoriteTest',
      subLabel: '리뷰자격·음악 (10)',
      icon: <Star size={18} />,
      color: '#eab308',
    },
    {
      id: 'image-upload',
      label: 'ImageUploadTest',
      subLabel: '스토리지·확장자 (6)',
      icon: <ImageIcon size={18} />,
      color: '#ec4899',
    },
    {
      id: 'full-scenario',
      label: 'FullScenarioTest',
      subLabel: '통합 E2E 플로우 (3)',
      icon: <Workflow size={18} />,
      color: '#10b981',
    },
  ];

  return (
    <div className="testlab-container" style={{ paddingBottom: '80px' }}>
      {/* 테스트 랩 전용 상단 헤더 & Nav 바 */}
      <div
        style={{
          background: '#0f172a',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={onBackToMainApp}
              className="btn-outline-sm"
              style={{
                background: '#1e293b',
                color: '#38bdf8',
                borderColor: '#334155',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
              }}
            >
              <ArrowLeft size={14} /> 메인 API 클라이언트로 돌아가기
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FlaskConical size={22} color="#38bdf8" />
              <h2 style={{ margin: 0, fontSize: '18px', color: '#ffffff' }}>백엔드 단위·통합 테스트 랩 (Test Lab)</h2>
            </div>
          </div>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            총 <strong>7개 테스트 파일</strong> / <strong>99개 단위 테스트 케이스</strong> 탑재
          </span>
        </div>

        {/* 테스트 파일 전용 Nav 메뉴 */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '4px',
            borderTop: '1px solid #1e293b',
            paddingTop: '12px',
          }}
        >
          {testLabNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  background: isActive ? item.color : '#1e293b',
                  color: isActive ? '#ffffff' : '#cbd5e1',
                  border: isActive ? `1px solid ${item.color}` : '1px solid #334155',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  boxShadow: isActive ? '0 2px 8px rgba(0, 0, 0, 0.2)' : 'none',
                }}
              >
                <span style={{ color: isActive ? '#ffffff' : item.color }}>{item.icon}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: '11px', opacity: 0.8 }}>{item.subLabel}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 활성화된 테스트 파일 컴포넌트 렌더링 */}
      <main>
        {activeTab === 'reservation-payment' && <ReservationPaymentTestTab />}
        {activeTab === 'host-accommodation' && <HostAccommodationTestTab />}
        {activeTab === 'inventory' && <InventoryTestTab />}
        {activeTab === 'auth-flow' && <AuthFlowTestTab />}
        {activeTab === 'review-favorite' && <ReviewFavoriteTestTab />}
        {activeTab === 'image-upload' && <ImageUploadTestTab />}
        {activeTab === 'full-scenario' && <FullScenarioTestTab />}
      </main>
    </div>
  );
};
