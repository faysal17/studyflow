import React, { useState } from 'react';
import type { Topic, SubjectLabel, PipelineStep } from '../../types';
import { SubjectBadge } from './SubjectBadge';
import { 
  togglePass1Completion, 
  togglePass2Completion,
  togglePass3Completion, 
  toggleStepCompletion, 
  deleteTopicWithUndo,
  restoreDeletedTopic,
  addTopicToSprint,
  removeTopicFromSprint
} from '../../db';
import { useAppStore } from '../../store/useAppStore';
import { formatScheduleDate, getTodayDateString } from '../../utils/dateUtils';
import { playCompletionSound, playTopicCompletedFanfare } from '../../utils/soundUtils';
import confetti from 'canvas-confetti';
import { Check, Trash2, Calendar, ChevronDown, ChevronRight } from 'lucide-react';

interface TopicRowProps {
  topic: Topic;
  subject?: SubjectLabel;
  steps: PipelineStep[];
  showSubjectBadge?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (topicId: string, isShiftClick: boolean) => void;
}

export const TopicRow: React.FC<TopicRowProps> = ({
  topic,
  subject,
  steps,
  showSubjectBadge = true,
  isSelected: propsIsSelected,
  onToggleSelect
}) => {
  const { 
    soundEnabled, 
    showToast, 
    setSelectedTopicForSchedule,
    selectedTopicIds,
    isMultiSelectMode,
    toggleTopicSelection
  } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const isSelected = propsIsSelected !== undefined 
    ? propsIsSelected 
    : selectedTopicIds.has(topic.id);

  const sortedSteps = [...steps].sort((a, b) => a.stepNumber - b.stepNumber);
  const completedStepCount = sortedSteps.filter(s => s.isCompleted).length;
  const isMastered = topic.status === 'completed' || (topic.pass1Completed && topic.pass2Completed && topic.pass3Completed);

  // Selection Checkbox Click Action
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

  // Main Circular Checkbox Click Action
  const handleMainCheckboxClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!topic.pass1Completed) {
      const done = await togglePass1Completion(topic.id);
      if (done && soundEnabled) playCompletionSound();
      showToast(`Pass 1 completed for "${topic.title}"`);
      return;
    }

    if (!topic.pass2Completed) {
      const done = await togglePass2Completion(topic.id);
      if (done && soundEnabled) playCompletionSound();
      showToast(`Pass 2 completed for "${topic.title}"`);
      return;
    }

    if (!topic.pass3Completed) {
      const done = await togglePass3Completion(topic.id);
      if (done) {
        if (soundEnabled) playTopicCompletedFanfare();
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
        showToast(`🎉 100% Mastered: "${topic.title}"!`);
      }
      return;
    }

    // If fully mastered, reopen
    await togglePass3Completion(topic.id);
    showToast(`Reopened "${topic.title}"`);
  };

  // Toggle sub-step in Pass 2
  const handleToggleStep = async (e: React.MouseEvent, step: PipelineStep) => {
    e.stopPropagation();
    const newCompleted = await toggleStepCompletion(step.id);
    if (newCompleted && soundEnabled) playCompletionSound();
    if (step.stepNumber === 5 && newCompleted) {
      showToast(`Pass 2 Finished! Step 5 completed for "${topic.title}"`);
    }
  };

  // Delete topic instantly with Undo toast notification (No blocking dialogs)
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const snapshot = await deleteTopicWithUndo(topic.id);
    showToast(
      `Deleted "${topic.title}"`,
      {
        label: 'Undo',
        onClick: async () => {
          await restoreDeletedTopic(snapshot);
          showToast(`Restored "${topic.title}"`);
        }
      },
      5000
    );
  };

  // Fast 1-click sprint toggle
  const handleToggleSprint = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (topic.inSprint) {
        await removeTopicFromSprint(topic.id);
        showToast(`Removed "${topic.title}" from This Week`);
      } else {
        await addTopicToSprint(topic.id);
        if (soundEnabled) playCompletionSound();
        showToast(`Added "${topic.title}" to This Week`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div 
      onClick={handleRowClick}
      className={`group flex flex-col py-3 px-2.5 rounded-lg border-b transition-all border-l-2 ${
        isSelected
          ? 'bg-zinc-800/45 border-l-emerald-500 border-b-zinc-800 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.12)]'
          : 'hover:bg-[#1a1d26] border-b-[#222634] border-l-transparent'
      }`}
    >
      {/* Primary Row */}
      <div className="flex items-center gap-2.5 w-full">
        {/* Square Selection Checkbox (Linear / Things 3 style) */}
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

        {/* Circular Checkbox (18px) for completing next pass */}
        <button
          type="button"
          onClick={handleMainCheckboxClick}
          className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
            isMastered
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-zinc-600 hover:border-zinc-400 bg-transparent'
          }`}
          title={isMastered ? 'Mastered (click to reopen)' : 'Complete next pass'}
        >
          {isMastered && <Check className="w-2.5 h-2.5 stroke-[3]" />}
        </button>

        {/* Subject Badge (conditional) */}
        {showSubjectBadge && <SubjectBadge subject={subject} className="flex-shrink-0" />}

        {/* Topic Title - NEVER TRUNCATED */}
        <div className="flex-1 min-w-0 pr-3">
          <span className={`text-base font-medium break-words leading-relaxed select-text ${
            isMastered ? 'line-through text-zinc-500' : 'text-[#f4f4f5]'
          }`}>
            {topic.title}
          </span>
        </div>

        {/* Right Actions: 1-Click Sprint Action + 3-Pass Mini Badges + Schedule Button + Expander + Delete */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Fast 1-Click Sprint Action */}
          <button
            type="button"
            onClick={handleToggleSprint}
            className={`h-5.5 text-[11px] px-2 rounded-md font-medium border transition-colors cursor-pointer flex items-center gap-1 select-none ${
              topic.inSprint
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-rose-500/15 hover:text-rose-300 hover:border-rose-500/30'
                : 'border-zinc-700/60 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white'
            }`}
            title={topic.inSprint ? 'Committed to This Week (click to remove)' : 'Add to This Week (Friday–Thursday sprint)'}
          >
            {topic.inSprint ? (
              <>
                <Check className="w-3 h-3 stroke-[2.5]" />
                <span>In Week</span>
              </>
            ) : (
              <span>+ Add to This Week</span>
            )}
          </button>

          {/* Pass 1 Status Badge */}
          <button
            type="button"
            onClick={() => setSelectedTopicForSchedule(topic)}
            className={`h-5.5 text-[11px] px-2 rounded-md font-medium border transition-colors cursor-pointer ${
              topic.pass1Completed
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : topic.pass1Date
                  ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                  : 'bg-zinc-800/80 text-[#71717a] border-[#222634] hover:text-[#a1a1aa]'
            }`}
            title="Pass 1: Skim"
          >
            P1{topic.pass1Completed ? ' ✓' : topic.pass1Date ? `: ${formatScheduleDate(topic.pass1Date)}` : ''}
          </button>

          {/* Pass 2 Status Badge */}
          <button
            type="button"
            onClick={() => setSelectedTopicForSchedule(topic)}
            className={`h-5.5 text-[11px] px-2 rounded-md font-medium border transition-colors cursor-pointer ${
              topic.pass2Completed
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : topic.pass2Date
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  : 'bg-zinc-800/80 text-[#71717a] border-[#222634] hover:text-[#a1a1aa]'
            }`}
            title="Pass 2: Deep Drill"
          >
            P2{topic.pass2Completed ? ' ✓' : topic.pass2Date ? `: ${formatScheduleDate(topic.pass2Date)} (${completedStepCount}/5)` : ''}
          </button>

          {/* Pass 3 Status Badge */}
          <button
            type="button"
            onClick={() => setSelectedTopicForSchedule(topic)}
            className={`h-5.5 text-[11px] px-2 rounded-md font-medium border transition-colors cursor-pointer ${
              topic.pass3Completed
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : topic.pass3Date
                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                  : 'bg-zinc-800/80 text-[#71717a] border-[#222634] hover:text-[#a1a1aa]'
            }`}
            title="Pass 3: Review"
          >
            P3{topic.pass3Completed ? ' ✓' : topic.pass3Date ? `: ${formatScheduleDate(topic.pass3Date)}` : ''}
          </button>

          {/* Schedule button */}
          <button
            type="button"
            onClick={() => setSelectedTopicForSchedule(topic)}
            className="p-1 rounded text-[#71717a] hover:text-[#f4f4f5] hover:bg-zinc-800/80 transition-colors cursor-pointer"
            title="Configure schedule for passes"
          >
            <Calendar className="w-3.5 h-3.5" />
          </button>

          {/* Expand Steps Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded text-[#71717a] hover:text-[#f4f4f5] hover:bg-zinc-800/80 transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse sub-steps' : 'View Pass 2 sub-steps'}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Delete Action */}
          <button
            type="button"
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#71717a] hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
            title="Delete topic"
          >
            <Trash2 className="w-3.5 h-3.5" />
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

                {/* Step Date Badge */}
                {stepDate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTopicForSchedule(topic);
                    }}
                    className={`text-[10px] font-medium px-1.5 py-0.2 rounded border transition-colors cursor-pointer flex-shrink-0 ${
                      isToday
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        : 'text-[#a1a1aa] bg-[#1a1d26] border-[#222634] hover:border-zinc-600'
                    }`}
                    title="Click to adjust schedule"
                  >
                    {formatScheduleDate(stepDate)}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
