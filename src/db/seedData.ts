import type { SubjectLabel, Topic, PipelineStep, VocabItem, MissedQuestion } from '../types';

export const DEFAULT_SUBJECTS: SubjectLabel[] = [
  // Memorize (Sun–Thu)
  {
    id: 'sub-bangla-lit',
    name: 'Bangla Literature',
    mode: 'memorize',
    color: 'emerald',
    order: 1
  },
  {
    id: 'sub-eng-lit',
    name: 'English Literature',
    mode: 'memorize',
    color: 'sky',
    order: 2
  },
  {
    id: 'sub-bd-affairs',
    name: 'Bangladesh Affairs',
    mode: 'memorize',
    color: 'teal',
    order: 3
  },
  {
    id: 'sub-intl-affairs',
    name: 'International Affairs',
    mode: 'memorize',
    color: 'indigo',
    order: 4
  },
  {
    id: 'sub-geography',
    name: 'Geography & Disaster Mgmt',
    mode: 'memorize',
    color: 'amber',
    order: 5
  },
  {
    id: 'sub-science-tech',
    name: 'General Science & Tech',
    mode: 'memorize',
    color: 'cyan',
    order: 6
  },
  // Think (Fri–Sat)
  {
    id: 'sub-math',
    name: 'Mathematics',
    mode: 'think',
    color: 'violet',
    order: 7
  },
  {
    id: 'sub-mental-ability',
    name: 'Mental Ability',
    mode: 'think',
    color: 'fuchsia',
    order: 8
  },
  {
    id: 'sub-bangla-gram',
    name: 'Bangla Grammar',
    mode: 'think',
    color: 'rose',
    order: 9
  },
  {
    id: 'sub-eng-gram',
    name: 'English Grammar',
    mode: 'think',
    color: 'blue',
    order: 10
  },
  {
    id: 'sub-ethics',
    name: 'Ethics & Good Governance',
    mode: 'think',
    color: 'orange',
    order: 11
  }
];

export function createPipelineStepsForTopic(topicId: string, initialProgress = 0): PipelineStep[] {
  const stepsDef: Array<{
    stepNumber: 1 | 2 | 3 | 4 | 5;
    title: string;
    contextTag: '@desk' | '@office' | '@commute';
  }> = [
    { stepNumber: 1, title: 'Study the book', contextTag: '@desk' },
    { stepNumber: 2, title: 'Solve book questions', contextTag: '@desk' },
    { stepNumber: 3, title: 'Create Anki questions from topic', contextTag: '@office' },
    { stepNumber: 4, title: 'Practice Anki questions', contextTag: '@commute' },
    { stepNumber: 5, title: 'Benchmark on LiveMCQ', contextTag: '@office' }
  ];

  const now = Date.now();
  return stepsDef.map((def) => {
    const isCompleted = def.stepNumber <= initialProgress;
    return {
      id: `${topicId}-step-${def.stepNumber}`,
      topicId,
      stepNumber: def.stepNumber,
      title: def.title,
      contextTag: def.contextTag,
      isCompleted,
      completedAt: isCompleted ? now - (5 - def.stepNumber) * 3600000 : null
    };
  });
}

export function generateSeedData(): {
  subjects: SubjectLabel[];
  topics: Topic[];
  steps: PipelineStep[];
  vocab: VocabItem[];
  missedQuestions: MissedQuestion[];
} {
  return {
    subjects: DEFAULT_SUBJECTS,
    topics: [],
    steps: [],
    vocab: [],
    missedQuestions: []
  };
}
