import React from 'react';
import type { SubjectLabel } from '../../types';

interface SubjectBadgeProps {
  subject?: SubjectLabel;
  className?: string;
}

export const subjectColorMap: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  sky: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20', dot: 'bg-sky-400' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20', dot: 'bg-teal-400' },
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', dot: 'bg-indigo-400' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', dot: 'bg-cyan-400' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', dot: 'bg-violet-400' },
  fuchsia: { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', border: 'border-fuchsia-500/20', dot: 'bg-fuchsia-400' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', dot: 'bg-rose-400' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-400' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', dot: 'bg-orange-400' }
};

export const SubjectBadge: React.FC<SubjectBadgeProps> = ({
  subject,
  className = ''
}) => {
  if (!subject) {
    return (
      <span className={`inline-flex items-center h-5 px-2 rounded-full text-[11px] font-medium bg-[#1a1d26] text-[#a1a1aa] border border-[#222634] ${className}`}>
        Subject
      </span>
    );
  }

  const style = subjectColorMap[subject.color] || subjectColorMap.emerald;

  return (
    <span
      className={`inline-flex items-center gap-1.5 h-5 text-[11px] font-medium px-2 rounded-full border ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      <span className="truncate max-w-[160px]">{subject.name}</span>
    </span>
  );
};
