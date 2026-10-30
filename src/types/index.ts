export type SubjectMode = 'memorize' | 'think';

export type ContextTag = '@desk' | '@office' | '@commute';

export type TopicStatus = 'backlog' | 'in_sprint' | 'completed';

export type SyllabusPass = 1 | 2 | 3;

export interface SubjectLabel {
  id: string;
  name: string;
  mode: SubjectMode; // 'memorize' (Sun–Thu) | 'think' (Fri–Sat)
  color: string;     // Color theme key or hex/tailwind class
  order: number;
}

export interface PipelineStep {
  id: string;
  topicId: string;
  stepNumber: 1 | 2 | 3 | 4 | 5;
  title: string;
  contextTag: ContextTag;
  isCompleted: boolean;
  completedAt: number | null;
  scheduledDate?: string | null; // YYYY-MM-DD
}

export interface Topic {
  id: string;
  title: string;
  labelId: string;              // references SubjectLabel.id
  pass1Date: string | null;     // YYYY-MM-DD
  pass1Completed: boolean;
  pass1CompletedAt?: number | null;
  pass2Date: string | null;     // YYYY-MM-DD
  pass2Completed: boolean;
  pass2CompletedAt?: number | null;
  pass3Date: string | null;     // YYYY-MM-DD
  pass3Completed: boolean;
  pass3CompletedAt?: number | null;
  currentPass?: SyllabusPass;   // 1: Read | 2: Deep Drill | 3: Review
  scheduledDate?: string | null;// Backwards compatibility
  inSprint?: boolean;           // Backwards compatibility
  sprintWeekId?: string | null; // Backwards compatibility
  createdAt: number;
  status: TopicStatus;          // 'backlog' | 'in_sprint' | 'completed'
  order: number;
  notes?: string;
}

export interface ScheduledPassTask {
  id: string; // `${topic.id}-p${passNumber}`
  topic: Topic;
  passNumber: 1 | 2 | 3;
  date: string;
  isCompleted: boolean;
  isOverdue: boolean;
}

export interface MissedQuestion {
  id: string;
  topicId?: string;
  question: string;
  answer: string;
  source?: string;
  tags?: string[];
  createdAt: number;
}

export interface VocabItem {
  id: string;
  type: 'bangla' | 'english';
  word: string;
  meaning: string;
  example?: string;
  reviewedCount: number;
  lastReviewedAt: number | null;
  createdAt: number;
}

export interface SprintHistory {
  sprintWeekId: string;
  startDate: string;
  endDate: string;
  archivedAt: number;
  completedTopicIds: string[];
  rolledOverTopicIds: string[];
  summaryNotes?: string;
  memorizeCount: number;
  thinkCount: number;
}

export interface AppSetting {
  key: string;
  value: any;
}
