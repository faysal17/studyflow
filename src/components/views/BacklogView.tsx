import React, { useState } from 'react';
import { useStudyData } from '../../hooks/useStudyData';
import { useAppStore } from '../../store/useAppStore';
import { TopicRow } from '../common/TopicRow';
import { SubjectBadge, subjectColorMap } from '../common/SubjectBadge';
import { CustomSelect } from '../common/CustomSelect';
import { PageHeader } from '../common/PageHeader';
import { bulkAddTopics } from '../../db';
import { Search, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import type { Topic } from '../../types';

export const BacklogView: React.FC = () => {
  const { 
    subjects, 
    subjectMap, 
    backlogTopics, 
    stepsByTopic 
  } = useStudyData();

  const { 
    backlogSearchQuery, 
    setBacklogSearchQuery,
    showToast
  } = useAppStore();

  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkSubjectId, setBulkSubjectId] = useState<string>(subjects[0]?.id || 'sub-bangla-lit');
  const [bulkText, setBulkText] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (subjectId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId]
    }));
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkText.split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return;

    try {
      const count = await bulkAddTopics(lines, bulkSubjectId);
      showToast(`Added ${count} topics to backlog`);
      setBulkText('');
      setIsBulkOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Filter topics by search query
  const query = backlogSearchQuery.trim().toLowerCase();
  const filteredTopics = backlogTopics.filter(t => {
    if (!query) return true;
    const sub = subjectMap.get(t.labelId);
    return (
      t.title.toLowerCase().includes(query) ||
      sub?.name.toLowerCase().includes(query)
    );
  });

  // Group filtered topics by subject
  const topicsBySubject = new Map<string, Topic[]>();
  filteredTopics.forEach((t) => {
    const list = topicsBySubject.get(t.labelId) || [];
    list.push(t);
    topicsBySubject.set(t.labelId, list);
  });

  return (
    <div className="w-full flex flex-col animate-in fade-in duration-150">
      {/* Standardized Sticky Top Header */}
      <PageHeader
        title="Syllabus Backlog"
        counter={`${backlogTopics.length} topics`}
        actions={
          <button
            onClick={() => setIsBulkOpen(!isBulkOpen)}
            className="bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 px-3 py-1.5 rounded-md border border-zinc-700/60 transition-colors cursor-pointer"
          >
            {isBulkOpen ? 'Close Paste' : '+ Bulk Paste'}
          </button>
        }
        searchProps={{
          value: backlogSearchQuery,
          onChange: setBacklogSearchQuery,
          placeholder: 'Search backlog...'
        }}
      />

      <div className="max-w-6xl w-full mx-auto px-8 py-6 space-y-6">
        {/* Bulk Fast-Capture if opened */}
        {isBulkOpen && (
        <form onSubmit={handleBulkSubmit} className="space-y-3 py-3 border-y border-[#222634]">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-[#a1a1aa] font-medium">Target Subject:</span>
            <CustomSelect
              value={bulkSubjectId}
              onChange={setBulkSubjectId}
              options={subjects.map(sub => ({
                value: sub.id,
                label: sub.name,
                colorDot: subjectColorMap[sub.color]?.dot || 'bg-emerald-400'
              }))}
              className="min-w-[220px]"
            />
          </div>

          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={5}
            placeholder="Paste syllabus topics (one per line)..."
            className="w-full bg-[#0a0b0e] border border-[#222634] rounded-md p-2.5 text-xs text-[#f4f4f5] placeholder:text-[#71717a] focus:ring-1 focus:ring-zinc-500 outline-none font-mono resize-none leading-relaxed"
            autoFocus
          />

          <div className="flex justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => setIsBulkOpen(false)}
              className="text-[#a1a1aa] hover:text-[#f4f4f5] px-2.5 py-1 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!bulkText.trim()}
              className="bg-zinc-800/90 hover:bg-zinc-700 text-[#f4f4f5] border border-[#222634] font-medium px-3.5 py-1 rounded-md disabled:opacity-40 transition-colors cursor-pointer"
            >
              Import Topics
            </button>
          </div>
        </form>
      )}

      {/* Top Controls: Search Bar Only */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-[#71717a] absolute left-0 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={backlogSearchQuery}
          onChange={(e) => setBacklogSearchQuery(e.target.value)}
          placeholder="Search syllabus topics..."
          className="w-full bg-transparent pl-6 pr-3 py-1.5 text-xs text-[#f4f4f5] placeholder:text-[#71717a] border-b border-[#222634] focus:outline-none focus:border-zinc-500 transition-colors"
        />
      </div>

      {/* Grouped Syllabus Sections (Textbook Table of Contents) */}
      {filteredTopics.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-[#12141a] border border-zinc-800 rounded-xl p-8">
          <Layers className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="text-sm font-medium text-zinc-300">
            {query ? 'No topics matching your filter.' : 'Syllabus Backlog is empty'}
          </p>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {query ? 'Try a different search term.' : 'Paste a syllabus list from your textbook table of contents or press N to add a topic.'}
          </p>
          {!query && (
            <button
              type="button"
              onClick={() => setIsBulkOpen(true)}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium px-4 py-2 rounded-lg border border-zinc-700/60 transition-colors cursor-pointer inline-flex items-center gap-1.5 mt-2"
            >
              <span>+ Bulk Paste Syllabus</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6 pt-1">
          {subjects.map((subject) => {
            const subjectTopics = topicsBySubject.get(subject.id) || [];
            if (subjectTopics.length === 0) return null;

            const isCollapsed = !query && !!collapsedSections[subject.id];
            const dotColor = subjectColorMap[subject.color]?.dot || 'bg-emerald-400';

            return (
              <div key={subject.id} className="space-y-1.5">
                {/* Section Header */}
                <button
                  type="button"
                  onClick={() => toggleSection(subject.id)}
                  className="w-full flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-[#1a1d26]/60 transition-colors text-left cursor-pointer group select-none border-b border-[#222634]/70"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0`} />
                    <span className="text-sm font-semibold text-zinc-300 group-hover:text-[#f4f4f5] transition-colors">
                      {subject.name}
                    </span>
                    <span className="text-xs text-[#71717a] font-normal">
                      {subjectTopics.length} {subjectTopics.length === 1 ? 'topic' : 'topics'}
                    </span>
                  </div>

                  <div className="text-[#71717a] group-hover:text-[#a1a1aa] transition-colors p-0.5">
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </button>

                {/* Topics List Under Subject Header (Without Redundant Subject Badge) */}
                {!isCollapsed && (
                  <div className="flex flex-col animate-in fade-in duration-100 pl-1">
                    {subjectTopics.map((topic) => {
                      const topicSteps = stepsByTopic.get(topic.id) || [];
                      return (
                        <TopicRow
                          key={topic.id}
                          topic={topic}
                          subject={subject}
                          steps={topicSteps}
                          showSubjectBadge={false}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
};
