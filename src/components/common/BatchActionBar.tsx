import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  batchAddTopicsToSprint, 
  batchSetTopicPassDate, 
  batchSetPassCompletion 
} from '../../db';
import { 
  getTodayDateString, 
  getTomorrowDateString, 
  formatScheduleDate 
} from '../../utils/dateUtils';
import { playStepCompleteSound, playTopicCompletedFanfare } from '../../utils/soundUtils';
import confetti from 'canvas-confetti';
import { 
  Calendar, 
  CalendarDays, 
  CheckCheck, 
  X, 
  ChevronUp, 
  Sun, 
  Sunrise, 
  Check, 
  Layers
} from 'lucide-react';

export const BatchActionBar: React.FC = () => {
  const { 
    selectedTopicIds, 
    clearSelection, 
    showToast, 
    soundEnabled 
  } = useAppStore();

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isPassOpen, setIsPassOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState<1 | 2 | 3 | 'active'>('active');
  const [customDate, setCustomDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const selectedCount = selectedTopicIds.size;

  // Global Escape key listener to close popover or deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isScheduleOpen || isPassOpen) {
          setIsScheduleOpen(false);
          setIsPassOpen(false);
        } else {
          clearSelection();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScheduleOpen, isPassOpen, clearSelection]);

  // Click outside listener for popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsScheduleOpen(false);
        setIsPassOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (selectedCount === 0) return null;

  const topicIds = Array.from(selectedTopicIds);

  // 1. Action: Add all to This Week (Current Friday–Thursday Sprint)
  const handleAddToThisWeek = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const count = await batchAddTopicsToSprint(topicIds);
      if (soundEnabled) playStepCompleteSound();
      showToast(`Added ${count} topics to This Week (Active Sprint)`);
      clearSelection();
    } catch (err) {
      console.error(err);
      showToast('Failed to add topics to sprint');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Action: Schedule Date
  const handleApplyScheduleDate = async (date: string | null) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const count = await batchSetTopicPassDate(topicIds, selectedPass, date);
      if (soundEnabled) playStepCompleteSound();
      const passLabel = selectedPass === 'active' ? 'Active Pass' : `Pass ${selectedPass}`;
      showToast(`Scheduled ${passLabel} for ${count} topics (${date ? formatScheduleDate(date) : 'Backlog'})`);
      clearSelection();
      setIsScheduleOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to schedule topics');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Action: Batch Set Pass Completion
  const handleBatchSetPass = async (targetPass: 1 | 2 | 3) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const count = await batchSetPassCompletion(topicIds, targetPass);
      if (targetPass === 3) {
        if (soundEnabled) playTopicCompletedFanfare();
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
        showToast(`🎉 Mastered all passes for ${count} topics!`);
      } else {
        if (soundEnabled) playStepCompleteSound();
        showToast(`Marked Pass ${targetPass} complete for ${count} topics`);
      }
      clearSelection();
      setIsPassOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to advance pass status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      {/* Schedule Popover */}
      {isScheduleOpen && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-80 bg-[#12141a] border border-zinc-700/90 rounded-xl p-3.5 shadow-2xl backdrop-blur-md space-y-3 animate-in fade-in zoom-in-95 duration-150 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              Batch Schedule ({selectedCount} topics)
            </span>
            <button 
              onClick={() => setIsScheduleOpen(false)}
              className="text-zinc-500 hover:text-zinc-300 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Target Pass Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-zinc-400 font-medium block">Target Pass:</label>
            <div className="grid grid-cols-4 gap-1 p-0.5 bg-zinc-900/90 border border-zinc-800 rounded-lg">
              {(['active', 1, 2, 3] as const).map((pass) => (
                <button
                  key={pass}
                  type="button"
                  onClick={() => setSelectedPass(pass)}
                  className={`py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer text-center ${
                    selectedPass === pass
                      ? 'bg-zinc-800 text-emerald-400 shadow-sm border border-zinc-700/60'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {pass === 'active' ? 'Active' : `P${pass}`}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-zinc-500 italic">
              {selectedPass === 'active' 
                ? 'Applies to the next incomplete pass for each topic.' 
                : `Specifically assigns schedule date for Pass ${selectedPass}.`}
            </p>
          </div>

          {/* Quick Date Presets */}
          <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
            <label className="text-[11px] text-zinc-400 font-medium block">Assign Date:</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleApplyScheduleDate(getTodayDateString())}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-200 hover:text-white transition-colors cursor-pointer text-xs"
              >
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Today</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyScheduleDate(getTomorrowDateString())}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-200 hover:text-white transition-colors cursor-pointer text-xs"
              >
                <Sunrise className="w-3.5 h-3.5 text-blue-400" />
                <span>Tomorrow</span>
              </button>
            </div>

            {/* Custom Date Input */}
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-700/80 rounded-md px-2 py-1 text-xs text-zinc-200 outline-none focus:border-zinc-500"
              />
              <button
                type="button"
                disabled={!customDate}
                onClick={() => handleApplyScheduleDate(customDate)}
                className="py-1 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                Apply
              </button>
            </div>

            {/* Remove / Return to Backlog */}
            <button
              type="button"
              onClick={() => handleApplyScheduleDate(null)}
              className="w-full mt-1 py-1 text-[11px] text-zinc-400 hover:text-rose-400 transition-colors text-center"
            >
              Clear Date (Send to Backlog)
            </button>
          </div>
        </div>
      )}

      {/* Pass Advancement Popover */}
      {isPassOpen && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-64 bg-[#12141a] border border-zinc-700/90 rounded-xl p-3 shadow-2xl backdrop-blur-md space-y-2 animate-in fade-in zoom-in-95 duration-150 text-xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
            <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              Batch Set Status
            </span>
            <button 
              onClick={() => setIsPassOpen(false)}
              className="text-zinc-500 hover:text-zinc-300 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => handleBatchSetPass(1)}
              className="w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-emerald-400 flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>Mark Pass 1 Complete</span>
              <span className="text-[10px] text-zinc-500 font-mono">P1 ✓</span>
            </button>

            <button
              type="button"
              onClick={() => handleBatchSetPass(2)}
              className="w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-amber-400 flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>Mark Pass 2 Complete (All 5 Steps)</span>
              <span className="text-[10px] text-zinc-500 font-mono">P2 ✓</span>
            </button>

            <button
              type="button"
              onClick={() => handleBatchSetPass(3)}
              className="w-full text-left py-1.5 px-2.5 rounded-lg hover:bg-emerald-500/15 text-zinc-200 hover:text-emerald-300 flex items-center justify-between transition-colors cursor-pointer border-t border-zinc-800/80 mt-1 pt-2 font-medium"
            >
              <span>🎉 Mark 100% Mastered</span>
              <span className="text-[10px] text-emerald-400 font-mono">P3 ✓</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Floating Action Bar Container */}
      <div className="bg-[#12141a]/95 border border-zinc-700/80 rounded-xl px-4 py-2.5 shadow-2xl flex items-center gap-2.5 backdrop-blur-md">
        {/* Selected Counter */}
        <div className="flex items-center gap-1.5 pr-2.5 border-r border-zinc-800">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-zinc-200 whitespace-nowrap">
            {selectedCount} selected
          </span>
        </div>

        {/* Action 1: Add to This Week */}
        <button
          type="button"
          onClick={handleAddToThisWeek}
          disabled={isSubmitting}
          className="h-7 px-3 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700/60 text-xs font-medium text-zinc-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer select-none disabled:opacity-50 whitespace-nowrap"
          title="Commit selected topics to current Friday–Thursday sprint"
        >
          <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
          <span>+ Add to This Week</span>
        </button>

        {/* Action 2: Schedule Date */}
        <button
          type="button"
          onClick={() => {
            setIsScheduleOpen(!isScheduleOpen);
            setIsPassOpen(false);
          }}
          className={`h-7 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer select-none whitespace-nowrap ${
            isScheduleOpen
              ? 'bg-zinc-700 text-white border-zinc-600'
              : 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 hover:text-white border-zinc-700/60'
          }`}
          title="Assign scheduled date across selected topics"
        >
          <Calendar className="w-3.5 h-3.5 text-blue-400" />
          <span>Schedule Date</span>
          <ChevronUp className={`w-3 h-3 transition-transform ${isScheduleOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Action 3: Batch Set Pass */}
        <button
          type="button"
          onClick={() => {
            setIsPassOpen(!isPassOpen);
            setIsScheduleOpen(false);
          }}
          className={`h-7 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer select-none whitespace-nowrap ${
            isPassOpen
              ? 'bg-zinc-700 text-white border-zinc-600'
              : 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 hover:text-white border-zinc-700/60'
          }`}
          title="Batch advance passes or complete topics"
        >
          <CheckCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>Batch Set Pass</span>
          <ChevronUp className={`w-3 h-3 transition-transform ${isPassOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Action 4: Deselect / ✕ */}
        <button
          type="button"
          onClick={clearSelection}
          className="h-7 px-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1 text-xs ml-1"
          title="Clear selection (Esc)"
        >
          <X className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px] text-zinc-500">Esc</span>
        </button>
      </div>
    </div>
  );
};
