import Dexie, { type Table } from 'dexie';
import type { SubjectLabel, Topic, PipelineStep, MissedQuestion, VocabItem, SprintHistory, AppSetting } from '../types';
import { generateSeedData, createPipelineStepsForTopic } from './seedData';
import { getCurrentSprintWeekId, getNextSprintWeekId } from '../utils/dateUtils';
import { getCurrentSprintRange } from '../utils/sprintUtils';

export class StudyFlowDatabase extends Dexie {
  subjects!: Table<SubjectLabel, string>;
  topics!: Table<Topic, string>;
  steps!: Table<PipelineStep, string>;
  missedQuestions!: Table<MissedQuestion, string>;
  vocab!: Table<VocabItem, string>;
  sprintHistory!: Table<SprintHistory, string>;
  settings!: Table<AppSetting, string>;

  constructor() {
    super('StudyFlowDB');

    // Version 1 Schema
    this.version(1).stores({
      subjects: 'id, name, mode, color, order',
      topics: 'id, labelId, inSprint, sprintWeekId, status, createdAt, order',
      steps: 'id, topicId, stepNumber, contextTag, isCompleted, completedAt',
      missedQuestions: 'id, topicId, createdAt',
      vocab: 'id, type, word, reviewedCount, createdAt',
      sprintHistory: 'sprintWeekId, archivedAt',
      settings: 'key'
    });

    // Version 2 Schema
    this.version(2).stores({
      topics: 'id, labelId, scheduledDate, currentPass, status, createdAt, order'
    });

    // Version 3 Schema: Independent Per-Pass Scheduling
    this.version(3).stores({
      topics: 'id, labelId, pass1Date, pass2Date, pass3Date, status, createdAt, order'
    }).upgrade(async (tx) => {
      await tx.table('topics').toCollection().modify((topic: any) => {
        if (topic.pass1Completed === undefined) topic.pass1Completed = false;
        if (topic.pass2Completed === undefined) topic.pass2Completed = false;
        if (topic.pass3Completed === undefined) topic.pass3Completed = false;
        if (topic.pass1Date === undefined) topic.pass1Date = topic.scheduledDate || null;
        if (topic.pass2Date === undefined) topic.pass2Date = null;
        if (topic.pass3Date === undefined) topic.pass3Date = null;
      });
    });

    // Version 4 Schema: Per-Step Scheduling for Pass 2
    this.version(4).stores({
      steps: 'id, topicId, stepNumber, scheduledDate, isCompleted, completedAt'
    }).upgrade(async (tx) => {
      await tx.table('steps').toCollection().modify((step: any) => {
        if (step.scheduledDate === undefined) step.scheduledDate = null;
      });
    });
  }
}

export const db = new StudyFlowDatabase();

// Reactive DB change listener for automatic background cloud sync
type DbChangeListener = () => void;
const dbChangeListeners = new Set<DbChangeListener>();

export function onDatabaseChange(listener: DbChangeListener): () => void {
  dbChangeListeners.add(listener);
  return () => {
    dbChangeListeners.delete(listener);
  };
}

export function notifyDatabaseChange(): void {
  dbChangeListeners.forEach(listener => {
    try {
      listener();
    } catch (e) {
      console.error('Error in database change listener:', e);
    }
  });
}

/**
 * Initialize and seed the database if empty
 */
export async function initializeDatabase(): Promise<void> {
  const subjectCount = await db.subjects.count();
  if (subjectCount === 0) {
    const seed = generateSeedData();
    await db.transaction('rw', [db.subjects, db.topics, db.steps, db.vocab, db.missedQuestions, db.settings], async () => {
      await db.subjects.bulkAdd(seed.subjects);
      await db.topics.bulkAdd(seed.topics);
      await db.steps.bulkAdd(seed.steps);
      await db.vocab.bulkAdd(seed.vocab);
      await db.missedQuestions.bulkAdd(seed.missedQuestions);
      
      const currentWeek = getCurrentSprintWeekId();
      await db.settings.bulkAdd([
        { key: 'activeSprintWeekId', value: currentWeek },
        { key: 'targetMemorize', value: 4 },
        { key: 'targetThink', value: 2 },
        { key: 'initializedAt', value: Date.now() },
        { key: 'dummyDataClearedV1', value: true }
      ]);
    });
  } else {
    // Migration: Purge all initial dummy seed topics and records
    const clearedSetting = await db.settings.get('dummyDataClearedV1');
    if (!clearedSetting || !clearedSetting.value) {
      await db.transaction('rw', [db.topics, db.steps, db.vocab, db.missedQuestions, db.sprintHistory, db.settings], async () => {
        await db.topics.clear();
        await db.steps.clear();
        await db.vocab.clear();
        await db.missedQuestions.clear();
        await db.sprintHistory.clear();
        await db.settings.put({ key: 'dummyDataClearedV1', value: true });
      });
    }

    // Migration helper: ensure all existing topics have pass1Date, pass2Date, pass3Date
    const allTopics = await db.topics.toArray();
    for (const topic of allTopics) {
      const updates: Partial<Topic> = {};
      if (topic.pass1Completed === undefined) updates.pass1Completed = false;
      if (topic.pass2Completed === undefined) updates.pass2Completed = false;
      if (topic.pass3Completed === undefined) updates.pass3Completed = false;
      if (topic.pass1Date === undefined) updates.pass1Date = topic.scheduledDate || null;
      if (topic.pass2Date === undefined) updates.pass2Date = null;
      if (topic.pass3Date === undefined) updates.pass3Date = null;
      if (Object.keys(updates).length > 0) {
        await db.topics.update(topic.id, updates);
      }
    }
  }
}

