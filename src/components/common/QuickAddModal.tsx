import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useStudyData } from '../../hooks/useStudyData';
import { bulkAddTopics, db } from '../../db';
import { createPipelineStepsForTopic } from '../../db/seedData';
import { getTodayDateString, getTomorrowDateString } from '../../utils/dateUtils';
import type { Topic } from '../../types';
import { CustomSelect } from './CustomSelect';
import { subjectColorMap } from './SubjectBadge';
import { X, Sun, Sunrise, Layers } from 'lucide-react';

export const QuickAddModal: React.FC = () => {
  const { isQuickAddOpen, setIsQuickAddOpen, showToast } = useAppStore();
  const { subjects, activeSprintWeekId } = useStudyData();

  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [selectedLabelId, setSelectedLabelId] = useState<string>(subjects[0]?.id || 'sub-bangla-lit');
  const [singleTitle, setSingleTitle] = useState('');
  const [scheduleTarget, setScheduleTarget] = useState<'today' | 'tomorrow' | 'backlog'>('today');
  const [bulkText, setBulkText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isQuickAddOpen) return null;

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const topicId = `top-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const now = Date.now();
      const scheduledDate = scheduleTarget === 'today' 
        ? getTodayDateString() 
        : (scheduleTarget === 'tomorrow' ? getTomorrowDateString() : null);

      const newTopic: Topic = {
        id: topicId,
        title: singleTitle.trim(),
        labelId: selectedLabelId,
        pass1Date: scheduledDate,
        pass1Completed: false,
        pass2Date: null,
        pass2Completed: false,
        pass3Date: null,
        pass3Completed: false,
        currentPass: 1,
        inSprint: !!scheduledDate,
        sprintWeekId: scheduledDate ? activeSprintWeekId : null,
        createdAt: now,
        status: scheduledDate ? 'in_sprint' : 'backlog',
        order: now
      };

      const steps = createPipelineStepsForTopic(topicId, 0);

      await db.transaction('rw', [db.topics, db.steps], async () => {
        await db.topics.add(newTopic);
        await db.steps.bulkAdd(steps);
      });

      showToast(`Added: "${newTopic.title}" (${scheduleTarget === 'backlog' ? 'Backlog' : scheduleTarget})`);
      setSingleTitle('');
      setIsQuickAddOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkText.split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const scheduledDate = scheduleTarget === 'today' 
        ? getTodayDateString() 
        : (scheduleTarget === 'tomorrow' ? getTomorrowDateString() : null);

      const count = await bulkAddTopics(lines, selectedLabelId, scheduledDate);
      showToast(`Added ${count} topics to ${scheduleTarget === 'backlog' ? 'backlog' : scheduleTarget}`);
      setBulkText('');
      setIsQuickAddOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-[#12141a] border border-[#222634] rounded-xl p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#222634]">
          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => setActiveTab('single')}
              className={`transition-colors font-medium ${activeTab === 'single' ? 'text-[#f4f4f5]' : 'text-[#71717a] hover:text-[#a1a1aa]'}`}
            >
              Single Topic
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`transition-colors font-medium ${activeTab === 'bulk' ? 'text-[#f4f4f5]' : 'text-[#71717a] hover:text-[#a1a1aa]'}`}
            >
              Bulk Paste
            </button>
          </div>
          <button 
            onClick={() => setIsQuickAddOpen(false)} 
            className="text-[#71717a] hover:text-[#f4f4f5] p-1 rounded hover:bg-[#1a1d26] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Subject select */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono text-[#a1a1aa]">Subject</label>
          <CustomSelect
            value={selectedLabelId}
            onChange={setSelectedLabelId}
            options={subjects.map(sub => ({
              value: sub.id,
              label: sub.name,
              colorDot: subjectColorMap[sub.color]?.dot || 'bg-emerald-400'
            }))}
            className="w-full"
          />
        </div>

        {/* Schedule Target */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono text-[#a1a1aa]">Schedule To</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setScheduleTarget('today')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                scheduleTarget === 'today'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-[#0a0b0e] border-[#222634] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#1a1d26]'
              }`}
            >
              <Sun className="w-3 h-3" />
              <span>Today</span>
            </button>
            <button
              type="button"
              onClick={() => setScheduleTarget('tomorrow')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                scheduleTarget === 'tomorrow'
                  ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                  : 'bg-[#0a0b0e] border-[#222634] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#1a1d26]'
              }`}
            >
              <Sunrise className="w-3 h-3" />
              <span>Tomorrow</span>
            </button>
            <button
              type="button"
              onClick={() => setScheduleTarget('backlog')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                scheduleTarget === 'backlog'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : 'bg-[#0a0b0e] border-[#222634] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#1a1d26]'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Backlog</span>
            </button>
          </div>
        </div>

        {activeTab === 'single' ? (
          <form onSubmit={handleSingleSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-[#a1a1aa]">Topic Title</label>
              <input
                type="text"
                value={singleTitle}
                onChange={(e) => setSingleTitle(e.target.value)}
                placeholder="e.g. চর্যাপদ ও মধ্যযুগের সাহিত্য"
                autoFocus
                required
                className="w-full bg-[#0a0b0e] border border-[#222634] rounded-md p-2.5 text-xs text-[#f4f4f5] placeholder:text-[#71717a] focus:ring-1 focus:ring-zinc-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#222634]">
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className="text-xs text-[#a1a1aa] hover:text-[#f4f4f5] px-3 py-1.5 rounded-md hover:bg-[#1a1d26] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!singleTitle.trim() || isSubmitting}
                className="bg-zinc-800/90 hover:bg-zinc-700 text-[#f4f4f5] border border-[#222634] font-medium text-xs px-4 py-1.5 rounded-md disabled:opacity-40 transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Adding...' : 'Add Topic'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleBulkSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-[#a1a1aa]">Topic Titles (One per line)</label>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={6}
                placeholder="Paste topics here...&#10;Topic 1&#10;Topic 2&#10;Topic 3"
                autoFocus
                required
                className="w-full bg-[#0a0b0e] border border-[#222634] rounded-md p-2.5 text-xs text-[#f4f4f5] placeholder:text-[#71717a] focus:ring-1 focus:ring-zinc-500 outline-none font-mono resize-none leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#222634]">
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className="text-xs text-[#a1a1aa] hover:text-[#f4f4f5] px-3 py-1.5 rounded-md hover:bg-[#1a1d26] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!bulkText.trim() || isSubmitting}
                className="bg-zinc-800/90 hover:bg-zinc-700 text-[#f4f4f5] border border-[#222634] font-medium text-xs px-4 py-1.5 rounded-md disabled:opacity-40 transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Importing...' : 'Import Topics'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
