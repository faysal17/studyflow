import React, { useState } from 'react';
import { useStudyData } from '../../hooks/useStudyData';
import { useAppStore } from '../../store/useAppStore';
import { PageHeader } from '../common/PageHeader';
import { SubjectBadge, subjectColorMap } from '../common/SubjectBadge';
import { formatScheduleDate, getTodayDateString } from '../../utils/dateUtils';
import { 
  togglePass1Completion, 
  togglePass2Completion, 
  togglePass3Completion, 
  toggleStepCompletion, 
  removeTopicFromSprint, 
  addTopicToSprint,
  completeAndCloseSprint 
} from '../../db';
import { playStepCompleteSound, playTopicCompletedFanfare } from '../../utils/soundUtils';
import confetti from 'canvas-confetti';
import { 
  Check, 
  Calendar, 
  ChevronDown, 
  ChevronRight, 
  X, 
  ArrowRight, 
  Layers, 
  CalendarDays, 
  Sparkles,
  RotateCcw,
  CheckSquare
} from 'lucide-react';
import type { Topic, PipelineStep, SubjectLabel } from '../../types';

interface SprintRowProps {
  topic: Topic;
  subject?: SubjectLabel;
  steps: PipelineStep[];
  onSchedule: (topic: Topic) => void;
  isSelected?: boolean;
  onToggleSelect?: (topicId: string, isShiftClick: boolean) => void;
}

