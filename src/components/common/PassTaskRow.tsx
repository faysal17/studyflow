import React, { useState } from 'react';
import type { ScheduledPassTask, SubjectLabel, PipelineStep } from '../../types';
import { SubjectBadge } from './SubjectBadge';
import { 
  togglePass1Completion, 
  togglePass2Completion, 
  togglePass3Completion, 
  toggleStepCompletion, 
  deleteTopicWithUndo,
  restoreDeletedTopic 
} from '../../db';
import { useAppStore } from '../../store/useAppStore';
import { formatScheduleDate, getTodayDateString } from '../../utils/dateUtils';
import { playCompletionSound, playTopicCompletedFanfare } from '../../utils/soundUtils';
import confetti from 'canvas-confetti';
import { Check, Trash2, ChevronDown, ChevronRight, Calendar } from 'lucide-react';

interface PassTaskRowProps {
  task: ScheduledPassTask;
  subject?: SubjectLabel;
  steps?: PipelineStep[];
}

export const PassTaskRow: React.FC<PassTaskRowProps> = ({
  task,
  subject,
  steps = []
}) => {
  const { soundEnabled, showToast, setSelectedTopicForSchedule } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(task.passNumber === 2);

  const sortedSteps = [...steps].sort((a, b) => a.stepNumber - b.stepNumber);
  const completedStepsCount = sortedSteps.filter(s => s.isCompleted).length;

  // Handle main circular checkbox click for the scheduled pass
  const handleCheckboxClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (task.passNumber === 1) {
      const isDone = await togglePass1Completion(task.topic.id);
      if (isDone && soundEnabled) playCompletionSound();
      showToast(isDone ? `Pass 1 completed for "${task.topic.title}"` : `Reopened Pass 1`);
    } else if (task.passNumber === 2) {
      const isDone = await togglePass2Completion(task.topic.id);
      if (isDone && soundEnabled) playCompletionSound();
      showToast(isDone ? `Pass 2 completed for "${task.topic.title}"` : `Reopened Pass 2`);
    } else if (task.passNumber === 3) {
      const isDone = await togglePass3Completion(task.topic.id);
      if (isDone) {
        if (task.topic.pass1Completed && task.topic.pass2Completed) {
          if (soundEnabled) playTopicCompletedFanfare();
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 }
          });
          showToast(`🎉 100% Mastered: "${task.topic.title}"!`);
        } else {
          if (soundEnabled) playCompletionSound();
          showToast(`Pass 3 completed for "${task.topic.title}"`);
        }
      } else {
        showToast(`Reopened Pass 3 for "${task.topic.title}"`);
      }
    }
  };

  // Handle sub-step click in Pass 2
  const handleStepClick = async (e: React.MouseEvent, step: PipelineStep) => {
    e.stopPropagation();
    const newCompleted = await toggleStepCompletion(step.id);
    if (newCompleted && soundEnabled) playCompletionSound();

    if (step.stepNumber === 5 && newCompleted) {
      showToast(`Pass 2 Finished! Step 5 completed for "${task.topic.title}"`);
    }
  };

  // Handle topic deletion instantly with Undo toast notification (No blocking dialogs)
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const snapshot = await deleteTopicWithUndo(task.topic.id);
    showToast(
      `Deleted "${task.topic.title}"`,
      {
        label: 'Undo',
        onClick: async () => {
          await restoreDeletedTopic(snapshot);
          showToast(`Restored "${task.topic.title}"`);
        }
      },
      5000
    );
  };

  // Pass badge styling
  const renderPassBadge = () => {
    if (task.passNumber === 1) {
      return (
        <button
          type="button"
          onClick={() => setSelectedTopicForSchedule(task.topic)}
          className="h-5.5 text-[11px] font-medium px-2 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
          title="Click to adjust pass scheduling"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          Pass 1: Skim
        </button>
      );
    }
    if (task.passNumber === 2) {
      return (
        <button
          type="button"
          onClick={() => setSelectedTopicForSchedule(task.topic)}
          className="h-5.5 text-[11px] font-medium px-2 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
          title="Click to adjust pass scheduling"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Pass 2: Deep Drill ({completedStepsCount}/5)
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setSelectedTopicForSchedule(task.topic)}
        className="h-5.5 text-[11px] font-medium px-2 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
        title="Click to adjust pass scheduling"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
        Pass 3: Review
      </button>
    );
  };

  return (
    <div className="group flex flex-col py-3 px-2.5 rounded-lg hover:bg-[#1a1d26] border-b border-[#222634] transition-colors">
      {/* Primary Row */}
      <div className="flex items-center gap-3 w-full">
        {/* Checkbox (18px circle) */}
        <button
          type="button"
          onClick={handleCheckboxClick}
          className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
            task.isCompleted
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-zinc-600 hover:border-zinc-400 bg-transparent'
          }`}
          title={task.isCompleted ? 'Mark incomplete' : 'Mark pass complete'}
        >
          {task.isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
        </button>

        {/* Subject Badge */}
        <SubjectBadge subject={subject} className="flex-shrink-0" />

        {/* Topic Title - NEVER TRUNCATED */}
        <div className="flex-1 min-w-0 pr-3">
          <span className="text-base font-medium text-[#f4f4f5] break-words leading-relaxed select-text">
            {task.topic.title}
          </span>
        </div>

        {/* Right Actions: Pass Badge + Date Button + Expander + Delete */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Pass Badge */}
          {renderPassBadge()}

          {/* Schedule Date Badge */}
          <button
            type="button"
            onClick={() => setSelectedTopicForSchedule(task.topic)}
            className={`h-5.5 text-[11px] font-medium px-2 rounded-md border transition-colors flex items-center gap-1 cursor-pointer ${
              task.isOverdue
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                : 'bg-zinc-800/80 text-[#a1a1aa] hover:text-[#f4f4f5] border-[#222634] hover:bg-zinc-700/80'
            }`}
            title="Edit schedule date"
          >
            <Calendar className="w-3 h-3 text-[#71717a]" />
            {task.isOverdue ? `Overdue (${formatScheduleDate(task.date)})` : formatScheduleDate(task.date)}
          </button>

          {/* Sub-step Toggle (Pass 2 only) */}
          {task.passNumber === 2 && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded text-[#71717a] hover:text-[#f4f4f5] hover:bg-zinc-800/80 transition-colors cursor-pointer"
              title={isExpanded ? 'Collapse sub-steps' : 'Expand sub-steps'}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          )}

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

      {/* Pass 2 Sub-steps (Clean Hairline Indentation, No Nested Cards) */}
      {task.passNumber === 2 && isExpanded && (
        <div className="ml-7 mt-2.5 pl-3.5 border-l border-[#222634] flex flex-col gap-1.5 pt-0.5 animate-in fade-in duration-150">
          {sortedSteps.map((step) => {
            const todayStr = getTodayDateString();
            const stepDate = step.scheduledDate || (task.passNumber === 2 ? task.topic.pass2Date : null);
            const isToday = stepDate === todayStr;

            return (
              <div
                key={step.id}
                onClick={(e) => handleStepClick(e, step)}
                className="flex items-center justify-between gap-2.5 py-1 px-1.5 rounded hover:bg-[#1a1d26] cursor-pointer transition-colors group/step"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <button
                    type="button"
                    onClick={(e) => handleStepClick(e, step)}
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
                      setSelectedTopicForSchedule(task.topic);
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
