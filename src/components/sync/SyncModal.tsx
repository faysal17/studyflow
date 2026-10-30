import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { syncService, type DatabaseBackup, type SupabaseConfig } from '../../services/syncService';
import { clearAllUserData } from '../../db';
import { formatTime } from '../../utils/dateUtils';
import { X, Download, Upload, RefreshCw, AlertCircle, Trash2 } from 'lucide-react';

export const SyncModal: React.FC = () => {
  const { isSyncModalOpen, setIsSyncModalOpen, showToast } = useAppStore();

  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(syncService.getSupabaseConfig());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(syncService.getLastSyncTime());
  const [pendingImport, setPendingImport] = useState<DatabaseBackup | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  if (!isSyncModalOpen) return null;

  const handleClearAllData = async () => {
    try {
      await clearAllUserData();
      setIsConfirmingClear(false);
      showToast('All topics & study data cleared');
      setIsSyncModalOpen(false);
    } catch (e) {
      console.error(e);
      showToast('Failed to clear data');
    }
  };

  const handleSaveConfig = () => {
    syncService.saveSupabaseConfig(supabaseConfig);
    showToast('Settings saved');
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await syncService.testSupabaseConnection(supabaseConfig);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Connection failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const res = await syncService.performCloudSync(supabaseConfig);
      setLastSyncTime(res.syncedAt);
      showToast(`Pushed ${res.count} items to Cloud`);
    } catch (e: any) {
      showToast(`Sync failed: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullCloud = async () => {
    setIsPulling(true);
    try {
      const res = await syncService.pullCloudSync(supabaseConfig);
      showToast(`Restored ${res.count} topics from Cloud`);
      setTimeout(() => {
        window.location.reload();
      }, 400);
    } catch (e: any) {
      showToast(`Cloud restore failed: ${e.message}`);
    } finally {
      setIsPulling(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      const backup = await syncService.exportData();
      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `studyflow-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Database exported as JSON');
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed: DatabaseBackup = JSON.parse(text);
        setPendingImport(parsed);
      } catch (err: any) {
        console.error(err);
        showToast('Invalid JSON backup file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;
    try {
      await syncService.importData(pendingImport);
      showToast('Data restored successfully');
      setPendingImport(null);
      setTimeout(() => {
        window.location.reload();
      }, 400);
    } catch (err: any) {
      console.error(err);
      showToast('Failed to restore data');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-[#12141a] border border-[#222634] rounded-xl p-5 space-y-4 shadow-2xl text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#222634]">
          <h3 className="text-sm font-semibold text-[#f4f4f5]">
            Storage & Supabase Sync
          </h3>
          <button 
            onClick={() => setIsSyncModalOpen(false)} 
            className="text-[#71717a] hover:text-[#f4f4f5] transition-colors p-1 rounded hover:bg-[#1a1d26]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Local-first status */}
        <div className="text-[#a1a1aa] space-y-1">
          <p className="text-zinc-200 font-medium">Local-first IndexedDB is active (100% offline).</p>
          {lastSyncTime && (
            <p className="text-[11px] text-[#71717a] font-mono">Last sync: {formatTime(lastSyncTime)}</p>
          )}
        </div>

        {/* Backup / Export */}
        <div className="space-y-2 pt-2 border-t border-[#222634]">
          <span className="text-[11px] text-[#a1a1aa] font-medium block">Offline Backup & Restore</span>
          <div className="flex gap-2">
            <button
              onClick={handleExportJSON}
              className="flex-1 py-1.5 px-3 rounded-md bg-zinc-800/80 border border-[#222634] hover:bg-zinc-700/80 text-zinc-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#71717a]" /> Export JSON
            </button>
            <label className="flex-1 py-1.5 px-3 rounded-md bg-zinc-800/80 border border-[#222634] hover:bg-zinc-700/80 text-zinc-200 flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5 text-[#71717a]" /> Restore JSON
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
            <button
              type="button"
              onClick={() => setIsConfirmingClear(true)}
              className="py-1.5 px-3 rounded-md bg-zinc-800/80 border border-[#222634] hover:bg-rose-500/10 hover:border-rose-500/30 text-zinc-400 hover:text-rose-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Clear all topics and study records"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All Data
            </button>
          </div>

          {/* Confirm Clear Data In-App Prompt */}
          {isConfirmingClear && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg space-y-2 mt-2 animate-in fade-in">
              <div className="text-rose-400 font-medium text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Clear all topics & study data?</span>
              </div>
              <p className="text-zinc-400 text-[11px]">
                This will wipe all topics, passes, and study history. The 11 core syllabus subject categories will remain intact.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsConfirmingClear(false)}
                  className="px-2.5 py-1 rounded bg-[#1f232f] hover:bg-zinc-800 text-zinc-300 text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearAllData}
                  className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  Confirm Clear
                </button>
              </div>
            </div>
          )}

          {/* Pending Import In-App Confirmation Prompt (Replaces window.confirm) */}
          {pendingImport && (
            <div className="p-3 bg-[#161922] border border-amber-500/30 rounded-lg space-y-2 mt-2 animate-in fade-in">
              <div className="text-amber-400 font-medium text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Importing will overwrite local data</span>
              </div>
              <p className="text-[#a1a1aa] text-[11px]">
                Proceed with restoring {pendingImport.data?.topics?.length || 0} topics and database tables?
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPendingImport(null)}
                  className="px-2.5 py-1 rounded bg-[#1f232f] hover:bg-zinc-800 text-zinc-300 text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-medium transition-colors cursor-pointer"
                >
                  Confirm Overwrite
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Supabase Config */}
        <div className="space-y-2 pt-2 border-t border-[#222634]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#a1a1aa] font-medium">Supabase Cloud Sync</span>
            <label className="flex items-center gap-1.5 cursor-pointer text-[#a1a1aa] hover:text-[#f4f4f5]">
              <input
                type="checkbox"
                checked={supabaseConfig.enabled}
                onChange={(e) => setSupabaseConfig({ ...supabaseConfig, enabled: e.target.checked })}
                className="accent-emerald-500 cursor-pointer"
              />
              <span className="text-xs">Enable</span>
            </label>
          </div>

          <input
            type="url"
            value={supabaseConfig.url}
            onChange={(e) => setSupabaseConfig({ ...supabaseConfig, url: e.target.value })}
            placeholder="Supabase Project URL"
            className="w-full bg-[#0a0b0e] border border-[#222634] focus:ring-1 focus:ring-zinc-500 rounded-md p-2 text-[#f4f4f5] placeholder:text-[#71717a] outline-none transition-colors"
          />

          <input
            type="password"
            value={supabaseConfig.anonKey}
            onChange={(e) => setSupabaseConfig({ ...supabaseConfig, anonKey: e.target.value })}
            placeholder="Anon Public API Key"
            className="w-full bg-[#0a0b0e] border border-[#222634] focus:ring-1 focus:ring-zinc-500 rounded-md p-2 text-[#f4f4f5] placeholder:text-[#71717a] outline-none transition-colors"
          />

          {testResult && (
            <p className={`text-[11px] ${testResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
              {testResult.message}
            </p>
          )}

          <div className="flex gap-2 pt-1 flex-wrap sm:flex-nowrap">
            <button
              onClick={handleTestConnection}
              disabled={isTesting || !supabaseConfig.url}
              className="px-2.5 py-1.5 bg-zinc-800/80 border border-[#222634] text-zinc-300 rounded-md hover:text-[#f4f4f5] hover:bg-zinc-700/80 disabled:opacity-40 transition-colors cursor-pointer text-xs"
            >
              {isTesting ? 'Testing...' : 'Test'}
            </button>
            <button
              onClick={handleSyncNow}
              disabled={isSyncing || !supabaseConfig.enabled}
              className="flex-1 py-1.5 bg-zinc-800/90 hover:bg-zinc-700 text-[#f4f4f5] border border-[#222634] font-medium rounded-md disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
              title="Push local data to Supabase"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Pushing...' : 'Push to Cloud'}
            </button>
            <button
              onClick={handlePullCloud}
              disabled={isPulling || !supabaseConfig.enabled}
              className="flex-1 py-1.5 bg-zinc-800/90 hover:bg-zinc-700 text-[#f4f4f5] border border-[#222634] font-medium rounded-md disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
              title="Download latest backup from Supabase"
            >
              <Download className={`w-3 h-3 ${isPulling ? 'animate-bounce' : ''}`} />
              {isPulling ? 'Pulling...' : 'Pull Cloud'}
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-[#222634]">
          <button
            onClick={() => {
              handleSaveConfig();
              setIsSyncModalOpen(false);
            }}
            className="bg-zinc-800/90 hover:bg-zinc-700 text-[#f4f4f5] border border-[#222634] px-4 py-1.5 rounded-md font-medium transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
