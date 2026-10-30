import React, { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  db, 
  setTopicPassDate, 
  setStepScheduleDate,
  togglePass1Completion,
  togglePass2Completion,
  togglePass3Completion,
  toggleStepCompletion 
} from '../../db';
import { useAppStore } from '../../store/useAppStore';
import { 
  getTodayDateString, 
  getTomorrowDateString, 
  getNextWeekDateString, 
  formatScheduleDate, 
  getScheduleStatus 
} from '../../utils/dateUtils';
import { playStepCompleteSound } from '../../utils/soundUtils';
import { SubjectBadge } from './SubjectBadge';
import { 
  X, 
  Calendar, 
  Check, 
  Sun, 
  Sunrise, 
  CalendarDays, 
  ChevronDown, 
  ChevronRight 
} from 'lucide-react';
import type { SubjectLabel, PipelineStep } from '../../types';

type DropdownTarget = 
  | { type: 'pass'; num: 1 | 2 | 3 }
  | { type: 'step'; stepId: string; stepTitle: string };

export const PerPassScheduleModal: React.FC = () => {
  const { selectedTopicForSchedule, setSelectedTopicForSchedule, soundEnabled, showToast } = useAppStore();
  const [activeDropdown, setActiveDropdown] = useState<DropdownTarget | null>(null);
  const [isPass2Expanded, setIsPass2Expanded] = useState<boolean>(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const topic = useLiveQuery(async () => {
    if (!selectedTopicForSchedule) return null;
    return await db.topics.get(selectedTopicForSchedule.id);
  }, [selectedTopicForSchedule?.id]) || selectedTopicForSchedule;

  const subject = useLiveQuery(async () => {
    if (!topic?.labelId) return undefined;
    return await db.subjects.get(topic.labelId);
  }, [topic?.labelId]) as SubjectLabel | undefined;

  const steps = useLiveQuery(async () => {
    if (!topic?.id) return [];
    return await db.steps.where('topicId').equals(topic.id).sortBy('stepNumber');
  }, [topic?.id]) as PipelineStep[] | undefined;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    if (activeDropdown !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeDropdown !== null) {
          setActiveDropdown(null);
        } else {
          setSelectedTopicForSchedule(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDropdown, setSelectedTopicForSchedule]);

  if (!topic) return null;

  const today = getTodayDateString();
  const tomorrow = getTomorrowDateString();
  const nextWeek = getNextWeekDateString();

  const handleSetPassDate = async (pass: 1 | 2 | 3, date: string | null) => {
    await setTopicPassDate(topic.id, pass, date);
    if (soundEnabled && date) playStepCompleteSound();
    
    const passName = pass === 1 ? 'Pass 1: Skim' : pass === 2 ? 'Pass 2: Deep Drill' : 'Pass 3: Review';
    if (date) {
      showToast(`Scheduled ${passName} for ${formatScheduleDate(date)}`);
    } else {
      showToast(`Cleared schedule for ${passName}`);
    }
    setActiveDropdown(null);
  };

  const handleSetStepDate = async (stepId: string, stepTitle: string, date: string | null) => {
    await setStepScheduleDate(stepId, date);
    if (soundEnabled && date) playStepCompleteSound();

    if (date) {
      showToast(`Scheduled "${stepTitle}" for ${formatScheduleDate(date)}`);
    } else {
      showToast(`Cleared schedule for "${stepTitle}"`);
    }
    setActiveDropdown(null);
  };

  const handleTogglePass = async (pass: 1 | 2 | 3) => {
    let completed = false;
    if (pass === 1) completed = await togglePass1Completion(topic.id);
    else if (pass === 2) completed = await togglePass2Completion(topic.id);
    else if (pass === 3) completed = await togglePass3Completion(topic.id);
    if (completed && soundEnabled) playStepCompleteSound();
  };

  const handleToggleStep = async (stepId: string) => {
    const isCompleted = await toggleStepCompletion(stepId);
    if (isCompleted && soundEnabled) playStepCompleteSound();
  };

  const getDateBadgeStyle = (dateStr: string | null) => {
    if (!dateStr) return 'text-zinc-300 bg-zinc-800/70 border-zinc-700/60 hover:bg-zinc-800';
    const status = getScheduleStatus(dateStr);
    if (status === 'today') {
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20';
    } else if (status === 'tomorrow') {
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20';
    } else if (status === 'overdue') {
      return 'text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20';
    }
    return 'text-zinc-300 bg-zinc-800/70 border-zinc-700/60 hover:bg-zinc-800';
  };

  // Reusable Date Dropdown Popover
  const renderDateDropdown = (
    currentDate: string | null,
    onSelectDate: (date: string) => void,
    onClearDate: () => void
  ) => (
    <div 
      ref={dropdownRef}
      className="absolute right-0 top-full mt-1.5 z-50 w-48 bg-[#181b24] border border-[#2c3142] rounded-lg shadow-2xl p-1.5 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-100"
    >
      <button
        type="button"
        onClick={() => onSelectDate(today)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left text-zinc-200 transition-colors cursor-pointer"
      >
        <Sun className="w-3.5 h-3.5 text-emerald-400" />
        <span className="flex-1 font-medium">Today</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectDate(tomorrow)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left text-zinc-200 transition-colors cursor-pointer"
      >
        <Sunrise className="w-3.5 h-3.5 text-amber-400" />
        <span className="flex-1 font-medium">Tomorrow</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectDate(nextWeek)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left text-zinc-200 transition-colors cursor-pointer"
      >
        <CalendarDays className="w-3.5 h-3.5 text-sky-400" />
        <span className="flex-1 font-medium">Next Week</span>
      </button>

      {/* Custom Date Input */}
      <div className="pt-1.5 border-t border-[#2c3142] px-1">
        <label className="text-[10px] uppercase font-mono text-[#71717a] block mb-1">
          Custom Date
        </label>
        <input
          type="date"
          value={currentDate || ''}
          onChange={(e) => {
            if (e.target.value) {
              onSelectDate(e.target.value);
            }
          }}
          className="w-full bg-[#12141a] border border-[#2c3142] rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 cursor-pointer"
        />
      </div>

      {/* Clear option if assigned */}
      {currentDate && (
        <div className="pt-1 border-t border-[#2c3142]">
          <button
            type="button"
            onClick={onClearDate}
            className="w-full flex items-center gap-1.5 px-2 py-1 rounded hover:bg-rose-500/10 text-rose-400 text-left transition-colors text-[11px] cursor-pointer"
          >
            <X className="w-3 h-3" />
            <span>Clear Schedule</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
      onClick={() => setSelectedTopicForSchedule(null)}
    >
      <div 
        className="bg-[#12141a] border border-[#222634] rounded-xl w-full max-w-md shadow-2xl p-5 text-zinc-100 flex flex-col gap-4 animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header Layout */}
        <div className="border-b border-[#222634] pb-3.5 space-y-2">
          {/* Top Bar (Line 1): Modal title & Close Button */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">
              Schedule Passes
            </span>
            <button
              onClick={() => setSelectedTopicForSchedule(null)}
              className="p-1 rounded-md text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#1a1d26] transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Topic Info (Line 2): Prominent Title + Subject Badge */}
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-semibold text-[#f4f4f5] break-words leading-snug flex-1 min-w-0">
              {topic.title}
            </h2>
            <SubjectBadge subject={subject} className="flex-shrink-0 mt-0.5" />
          </div>
        </div>

        {/* 3-Row Passes List with Sub-Step Indentation for Pass 2 */}
        <div className="divide-y divide-[#222634]">
          {/* 1. PASS 1: SKIM */}
          <div className="py-3 flex items-center justify-between gap-3 relative">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => handleTogglePass(1)}
                className="cursor-pointer transition-transform active:scale-95"
                title={topic.pass1Completed ? 'Reopen Pass 1' : 'Complete Pass 1'}
              >
                {topic.pass1Completed ? (
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/30">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                ) : (
                  <span className="text-xs font-mono font-medium text-[#71717a] hover:text-emerald-400 w-4 flex-shrink-0">
                    P1
                  </span>
                )}
              </button>
              <span className={`text-sm font-medium ${topic.pass1Completed ? 'text-[#71717a] line-through' : 'text-[#f4f4f5]'}`}>
                Pass 1: Skim
              </span>
            </div>

            {/* Pass 1 Date Pill */}
            <div className="relative flex-shrink-0">
              {!topic.pass1Date ? (
                <button
                  type="button"
                  onClick={() => setActiveDropdown(
                    activeDropdown?.type === 'pass' && activeDropdown.num === 1 
                      ? null 
                      : { type: 'pass', num: 1 }
                  )}
                  className="text-xs text-[#a1a1aa] bg-zinc-800/60 hover:bg-zinc-700/60 hover:text-[#f4f4f5] px-2.5 py-1 rounded-md border border-[#222634] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-3 h-3 text-[#71717a]" />
                  <span>+ Schedule</span>
                </button>
              ) : (
                <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border transition-colors ${getDateBadgeStyle(topic.pass1Date)}`}>
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(
                      activeDropdown?.type === 'pass' && activeDropdown.num === 1 
                        ? null 
                        : { type: 'pass', num: 1 }
                    )}
                    className="flex items-center gap-1 cursor-pointer"
                    title="Change date"
                  >
                    <Calendar className="w-3 h-3 text-zinc-400" />
                    <span>{formatScheduleDate(topic.pass1Date)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetPassDate(1, null);
                    }}
                    className="text-zinc-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                    title="Clear date"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {activeDropdown?.type === 'pass' && activeDropdown.num === 1 && (
                renderDateDropdown(
                  topic.pass1Date,
                  (d) => handleSetPassDate(1, d),
                  () => handleSetPassDate(1, null)
                )
              )}
            </div>
          </div>

          {/* 2. PASS 2: DEEP DRILL (With Expand Toggle & Sub-Steps) */}
          <div className="py-3 space-y-2.5">
            {/* Main Pass 2 Row */}
            <div className="flex items-center justify-between gap-3 relative">
              <div className="flex items-center gap-1.5 min-w-0">
                {/* Expand Toggle */}
                <button
                  type="button"
                  onClick={() => setIsPass2Expanded(!isPass2Expanded)}
                  className="p-1 rounded text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#1a1d26] transition-colors cursor-pointer"
                  title={isPass2Expanded ? 'Collapse sub-steps' : 'Expand individual sub-steps'}
                >
                  {isPass2Expanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleTogglePass(2)}
                  className="cursor-pointer transition-transform active:scale-95"
                  title={topic.pass2Completed ? 'Reopen Pass 2' : 'Complete Pass 2'}
                >
                  {topic.pass2Completed ? (
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/30">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="text-xs font-mono font-medium text-[#71717a] hover:text-emerald-400 w-4 flex-shrink-0">
                      P2
                    </span>
                  )}
                </button>

                <span className={`text-sm font-medium ${topic.pass2Completed ? 'text-[#71717a] line-through' : 'text-[#f4f4f5]'}`}>
                  Pass 2: Deep Drill
                </span>
              </div>

              {/* Main Pass 2 Date Pill */}
              <div className="relative flex-shrink-0">
                {!topic.pass2Date ? (
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(
                      activeDropdown?.type === 'pass' && activeDropdown.num === 2 
                        ? null 
                        : { type: 'pass', num: 2 }
                    )}
                    className="text-xs text-[#a1a1aa] bg-zinc-800/60 hover:bg-zinc-700/60 hover:text-[#f4f4f5] px-2.5 py-1 rounded-md border border-[#222634] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Calendar className="w-3 h-3 text-[#71717a]" />
                    <span>+ Schedule All</span>
                  </button>
                ) : (
                  <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border transition-colors ${getDateBadgeStyle(topic.pass2Date)}`}>
                    <button
                      type="button"
                      onClick={() => setActiveDropdown(
                        activeDropdown?.type === 'pass' && activeDropdown.num === 2 
                          ? null 
                          : { type: 'pass', num: 2 }
                      )}
                      className="flex items-center gap-1 cursor-pointer"
                      title="Change date"
                    >
                      <Calendar className="w-3 h-3 text-zinc-400" />
                      <span>{formatScheduleDate(topic.pass2Date)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetPassDate(2, null);
                      }}
                      className="text-zinc-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                      title="Clear date"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {activeDropdown?.type === 'pass' && activeDropdown.num === 2 && (
                  renderDateDropdown(
                    topic.pass2Date,
                    (d) => handleSetPassDate(2, d),
                    () => handleSetPassDate(2, null)
                  )
                )}
              </div>
            </div>

            {/* Indented 5 Sub-Steps with Hairline Dividers */}
            {isPass2Expanded && steps && steps.length > 0 && (
              <div className="ml-5 pl-3 border-l border-[#222634] divide-y divide-[#222634]/50 animate-in fade-in duration-100">
                {steps.map((step) => {
                  const stepDate = step.scheduledDate || null;
                  const isAssigned = !!stepDate;
                  const isDropdownOpen = activeDropdown?.type === 'step' && activeDropdown.stepId === step.id;

                  return (
                    <div 
                      key={step.id}
                      className="py-2 flex items-center justify-between gap-3 text-xs relative"
                    >
                      {/* Step Title & Checkbox */}
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <button
                          type="button"
                          onClick={() => handleToggleStep(step.id)}
                          className="cursor-pointer transition-transform active:scale-95"
                          title={step.isCompleted ? 'Mark step incomplete' : 'Mark step complete'}
                        >
                          {step.isCompleted ? (
                            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                              <Check className="w-2 h-2 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full border border-zinc-600 hover:border-emerald-400 flex items-center justify-center text-[9px] text-[#71717a] hover:text-emerald-400 flex-shrink-0">
                              {step.stepNumber}
                            </span>
                          )}
                        </button>
                        <span className={`truncate ${step.isCompleted ? 'text-[#71717a] line-through' : 'text-[#a1a1aa]'}`}>
                          {step.title}
                        </span>
                      </div>

                      {/* Step Date Trigger Pill */}
                      <div className="relative flex-shrink-0">
                        {!isAssigned ? (
                          <button
                            type="button"
                            onClick={() => setActiveDropdown(
                              isDropdownOpen ? null : { type: 'step', stepId: step.id, stepTitle: step.title }
                            )}
                            className="text-[11px] text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#1a1d26] px-2 py-0.5 rounded border border-transparent hover:border-[#222634] transition-colors cursor-pointer"
                          >
                            {topic.pass2Date ? `(${formatScheduleDate(topic.pass2Date)})` : '+ Schedule'}
                          </button>
                        ) : (
                          <div className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border transition-colors ${getDateBadgeStyle(stepDate)}`}>
                            <button
                              type="button"
                              onClick={() => setActiveDropdown(
                                isDropdownOpen ? null : { type: 'step', stepId: step.id, stepTitle: step.title }
                              )}
                              className="cursor-pointer"
                              title="Change date"
                            >
                              {formatScheduleDate(stepDate)}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetStepDate(step.id, step.title, null);
                              }}
                              className="text-zinc-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                              title="Clear date"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}

                        {isDropdownOpen && (
                          renderDateDropdown(
                            stepDate,
                            (d) => handleSetStepDate(step.id, step.title, d),
                            () => handleSetStepDate(step.id, step.title, null)
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. PASS 3: REVIEW */}
          <div className="py-3 flex items-center justify-between gap-3 relative">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => handleTogglePass(3)}
                className="cursor-pointer transition-transform active:scale-95"
                title={topic.pass3Completed ? 'Reopen Pass 3' : 'Complete Pass 3'}
              >
                {topic.pass3Completed ? (
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/30">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                ) : (
                  <span className="text-xs font-mono font-medium text-[#71717a] hover:text-emerald-400 w-4 flex-shrink-0">
                    P3
                  </span>
                )}
              </button>
              <span className={`text-sm font-medium ${topic.pass3Completed ? 'text-[#71717a] line-through' : 'text-[#f4f4f5]'}`}>
                Pass 3: Review
              </span>
            </div>

            {/* Pass 3 Date Pill */}
            <div className="relative flex-shrink-0">
              {!topic.pass3Date ? (
                <button
                  type="button"
                  onClick={() => setActiveDropdown(
                    activeDropdown?.type === 'pass' && activeDropdown.num === 3 
                      ? null 
                      : { type: 'pass', num: 3 }
                  )}
                  className="text-xs text-[#a1a1aa] bg-zinc-800/60 hover:bg-zinc-700/60 hover:text-[#f4f4f5] px-2.5 py-1 rounded-md border border-[#222634] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-3 h-3 text-[#71717a]" />
                  <span>+ Schedule</span>
                </button>
              ) : (
                <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border transition-colors ${getDateBadgeStyle(topic.pass3Date)}`}>
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(
                      activeDropdown?.type === 'pass' && activeDropdown.num === 3 
                        ? null 
                        : { type: 'pass', num: 3 }
                    )}
                    className="flex items-center gap-1 cursor-pointer"
                    title="Change date"
                  >
                    <Calendar className="w-3 h-3 text-zinc-400" />
                    <span>{formatScheduleDate(topic.pass3Date)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetPassDate(3, null);
                    }}
                    className="text-zinc-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                    title="Clear date"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {activeDropdown?.type === 'pass' && activeDropdown.num === 3 && (
                renderDateDropdown(
                  topic.pass3Date,
                  (d) => handleSetPassDate(3, d),
                  () => handleSetPassDate(3, null)
                )
              )}
            </div>
          </div>
        </div>

        {/* Quiet Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#222634]">
          <span className="text-[11px] text-[#71717a] font-mono">
            Esc to close
          </span>
          <button
            onClick={() => setSelectedTopicForSchedule(null)}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