const SprintTopicRow: React.FC<SprintRowProps> = ({
  topic,
  subject,
  steps,
  onSchedule,
  isSelected: propsIsSelected,
  onToggleSelect
}) => {
  const { 
    soundEnabled, 
    showToast, 
    selectedTopicIds, 
    isMultiSelectMode, 
    toggleTopicSelection 
  } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const isSelected = propsIsSelected !== undefined 
    ? propsIsSelected 
    : selectedTopicIds.has(topic.id);

  const sortedSteps = [...steps].sort((a, b) => a.stepNumber - b.stepNumber);
  const completedSteps = sortedSteps.filter(s => s.isCompleted).length;
  const isMastered = topic.status === 'completed' || (topic.pass1Completed && topic.pass2Completed && topic.pass3Completed);

  // Checkbox action for multi-select
  const handleSelectCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleSelect) {
      onToggleSelect(topic.id, e.shiftKey);
    } else {
      toggleTopicSelection(topic.id, { isShiftClick: e.shiftKey });
    }
  };

  // Row Click for Shift/Cmd/Select-Mode
  const handleRowClick = (e: React.MouseEvent) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey || isMultiSelectMode) {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('input')) return;

      if (onToggleSelect) {
        onToggleSelect(topic.id, e.shiftKey);
      } else {
        toggleTopicSelection(topic.id, { isShiftClick: e.shiftKey });
      }
    }
  };

  // Checkbox action
  const handleCheckboxClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!topic.pass1Completed) {
      const done = await togglePass1Completion(topic.id);
      if (done && soundEnabled) playStepCompleteSound();
      showToast(`Pass 1 completed for "${topic.title}"`);
      return;
    }

    if (!topic.pass2Completed) {
      const done = await togglePass2Completion(topic.id);
      if (done && soundEnabled) playStepCompleteSound();
      showToast(`Pass 2 completed for "${topic.title}"`);
      return;
    }

    if (!topic.pass3Completed) {
      const done = await togglePass3Completion(topic.id);
      if (done) {
        if (soundEnabled) playTopicCompletedFanfare();
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        showToast(`🎉 100% Mastered: "${topic.title}"!`);
      }
      return;
    }

    await togglePass3Completion(topic.id);
    showToast(`Reopened "${topic.title}"`);
  };

  // Sub-step toggle
  const handleToggleStep = async (e: React.MouseEvent, step: PipelineStep) => {
    e.stopPropagation();
    const newCompleted = await toggleStepCompletion(step.id);
    if (newCompleted && soundEnabled) playStepCompleteSound();
    if (step.stepNumber === 5 && newCompleted) {
      showToast(`Pass 2 Finished! Step 5 completed for "${topic.title}"`);
    }
  };

  // Remove from sprint with undo toast
  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await removeTopicFromSprint(topic.id);
    showToast(
      `Removed "${topic.title}" from This Week`,
      {
        label: 'Undo',
        onClick: async () => {
          await addTopicToSprint(topic.id);
          showToast(`Restored "${topic.title}" to This Week`);
        }
      },
      5000
    );
  };

  return (
    <div 
      onClick={handleRowClick}
      className={`group flex flex-col py-3 px-3 rounded-lg border-b transition-all border-l-2 ${
        isSelected
          ? 'bg-zinc-800/45 border-l-emerald-500 border-b-zinc-800 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.12)]'
          : 'hover:bg-[#1a1d26] border-b-[#222634] border-l-transparent'
      }`}
    >
      <div className="flex items-center gap-2.5 w-full">
        {/* Square Selection Checkbox */}
        <button
          type="button"
          onClick={handleSelectCheckboxClick}
          className={`w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
            isSelected
              ? 'bg-emerald-500 border-emerald-500 text-black shadow-sm'
              : isMultiSelectMode || selectedTopicIds.size > 0
                ? 'border-zinc-600 hover:border-zinc-400 bg-zinc-900/60'
                : 'opacity-0 group-hover:opacity-100 border-zinc-600 hover:border-zinc-400 bg-zinc-900/40'
          }`}
          title={isSelected ? 'Deselect topic (Shift+Click for range)' : 'Select topic (Shift+Click for range)'}
        >
          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
        </button>

        {/* 18px Circular Checkbox */}
        <button
          type="button"
          onClick={handleCheckboxClick}
          className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
            isMastered
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-zinc-600 hover:border-zinc-400 bg-transparent'
          }`}
          title={isMastered ? 'Mastered (click to reopen)' : 'Complete next pass'}
        >
          {isMastered && <Check className="w-2.5 h-2.5 stroke-[3]" />}
        </button>

        {/* Subject Badge */}
        {subject && <SubjectBadge subject={subject} className="flex-shrink-0" />}

        {/* Topic Title */}
        <div className="flex-1 min-w-0 pr-3">
          <span className={`text-sm md:text-base font-medium break-words leading-relaxed select-text ${
            isMastered ? 'line-through text-zinc-500' : 'text-[#f4f4f5]'
          }`}>
            {topic.title}
          </span>
        </div>

        {/* Pass Status Badges & Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Active Pass Indicator */}
          {!topic.pass1Completed ? (
            <span className="text-[11px] px-2 py-0.5 rounded-md font-medium border bg-blue-500/10 text-blue-300 border-blue-500/20">
              Pass 1: Skim{topic.pass1Date ? ` (${formatScheduleDate(topic.pass1Date)})` : ''}
            </span>
          ) : !topic.pass2Completed ? (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[11px] px-2 py-0.5 rounded-md font-medium border bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Pass 2: Drill ({completedSteps}/5)</span>
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          ) : !topic.pass3Completed ? (
            <span className="text-[11px] px-2 py-0.5 rounded-md font-medium border bg-purple-500/10 text-purple-300 border-purple-500/20">
              Pass 3: Review{topic.pass3Date ? ` (${formatScheduleDate(topic.pass3Date)})` : ''}
            </span>
          ) : (
            <span className="text-[11px] px-2 py-0.5 rounded-md font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center gap-1">
              <Check className="w-3 h-3 stroke-[2.5]" /> Mastered
            </span>
          )}

          {/* Schedule Trigger Button */}
          <button
            type="button"
            onClick={() => onSchedule(topic)}
            className="p-1 rounded text-[#71717a] hover:text-[#f4f4f5] hover:bg-zinc-800/80 transition-colors cursor-pointer"
            title="Configure schedule for passes"
          >
            <Calendar className="w-3.5 h-3.5" />
          </button>

          {/* Remove from Week */}
          <button
            type="button"
            onClick={handleRemove}
            className="text-[11px] text-[#71717a] hover:text-rose-400 hover:bg-rose-500/10 px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1"
            title="Remove from This Week"
          >
            <X className="w-3 h-3" />
            <span className="hidden sm:inline">Remove</span>
          </button>
        </div>
      </div>

      {/* Sub-steps if expanded */}
      {isExpanded && (
        <div className="ml-7 mt-2.5 pl-3.5 border-l border-[#222634] flex flex-col gap-1.5 pt-0.5 animate-in fade-in duration-150">
          <div className="text-[10px] font-semibold text-[#71717a] uppercase tracking-wider mb-0.5">
            Pass 2: 5-Step Deep Drill
          </div>
          {sortedSteps.map((step) => {
            const todayStr = getTodayDateString();
            const stepDate = step.scheduledDate || (topic.pass2Date || null);
            const isToday = stepDate === todayStr;

            return (
              <div
                key={step.id}
                onClick={(e) => handleToggleStep(e, step)}
                className="flex items-center justify-between gap-2.5 py-1 px-1.5 rounded hover:bg-[#1a1d26] cursor-pointer transition-colors group/step"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <button
                    type="button"
                    onClick={(e) => handleToggleStep(e, step)}
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                      step.isCompleted
                        ? 'bg-amber-500 border-amber-500 text-white'
                        : 'border-zinc-600 group-hover/step:border-zinc-400 bg-transparent'
                    }`}
                  >
                    {step.isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </button>
                  <span
                    className={`text-xs break-words transition-colors ${
                      step.isCompleted
                        ? 'line-through text-zinc-500'
                        : 'text-[#a1a1aa] group-hover/step:text-[#f4f4f5]'
                    }`}
                  >
                    {step.stepNumber}. {step.title}
                  </span>
                </div>

                {stepDate && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${
                    isToday
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : 'text-[#a1a1aa] bg-[#1a1d26] border-[#222634]'
                  }`}>
                    {formatScheduleDate(stepDate)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const ThisWeekView: React.FC = () => {
  const { 
    subjects, 
    subjectMap, 
    thisWeekTopics, 
    stepsByTopic, 
    currentSprintRange 
  } = useStudyData();

  const { 
    setSelectedTopicForSchedule, 
    setActiveView, 
    showToast, 
    soundEnabled,
    selectedTopicIds,
    isMultiSelectMode,
    toggleMultiSelectMode,
    toggleTopicSelection,
    selectTopics,
    deselectTopics
  } = useAppStore();

  const [grouping, setGrouping] = useState<'day' | 'subject'>('day');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [rollOverChoice, setRollOverChoice] = useState<'rollover' | 'backlog'>('rollover');
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);

  // Filter topics
  const query = searchQuery.trim().toLowerCase();
  const filteredTopics = thisWeekTopics.filter(t => {
    if (!query) return true;
    const sub = subjectMap.get(t.labelId);
    return t.title.toLowerCase().includes(query) || sub?.name.toLowerCase().includes(query);
  });

  const allVisibleTopicIds = filteredTopics.map(t => t.id);

  // Calculate sprint completion breakdown
  const completedTopics = filteredTopics.filter(t => 
    t.status === 'completed' || (t.pass1Completed && t.pass2Completed && t.pass3Completed)
  );
  const incompleteTopics = filteredTopics.filter(t => 
    !t.pass1Completed || !t.pass2Completed || !t.pass3Completed
  );

  // Next sprint Friday date
  const nextFriday = new Date(currentSprintRange.startDate);
  nextFriday.setDate(nextFriday.getDate() + 7);
  const nextFridayFormatted = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(nextFriday);

  // Close Sprint Action
  const handleConfirmCloseSprint = async () => {
    setIsSubmittingClose(true);
    try {
      const result = await completeAndCloseSprint({
        rollOverToNextSprint: rollOverChoice === 'rollover'
      });

      if (soundEnabled) playTopicCompletedFanfare();
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.5 } });

      showToast(
        `Sprint closed! ${result.completedCount} archived, ${result.rolledOverCount} ${rollOverChoice === 'rollover' ? 'rolled over to next sprint' : 'moved to backlog'}.`
      );
      setIsCloseModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Error closing sprint. Please try again.');
    } finally {
      setIsSubmittingClose(false);
    }
  };

  // Map topics for Day Grouping
  const topicsByDay = new Map<string, Topic[]>();
  const unscheduledTopics: Topic[] = [];

  filteredTopics.forEach(topic => {
    const topicSteps = stepsByTopic.get(topic.id) || [];
    let assignedDay: string | null = null;

    // Check pass dates within current sprint range
    if (topic.pass1Date && topic.pass1Date >= currentSprintRange.startStr && topic.pass1Date <= currentSprintRange.endStr) {
      assignedDay = topic.pass1Date;
    } else if (topic.pass2Date && topic.pass2Date >= currentSprintRange.startStr && topic.pass2Date <= currentSprintRange.endStr) {
      assignedDay = topic.pass2Date;
    } else if (topic.pass3Date && topic.pass3Date >= currentSprintRange.startStr && topic.pass3Date <= currentSprintRange.endStr) {
      assignedDay = topic.pass3Date;
    } else {
      const stepWithDate = topicSteps.find(s => s.scheduledDate && s.scheduledDate >= currentSprintRange.startStr && s.scheduledDate <= currentSprintRange.endStr);
      if (stepWithDate && stepWithDate.scheduledDate) {
        assignedDay = stepWithDate.scheduledDate;
      }
    }

    if (assignedDay) {
      const list = topicsByDay.get(assignedDay) || [];
      list.push(topic);
      topicsByDay.set(assignedDay, list);
    } else {
      unscheduledTopics.push(topic);
    }
  });

  // Map topics for Subject Grouping
  const topicsBySubject = new Map<string, Topic[]>();
  filteredTopics.forEach(topic => {
    const list = topicsBySubject.get(topic.labelId) || [];
    list.push(topic);
    topicsBySubject.set(topic.labelId, list);
  });

  return (
    <div className="w-full flex flex-col animate-in fade-in duration-150">
      {/* Standardized Sticky Top Header */}
      <PageHeader
        title="This Week"
        counter={`Sprint: ${currentSprintRange.formattedRange} • ${thisWeekTopics.length} committed`}
        actions={
          <div className="flex items-center gap-2">
            {/* Multi-Select Toggle Button */}
            <button
              type="button"
              onClick={() => toggleMultiSelectMode()}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors cursor-pointer flex items-center gap-1.5 select-none ${
                isMultiSelectMode || selectedTopicIds.size > 0
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700/60'
              }`}
              title={isMultiSelectMode ? 'Exit multi-select mode' : 'Select multiple topics for batch actions'}
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isMultiSelectMode || selectedTopicIds.size > 0 ? 'Select Multiple' : 'Select'}</span>
            </button>

            {/* Grouping Toggle: Day / Subject */}
            <div className="flex items-center p-0.5 rounded-md bg-zinc-900/60 border border-zinc-800">
              <button
                type="button"
                onClick={() => setGrouping('day')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  grouping === 'day'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>By Day</span>
              </button>
              <button
                type="button"
                onClick={() => setGrouping('subject')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  grouping === 'subject'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>By Subject</span>
              </button>
            </div>

            {/* Complete & Close Sprint Button */}
            <button
              type="button"
              onClick={() => setIsCloseModalOpen(true)}
              disabled={thisWeekTopics.length === 0}
              className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-medium text-zinc-200 px-3 py-1.5 rounded-md border border-zinc-700/60 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>Complete & Close Sprint</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        }
        searchProps={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: 'Filter sprint topics...'
        }}
      />

      <div className="max-w-6xl w-full mx-auto px-8 py-6 space-y-6">
        {/* Select All Visible Quick Bar */}
        {(isMultiSelectMode || selectedTopicIds.size > 0) && filteredTopics.length > 0 && (
          <div className="flex items-center justify-between text-xs py-2 px-3 bg-zinc-900/70 border border-zinc-800/80 rounded-lg text-zinc-400 animate-in fade-in">
            <span>
              <strong className="text-zinc-200">{selectedTopicIds.size}</strong> of {filteredTopics.length} sprint topics selected
            </span>
            <button
              type="button"
              onClick={() => {
                const allSelected = allVisibleTopicIds.length > 0 && allVisibleTopicIds.every(id => selectedTopicIds.has(id));
                if (allSelected) {
                  deselectTopics(allVisibleTopicIds);
                } else {
                  selectTopics(allVisibleTopicIds);
                }
              }}
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
            >
              {allVisibleTopicIds.every(id => selectedTopicIds.has(id)) ? 'Deselect All Visible' : 'Select All Visible'}
            </button>
          </div>
        )}

        {/* Empty State */}
        {filteredTopics.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-300">
                {query ? 'No topics matching search filter.' : 'No topics committed to This Week yet.'}
              </p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Friday–Thursday sprint cycle ({currentSprintRange.formattedRange}).
              </p>
            </div>
            {!query && (
              <button
                type="button"
                onClick={() => setActiveView('backlog')}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium px-4 py-2 rounded-lg border border-zinc-700/60 transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Browse Syllabus Backlog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <>
            {/* View A: Grouped by Day (Friday -> Thursday) */}
            {grouping === 'day' && (
              <div className="space-y-6">
                {/* 7 Days of the Sprint Cycle */}
                {currentSprintRange.days.map((day) => {
                  const dayTopics = topicsByDay.get(day.dateStr) || [];
                  if (dayTopics.length === 0) return null;

                  return (
                    <div key={day.dateStr} className="space-y-2">
                      {/* Day Header */}
                      <div className="flex items-center justify-between py-1.5 px-2 border-b border-[#222634]/70">
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-semibold text-zinc-200">
                            {day.dayName}, {day.formattedDate}
                          </span>
                          {day.isToday && (
                            <span className="text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">
                              Today
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-zinc-500">
                          {dayTopics.length} {dayTopics.length === 1 ? 'topic' : 'topics'}
                        </span>
                      </div>

                      {/* Day Topics */}
                      <div className="flex flex-col">
                        {dayTopics.map((topic) => (
                          <SprintTopicRow
                            key={topic.id}
                            topic={topic}
                            subject={subjectMap.get(topic.labelId)}
                            steps={stepsByTopic.get(topic.id) || []}
                            onSchedule={setSelectedTopicForSchedule}
                            onToggleSelect={(topicId, isShiftClick) => {
                              toggleTopicSelection(topicId, { isShiftClick, orderedTopicIds: allVisibleTopicIds });
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Unscheduled / Committed Topics */}
                {unscheduledTopics.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between py-1.5 px-2 border-b border-[#222634]/70">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-300">
                          Committed (Unassigned Day)
                        </span>
                        <span className="text-[10px] text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded font-mono">
                          Sprint Backlog
                        </span>
                      </div>
                      <span className="text-xs font-mono text-zinc-500">
                        {unscheduledTopics.length} {unscheduledTopics.length === 1 ? 'topic' : 'topics'}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      {unscheduledTopics.map((topic) => (
                        <SprintTopicRow
                          key={topic.id}
                          topic={topic}
                          subject={subjectMap.get(topic.labelId)}
                          steps={stepsByTopic.get(topic.id) || []}
                          onSchedule={setSelectedTopicForSchedule}
                          onToggleSelect={(topicId, isShiftClick) => {
                            toggleTopicSelection(topicId, { isShiftClick, orderedTopicIds: allVisibleTopicIds });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* View B: Grouped by Subject */}
            {grouping === 'subject' && (
              <div className="space-y-6">
                {subjects.map((subject) => {
                  const subjectTopics = topicsBySubject.get(subject.id) || [];
                  if (subjectTopics.length === 0) return null;

                  const dotColor = subjectColorMap[subject.color]?.dot || 'bg-emerald-400';

                  return (
                    <div key={subject.id} className="space-y-2">
                      <div className="flex items-center justify-between py-1.5 px-2 border-b border-[#222634]/70">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0`} />
                          <span className="text-sm font-semibold text-zinc-200">
                            {subject.name}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-zinc-500">
                          {subjectTopics.length} {subjectTopics.length === 1 ? 'topic' : 'topics'}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        {subjectTopics.map((topic) => (
                          <SprintTopicRow
                            key={topic.id}
                            topic={topic}
                            subject={subject}
                            steps={stepsByTopic.get(topic.id) || []}
                            onSchedule={setSelectedTopicForSchedule}
                            onToggleSelect={(topicId, isShiftClick) => {
                              toggleTopicSelection(topicId, { isShiftClick, orderedTopicIds: allVisibleTopicIds });
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Complete & Close Sprint Modal */}
      {isCloseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#12141a] border border-zinc-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#161821]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-zinc-100">
                  Complete & Close Sprint
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCloseModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <div className="text-xs text-zinc-400">
                Closing sprint <span className="font-mono text-zinc-200">{currentSprintRange.sprintWeekId}</span> ({currentSprintRange.formattedRange}).
              </div>

              {/* Stats Breakdown */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#161821] border border-zinc-800 rounded-lg p-3">
                  <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                    Completed
                  </div>
                  <div className="text-lg font-semibold text-emerald-400 mt-0.5 font-mono">
                    {completedTopics.length}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    Ready to archive
                  </div>
                </div>

                <div className="bg-[#161821] border border-zinc-800 rounded-lg p-3">
                  <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                    Incomplete
                  </div>
                  <div className="text-lg font-semibold text-amber-400 mt-0.5 font-mono">
                    {incompleteTopics.length}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    Needs disposition
                  </div>
                </div>
              </div>

              {/* Incomplete Topics Disposition */}
              {incompleteTopics.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-300">
                    What should happen to the {incompleteTopics.length} incomplete topics?
                  </label>
                  <div className="space-y-2">
                    <label 
                      onClick={() => setRollOverChoice('rollover')}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer select-none ${
                        rollOverChoice === 'rollover'
                          ? 'bg-zinc-800/60 border-zinc-600 text-zinc-100'
                          : 'bg-[#161821] border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="rollover"
                        checked={rollOverChoice === 'rollover'}
                        onChange={() => setRollOverChoice('rollover')}
                        className="mt-0.5 accent-emerald-500"
                      />
                      <div className="text-xs">
                        <div className="font-medium text-zinc-200">
                          Roll over to Next Sprint (Starts {nextFridayFormatted})
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          Keeps them committed for the upcoming Friday-to-Thursday sprint cycle.
                        </div>
                      </div>
                    </label>

                    <label 
                      onClick={() => setRollOverChoice('backlog')}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer select-none ${
                        rollOverChoice === 'backlog'
                          ? 'bg-zinc-800/60 border-zinc-600 text-zinc-100'
                          : 'bg-[#161821] border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="rollover"
                        checked={rollOverChoice === 'backlog'}
                        onChange={() => setRollOverChoice('backlog')}
                        className="mt-0.5 accent-emerald-500"
                      />
                      <div className="text-xs">
                        <div className="font-medium text-zinc-200">
                          Move back to Syllabus Backlog
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          Unassigns them from sprint commitments until scheduled again.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800 bg-[#161821]">
              <button
                type="button"
                onClick={() => setIsCloseModalOpen(false)}
                disabled={isSubmittingClose}
                className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-md transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCloseSprint}
                disabled={isSubmittingClose}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs px-4 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                {isSubmittingClose ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Closing Sprint...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm & Close Sprint</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
