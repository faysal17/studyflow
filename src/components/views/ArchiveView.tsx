import React, { useState } from 'react';
import { useStudyData } from '../../hooks/useStudyData';
import { useAppStore } from '../../store/useAppStore';
import { TopicRow } from '../common/TopicRow';
import { PageHeader } from '../common/PageHeader';

export const ArchiveView: React.FC = () => {
  const { 
    archiveTopics, 
    subjectMap, 
    stepsByTopic 
  } = useStudyData();

  const { setIsSyncModalOpen } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTopics = archiveTopics.filter(t => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const sub = subjectMap.get(t.labelId);
      return (
        t.title.toLowerCase().includes(q) ||
        sub?.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="w-full flex flex-col animate-in fade-in duration-150">
      {/* Standardized Sticky Top Header */}
      <PageHeader
        title="Archive"
        counter={`${archiveTopics.length} completed`}
        actions={
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 px-3 py-1.5 rounded-md border border-zinc-700/60 transition-colors cursor-pointer"
          >
            Export / Backup
          </button>
        }
        searchProps={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: 'Search archive...'
        }}
      />

      {/* Content Container */}
      <div className="max-w-6xl w-full mx-auto px-8 py-6 space-y-6">
        {filteredTopics.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#71717a]">
            No archived topics yet. Topics will appear here when you tick off Pass 3.
          </div>
        ) : (
          <div className="divide-y-0">
            {filteredTopics.map((topic) => {
              const subject = subjectMap.get(topic.labelId);
              const topicSteps = stepsByTopic.get(topic.id) || [];
              return (
                <TopicRow
                  key={topic.id}
                  topic={topic}
                  subject={subject}
                  steps={topicSteps}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
