import React from 'react';
import { useStudyData } from '../../hooks/useStudyData';
import { PassTaskRow } from '../common/PassTaskRow';

export const TomorrowView: React.FC = () => {
  const { 
    tomorrowTasks, 
    subjectMap, 
    stepsByTopic 
  } = useStudyData();

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);

  const dayName = tomorrowDate.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(tomorrowDate);

  return (
    <div className="max-w-4xl w-full mx-auto px-8 py-8 space-y-6 animate-in fade-in duration-150">
      {/* Quiet Top Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#f4f4f5] tracking-tight">
          Tomorrow
        </h1>
        <p className="text-sm text-[#a1a1aa] mt-1">
          {dayName}, {formattedDate}
        </p>
      </div>

      {/* Flat Things 3 Checklist */}
      {tomorrowTasks.length === 0 ? (
        <div className="py-16 text-center text-sm text-[#71717a]">
          Nothing scheduled for tomorrow yet.
        </div>
      ) : (
        <div className="flex flex-col">
          {tomorrowTasks.map((task) => {
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
