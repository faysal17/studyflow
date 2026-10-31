import React from 'react';
import type { PipelineStep } from '../../types';
import { toggleStepCompletion } from '../../db';
import { useAppStore } from '../../store/useAppStore';
import { playCompletionSound, playTopicCompletedFanfare } from '../../utils/soundUtils';
import confetti from 'canvas-confetti';
import { Check } from 'lucide-react';

export const STANDARD_STEP_TITLES: Record<number, string> = {
  1: 'Study the book',
  2: 'Solve book questions',
  3: 'Create Anki questions from topic',
  4: 'Practice Anki questions',
  5: 'Benchmark on LiveMCQ'
};

interface PipelineStepsBarProps {
  steps: PipelineStep[];
  topicTitle?: string;
  compact?: boolean;
  onStepToggled?: (stepNumber: number, isCompleted: boolean) => void;
}

export const PipelineStepsBar: React.FC<PipelineStepsBarProps> = ({
  steps,
  topicTitle,
  compact = false,
  onStepToggled
}) => {
  const { soundEnabled, showToast } = useAppStore();

  const sortedSteps = [...steps].sort((a, b) => a.stepNumber - b.stepNumber);
  const completedCount = sortedSteps.filter(s => s.isCompleted).length;

  const handleToggle = async (e: React.MouseEvent, step: PipelineStep) => {
    e.stopPropagation();
    try {
      const willBeCompleted = !step.isCompleted;
      await toggleStepCompletion(step.id);

      if (willBeCompleted) {
        if (step.stepNumber === 5) {
          if (soundEnabled) playTopicCompletedFanfare();
          confetti({
            particleCount: 50,
            spread: 55,
            origin: { y: 0.6 }
          });
          showToast(`Pass 2 completed: "${topicTitle || 'Topic'}". Ready for Pass 3: Final Review & Polish.`);
        } else {
          if (soundEnabled) playCompletionSound();
        }
      }

      onStepToggled?.(step.stepNumber, willBeCompleted);
    } catch (err) {
      console.error('Error toggling step:', err);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5" title={`${completedCount}/5 steps completed`}>
        {sortedSteps.map(step => {
          const stepTitle = STANDARD_STEP_TITLES[step.stepNumber] || step.title;
          return (
            <button
              key={step.id}
              onClick={(e) => handleToggle(e, step)}
              className={`w-[18px] h-[18px] rounded-full flex items-center justify-center transition-colors ${
                step.isCompleted
                  ? 'bg-emerald-500 text-white border border-emerald-400'
                  : 'border border-zinc-700 bg-transparent hover:border-zinc-500'
              }`}
              title={`Step ${step.stepNumber}: ${stepTitle}`}
            >
              {step.isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </button>
          );
        })}
        <span className="text-xs text-zinc-400 font-mono ml-1.5">
          {completedCount}/5
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 py-1">
      {sortedSteps.map((step) => {
        const isDone = step.isCompleted;
        const stepTitle = STANDARD_STEP_TITLES[step.stepNumber] || step.title;
        return (
          <div
            key={step.id}
            onClick={(e) => handleToggle(e, step)}
            className="group flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-[#1a1d26] transition-colors cursor-pointer select-none"
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* 18px Circular check indicator */}
              <button
                type="button"
                className={`w-[18px] h-[18px] rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                  isDone
                    ? 'bg-emerald-500 text-white border border-emerald-400'
                    : 'border border-zinc-600 group-hover:border-zinc-400 bg-transparent'
                }`}
              >
                {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </button>

              {/* Title & Strikethrough handling */}
              <span className={`text-xs ${
                isDone 
                  ? 'text-[#71717a] line-through opacity-80' 
                  : 'text-zinc-200 group-hover:text-zinc-100 font-normal'
              }`}>
                {step.stepNumber}. {stepTitle}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
