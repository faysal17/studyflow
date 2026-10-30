import React, { useEffect, useState } from 'react';
import { initializeDatabase } from './db';
import { useAppStore } from './store/useAppStore';
import { Sidebar } from './components/navigation/Sidebar';
import { TodayView } from './components/views/TodayView';
import { TomorrowView } from './components/views/TomorrowView';
import { UpcomingView } from './components/views/UpcomingView';
import { ThisWeekView } from './components/views/ThisWeekView';
import { BacklogView } from './components/views/BacklogView';
import { MatrixView } from './components/views/MatrixView';
import { PerformanceView } from './components/views/PerformanceView';
import { ArchiveView } from './components/views/ArchiveView';
import { QuickAddModal } from './components/common/QuickAddModal';
import { PerPassScheduleModal } from './components/common/PerPassScheduleModal';
import { SyncModal } from './components/sync/SyncModal';

export function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const { activeView, toastMessage, toastAction, clearToast } = useAppStore();

  useEffect(() => {
    initializeDatabase()
      .then(() => setIsDbReady(true))
      .catch((err) => {
        console.error('Failed to initialize database:', err);
        setIsDbReady(true);
      });
  }, []);

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-[#0a0b0e] flex items-center justify-center text-xs text-[#71717a] font-mono">
        Starting StudyFlow...
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[#0a0b0e] text-[#f4f4f5] antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* 260px Fixed Sidebar */}
      <Sidebar />

      {/* Main Content Canvas (Fluid desktop layout with dedicated scroll container) */}
      <div className="flex-1 md:pl-[260px] h-full overflow-y-auto relative flex flex-col">
        <main className="flex-1 w-full flex flex-col pb-16">
          {activeView === 'today' && <TodayView />}
          {activeView === 'tomorrow' && <TomorrowView />}
          {activeView === 'upcoming' && <UpcomingView />}
          {activeView === 'this_week' && <ThisWeekView />}
          {activeView === 'backlog' && <BacklogView />}
          {activeView === 'matrix' && <MatrixView />}
          {activeView === 'performance' && <PerformanceView />}
          {activeView === 'archive' && <ArchiveView />}
        </main>
      </div>

      {/* Subtle Toast Notification with Undo Action */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="bg-[#12141a] border border-[#2c3142] text-zinc-200 text-xs py-2 px-3.5 rounded-lg shadow-2xl flex items-center gap-3">
            <span className="font-medium max-w-xs truncate">{toastMessage}</span>
            {toastAction && (
              <button
                type="button"
                onClick={async () => {
                  await toastAction.onClick();
                  clearToast();
                }}
                className="font-semibold text-emerald-400 hover:text-emerald-300 hover:underline px-1.5 py-0.5 rounded text-xs transition-colors cursor-pointer select-none"
              >
                {toastAction.label}
              </button>
            )}
            <button 
              type="button"
              onClick={clearToast} 
              className="text-[#71717a] hover:text-[#f4f4f5] text-xs cursor-pointer p-0.5 transition-colors"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <QuickAddModal />
      <PerPassScheduleModal />
      <SyncModal />
    </div>
  );
}

export default App;
