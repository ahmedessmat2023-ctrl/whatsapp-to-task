/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { SimulatorModal } from './components/SimulatorModal';
import { TaskDetailDrawer } from './components/TaskDetailDrawer';

import { DashboardView } from './views/DashboardView';
import { LiveCaptureView } from './views/LiveCaptureView';
import { ReviewInboxView } from './views/ReviewInboxView';
import { TaskTrackerView } from './views/TaskTrackerView';
import { VoiceNotesView } from './views/VoiceNotesView';
import { MonitoredGroupsView } from './views/MonitoredGroupsView';
import { PeopleMappingView } from './views/PeopleMappingView';
import { ProjectsView } from './views/ProjectsView';
import { AnalyticsView } from './views/AnalyticsView';
import { DiagnosticsView } from './views/DiagnosticsView';
import { AutomationRulesView } from './views/AutomationRulesView';
import { SettingsView } from './views/SettingsView';

const MainLayout: React.FC = () => {
  const { currentTab, isDarkMode } = useApp();

  const renderCurrentView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'live_capture':
        return <LiveCaptureView />;
      case 'inbox':
        return <ReviewInboxView />;
      case 'tasks':
        return <TaskTrackerView />;
      case 'voice_notes':
        return <VoiceNotesView />;
      case 'groups':
        return <MonitoredGroupsView />;
      case 'people':
        return <PeopleMappingView />;
      case 'projects':
        return <ProjectsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'diagnostics':
        return <DiagnosticsView />;
      case 'rules':
        return <AutomationRulesView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans antialiased ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50/70 text-slate-900'}`}>
      <div className="flex flex-1 overflow-hidden h-screen">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {renderCurrentView()}
            </div>
          </main>
        </div>
      </div>

      {/* Global Interactive Elements */}
      <SimulatorModal />
      <TaskDetailDrawer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
