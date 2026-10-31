import React, { useEffect, useState } from 'react';
import { useAppStore, type MainNavView } from '../../store/useAppStore';
import { useStudyData } from '../../hooks/useStudyData';
import { 
  Sun,
  Sunrise,
  CalendarRange, 
  CalendarDays,
  Layers, 
  TableProperties,
  TrendingUp,
  Archive,
  Plus, 
  Database, 
  Volume2,
  VolumeX,
  Zap,
  Menu,
  X,
  RefreshCw
} from 'lucide-react';
import { playCompletionSound } from '../../utils/soundUtils';

export const Sidebar: React.FC = () => {
  const { 
    activeView, 
    setActiveView, 
    setIsQuickAddOpen, 
    setIsSyncModalOpen,
    soundEnabled,
    setSoundEnabled,
    cloudSyncStatus
  } = useAppStore();

  const { 
    todayTasks,
    tomorrowTasks,
    upcomingTasks,
    thisWeekTopics,
    backlogTopics,
    archiveTopics,
    syllabusCompletionPercentage,
    activeSprintWeekId
  } = useStudyData();

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const formatWeekBadge = (weekId: string) => {
    if (!weekId) return 'Week 44';
    if (weekId.includes('-W')) {
      const parts = weekId.split('-W');
      const num = parseInt(parts[1], 10);
      return !isNaN(num) ? `Week ${num}` : weekId;
    }
    if (weekId.toLowerCase().startsWith('week')) {
      return weekId;
    }
    return `Week ${weekId}`;
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        if (e.key === 'Escape') target.blur();
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setIsQuickAddOpen(true);
      } else if (e.key === '1') {
        e.preventDefault();
        setActiveView('today');
      } else if (e.key === '2') {
        e.preventDefault();
        setActiveView('tomorrow');
      } else if (e.key === '3') {
        e.preventDefault();
        setActiveView('upcoming');
      } else if (e.key === '4') {
        e.preventDefault();
        setActiveView('this_week');
      } else if (e.key === '5') {
        e.preventDefault();
        setActiveView('backlog');
      } else if (e.key === '6') {
        e.preventDefault();
        setActiveView('matrix');
      } else if (e.key === '7') {
        e.preventDefault();
        setActiveView('performance');
      } else if (e.key === '8') {
        e.preventDefault();
        setActiveView('archive');
      } else if (e.key === 'Escape') {
        setIsQuickAddOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveView, setIsQuickAddOpen]);

  const navItems: Array<{ 
    id: MainNavView; 
    label: string; 
    icon: React.ReactNode; 
    shortcut: string;
    count?: number | string;
  }> = [
    { 
      id: 'today', 
      label: 'Today', 
      icon: <Sun className="w-4 h-4" />, 
      shortcut: '1',
      count: todayTasks.length 
    },
    { 
      id: 'tomorrow', 
      label: 'Tomorrow', 
      icon: <Sunrise className="w-4 h-4" />, 
      shortcut: '2',
      count: tomorrowTasks.length 
    },
    { 
      id: 'upcoming', 
      label: 'Upcoming', 
      icon: <CalendarRange className="w-4 h-4" />, 
      shortcut: '3',
      count: upcomingTasks.length 
    },
    { 
      id: 'this_week', 
      label: 'This Week', 
      icon: <CalendarDays className="w-4 h-4" />, 
      shortcut: '4',
      count: thisWeekTopics.length 
    },
    { 
      id: 'backlog', 
      label: 'Syllabus Backlog', 
      icon: <Layers className="w-4 h-4" />, 
      shortcut: '5',
      count: backlogTopics.length 
    },
    { 
      id: 'matrix', 
      label: 'Syllabus Matrix', 
      icon: <TableProperties className="w-4 h-4" />, 
      shortcut: '6',
      count: `${syllabusCompletionPercentage}%`
    },
    { 
      id: 'performance', 
      label: 'Performance', 
      icon: <TrendingUp className="w-4 h-4" />, 
      shortcut: '7' 
    },
    { 
      id: 'archive', 
      label: 'Archive', 
      icon: <Archive className="w-4 h-4" />, 
      shortcut: '8',
      count: archiveTopics.length 
    }
  ];

  return (
    <>
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between h-14 px-4 bg-[#12141a] border-b border-[#222634] sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Zap className="w-3.5 h-3.5 fill-current" />
          </div>
          <span className="font-semibold text-sm text-[#f4f4f5]">StudyFlow</span>
        </div>

        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-1.5 text-zinc-400 hover:text-zinc-100"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar (Desktop Fixed width 260px, Mobile Drawer) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[260px] h-full flex-shrink-0 overflow-y-auto bg-[#12141a] border-r border-[#222634] flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Top: Brand Header & Navigation */}
        <div>
          {/* Brand Header */}
          <div className="px-4 pt-5 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <span className="font-semibold text-sm text-[#f4f4f5] tracking-tight">StudyFlow</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveView('this_week');
                  setIsMobileOpen(false);
                }}
                className="font-mono text-[10px] text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 hover:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700/40 transition-colors cursor-pointer select-none"
                title="Go to This Week Sprint"
              >
                {formatWeekBadge(activeSprintWeekId)}
              </button>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="md:hidden text-zinc-500 hover:text-zinc-200 p-0.5"
                title="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-4 pb-4 space-y-4">
            {/* New Topic Action Button */}
            <button
              onClick={() => {
                setIsQuickAddOpen(true);
                setIsMobileOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#12141a] hover:bg-[#1a1d26] text-xs font-medium text-zinc-200 border border-[#222634] transition-colors group cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>New Topic</span>
              </span>
              <kbd className="font-mono text-[10px] text-[#71717a] bg-[#0a0b0e] px-1.5 py-0.5 rounded border border-[#222634]">
                N
              </kbd>
            </button>

            {/* Navigation Items */}
            <nav className="space-y-1 pt-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] px-2 pb-1 font-medium">
                Schedule & Syllabus
              </div>
              {navItems.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id);
                      setIsMobileOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#1a1d26] text-[#f4f4f5] border border-[#222634] shadow-sm'
                        : 'text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#1a1d26]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={isActive ? 'text-emerald-400' : 'text-[#71717a]'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {item.count !== undefined && item.count !== 0 && (
                        <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded ${
                          isActive ? 'bg-[#222634] text-[#f4f4f5]' : 'bg-[#1a1d26] text-[#a1a1aa]'
                        }`}>
                          {item.count}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-[#71717a]">
                        {item.shortcut}
                      </span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Sidebar Footer */}
        <div className="p-3 border-t border-[#222634] flex items-center justify-between gap-2">
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#1a1d26] transition-colors cursor-pointer group"
          >
            <span className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-[#71717a] group-hover:text-zinc-300 transition-colors" />
              <span>Cloud Sync</span>
            </span>
            <div className="flex items-center gap-1.5">
              {cloudSyncStatus === 'syncing' ? (
                <span className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Syncing
                </span>
              ) : cloudSyncStatus === 'synced' ? (
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                  Synced
                </span>
              ) : cloudSyncStatus === 'offline' ? (
                <span className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                  Offline
                </span>
              ) : cloudSyncStatus === 'error' ? (
                <span className="flex items-center gap-1.5 text-[11px] text-rose-400 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Error
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                  Local
                </span>
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              const nextState = !soundEnabled;
              setSoundEnabled(nextState);
              if (nextState) {
                playCompletionSound();
              }
            }}
            className={`p-2 rounded-lg text-xs border transition-colors cursor-pointer ${
              soundEnabled
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
                : 'text-[#71717a] bg-[#1a1d26] border-[#222634] hover:text-[#f4f4f5]'
            }`}
            title={soundEnabled ? 'Audio Chime Enabled (Click to mute)' : 'Audio Chime Muted (Click to enable)'}
            aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        />
      )}
    </>
  );
};
