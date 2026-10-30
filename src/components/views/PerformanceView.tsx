import React, { useMemo, useState } from 'react';
import { useStudyData } from '../../hooks/useStudyData';
import { useAppStore } from '../../store/useAppStore';
import { toLocalDateString } from '../../utils/dateUtils';
import { getCurrentSprintRange } from '../../utils/sprintUtils';
import { subjectColorMap } from '../common/SubjectBadge';
import { PageHeader } from '../common/PageHeader';
import { 
  TrendingUp, 
  Flame, 
  Calendar, 
  Clock, 
  Layers, 
  Award 
} from 'lucide-react';

type SortOption = 'lagging' | 'progress' | 'order';

export const PerformanceView: React.FC = () => {
  const {
    subjects,
    topics,
    steps,
    totalTopicsCount,
    activeSprintWeekId
  } = useStudyData();

  const { setActiveView } = useAppStore();

  const [sortBy, setSortBy] = useState<SortOption>('lagging');
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number } | null>(null);

  // 1. Build Day-by-Day Activity Map for completions
  const activityMap = useMemo(() => {
    const map = new Map<string, number>();

    // Count step completions
    steps.forEach((step) => {
      if (step.isCompleted && step.completedAt) {
        const dateStr = toLocalDateString(new Date(step.completedAt));
        map.set(dateStr, (map.get(dateStr) || 0) + 1);
      }
    });

    // Count topic pass completions
    topics.forEach((topic) => {
      if (topic.pass1Completed) {
        const dateStr = topic.pass1CompletedAt
          ? toLocalDateString(new Date(topic.pass1CompletedAt))
          : (topic.pass1Date || toLocalDateString(new Date(topic.createdAt)));
        map.set(dateStr, (map.get(dateStr) || 0) + 1);
      }
      if (topic.pass2Completed) {
        const dateStr = topic.pass2CompletedAt
          ? toLocalDateString(new Date(topic.pass2CompletedAt))
          : (topic.pass2Date || toLocalDateString(new Date(topic.createdAt)));
        map.set(dateStr, (map.get(dateStr) || 0) + 1);
      }
      if (topic.pass3Completed) {
        const dateStr = topic.pass3CompletedAt
          ? toLocalDateString(new Date(topic.pass3CompletedAt))
          : (topic.pass3Date || toLocalDateString(new Date(topic.createdAt)));
        map.set(dateStr, (map.get(dateStr) || 0) + 1);
      }
    });

    return map;
  }, [steps, topics]);

  const sprintRange = useMemo(() => getCurrentSprintRange(), []);

  // 2. Metrics: This Week Completed (Friday-to-Thursday sprint cycle)
  const thisWeekCompleted = useMemo(() => {
    let total = 0;
    for (const day of sprintRange.days) {
      total += (activityMap.get(day.dateStr) || 0);
    }
    return total;
  }, [activityMap, sprintRange]);

  // 3. Metrics: 14-Day Daily Average
  const dailyAverage14Days = useMemo(() => {
    let total = 0;
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const str = toLocalDateString(d);
      total += (activityMap.get(str) || 0);
    }
    return (total / 14).toFixed(1);
  }, [activityMap]);

  // 4. Metrics: Current Streak
  const currentStreak = useMemo(() => {
    let streak = 0;
    const today = new Date();
    const todayStr = toLocalDateString(today);
    const todayCount = activityMap.get(todayStr) || 0;

    let checkDate = new Date(today);
    if (todayCount === 0) {
      // If nothing done today yet, look at yesterday
      checkDate.setDate(checkDate.getDate() - 1);
    }

    for (let i = 0; i < 60; i++) {
      const str = toLocalDateString(checkDate);
      const count = activityMap.get(str) || 0;
      if (count > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [activityMap]);

  // 5. 30-Day Heatmap Data
  const last30Days = useMemo(() => {
    const list: Array<{
      dateStr: string;
      formattedDate: string;
      count: number;
    }> = [];

    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = toLocalDateString(d);
      const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const count = activityMap.get(dateStr) || 0;
      list.push({ dateStr, formattedDate, count });
    }
    return list;
  }, [activityMap]);

  // Heatmap block color intensity
  const getCellColor = (count: number) => {
    if (count === 0) return 'bg-zinc-800/50 border border-zinc-700/30';
    if (count <= 2) return 'bg-emerald-500/25 border border-emerald-500/30';
    if (count <= 4) return 'bg-emerald-500/50 border border-emerald-500/60';
    return 'bg-emerald-500 border border-emerald-400';
  };

  // 6. Pass Distribution Breakdown
  const passStats = useMemo(() => {
    const total = totalTopicsCount || 1;
    const p1 = topics.filter(t => t.pass1Completed).length;
    const p2 = topics.filter(t => t.pass2Completed).length;
    const p3 = topics.filter(t => t.pass3Completed).length;

    const p1Pct = Math.round((p1 / total) * 100);
    const p2Pct = Math.round((p2 / total) * 100);
    const p3Pct = Math.round((p3 / total) * 100);

    const completedStepsCount = steps.filter(s => s.isCompleted).length;
    const totalStepsCount = steps.length;

    return {
      p1,
      p2,
      p3,
      p1Pct,
      p2Pct,
      p3Pct,
      completedStepsCount,
      totalStepsCount
    };
  }, [topics, steps, totalTopicsCount]);

  // 7. Subject Velocity Ranking
  const subjectRankings = useMemo(() => {
    const list = subjects.map((subject) => {
      const subjectTopics = topics.filter(t => t.labelId === subject.id);
      const topicCount = subjectTopics.length;
      const p1Done = subjectTopics.filter(t => t.pass1Completed).length;
      const p2Done = subjectTopics.filter(t => t.pass2Completed).length;
      const p3Done = subjectTopics.filter(t => t.pass3Completed).length;

      const totalPasses = topicCount * 3;
      const completedPasses = p1Done + p2Done + p3Done;
      const coveragePct = totalPasses > 0 ? Math.round((completedPasses / totalPasses) * 100) : 0;

      return {
        subject,
        topicCount,
        p1Done,
        p2Done,
        p3Done,
        totalPasses,
        completedPasses,
        coveragePct
      };
    });

    if (sortBy === 'lagging') {
      return [...list].sort((a, b) => a.coveragePct - b.coveragePct);
    } else if (sortBy === 'progress') {
      return [...list].sort((a, b) => b.coveragePct - a.coveragePct);
    } else {
      return [...list].sort((a, b) => a.subject.order - b.subject.order);
    }
  }, [subjects, topics, sortBy]);

  return (
    <div className="w-full flex flex-col animate-in fade-in duration-150">
      {/* Standardized Sticky Top Header */}
      <PageHeader
        title="Performance Analytics"
        counter={activeSprintWeekId}
        actions={
          <button
            type="button"
            onClick={() => setActiveView('this_week')}
            className="font-mono text-xs text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 px-2.5 py-1 rounded-md border border-zinc-700/60 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Go to This Week Sprint"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Active Sprint</span>
          </button>
        }
      />

      <div className="max-w-6xl w-full mx-auto px-8 py-6 space-y-8">

      {/* 2. Top Metric Cards: Clean 3-Column CSS Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: This Week Completed */}
        <div className="bg-[#12141a] border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              This Week Completed
            </span>
            <Calendar className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-semibold text-zinc-100 font-mono tracking-tight">
              {thisWeekCompleted}
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              Passes & steps cleared this sprint
            </div>
          </div>
        </div>

        {/* Card 2: Daily Average */}
        <div className="bg-[#12141a] border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Daily Average
            </span>
            <Clock className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-semibold text-zinc-100 font-mono tracking-tight">
              {dailyAverage14Days} <span className="text-sm font-normal text-zinc-400 font-sans">/ day</span>
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              Rolling 14-day completion velocity
            </div>
          </div>
        </div>

        {/* Card 3: Current Streak */}
        <div className="bg-[#12141a] border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Current Streak
            </span>
            <Flame className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-semibold text-zinc-100 font-mono tracking-tight flex items-baseline gap-1.5">
              <span>{currentStreak}</span>
              <span className="text-sm font-normal text-zinc-400 font-sans">{currentStreak === 1 ? 'day' : 'consecutive days'}</span>
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              {currentStreak > 0 ? 'Consistent daily study sustained' : 'Complete a task today to begin streak'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. 30-Day Activity Heatmap (Sleek Compact Commit Grid) */}
      <div className="bg-[#12141a] border border-zinc-800/80 rounded-xl p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-zinc-100">
              30-Day Activity Heatmap
            </h2>
          </div>
          {hoveredDay ? (
            <span className="text-xs font-mono text-emerald-400 animate-in fade-in duration-75">
              {hoveredDay.date}: {hoveredDay.count} {hoveredDay.count === 1 ? 'task' : 'tasks'} completed
            </span>
          ) : (
            <span className="text-xs text-zinc-400 font-mono">
              Hover cell for daily details
            </span>
          )}
        </div>

        {/* Sleek Compact Commit Grid (w-5.5 h-5.5 rounded-sm) */}
        <div className="overflow-x-auto py-1">
          <div className="flex items-center gap-1.5 min-w-[620px] py-1">
            {last30Days.map((day) => {
              const colorClass = getCellColor(day.count);
              const label = `${day.formattedDate}: ${day.count} ${day.count === 1 ? 'task' : 'tasks'} completed`;
              return (
                <div
                  key={day.dateStr}
                  onMouseEnter={() => setHoveredDay({ date: day.formattedDate, count: day.count })}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={`w-5.5 h-5.5 rounded-sm transition-transform cursor-pointer hover:scale-110 flex-shrink-0 ${colorClass}`}
                  title={label}
                  aria-label={label}
                />
              );
            })}
          </div>
        </div>

        {/* Heatmap Footer Legend with Crisp Zinc Text */}
        <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800/70">
          <div className="flex items-center gap-1.5 font-mono">
            <span>{last30Days[0]?.formattedDate}</span>
            <span>→</span>
            <span>{last30Days[last30Days.length - 1]?.formattedDate}</span>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <span>Less</span>
            <span className="w-3.5 h-3.5 rounded-sm bg-zinc-800/50 border border-zinc-700/30" />
            <span className="w-3.5 h-3.5 rounded-sm bg-emerald-500/25 border border-emerald-500/30" />
            <span className="w-3.5 h-3.5 rounded-sm bg-emerald-500/50 border border-emerald-500/60" />
            <span className="w-3.5 h-3.5 rounded-sm bg-emerald-500 border border-emerald-400" />
            <span>More</span>
          </div>
        </div>
      </div>

      {/* 4. Pass Distribution Breakdown */}
      <div className="bg-[#12141a] border border-zinc-800/80 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-zinc-100">
              Pass Distribution Breakdown
            </h2>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            {totalTopicsCount} total syllabus topics
          </span>
        </div>

        {/* Streamlined Progress Bar (Height h-2.5 rounded-full) */}
        <div className="h-2.5 w-full bg-zinc-800/60 rounded-full overflow-hidden flex border border-zinc-800">
          <div 
            className="bg-blue-500 transition-all duration-300" 
            style={{ width: `${(passStats.p1 / (totalTopicsCount || 1)) * 100}%` }}
            title={`Pass 1 Skim: ${passStats.p1}`}
          />
          <div 
            className="bg-amber-500 transition-all duration-300" 
            style={{ width: `${(passStats.p2 / (totalTopicsCount || 1)) * 100}%` }}
            title={`Pass 2 Deep Drill: ${passStats.p2}`}
          />
          <div 
            className="bg-emerald-500 transition-all duration-300" 
            style={{ width: `${(passStats.p3 / (totalTopicsCount || 1)) * 100}%` }}
            title={`Pass 3 Polish: ${passStats.p3}`}
          />
        </div>

        {/* 3 Metric Columns Below the Bar: High Contrast, Clean Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Pass 1 Metric */}
          <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-800/50 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-blue-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                Pass 1: Skim & Theory
              </span>
              <span className="font-mono text-zinc-300 font-medium">{passStats.p1Pct}%</span>
            </div>
            <div className="text-sm font-semibold text-zinc-100">
              {passStats.p1} <span className="text-xs font-normal text-zinc-400">of {totalTopicsCount} topics read</span>
            </div>
          </div>

          {/* Pass 2 Metric */}
          <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-800/50 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Pass 2: Deep Drill
              </span>
              <span className="font-mono text-zinc-300 font-medium">{passStats.p2Pct}%</span>
            </div>
            <div className="text-sm font-semibold text-zinc-100">
              {passStats.p2} <span className="text-xs font-normal text-zinc-400">of {totalTopicsCount} topics ({passStats.completedStepsCount}/{passStats.totalStepsCount} steps)</span>
            </div>
          </div>

          {/* Pass 3 Metric */}
          <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-800/50 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Pass 3: Polish & Review
              </span>
              <span className="font-mono text-zinc-300 font-medium">{passStats.p3Pct}%</span>
            </div>
            <div className="text-sm font-semibold text-zinc-100">
              {passStats.p3} <span className="text-xs font-normal text-zinc-400">of {totalTopicsCount} topics 100% mastered</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Subject Velocity Table */}
      <div className="bg-[#12141a] border border-zinc-800/80 rounded-xl overflow-hidden">
        {/* Table Title & Segmented Sort Controls */}
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-100">
              Subject Velocity Ranking
            </h2>
          </div>

          <div className="flex items-center p-0.5 rounded-lg bg-[#161821] border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setSortBy('lagging')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                sortBy === 'lagging'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Lagging First
            </button>
            <button
              type="button"
              onClick={() => setSortBy('progress')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                sortBy === 'progress'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Highest First
            </button>
            <button
              type="button"
              onClick={() => setSortBy('order')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                sortBy === 'order'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Syllabus Order
            </button>
          </div>
        </div>

        {/* Structured Table Container with High-Contrast Zinc Header */}
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse min-w-[650px]">
            <colgroup>
              <col className="w-[40%]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
            </colgroup>
            <thead className="bg-zinc-900/60 border-b border-zinc-800 text-xs font-semibold text-zinc-300 uppercase tracking-wider select-none">
              <tr>
                <th className="px-4 py-3 text-left">Subject Name</th>
                <th className="px-4 py-3 text-center">Pass 1: Skim</th>
                <th className="px-4 py-3 text-center">Pass 2: Drill</th>
                <th className="px-4 py-3 text-center">Pass 3: Polish</th>
                <th className="px-4 py-3 text-right">Coverage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {subjectRankings.map(({ subject, topicCount, p1Done, p2Done, p3Done, coveragePct }) => {
                const isLagging = coveragePct < 25;
                const isMastered = coveragePct === 100;
                const dotColor = subjectColorMap[subject.color]?.dot || 'bg-emerald-400';

                return (
                  <tr 
                    key={subject.id}
                    className="hover:bg-zinc-800/30 transition-colors text-sm text-zinc-200"
                  >
                    {/* Subject Name & Topic Count */}
                    <td className="px-4 py-3 text-left align-middle">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0`} />
                        <span className="font-medium text-zinc-100 truncate">
                          {subject.name}
                        </span>
                        <span className="text-xs font-mono text-zinc-400 flex-shrink-0">
                          ({topicCount} topics)
                        </span>
                      </div>
                    </td>

                    {/* Pass 1 Counts */}
                    <td className="px-4 py-3 text-center align-middle font-mono text-xs">
                      <span className={p1Done > 0 ? 'text-blue-400 font-semibold' : 'text-zinc-400'}>
                        {p1Done}
                      </span>
                      <span className="text-zinc-400"> / {topicCount}</span>
                    </td>

                    {/* Pass 2 Counts */}
                    <td className="px-4 py-3 text-center align-middle font-mono text-xs">
                      <span className={p2Done > 0 ? 'text-amber-400 font-semibold' : 'text-zinc-400'}>
                        {p2Done}
                      </span>
                      <span className="text-zinc-400"> / {topicCount}</span>
                    </td>

                    {/* Pass 3 Counts */}
                    <td className="px-4 py-3 text-center align-middle font-mono text-xs">
                      <span className={p3Done > 0 ? 'text-emerald-400 font-semibold' : 'text-zinc-400'}>
                        {p3Done}
                      </span>
                      <span className="text-zinc-400"> / {topicCount}</span>
                    </td>

                    {/* Coverage % and Mini Progress Bar */}
                    <td className="px-4 py-3 text-right align-middle">
                      <div className="flex items-center justify-end gap-2.5">
                        <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              isMastered ? 'bg-emerald-400' :
                              isLagging ? 'bg-rose-500/80' :
                              'bg-emerald-500'
                            }`}
                            style={{ width: `${coveragePct}%` }}
                          />
                        </div>
                        <span className={`font-mono text-xs w-9 text-right font-medium ${
                              isMastered ? 'text-emerald-400' :
                              isLagging ? 'text-rose-400' :
                              'text-zinc-400'
                        }`}>
                          {coveragePct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
};
