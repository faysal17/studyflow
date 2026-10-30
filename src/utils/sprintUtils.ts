import { toLocalDateString, getCurrentSprintWeekId } from './dateUtils';
import type { Topic, PipelineStep } from '../types';

export interface SprintDay {
  date: Date;
  dateStr: string;
  dayName: string;
  shortDay: string;
  formattedDate: string;
  isToday: boolean;
}

export interface SprintRange {
  startDate: Date;
  endDate: Date;
  startStr: string;
  endStr: string;
  sprintWeekId: string;
  formattedRange: string;
  days: SprintDay[];
}

/**
 * Returns the most recent Friday (or today if today is Friday) at 00:00:00
 */
export function getSprintStartDate(date: Date = new Date()): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
  const daysSinceFriday = (day + 2) % 7;
  d.setDate(d.getDate() - daysSinceFriday);
  return d;
}

/**
 * Returns the following Thursday at 23:59:59
 */
export function getSprintEndDate(date: Date = new Date()): Date {
  const start = getSprintStartDate(date);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
  return end;
}

/**
 * Calculates current Friday-to-Thursday sprint cycle metadata
 */
export function getCurrentSprintRange(currentDate: Date = new Date()): SprintRange {
  const startDate = getSprintStartDate(currentDate);
  const endDate = getSprintEndDate(currentDate);

  const startStr = toLocalDateString(startDate);
  const endStr = toLocalDateString(endDate);

  const todayStr = toLocalDateString(currentDate);
  const sprintWeekId = getCurrentSprintWeekId(startDate);

  // Human-readable range e.g. "Oct 30 – Nov 05, 2026"
  const startMonth = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(startDate);
  const startDay = String(startDate.getDate()).padStart(2, '0');
  const endMonth = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(endDate);
  const endDay = String(endDate.getDate()).padStart(2, '0');
  const endYear = endDate.getFullYear();
  const formattedRange = `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${endYear}`;

  // 7 days in Friday -> Thursday order
  const days: SprintDay[] = [];
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
    const dateStr = toLocalDateString(dayDate);
    days.push({
      date: dayDate,
      dateStr,
      dayName: dayDate.toLocaleDateString('en-US', { weekday: 'long' }),
      shortDay: dayDate.toLocaleDateString('en-US', { weekday: 'short' }),
      formattedDate: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(dayDate),
      isToday: dateStr === todayStr
    });
  }

  return {
    startDate,
    endDate,
    startStr,
    endStr,
    sprintWeekId,
    formattedRange,
    days
  };
}

/**
 * Checks if a YYYY-MM-DD date string falls inside the sprint range
 */
export function isDateInSprint(
  dateStr: string | null | undefined, 
  range: SprintRange = getCurrentSprintRange()
): boolean {
  if (!dateStr) return false;
  return dateStr >= range.startStr && dateStr <= range.endStr;
}

/**
 * Checks if a topic belongs in the current sprint:
 * inSprint === true OR any pass / sub-step scheduled within the sprint cycle
 */
export function isTopicInSprint(
  topic: Topic, 
  steps: PipelineStep[] = [], 
  range: SprintRange = getCurrentSprintRange()
): boolean {
  if (topic.inSprint) return true;
  if (isDateInSprint(topic.pass1Date, range)) return true;
  if (isDateInSprint(topic.pass2Date, range)) return true;
  if (isDateInSprint(topic.pass3Date, range)) return true;
  if (steps.some(s => isDateInSprint(s.scheduledDate, range))) return true;
  return false;
}
