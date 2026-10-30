import React from 'react';
import { useStudyData } from '../../hooks/useStudyData';
import { PassTaskRow } from '../common/PassTaskRow';
import { formatFullScheduleDate } from '../../utils/dateUtils';
import type { ScheduledPassTask } from '../../types';

export const UpcomingView: React.FC = () => {
  const { 
    upcomingTasks, 
    subjectMap, 
    stepsByTopic 
  } = useStudyData();

  // Group upcoming tasks by date
  const groupedByDate = upcomingTasks.reduce<Record<string, ScheduledPassTask[]>>((acc, task) => {
    const dateKey = task.date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(task);
    return acc;
  }, {});

  const dateKeys = Object.keys(groupedByDate).sort();

  return (
    <div className="max-w-4xl w-full mx-auto px-8 py-8 space-y-6 animate-in fade-in duration-150">
      {/* Quiet Top Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#f4f4f5] tracking-tight">
          Upcoming
        </h1>
        <p className="text-sm text-[#a1a1aa] mt-1">
          {upcomingTasks.length} scheduled pass tasks beyond tomorrow
        </p>
      </div>

      {/* Grouped by Day Checklist */}
      {dateKeys.length === 0 ? (
        <div className="py-16 text-center text-sm text-[#71717a]">
          No pass tasks scheduled beyond tomorrow.
        </div>
      ) : (
        <div className="space-y-6">
          {dateKeys.map((dateStr) => {
            const tasksForDate = groupedByDate[dateStr];
            return (
              <div key={dateStr} className="space-y-1">
                <div className="text-xs font-medium text-[#a1a1aa] pb-1 border-b border-[#222634]">
                  {formatFullScheduleDate(dateStr)}
                </div>

                <div className="flex flex-col">
                  {tasksForDate.map((task) => {
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
