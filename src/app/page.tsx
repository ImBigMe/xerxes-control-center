'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Dashboard } from '@/components/screens/Dashboard';
import { TaskBoard } from '@/components/screens/TaskBoard';
import { ContentPipeline } from '@/components/screens/ContentPipeline';
import { Calendar } from '@/components/screens/Calendar';
import { MemoryScreen } from '@/components/screens/MemoryScreen';
import { TeamStructure } from '@/components/screens/TeamStructure';
import { AnalyticsDashboard } from '@/components/screens/AnalyticsDashboard';
import { ShellSelector } from '@/components/screens/ShellSelector';
import { ClawManager } from '@/components/screens/ClawManager';
import { ApiUsage } from '@/components/screens/ApiUsage';
import { SetupWizard } from '@/components/screens/SetupWizard';
import { PasswordGate } from '@/components/screens/PasswordGate';
import { useMissionControl } from '@/lib/store';

const screens: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  tasks: TaskBoard,
  pipeline: ContentPipeline,
  calendar: Calendar,
  memory: MemoryScreen, api: ApiUsage,
  team: TeamStructure,
  analytics: AnalyticsDashboard,
  shells: ShellSelector,
  claws: ClawManager,
  wizard: SetupWizard,
};

export default function MissionControlPage() {
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const activeScreen = useMissionControl((s) => s.activeScreen);
  const wizardCompleted = useMissionControl((s) => s.wizardCompleted);
  const claws = useMissionControl((s) => s.claws);

  useEffect(() => {
    setIsClient(true);
    // Check if already authenticated
    const auth = localStorage.getItem('xerxes_authenticated') === 'true';
    setIsAuthenticated(auth);
  }, []);

  const handleUnlock = () => {
    setIsAuthenticated(true);
  };

  // Don't render until client-side to avoid hydration mismatch
  if (!isClient) {
    return null;
  }

  // Show password gate if not authenticated
  if (!isAuthenticated) {
    return <PasswordGate onUnlock={handleUnlock} />;
  }

  // Gate: if no claws connected and wizard not completed, force wizard
  const needsSetup = !wizardCompleted && claws.length === 0;
  const ActiveScreen = needsSetup ? SetupWizard : (screens[activeScreen] || Dashboard);

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--shell-gradient)' }}>
      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* Sidebar — hidden during initial setup */}
      {!needsSetup && <Sidebar />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10 min-w-0">
        {!needsSetup && <Header />}
        <main className="flex-1 overflow-y-auto p-3 md:p-6">
          <ActiveScreen />
        </main>
      </div>
    </div>
  );
}
