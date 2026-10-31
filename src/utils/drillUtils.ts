import type { DrillType, PipelineStep, ContextTag } from '../types';

export interface DrillStepDef {
  stepNumber: 1 | 2 | 3 | 4 | 5;
  title: string;
  contextTag: ContextTag;
}

/**
 * 5-Step Deep Drill Template
 * Book Theory -> Solve Questions -> Create Anki -> Practice Anki -> Benchmark LiveMCQ
 */
export const DRILL_5_STEP_TEMPLATE: DrillStepDef[] = [
  { stepNumber: 1, title: 'Study the book', contextTag: '@desk' },
  { stepNumber: 2, title: 'Solve book questions', contextTag: '@desk' },
  { stepNumber: 3, title: 'Create Anki questions from topic', contextTag: '@office' },
  { stepNumber: 4, title: 'Practice Anki questions', contextTag: '@commute' },
  { stepNumber: 5, title: 'Benchmark on LiveMCQ', contextTag: '@office' }
];

/**
 * 3-Step Direct Drill Template
 * Book Theory -> Solve Questions -> Benchmark LiveMCQ
 */
export const DRILL_3_STEP_TEMPLATE: DrillStepDef[] = [
  { stepNumber: 1, title: 'Study the book', contextTag: '@desk' },
  { stepNumber: 2, title: 'Solve book questions', contextTag: '@desk' },
  { stepNumber: 3, title: 'Benchmark on LiveMCQ', contextTag: '@office' }
];

/**
 * Subject-to-Drill default configuration
 */
export const SUBJECT_DRILL_DEFAULTS: Record<string, DrillType> = {
  // 5-Step Drill subjects (Theory heavy / Fact retention)
  'sub-bangla-lit': '5-step',
  'sub-eng-lit': '5-step',
  'sub-bd-affairs': '5-step',
  'sub-intl-affairs': '5-step',
  'sub-geography': '5-step',
  'sub-science-tech': '5-step',
  'sub-science': '5-step',

  // 3-Step Drill subjects (Problem solving / Rules / Direct practice)
  'sub-math': '3-step',
  'sub-mental-ability': '3-step',
  'sub-bangla-gram': '3-step',
  'sub-eng-gram': '3-step',
  'sub-ethics': '3-step'
};

/**
 * Determines default drill type based on subject label id or name
 */
export function getDefaultDrillTypeForSubject(subjectIdOrName?: string | null): DrillType {
  if (!subjectIdOrName) return '5-step';
  
  if (SUBJECT_DRILL_DEFAULTS[subjectIdOrName]) {
    return SUBJECT_DRILL_DEFAULTS[subjectIdOrName];
  }

  const lower = subjectIdOrName.toLowerCase();
  if (
    lower.includes('math') ||
    lower.includes('mental') ||
    lower.includes('gram') ||
    lower.includes('ethics') ||
    lower.includes('governance')
  ) {
    return '3-step';
  }

  return '5-step';
}

/**
 * Generates initial pipeline steps for a topic matching its drill type
 */
export function createPipelineStepsForDrill(
  topicId: string,
  drillType: DrillType = '5-step',
  initialProgress = 0
): PipelineStep[] {
  const template = drillType === '3-step' ? DRILL_3_STEP_TEMPLATE : DRILL_5_STEP_TEMPLATE;
  const now = Date.now();

  return template.map((def) => {
    const isCompleted = def.stepNumber <= initialProgress;
    return {
      id: `${topicId}-step-${def.stepNumber}`,
      topicId,
      stepNumber: def.stepNumber,
      title: def.title,
      contextTag: def.contextTag,
      isCompleted,
      completedAt: isCompleted ? now - (template.length - def.stepNumber) * 3600000 : null,
      scheduledDate: null
    };
  });
}
