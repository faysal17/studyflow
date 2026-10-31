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

  // Multi-Select & Batch Actions
  selectedTopicIds: Set<string>;
  isMultiSelectMode: boolean;
  lastSelectedTopicId: string | null;
  toggleMultiSelectMode: (enabled?: boolean) => void;
  toggleTopicSelection: (topicId: string, options?: { isShiftClick?: boolean; orderedTopicIds?: string[] }) => void;
  selectTopics: (topicIds: string[]) => void;
  deselectTopics: (topicIds: string[]) => void;
  selectAllTopics: (topicIds: string[]) => void;
  clearSelection: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  activeView: 'today',
  setActiveView: (view) => set({ activeView: view, selectedTopicIds: new Set<string>(), lastSelectedTopicId: null }),

  // Multi-Select & Batch Actions
  selectedTopicIds: new Set<string>(),
  isMultiSelectMode: false,
  lastSelectedTopicId: null,

  toggleMultiSelectMode: (enabled) => {
    const current = get().isMultiSelectMode;
    const nextVal = enabled !== undefined ? enabled : !current;
    if (!nextVal) {
      set({ isMultiSelectMode: false, selectedTopicIds: new Set<string>(), lastSelectedTopicId: null });
    } else {
      set({ isMultiSelectMode: true });
    }
  },

  toggleTopicSelection: (topicId, options) => {
    const { selectedTopicIds, lastSelectedTopicId } = get();
    const nextSet = new Set(selectedTopicIds);

    if (options?.isShiftClick && lastSelectedTopicId && options?.orderedTopicIds) {
      const fromIdx = options.orderedTopicIds.indexOf(lastSelectedTopicId);
      const toIdx = options.orderedTopicIds.indexOf(topicId);

      if (fromIdx !== -1 && toIdx !== -1) {
        const start = Math.min(fromIdx, toIdx);
        const end = Math.max(fromIdx, toIdx);
        for (let i = start; i <= end; i++) {
          nextSet.add(options.orderedTopicIds[i]);
        }
        set({ selectedTopicIds: nextSet, lastSelectedTopicId: topicId, isMultiSelectMode: true });
        return;
      }
    }

    if (nextSet.has(topicId)) {
      nextSet.delete(topicId);
    } else {
      nextSet.add(topicId);
    }

    set({ 
      selectedTopicIds: nextSet, 
      lastSelectedTopicId: topicId,
      isMultiSelectMode: nextSet.size > 0 ? get().isMultiSelectMode : get().isMultiSelectMode
    });
  },

  selectTopics: (topicIds) => {
    const nextSet = new Set(get().selectedTopicIds);
    topicIds.forEach(id => nextSet.add(id));
    set({ selectedTopicIds: nextSet, isMultiSelectMode: true });
  },

  deselectTopics: (topicIds) => {
    const nextSet = new Set(get().selectedTopicIds);
    topicIds.forEach(id => nextSet.delete(id));
    set({ selectedTopicIds: nextSet });
  },

  selectAllTopics: (topicIds) => {
    const nextSet = new Set(topicIds);
    set({ selectedTopicIds: nextSet, isMultiSelectMode: true });
  },

  clearSelection: () => {
    set({ selectedTopicIds: new Set<string>(), lastSelectedTopicId: null });
  },

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
