import React, { useState } from 'react';
import { ViewState } from './types';
import { Layout } from './components/Layout';
import Generator from './views/Generator';
import CameraStation from './views/CameraStation';
import Evaluator from './views/Evaluator';
import Dashboard from './views/Dashboard';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);

  const renderView = () => {
    switch (currentView) {
      case ViewState.GENERATOR:
        return <Generator />;
      case ViewState.CAMERA:
        return <CameraStation />;
      case ViewState.EVALUATOR:
        return <Evaluator />;
      case ViewState.DASHBOARD:
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentView={currentView} onNavigate={setCurrentView}>
      {renderView()}
    </Layout>
  );
};

export default App;