/**
 * Clear all topics, steps, vocab, missed questions, and sprint history
 */
export async function clearAllUserData(): Promise<void> {
  await db.transaction('rw', [db.topics, db.steps, db.vocab, db.missedQuestions, db.sprintHistory, db.settings], async () => {
    await db.topics.clear();
    await db.steps.clear();
    await db.vocab.clear();
    await db.missedQuestions.clear();
    await db.sprintHistory.clear();
    await db.settings.put({ key: 'dummyDataClearedV1', value: true });
  });
  notifyDatabaseChange();
}

/**
 * Add a single new topic and its 5 pipeline steps
 */
export async function addSingleTopic(topic: Topic, steps: PipelineStep[]): Promise<void> {
  await db.transaction('rw', [db.topics, db.steps], async () => {
    await db.topics.add(topic);
    await db.steps.bulkAdd(steps);
  });
  notifyDatabaseChange();
}

/**
 * High-level database mutations with Independent Per-Pass Scheduling
 */

/**
 * Update single pass date
 */
export async function setTopicPassDate(topicId: string, pass: 1 | 2 | 3, date: string | null): Promise<void> {
  const field = pass === 1 ? 'pass1Date' : (pass === 2 ? 'pass2Date' : 'pass3Date');
  await db.topics.update(topicId, { [field]: date });
  notifyDatabaseChange();
}

/**
 * Update all three pass dates simultaneously
 */
export async function setTopicAllPassDates(
  topicId: string, 
  dates: { pass1Date: string | null; pass2Date: string | null; pass3Date: string | null }
): Promise<void> {
  await db.topics.update(topicId, {
    pass1Date: dates.pass1Date,
    pass2Date: dates.pass2Date,
    pass3Date: dates.pass3Date
  });
  notifyDatabaseChange();
}

/**
 * Toggle Pass 1 completion state
 */
export async function togglePass1Completion(topicId: string): Promise<boolean> {
  const result = await db.transaction('rw', db.topics, async () => {
    const topic = await db.topics.get(topicId);
    if (!topic) return false;

    const newCompleted = !topic.pass1Completed;
    const isAllCompleted = newCompleted && topic.pass2Completed && topic.pass3Completed;

    await db.topics.update(topicId, {
      pass1Completed: newCompleted,
      pass1CompletedAt: newCompleted ? Date.now() : null,
      status: isAllCompleted ? 'completed' : 'in_sprint'
    });

    return newCompleted;
  });
  notifyDatabaseChange();
  return result;
}

/**
 * Toggle Pass 2 completion state (marks all 5 steps complete if incomplete, or resets step 5)
 */
export async function togglePass2Completion(topicId: string): Promise<boolean> {
  const result = await db.transaction('rw', [db.steps, db.topics], async () => {
    const topic = await db.topics.get(topicId);
    if (!topic) return false;

    const newCompleted = !topic.pass2Completed;
    const now = Date.now();

    const topicSteps = await db.steps.where('topicId').equals(topicId).toArray();
    for (const step of topicSteps) {
      await db.steps.update(step.id, {
        isCompleted: newCompleted,
        completedAt: newCompleted ? now : null
      });
    }

    const isAllCompleted = topic.pass1Completed && newCompleted && topic.pass3Completed;

    await db.topics.update(topicId, {
      pass2Completed: newCompleted,
      pass2CompletedAt: newCompleted ? now : null,
      status: isAllCompleted ? 'completed' : 'in_sprint'
    });

    return newCompleted;
  });
  notifyDatabaseChange();
  return result;
}

/**
 * Toggle Pass 3 completion state
 */
