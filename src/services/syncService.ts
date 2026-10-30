import { db } from '../db';
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
    });

    return true;
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
        return JSON.parse(item);
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
      autoSync: false
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
      const count = rows[0].payload?.data?.topics?.length || 0;
      return { success: true, count };
    } catch (e: any) {
      throw new Error(`Cloud download error: ${e.message}`);
    }
  }
};
