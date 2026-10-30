import React from 'react';
import { useStudyData } from '../../hooks/useStudyData';
import { PassTaskRow } from '../common/PassTaskRow';
import { getTodayDateString, getDayName } from '../../utils/dateUtils';
import { setTopicPassDate } from '../../db';
import { useAppStore } from '../../store/useAppStore';

export const TodayView: React.FC = () => {
  const { 
    todayTasks, 
    overdueTasks, 
    subjectMap, 
    stepsByTopic 
  } = useStudyData();

  const { showToast } = useAppStore();
  const todayStr = getTodayDateString();
  const dayName = getDayName();

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(new Date());

  const handleRescheduleAllOverdue = async () => {
    try {
      for (const task of overdueTasks) {
        await setTopicPassDate(task.topic.id, task.passNumber, todayStr);
      }
      showToast(`Rescheduled ${overdueTasks.length} overdue pass tasks to Today`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-4xl w-full mx-auto px-8 py-8 space-y-6 animate-in fade-in duration-150">
      {/* Quiet Top Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#f4f4f5] tracking-tight">
          Today
        </h1>
        <p className="text-sm text-[#a1a1aa] mt-1">
          {dayName}, {formattedDate}
        </p>

        {/* Quiet overdue alert if any */}
        {overdueTasks.length > 0 && (
          <div className="flex items-center gap-2 mt-3 text-xs text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-md border border-rose-500/20 w-fit">
            <span>{overdueTasks.length} overdue pass tasks</span>
            <span>•</span>
            <button
              onClick={handleRescheduleAllOverdue}
              className="text-rose-300 hover:text-white underline underline-offset-2 font-medium cursor-pointer"
            >
              Reschedule to Today
            </button>
          </div>
        )}
      </div>

      {/* Flat Things 3 Single-Row Checklist */}
      {todayTasks.length === 0 ? (
        <div className="py-16 text-center text-sm text-[#71717a]">
          No pass tasks scheduled for today. Press <kbd className="font-mono text-xs text-[#a1a1aa] bg-[#12141a] px-1.5 py-0.5 rounded border border-[#222634]">N</kbd> to add topics or browse Backlog.
        </div>
      ) : (
        <div className="flex flex-col">
          {todayTasks.map((task) => {
            const subject = subjectMap.get(task.topic.labelId);
            const topicSteps = stepsByTopic.get(task.topic.id) || [];
            return (
              <PassTaskRow
                key={task.id}
                task={task}
                subject={subject}
                steps={topicSteps}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