export async function togglePass3Completion(topicId: string): Promise<boolean> {
  const result = await db.transaction('rw', db.topics, async () => {
    const topic = await db.topics.get(topicId);
    if (!topic) return false;

    const newCompleted = !topic.pass3Completed;
    const isAllCompleted = topic.pass1Completed && topic.pass2Completed && newCompleted;

    await db.topics.update(topicId, {
      pass3Completed: newCompleted,
      pass3CompletedAt: newCompleted ? Date.now() : null,
      status: isAllCompleted ? 'completed' : 'in_sprint'
    });

    return newCompleted;
  });
  notifyDatabaseChange();
  return result;
}

/**
 * Update individual Pass 2 step scheduled date
 */
export async function setStepScheduleDate(stepId: string, date: string | null): Promise<void> {
  await db.steps.update(stepId, { scheduledDate: date });
  notifyDatabaseChange();
}

/**
 * Toggle a Pass 2 pipeline step's completion state.
 * When all 5 steps are checked, automatically marks Pass 2 as completed and advances to Pass 3.
 */
export async function toggleStepCompletion(stepId: string): Promise<boolean> {
  const result = await db.transaction('rw', [db.steps, db.topics], async () => {
    const step = await db.steps.get(stepId);
    if (!step) return false;

    const newCompleted = !step.isCompleted;
    await db.steps.update(stepId, {
      isCompleted: newCompleted,
      completedAt: newCompleted ? Date.now() : null
    });

    const topic = await db.topics.get(step.topicId);
    if (!topic) return newCompleted;

    // Fetch all steps for this topic to check completion
    const allTopicSteps = await db.steps.where('topicId').equals(step.topicId).sortBy('stepNumber');
    const allCompleted = allTopicSteps.every(s => (s.id === stepId ? newCompleted : s.isCompleted));

    const isAllDone = topic.pass1Completed && allCompleted && topic.pass3Completed;

    await db.topics.update(topic.id, {
      pass2Completed: allCompleted,
      pass2CompletedAt: allCompleted ? (topic.pass2CompletedAt || Date.now()) : null,
      currentPass: allCompleted ? 3 : 2,
      status: isAllDone ? 'completed' : 'in_sprint'
    });

    return newCompleted;
  });
  notifyDatabaseChange();
  return result;
}

/**
 * Bulk add topics to backlog or scheduled date
 */
export async function bulkAddTopics(
  titles: string[], 
  subjectLabelId: string,
  initialPass1Date: string | null = null
): Promise<number> {
  const now = Date.now();
  const topicsToAdd: Topic[] = [];
  const stepsToAdd: PipelineStep[] = [];

  for (let i = 0; i < titles.length; i++) {
    const title = titles[i].trim();
    if (!title) continue;

    const topicId = `top-${now}-${i}-${Math.random().toString(36).substring(2, 6)}`;
    topicsToAdd.push({
      id: topicId,
      title,
      labelId: subjectLabelId,
      pass1Date: initialPass1Date,
      pass1Completed: false,
      pass2Date: null,
      pass2Completed: false,
      pass3Date: null,
      pass3Completed: false,
      createdAt: now + i,
      status: initialPass1Date ? 'in_sprint' : 'backlog',
      order: now + i
    });

    const steps = createPipelineStepsForTopic(topicId, 0);
    stepsToAdd.push(...steps);
  }

  await db.transaction('rw', [db.topics, db.steps], async () => {
    await db.topics.bulkAdd(topicsToAdd);
    await db.steps.bulkAdd(stepsToAdd);
  });
  notifyDatabaseChange();

  return topicsToAdd.length;
}

/**
 * Reorder a topic
 */
export async function updateTopicOrder(topicId: string, newOrder: number): Promise<void> {
  await db.topics.update(topicId, { order: newOrder });
  notifyDatabaseChange();
}

/**
 * Delete a topic and all its child steps
 */
export async function deleteTopic(topicId: string): Promise<void> {
  await db.transaction('rw', [db.topics, db.steps, db.missedQuestions], async () => {
    await db.topics.delete(topicId);
    await db.steps.where('topicId').equals(topicId).delete();
    await db.missedQuestions.where('topicId').equals(topicId).delete();
  });
  notifyDatabaseChange();
}

/**
 * Delete a topic and its steps, returning a full snapshot for instant Undo restoration
 */
export async function deleteTopicWithUndo(topicId: string): Promise<{
  topic?: Topic;
  steps: PipelineStep[];
  missedQuestions: MissedQuestion[];
}> {
  const result = await db.transaction('rw', [db.topics, db.steps, db.missedQuestions], async () => {
    const topic = await db.topics.get(topicId);
    const steps = await db.steps.where('topicId').equals(topicId).toArray();
    const missedQuestions = await db.missedQuestions.where('topicId').equals(topicId).toArray();

    await db.topics.delete(topicId);
    await db.steps.where('topicId').equals(topicId).delete();
    await db.missedQuestions.where('topicId').equals(topicId).delete();

    return { topic, steps, missedQuestions };
  });
  notifyDatabaseChange();
  return result;
}

