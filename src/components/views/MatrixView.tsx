import React, { useState } from 'react';
import { useStudyData } from '../../hooks/useStudyData';
import { subjectColorMap } from '../common/SubjectBadge';
import { formatScheduleDate } from '../../utils/dateUtils';
import { PageHeader } from '../common/PageHeader';
import { Check, Table, LayoutGrid, ChevronDown, ChevronRight } from 'lucide-react';
import type { Topic } from '../../types';

export const MatrixView: React.FC = () => {
  const { 
    subjects, 
    topics, 
    stepsByTopic, 
    syllabusCompletionPercentage, 
    completedPassesCount, 
    totalPasses 
  } = useStudyData();

  const [viewMode, setViewMode] = useState<'table' | 'heatmap'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (subjectId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId]
    }));
  };

  // Group topics by subject
  const query = searchQuery.trim().toLowerCase();
  const topicsBySubject = new Map<string, Topic[]>();
  
  topics.forEach((t) => {
    if (query && !t.title.toLowerCase().includes(query)) return;
    const list = topicsBySubject.get(t.labelId) || [];
    list.push(t);
    topicsBySubject.set(t.labelId, list);
  });

  // Calculate pass stage for a topic
  const getTopicStage = (topic: Topic, completedSteps: number) => {
    if (topic.pass3Completed) return { label: 'Mastered', stage: 3, color: 'emerald' };
    if (topic.pass2Completed) return { label: 'P3 Ready', stage: 2.5, color: 'purple' };
    if (completedSteps > 0 || topic.pass2Date) return { label: `P2 (${completedSteps}/5)`, stage: 2, color: 'amber' };
    if (topic.pass1Completed) return { label: 'P1 Done', stage: 1.5, color: 'blue' };
    if (topic.pass1Date) return { label: 'P1 Sched', stage: 1, color: 'sky' };
    return { label: 'Unstarted', stage: 0, color: 'zinc' };
  };

  return (
    <div className="w-full flex flex-col animate-in fade-in duration-150">
      {/* Standardized Sticky Top Header */}
      <PageHeader
        title="Coverage Matrix"
        counter={`${completedPassesCount} of ${totalPasses} passes completed (${syllabusCompletionPercentage}%)`}
        actions={
          <div className="flex items-center p-0.5 rounded-md bg-zinc-900/60 border border-zinc-800">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('heatmap')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'heatmap'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Heatmap</span>
            </button>
          </div>
        }
        searchProps={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: 'Filter matrix...'
        }}
      >
        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <div className="w-28 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${syllabusCompletionPercentage}%` }}
            />
          </div>
          <span className="text-emerald-400 font-semibold">{syllabusCompletionPercentage}%</span>
        </div>
      </PageHeader>

      <div className="max-w-6xl w-full mx-auto px-8 py-6 space-y-6">
        {topics.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-[#12141a] border border-zinc-800 rounded-xl p-8">
            <Table className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-sm font-medium text-zinc-300">Coverage Matrix is empty</p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Add syllabus topics in the Backlog or use Quick Add (press N) to begin tracking your 3-pass syllabus coverage.
            </p>
          </div>
        ) : (
          <>
            {/* VIEW 1: High-Density Table View (Linear / Notion style) */}
            {viewMode === 'table' && (
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-[#12141a] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse min-w-[700px]">
              <colgroup>
                <col className="w-[45%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[13%]" />
              </colgroup>

              {/* Table Column Headers: Background #161922, borders border-b border-zinc-700/60, column text #e4e4e7 */}
              <thead className="bg-[#161922] border-b border-zinc-700/60 text-[#e4e4e7] text-xs font-semibold tracking-wider select-none">
                <tr>
                  <th className="py-3 pl-4 pr-3 text-left font-semibold">Topic Name</th>
                  <th className="py-3 px-2 text-center font-semibold">Pass 1: Skim</th>
                  <th className="py-3 px-2 text-center font-semibold">Pass 2: Deep Drill</th>
                  <th className="py-3 px-2 text-center font-semibold">Pass 3: Review</th>
                  <th className="py-3 pl-2 pr-4 text-right font-semibold">Status</th>
                </tr>
              </thead>

              {/* Subject Sections & Topic Rows */}
              <tbody className="divide-y divide-zinc-800/70">
                {subjects.map((subject) => {
                  const subjectTopics = topicsBySubject.get(subject.id) || [];
                  if (subjectTopics.length === 0) return null;

                  // Subject stats
                  let subPassesDone = 0;
                  subjectTopics.forEach(t => {
                    if (t.pass1Completed) subPassesDone++;
                    if (t.pass2Completed) subPassesDone++;
                    if (t.pass3Completed) subPassesDone++;
                  });
                  const subTotalPasses = subjectTopics.length * 3;
                  const subPct = subTotalPasses > 0 ? Math.round((subPassesDone / subTotalPasses) * 100) : 0;
                  const isCollapsed = !query && !!collapsedSections[subject.id];
                  const dotColor = subjectColorMap[subject.color]?.dot || 'bg-emerald-400';

                  return (
                    <React.Fragment key={subject.id}>
                      {/* Collapsible Subject Section Band */}
                      <tr 
                        onClick={() => toggleSection(subject.id)}
                        className="bg-[#181b24] hover:bg-[#1f232f] border-b border-zinc-800/80 cursor-pointer transition-colors select-none group"
                      >
                        <td colSpan={5} className="py-2.5 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="text-zinc-400 group-hover:text-zinc-200 transition-colors">
                                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </span>
                              <span className={`w-2.5 h-2.5 rounded-full ${dotColor} flex-shrink-0`} />
                              <span className="text-sm font-semibold text-[#f4f4f5]">
                                {subject.name}
                              </span>
                              <span className="text-xs text-zinc-400 font-mono">
                                • {subPassesDone}/{subTotalPasses} passes ({subPct}%)
                              </span>
                              <div className="w-24 h-1.5 bg-[#0a0b0e] rounded-full overflow-hidden hidden sm:block border border-zinc-700/50">
                                <div 
                                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                  style={{ width: `${subPct}%` }}
                                />
                              </div>
                            </div>

                            <span className="text-xs font-mono text-zinc-400">
                              {subjectTopics.length} {subjectTopics.length === 1 ? 'topic' : 'topics'}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Topic Rows */}
                      {!isCollapsed && subjectTopics.map((topic, idx) => {
                        const topicSteps = stepsByTopic.get(topic.id) || [];
                        const completedSteps = topicSteps.filter(s => s.isCompleted).length;
                        const overall = getTopicStage(topic, completedSteps);
                        const isAlt = idx % 2 === 1;

                        return (
                          <tr
                            key={topic.id}
                            className={`border-b border-zinc-800/70 hover:bg-zinc-800/25 transition-colors select-none ${
                              isAlt ? 'bg-[#151720]/40' : 'bg-[#12141a]'
                            }`}
                          >
                            {/* Column 1: Topic Title (width: 45%, text-left, text-sm font-medium text-zinc-100 pl-4) */}
                            <td className="py-2.5 pl-4 pr-3 text-left align-middle">
                              <span className="text-sm font-medium text-[#f4f4f5] leading-snug break-words">
                                {topic.title}
                              </span>
                            </td>

                            {/* Column 2: Pass 1: Skim (width: 14%, text-center) */}
                            <td className="py-2.5 px-2 text-center align-middle">
                              {topic.pass1Completed ? (
                                <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium text-xs px-2.5 py-0.5 rounded inline-flex items-center gap-1 shadow-sm cursor-default select-none">
                                  <Check className="w-3 h-3 stroke-[2.5]" /> Read
                                </span>
                              ) : topic.pass1Date ? (
                                <span className="bg-sky-500/15 text-sky-400 border border-sky-500/30 text-xs px-2 py-0.5 rounded inline-flex items-center gap-1 shadow-sm font-medium cursor-default select-none">
                                  {formatScheduleDate(topic.pass1Date)}
                                </span>
                              ) : (
                                <span className="text-[#71717a] font-mono text-xs select-none cursor-default">—</span>
                              )}
                            </td>

                            {/* Column 3: Pass 2: Deep Drill (width: 14%, text-center) */}
                            <td className="py-2.5 px-2 text-center align-middle">
                              {topic.pass2Completed ? (
                                <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium text-xs px-2.5 py-0.5 rounded inline-flex items-center gap-1 shadow-sm cursor-default select-none">
                                  <Check className="w-3 h-3 stroke-[2.5]" /> Drill
                                </span>
                              ) : completedSteps > 0 ? (
                                <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono text-xs px-2 py-0.5 rounded inline-flex items-center gap-1 shadow-sm cursor-default select-none">
                                  <span>{completedSteps}/5 steps</span>
                                </span>
                              ) : topic.pass2Date ? (
                                <span className="bg-sky-500/15 text-sky-400 border border-sky-500/30 text-xs px-2 py-0.5 rounded inline-flex items-center gap-1 shadow-sm font-medium cursor-default select-none">
                                  {formatScheduleDate(topic.pass2Date)}
                                </span>
                              ) : (
                                <span className="text-[#71717a] font-mono text-xs select-none cursor-default">—</span>
                              )}
                            </td>

                            {/* Column 4: Pass 3: Review (width: 14%, text-center) */}
                            <td className="py-2.5 px-2 text-center align-middle">
                              {topic.pass3Completed ? (
                                <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium text-xs px-2.5 py-0.5 rounded inline-flex items-center gap-1 shadow-sm cursor-default select-none">
                                  <Check className="w-3 h-3 stroke-[2.5]" /> Polish
                                </span>
                              ) : topic.pass3Date ? (
                                <span className="bg-sky-500/15 text-sky-400 border border-sky-500/30 text-xs px-2 py-0.5 rounded inline-flex items-center gap-1 shadow-sm font-medium cursor-default select-none">
                                  {formatScheduleDate(topic.pass3Date)}
                                </span>
                              ) : (
                                <span className="text-[#71717a] font-mono text-xs select-none cursor-default">—</span>
                              )}
                            </td>

                            {/* Column 5: Status (width: 13%, text-right pr-4) */}
                            <td className="py-2.5 pl-2 pr-4 text-right align-middle">
                              {overall.stage === 3 ? (
                                <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-medium px-2 py-0.5 rounded inline-flex items-center gap-1 cursor-default select-none">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" /> Mastered
                                </span>
                              ) : overall.stage > 0 ? (
                                <span className="bg-[#1a1d26] text-zinc-300 border border-zinc-700/60 text-xs font-mono px-2 py-0.5 rounded inline-block cursor-default select-none">
                                  {overall.label}
                                </span>
                              ) : (
                                <span className="text-[#71717a] font-mono text-xs select-none pr-1 cursor-default">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: Compact Heatmap / Visual Progress Grid (Option B) */}
      {viewMode === 'heatmap' && (
        <div className="space-y-6">
          {/* Heatmap Legend */}
          <div className="flex items-center gap-4 text-xs text-[#a1a1aa] bg-[#12141a] border border-[#222634] p-3 rounded-lg flex-wrap">
            <span className="font-medium text-[#f4f4f5]">Mastery Stages:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-[#1a1d26] border border-[#222634]" />
              <span className="text-[11px] text-[#71717a]">Unstarted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-blue-500/20 border border-blue-500/40" />
              <span className="text-[11px] text-blue-300">P1 Skim Done</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-amber-500/20 border border-amber-500/40" />
              <span className="text-[11px] text-amber-300">P2 Deep Drill</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-emerald-500/20 border border-emerald-500/40" />
              <span className="text-[11px] text-emerald-300">100% Mastered</span>
            </div>
          </div>

          {/* Subject Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject) => {
              const subjectTopics = topicsBySubject.get(subject.id) || [];
              if (subjectTopics.length === 0) return null;

              // Subject stats
              let subPassesDone = 0;
              subjectTopics.forEach(t => {
                if (t.pass1Completed) subPassesDone++;
                if (t.pass2Completed) subPassesDone++;
                if (t.pass3Completed) subPassesDone++;
              });
              const subTotalPasses = subjectTopics.length * 3;
              const subPct = subTotalPasses > 0 ? Math.round((subPassesDone / subTotalPasses) * 100) : 0;
              const dotColor = subjectColorMap[subject.color]?.dot || 'bg-emerald-400';

              return (
                <div 
                  key={subject.id} 
                  className="bg-[#12141a] border border-[#222634] rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-zinc-700 transition-colors"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0`} />
                        <h3 className="text-xs font-semibold text-[#f4f4f5] truncate">
                          {subject.name}
                        </h3>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        {subPct}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#71717a] mt-1">
                      <span>{subjectTopics.length} topics</span>
                      <span>{subPassesDone}/{subTotalPasses} passes</span>
                    </div>
                  </div>

                  {/* Progress Heatmap Chips Grid */}
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#222634]/60">
                    {subjectTopics.map((topic) => {
                      const topicSteps = stepsByTopic.get(topic.id) || [];
                      const completedSteps = topicSteps.filter(s => s.isCompleted).length;
                      const overall = getTopicStage(topic, completedSteps);

                      // Determine chip appearance
                      let chipColor = 'bg-[#1a1d26] border-[#222634] hover:border-zinc-500';
                      if (overall.stage === 3) {
                        chipColor = 'bg-emerald-500/25 border-emerald-500/40 hover:bg-emerald-500/40';
                      } else if (overall.stage >= 2) {
                        chipColor = 'bg-amber-500/25 border-amber-500/40 hover:bg-amber-500/40';
                      } else if (overall.stage >= 1) {
                        chipColor = 'bg-blue-500/25 border-blue-500/40 hover:bg-blue-500/40';
                      }

                      return (
                        <div 
                          key={topic.id}
                          className="relative group/chip cursor-default select-none"
                        >
                          <div 
                            className={`w-6 h-6 rounded border flex items-center justify-center transition-all ${chipColor}`}
                          >
                            {overall.stage === 3 && (
                              <Check className="w-3 h-3 text-emerald-300 stroke-[3]" />
                            )}
                          </div>

                          {/* Hover Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/chip:flex flex-col items-center z-50 pointer-events-none">
                            <div className="bg-[#181b24] border border-[#2c3142] text-xs py-1.5 px-2.5 rounded-lg shadow-2xl whitespace-nowrap text-zinc-100 flex flex-col gap-0.5">
                              <span className="font-semibold text-zinc-100 text-[11px]">{topic.title}</span>
                              <span className="text-[10px] text-zinc-400 font-mono">Stage: {overall.label}</span>
                            </div>
                            <div className="w-1.5 h-1.5 bg-[#181b24] border-r border-b border-[#2c3142] rotate-45 -mt-1" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </>
      )}
      </div>
    </div>
  );
};
