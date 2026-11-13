import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ApiLogProvider } from './context/ApiLogContext';
import { Navbar, TabType } from './components/Navbar';
import { ApiLoggerDrawer } from './components/ApiLoggerDrawer';
import { ScenarioGuideTab } from './components/tabs/ScenarioGuideTab';
import { AuthTab } from './components/tabs/AuthTab';
import { HostTab } from './components/tabs/HostTab';
import { AccommodationTab } from './components/tabs/AccommodationTab';
import { ReservationPaymentTab } from './components/tabs/ReservationPaymentTab';
import { TestLabLayout } from './components/testlab/TestLabLayout';
import { ReviewTab } from './components/tabs/ReviewTab';
import { StorageTab } from './components/tabs/StorageTab';
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
        {currentTab === 'scenario' && <ScenarioGuideTab onNavigateTab={setCurrentTab} />}
        {currentTab === 'auth' && <AuthTab />}
        {currentTab === 'host' && <HostTab />}
        {currentTab === 'accommodation' && <AccommodationTab />}
        {currentTab === 'reservation' && <ReservationPaymentTab />}
        {currentTab === 'test-lab' && <TestLabLayout onBackToMainApp={() => setCurrentTab('scenario')} />}
        {currentTab === 'review' && <ReviewTab />}
        {currentTab === 'storage' && <StorageTab />}
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