/**
 * Restore a previously deleted topic and its steps from snapshot
 */
export async function restoreDeletedTopic(snapshot: {
  topic?: Topic;
  steps: PipelineStep[];
  missedQuestions: MissedQuestion[];
}): Promise<void> {
  if (!snapshot.topic) return;
  await db.transaction('rw', [db.topics, db.steps, db.missedQuestions], async () => {
    await db.topics.put(snapshot.topic!);
    for (const step of snapshot.steps) {
      await db.steps.put(step);
    }
    for (const mq of snapshot.missedQuestions) {
      await db.missedQuestions.put(mq);
    }
  });
  notifyDatabaseChange();
}

/**
 * Add a topic to current sprint
 */
export async function addTopicToSprint(topicId: string, sprintWeekId?: string): Promise<void> {
  const weekId = sprintWeekId || getCurrentSprintRange().sprintWeekId;
  await db.topics.update(topicId, {
    inSprint: true,
    sprintWeekId: weekId,
    status: 'in_sprint'
  });
  notifyDatabaseChange();
}

/**
 * Remove a topic from sprint and restore to backlog
 */
export async function removeTopicFromSprint(topicId: string): Promise<void> {
  await db.topics.update(topicId, {
    inSprint: false,
    status: 'backlog'
  });
  notifyDatabaseChange();
}

/**
 * Complete and Close Sprint:
 * - Archives all completed topics from this sprint
 * - Either rolls over incomplete topics to next Friday's sprint or returns them to backlog
 * - Records summary in sprintHistory
 * - Advances activeSprintWeekId
 */
export async function completeAndCloseSprint(options: { rollOverToNextSprint: boolean }): Promise<{
  completedCount: number;
  rolledOverCount: number;
}> {
  const range = getCurrentSprintRange();
  const currentWeek = range.sprintWeekId;
  const nextWeek = getNextSprintWeekId(currentWeek);

  const result = await db.transaction('rw', [db.topics, db.steps, db.sprintHistory, db.settings], async () => {
    const allTopics = await db.topics.toArray();
    const allSteps = await db.steps.toArray();

    // Map steps by topic
    const stepsByTopic = new Map<string, PipelineStep[]>();
    for (const step of allSteps) {
      const list = stepsByTopic.get(step.topicId) || [];
      list.push(step);
      stepsByTopic.set(step.topicId, list);
    }

    const sprintTopics = allTopics.filter(t => 
      t.inSprint || 
      (t.sprintWeekId === currentWeek) ||
      (t.pass1Date && t.pass1Date >= range.startStr && t.pass1Date <= range.endStr) ||
      (t.pass2Date && t.pass2Date >= range.startStr && t.pass2Date <= range.endStr) ||
      (t.pass3Date && t.pass3Date >= range.startStr && t.pass3Date <= range.endStr) ||
      (stepsByTopic.get(t.id) || []).some(s => s.scheduledDate && s.scheduledDate >= range.startStr && s.scheduledDate <= range.endStr)
    );

    const completedTopicIds: string[] = [];
    const rolledOverTopicIds: string[] = [];

    for (const topic of sprintTopics) {
      const isMastered = topic.pass1Completed && topic.pass2Completed && topic.pass3Completed;
      if (isMastered || topic.status === 'completed') {
        completedTopicIds.push(topic.id);
        await db.topics.update(topic.id, {
          status: 'completed',
          inSprint: false
        });
      } else {
        if (options.rollOverToNextSprint) {
          rolledOverTopicIds.push(topic.id);
          await db.topics.update(topic.id, {
            inSprint: true,
            sprintWeekId: nextWeek,
            status: 'in_sprint'
          });
        } else {
          await db.topics.update(topic.id, {
            inSprint: false,
            sprintWeekId: null,
            status: 'backlog'
          });
        }
      }
    }

    // Save to sprint history
    await db.sprintHistory.put({
      sprintWeekId: currentWeek,
      startDate: range.startStr,
      endDate: range.endStr,
      archivedAt: Date.now(),
      completedTopicIds,
      rolledOverTopicIds,
      memorizeCount: 0,
      thinkCount: 0
    });

    // Update activeSprintWeekId
    await db.settings.put({
      key: 'activeSprintWeekId',
      value: nextWeek
    });

    return {
      completedCount: completedTopicIds.length,
      rolledOverCount: rolledOverTopicIds.length
    };
  });
  notifyDatabaseChange();
  return result;
}
