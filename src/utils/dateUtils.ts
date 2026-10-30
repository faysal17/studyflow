/**
 * Date and Sprint Week utility functions
 */

export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayDateString(): string {
  return toLocalDateString(new Date());
}

export function getTomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toLocalDateString(d);
}

export function getNextWeekDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return toLocalDateString(d);
}

export function getDayName(date = new Date()): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

export function getScheduleStatus(dateString: string | null): 'today' | 'tomorrow' | 'overdue' | 'upcoming' | 'unscheduled' {
  if (!dateString) return 'unscheduled';
  const today = getTodayDateString();
  const tomorrow = getTomorrowDateString();
  if (dateString === today) return 'today';
  if (dateString === tomorrow) return 'tomorrow';
  if (dateString < today) return 'overdue';
  return 'upcoming';
}

export function formatScheduleDate(dateString: string | null): string {
  if (!dateString) return 'Schedule';
  const status = getScheduleStatus(dateString);
  if (status === 'today') return 'Today';
  if (status === 'tomorrow') return 'Tomorrow';
  if (status === 'overdue') return 'Overdue';

  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(date);
}

export function formatFullScheduleDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(timestamp));
}

export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(new Date(timestamp));
}

export function getCurrentSprintWeekId(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function getNextSprintWeekId(currentWeekId: string): string {
  const [yearStr, weekStr] = currentWeekId.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  if (week >= 52) {
    return `${year + 1}-W01`;
  }
  return `${year}-W${String(week + 1).padStart(2, '0')}`;
}
