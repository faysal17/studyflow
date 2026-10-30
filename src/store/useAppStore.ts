import { create } from 'zustand';
import type { Topic } from '../types';

export type MainNavView = 'today' | 'tomorrow' | 'upcoming' | 'this_week' | 'backlog' | 'matrix' | 'performance' | 'archive';
export type TimerMode = 'pomodoro' | 'deep_work' | 'stopwatch';
export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export interface ToastAction {
  label: string;
  onClick: () => void | Promise<void>;
}

interface AppState {
  // Navigation
  activeView: MainNavView;
  setActiveView: (view: MainNavView) => void;

  // Modals & Panels
  isQuickAddOpen: boolean;
  setIsQuickAddOpen: (open: boolean) => void;
  isRollOverModalOpen: boolean;
  setIsRollOverModalOpen: (open: boolean) => void;
  isSyncModalOpen: boolean;
  setIsSyncModalOpen: (open: boolean) => void;

  // Per-Pass Schedule Modal
  selectedTopicForSchedule: Topic | null;
  setSelectedTopicForSchedule: (topic: Topic | null) => void;

  // Sound effects
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;

  // Timer State
  timerMode: TimerMode;
  setTimerMode: (mode: TimerMode) => void;
  timerDuration: number; // in seconds
  timerRemaining: number;
  isTimerRunning: boolean;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: (mode?: TimerMode) => void;
  tickTimer: () => void;

  // Backlog View Filters
  selectedSubjectFilter: string | null;
  setSelectedSubjectFilter: (subjectId: string | null) => void;
  backlogSearchQuery: string;
  setBacklogSearchQuery: (query: string) => void;

  // Notification Toast
  toastMessage: string | null;
  toastAction: ToastAction | null;
  showToast: (msg: string, action?: ToastAction | null, duration?: number) => void;
  clearToast: () => void;

  // Cloud Sync
  cloudSyncStatus: CloudSyncStatus;
  setCloudSyncStatus: (status: CloudSyncStatus) => void;
  lastCloudSyncTime: number | null;
  setLastCloudSyncTime: (time: number | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  activeView: 'today',
  setActiveView: (view) => set({ activeView: view }),

  // Cloud Sync
  cloudSyncStatus: 'idle',
  setCloudSyncStatus: (status) => set({ cloudSyncStatus: status }),
  lastCloudSyncTime: null,
  setLastCloudSyncTime: (time) => set({ lastCloudSyncTime: time }),

  // Modals & Panels
  isQuickAddOpen: false,
  setIsQuickAddOpen: (open) => set({ isQuickAddOpen: open }),
  isRollOverModalOpen: false,
  setIsRollOverModalOpen: (open) => set({ isRollOverModalOpen: open }),
  isSyncModalOpen: false,
  setIsSyncModalOpen: (open) => set({ isSyncModalOpen: open }),

  // Per-Pass Schedule Modal
  selectedTopicForSchedule: null,
  setSelectedTopicForSchedule: (topic) => set({ selectedTopicForSchedule: topic }),

  // Sound effects
  soundEnabled: typeof window !== 'undefined' ? localStorage.getItem('studyflow_sound_enabled') !== 'false' : true,
  setSoundEnabled: (enabled) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('studyflow_sound_enabled', String(enabled));
    }
    set({ soundEnabled: enabled });
  },

  // Timer State
  timerMode: 'pomodoro',
  setTimerMode: (mode) => {
    let duration = 25 * 60;
    if (mode === 'deep_work') duration = 50 * 60;
    if (mode === 'stopwatch') duration = 0;
    set({
      timerMode: mode,
      timerDuration: duration,
      timerRemaining: duration,
      isTimerRunning: false
    });
  },
  timerDuration: 25 * 60,
  timerRemaining: 25 * 60,
  isTimerRunning: false,
  startTimer: () => set({ isTimerRunning: true }),
  pauseTimer: () => set({ isTimerRunning: false }),
  resetTimer: (newMode) => {
    const mode = newMode || get().timerMode;
    let duration = 25 * 60;
    if (mode === 'deep_work') duration = 50 * 60;
    if (mode === 'stopwatch') duration = 0;
    set({
      timerMode: mode,
      timerDuration: duration,
      timerRemaining: duration,
      isTimerRunning: false
    });
  },
  tickTimer: () => {
    const { isTimerRunning, timerMode, timerRemaining } = get();
    if (!isTimerRunning) return;

    if (timerMode === 'stopwatch') {
      set({ timerRemaining: timerRemaining + 1 });
    } else {
      if (timerRemaining > 1) {
        set({ timerRemaining: timerRemaining - 1 });
      } else {
        set({ timerRemaining: 0, isTimerRunning: false });
        get().showToast('⏰ Focus session completed! Take a breather.');
      }
    }
  },

  // Backlog View Filters
  selectedSubjectFilter: null,
  setSelectedSubjectFilter: (subjectId) => set({ selectedSubjectFilter: subjectId }),
  backlogSearchQuery: '',
  setBacklogSearchQuery: (query) => set({ backlogSearchQuery: query }),

  // Toast
  toastMessage: null,
  toastAction: null,
  showToast: (msg, action = null, duration) => {
    const timeoutMs = duration || (action ? 5000 : 3200);
    set({ toastMessage: msg, toastAction: action });
    setTimeout(() => {
      if (get().toastMessage === msg) {
        set({ toastMessage: null, toastAction: null });
      }
    }, timeoutMs);
  },
  clearToast: () => set({ toastMessage: null, toastAction: null })
}));
