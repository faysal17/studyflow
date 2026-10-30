import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { SubjectLabel, Topic, PipelineStep, MissedQuestion, VocabItem, SprintHistory, ScheduledPassTask } from '../types';
import { getCurrentSprintWeekId, getTodayDateString, getTomorrowDateString } from '../utils/dateUtils';
import { getCurrentSprintRange, isTopicInSprint } from '../utils/sprintUtils';

export function useStudyData() {
  const subjects = useLiveQuery<SubjectLabel[]>(() => {
    return db.subjects.orderBy('order').toArray();
  }, []) || [];

  const topics = useLiveQuery<Topic[]>(() => {
    return db.topics.orderBy('order').toArray();
  }, []) || [];

  const steps = useLiveQuery<PipelineStep[]>(() => {
    return db.steps.toArray();
  }, []) || [];

  const missedQuestions = useLiveQuery<MissedQuestion[]>(() => {
    return db.missedQuestions.reverse().sortBy('createdAt');
  }, []) || [];

  const vocabItems = useLiveQuery<VocabItem[]>(() => {
    return db.vocab.reverse().sortBy('createdAt');
  }, []) || [];

  const sprintHistory = useLiveQuery<SprintHistory[]>(() => {
    return db.sprintHistory.reverse().sortBy('archivedAt');
  }, []) || [];

  const settingsMap = useLiveQuery<Record<string, any>>(async () => {
    const list = await db.settings.toArray();
    const map: Record<string, any> = {};
    for (const item of list) {
      map[item.key] = item.value;
    }
    return map;
  }, []) || {};

  // Build subject lookup map
  const subjectMap = new Map<string, SubjectLabel>();
  subjects.forEach(sub => subjectMap.set(sub.id, sub));

  // Build steps lookup map by topicId
  const stepsByTopic = new Map<string, PipelineStep[]>();
  steps.forEach(step => {
    const existing = stepsByTopic.get(step.topicId) || [];
    existing.push(step);
    stepsByTopic.set(step.topicId, existing);
  });

  // Sort steps inside topic by stepNumber
  stepsByTopic.forEach(arr => {
    arr.sort((a, b) => a.stepNumber - b.stepNumber);
  });

  const todayStr = getTodayDateString();
  const tomorrowStr = getTomorrowDateString();

  // Generate scheduled pass tasks across all active topics
  const allScheduledTasks: ScheduledPassTask[] = [];

  topics.forEach((topic) => {
    if (topic.status === 'completed') return;

    // Pass 1 Task
    if (topic.pass1Date && !topic.pass1Completed) {
      allScheduledTasks.push({
        id: `${topic.id}-p1`,
        topic,
        passNumber: 1,
        date: topic.pass1Date,
        isCompleted: false,
        isOverdue: topic.pass1Date < todayStr
      });
    }

    // Pass 2 Task: Check topic.pass2Date OR individual step scheduledDate
    if (!topic.pass2Completed) {
      const topicSteps = stepsByTopic.get(topic.id) || [];
      const uncompletedSteps = topicSteps.filter(s => !s.isCompleted);
      const pass2Dates = new Set<string>();

      // If topic has pass2Date and some uncompleted steps inherit it
      if (topic.pass2Date && uncompletedSteps.some(s => !s.scheduledDate)) {
        pass2Dates.add(topic.pass2Date);
      }

      // Add explicit dates from individual uncompleted steps
      uncompletedSteps.forEach(step => {
        if (step.scheduledDate) {
          pass2Dates.add(step.scheduledDate);
        }
      });

      pass2Dates.forEach(dateStr => {
        allScheduledTasks.push({
          id: `${topic.id}-p2-${dateStr}`,
          topic,
          passNumber: 2,
          date: dateStr,
          isCompleted: false,
          isOverdue: dateStr < todayStr
        });
      });
    }

    // Pass 3 Task
    if (topic.pass3Date && !topic.pass3Completed) {
      allScheduledTasks.push({
        id: `${topic.id}-p3`,
        topic,
        passNumber: 3,
        date: topic.pass3Date,
        isCompleted: false,
        isOverdue: topic.pass3Date < todayStr
      });
    }
  });

  // 1. Today tasks (scheduled for today or overdue)
  const todayTasks = allScheduledTasks.filter(task => 
    task.date === todayStr || task.isOverdue
  );

  const overdueTasks = allScheduledTasks.filter(task => task.isOverdue);

  // 2. Tomorrow tasks
  const tomorrowTasks = allScheduledTasks.filter(task => 
    task.date === tomorrowStr && !task.isOverdue
  );

  // 3. Upcoming tasks (future dates strictly after tomorrow)
  const upcomingTasks = allScheduledTasks.filter(task => 
    task.date > tomorrowStr
  ).sort((a, b) => a.date.localeCompare(b.date));

  // 4. Backlog topics (uncompleted topics with at least one unscheduled pass or completely unassigned)
  const backlogTopics = topics.filter(t => 
    t.status !== 'completed' && 
    (!t.pass1Date || !t.pass2Date || !t.pass3Date)
  );

  // 4b. This Week / Current Sprint committed topics (Friday -> Thursday cycle)
  const currentSprintRange = getCurrentSprintRange();
  const thisWeekTopics = topics.filter(t => 
    t.status !== 'completed' && isTopicInSprint(t, stepsByTopic.get(t.id) || [], currentSprintRange)
  );

  // 5. Fully Mastered / Completed topics for Archive
  const archiveTopics = topics.filter(t => 
    t.status === 'completed' || 
    (t.pass1Completed && t.pass2Completed && t.pass3Completed)
  );

  // 6. Syllabus Matrix Metrics
  const totalTopicsCount = topics.length;
  const totalPasses = totalTopicsCount * 3;
  let completedPassesCount = 0;
  topics.forEach(t => {
    if (t.pass1Completed) completedPassesCount++;
    if (t.pass2Completed) completedPassesCount++;
    if (t.pass3Completed) completedPassesCount++;
  });
  const syllabusCompletionPercentage = totalPasses > 0 
    ? Math.round((completedPassesCount / totalPasses) * 100) 
    : 0;

  const activeSprintWeekId = settingsMap['activeSprintWeekId'] || getCurrentSprintWeekId();

  return {
    subjects,
    subjectMap,
    topics,
    steps,
    stepsByTopic,
    todayTasks,
    overdueTasks,
    tomorrowTasks,
    upcomingTasks,
    thisWeekTopics,
    currentSprintRange,
    backlogTopics,
    archiveTopics,
    totalTopicsCount,
    totalPasses,
    completedPassesCount,
    syllabusCompletionPercentage,
    missedQuestions,
    vocabItems,
    sprintHistory,
    activeSprintWeekId,
    isLoading: !subjects.length && !topics.length
  };
}
