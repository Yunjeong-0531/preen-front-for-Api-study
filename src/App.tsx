import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ApiLogProvider } from './context/ApiLogContext';
import { Navbar, TabType } from './components/Navbar';
import { ApiLoggerDrawer } from './components/ApiLoggerDrawer';

// 일반 기능 탭
import { ScenarioGuideTab } from './components/tabs/ScenarioGuideTab';
import { AuthTab } from './components/tabs/AuthTab';
import { HostTab } from './components/tabs/HostTab';
import { AccommodationTab } from './components/tabs/AccommodationTab';
import { ReservationPaymentTab } from './components/tabs/ReservationPaymentTab';
import { ReviewTab } from './components/tabs/ReviewTab';
import { StorageTab } from './components/tabs/StorageTab';

// 단위·통합 테스트 탭 (1:1 매핑)
import { FullScenarioTestTab } from './components/testlab/tabs/FullScenarioTestTab';
import { AuthFlowTestTab } from './components/testlab/tabs/AuthFlowTestTab';
import { HostAccommodationTestTab } from './components/testlab/tabs/HostAccommodationTestTab';
import { InventoryTestTab } from './components/testlab/tabs/InventoryTestTab';
import { ReservationPaymentTestTab } from './components/testlab/tabs/ReservationPaymentTestTab';
import { ReviewFavoriteTestTab } from './components/testlab/tabs/ReviewFavoriteTestTab';
import { ImageUploadTestTab } from './components/testlab/tabs/ImageUploadTestTab';

import './App.css';

export const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('toss_status') || query.get('paymentKey')) {
      return 'reservation';
    }
    return 'scenario';
  });

  return (
    <div className="app-layout">
      <Navbar currentTab={currentTab} onSelectTab={setCurrentTab} />

      <main className="main-content">
        {/* 일반 기능 모드 뷰 */}
        {currentTab === 'scenario' && <ScenarioGuideTab onNavigateTab={setCurrentTab} />}
        {currentTab === 'auth' && <AuthTab />}
        {currentTab === 'host' && <HostTab />}
        {currentTab === 'accommodation' && <AccommodationTab />}
        {currentTab === 'reservation' && <ReservationPaymentTab />}
        {currentTab === 'review' && <ReviewTab />}
        {currentTab === 'storage' && <StorageTab />}

        {/* 🧪 테스트 코드 모드 뷰 (각 메뉴 위치에 정확히 1:1 매핑!) */}
        {currentTab === 'test-scenario' && <FullScenarioTestTab />}
        {currentTab === 'test-auth' && <AuthFlowTestTab />}
        {currentTab === 'test-host' && <HostAccommodationTestTab />}
        {currentTab === 'test-accommodation' && <InventoryTestTab />}
        {currentTab === 'test-reservation' && <ReservationPaymentTestTab />}
        {currentTab === 'test-review' && <ReviewFavoriteTestTab />}
        {currentTab === 'test-storage' && <ImageUploadTestTab />}
      </main>

      <ApiLoggerDrawer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ApiLogProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ApiLogProvider>
  );
};

export default App;
