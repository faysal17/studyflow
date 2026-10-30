import { db, onDatabaseChange } from '../db';
import { useAppStore } from '../store/useAppStore';
import type { SubjectLabel, Topic, PipelineStep, MissedQuestion, VocabItem, SprintHistory, AppSetting } from '../types';

export interface DatabaseBackup {
  version: number;
  timestamp: number;
  data: {
    subjects: SubjectLabel[];
    topics: Topic[];
    steps: PipelineStep[];
    missedQuestions: MissedQuestion[];
    vocab: VocabItem[];
    sprintHistory: SprintHistory[];
    settings: AppSetting[];
  };
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  enabled: boolean;
  autoSync: boolean;
}

const SUPABASE_CONFIG_KEY = 'studyflow_supabase_config';
const LAST_SYNC_KEY = 'studyflow_last_sync_timestamp';

// In-memory sync management state
let autoSyncTimeout: any = null;
let isSyncInProgress = false;
let hasPendingChanges = false;
let isImportingData = false;

export const syncService = {
  /**
   * Export all local data to a JSON object
   */
  async exportData(): Promise<DatabaseBackup> {
    const subjects = await db.subjects.toArray();
    const topics = await db.topics.toArray();
    const steps = await db.steps.toArray();
    const missedQuestions = await db.missedQuestions.toArray();
    const vocab = await db.vocab.toArray();
    const sprintHistory = await db.sprintHistory.toArray();
    const settings = await db.settings.toArray();

    return {
      version: 1,
      timestamp: Date.now(),
      data: {
        subjects,
        topics,
        steps,
        missedQuestions,
        vocab,
        sprintHistory,
        settings
      }
    };
  },

  /**
   * Import data from JSON backup, completely refreshing or merging with local IndexedDB
   */
  async importData(backup: DatabaseBackup): Promise<boolean> {
    if (!backup?.data?.subjects || !backup?.data?.topics) {
      throw new Error('Invalid backup schema. Required collections missing.');
    }

    isImportingData = true;
    try {
      await db.transaction('rw', [
        db.subjects,
        db.topics,
        db.steps,
        db.missedQuestions,
        db.vocab,
        db.sprintHistory,
        db.settings
      ], async () => {
        await db.subjects.clear();
        await db.topics.clear();
        await db.steps.clear();
        await db.missedQuestions.clear();
        await db.vocab.clear();
        await db.sprintHistory.clear();
        await db.settings.clear();

        await db.subjects.bulkAdd(backup.data.subjects);
        await db.topics.bulkAdd(backup.data.topics);
        await db.steps.bulkAdd(backup.data.steps);
        if (backup.data.missedQuestions?.length) {
          await db.missedQuestions.bulkAdd(backup.data.missedQuestions);
        }
        if (backup.data.vocab?.length) {
          await db.vocab.bulkAdd(backup.data.vocab);
        }
        if (backup.data.sprintHistory?.length) {
          await db.sprintHistory.bulkAdd(backup.data.sprintHistory);
        }
        if (backup.data.settings?.length) {
          await db.settings.bulkAdd(backup.data.settings);
        }
        // Protect dummy data purge migration status
        await db.settings.put({ key: 'dummyDataClearedV1', value: true });
      });
      return true;
    } finally {
      // Re-enable DB mutation listener after short pause
      setTimeout(() => {
        isImportingData = false;
      }, 500);
    }
  },

  /**
   * Save Supabase configuration in localStorage
   */
  saveSupabaseConfig(config: SupabaseConfig): void {
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
  },

  /**
   * Load Supabase configuration
   */
  getSupabaseConfig(): SupabaseConfig {
    try {
      const item = localStorage.getItem(SUPABASE_CONFIG_KEY);
      if (item) {
        const parsed = JSON.parse(item);
        return {
          ...parsed,
          autoSync: parsed.autoSync !== undefined ? parsed.autoSync : true
        };
      }
    } catch (e) {
      console.error('Failed to parse Supabase config:', e);
    }
    const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
    const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
    return {
      url: envUrl,
      anonKey: envKey,
      enabled: !!(envUrl && envKey),
      autoSync: true
    };
  },

  getLastSyncTime(): number | null {
    const val = localStorage.getItem(LAST_SYNC_KEY);
    return val ? parseInt(val, 10) : null;
  },

  setLastSyncTime(timestamp: number): void {
    localStorage.setItem(LAST_SYNC_KEY, timestamp.toString());
  },

  /**
   * Test connection to Supabase REST endpoint
   */
  async testSupabaseConnection(config: SupabaseConfig): Promise<{ success: boolean; message: string }> {
    if (!config.url || !config.anonKey) {
      return { success: false, message: 'URL and Anon Key are required.' };
    }

    try {
      const baseUrl = config.url.replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/rest/v1/studyflow_sync?select=id&limit=1`, {
        method: 'GET',
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`
        }
      });

      if (response.ok || response.status === 200) {
        return { success: true, message: 'Connected! "studyflow_sync" table verified.' };
      } else if (response.status === 404 || response.status === 400) {
        return { 
          success: true, 
          message: 'Connected to Supabase! (Remember to execute supabase-schema.sql to create the sync table)' 
        };
      } else {
        return { success: false, message: `Server returned status ${response.status}: ${response.statusText}` };
      }
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Network error while contacting Supabase instance.'
      };
    }
  },

  /**
   * Fetch remote synced_at timestamp from Supabase without downloading whole payload
   */
  async getRemoteSyncTimestamp(config: SupabaseConfig): Promise<number | null> {
    if (!config.enabled || !config.url || !config.anonKey) return null;
    const baseUrl = config.url.replace(/\/$/, '');
    try {
      const response = await fetch(`${baseUrl}/rest/v1/studyflow_sync?id=eq.default_user&select=synced_at`, {
        method: 'GET',
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          Accept: 'application/json'
        }
      });
      if (!response.ok) return null;
      const rows = await response.json();
      if (rows && rows.length > 0 && typeof rows[0]?.synced_at === 'number') {
        return rows[0].synced_at;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Push local database to Supabase cloud table (studyflow_sync)
   */
  async performCloudSync(config: SupabaseConfig): Promise<{ success: boolean; syncedAt: number; count: number }> {
    const exportData = await this.exportData();
    const count = exportData.data.topics.length + exportData.data.steps.length;

    if (!config.enabled || !config.url || !config.anonKey) {
      throw new Error('Supabase URL and Anon Key must be configured and enabled.');
    }

    const baseUrl = config.url.replace(/\/$/, '');
    const now = Date.now();

    try {
      const response = await fetch(`${baseUrl}/rest/v1/studyflow_sync`, {
        method: 'POST',
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          id: 'default_user',
          payload: exportData,
          synced_at: now
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sync upload failed (${response.status}): ${errorText}`);
      }

      this.setLastSyncTime(now);
      return { success: true, syncedAt: now, count };
    } catch (e: any) {
      throw new Error(`Cloud sync error: ${e.message}`);
    }
  },

  /**
   * Pull latest database backup from Supabase cloud table and restore into local IndexedDB
   */
  async pullCloudSync(config: SupabaseConfig): Promise<{ success: boolean; count: number }> {
    if (!config.enabled || !config.url || !config.anonKey) {
      throw new Error('Supabase URL and Anon Key must be configured and enabled.');
    }

    const baseUrl = config.url.replace(/\/$/, '');

    try {
      const response = await fetch(`${baseUrl}/rest/v1/studyflow_sync?id=eq.default_user&select=*`, {
        method: 'GET',
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Cloud fetch failed (${response.status}): ${response.statusText}`);
      }

      const rows = await response.json();
      if (!rows || rows.length === 0 || !rows[0]?.payload) {
        throw new Error('No cloud backup found on this Supabase project yet.');
      }

      await this.importData(rows[0].payload);
      if (rows[0].synced_at) {
        this.setLastSyncTime(rows[0].synced_at);
      }
      const count = rows[0].payload?.data?.topics?.length || 0;
      return { success: true, count };
    } catch (e: any) {
      throw new Error(`Cloud download error: ${e.message}`);
    }
  },

  /**
   * Immediately push any pending changes to Supabase
   */
  async flushPendingSync(): Promise<void> {
    const config = this.getSupabaseConfig();
    if (!config.enabled || !config.url || !config.anonKey) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      useAppStore.getState().setCloudSyncStatus('offline');
      return;
    }

    if (isSyncInProgress) return;

    try {
      isSyncInProgress = true;
      useAppStore.getState().setCloudSyncStatus('syncing');
      const res = await this.performCloudSync(config);
      hasPendingChanges = false;
      useAppStore.getState().setLastCloudSyncTime(res.syncedAt);
      useAppStore.getState().setCloudSyncStatus('synced');
    } catch (err) {
      console.warn('Auto-sync flush failed:', err);
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        useAppStore.getState().setCloudSyncStatus('offline');
      } else {
        useAppStore.getState().setCloudSyncStatus('error');
      }
    } finally {
      isSyncInProgress = false;
    }
  },

  /**
   * Trigger a debounced automatic background push to Supabase
   */
  triggerAutoSync(delayMs = 2000): void {
    const config = this.getSupabaseConfig();
    if (!config.enabled || !config.autoSync || !config.url || !config.anonKey) {
      return;
    }

    hasPendingChanges = true;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      useAppStore.getState().setCloudSyncStatus('offline');
      return;
    }

    if (autoSyncTimeout) {
      clearTimeout(autoSyncTimeout);
    }

    autoSyncTimeout = setTimeout(async () => {
      await syncService.flushPendingSync();
    }, delayMs);
  },

  /**
   * Smart synchronization on startup, window focus, or reconnection:
   * - If local mutations are pending, flushes them to cloud.
   * - Otherwise checks remote synced_at timestamp. If remote is newer, pulls silently into Dexie!
   */
  async smartSyncOnStartupOrFocus(): Promise<void> {
    const config = this.getSupabaseConfig();
    if (!config.enabled || !config.autoSync || !config.url || !config.anonKey) {
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      useAppStore.getState().setCloudSyncStatus('offline');
      return;
    }

    // If local changes were made while offline or pending debounce, push first
    if (hasPendingChanges) {
      await this.flushPendingSync();
      return;
    }

    try {
      const remoteTimestamp = await this.getRemoteSyncTimestamp(config);
      if (remoteTimestamp === null) {
        const localTime = this.getLastSyncTime();
        if (localTime) {
          useAppStore.getState().setLastCloudSyncTime(localTime);
          useAppStore.getState().setCloudSyncStatus('synced');
        }
        return;
      }

      const localLastSync = this.getLastSyncTime() || 0;

      // If remote has newer data (e.g. from another tab or device)
      if (remoteTimestamp > localLastSync + 1000) {
        useAppStore.getState().setCloudSyncStatus('syncing');
        await this.pullCloudSync(config);
        this.setLastSyncTime(remoteTimestamp);
        useAppStore.getState().setLastCloudSyncTime(remoteTimestamp);
        useAppStore.getState().setCloudSyncStatus('synced');
        useAppStore.getState().showToast('⚡ Cloud changes synchronized');
      } else {
        // Local is fully up to date with remote
        this.setLastSyncTime(remoteTimestamp);
        useAppStore.getState().setLastCloudSyncTime(remoteTimestamp);
        useAppStore.getState().setCloudSyncStatus('synced');
      }
    } catch (e) {
      console.warn('Smart sync check error:', e);
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        useAppStore.getState().setCloudSyncStatus('offline');
      }
    }
  }
};

// Automatically subscribe to local IndexedDB mutations across the app
onDatabaseChange(() => {
  if (isImportingData) return;
  syncService.triggerAutoSync();
});
