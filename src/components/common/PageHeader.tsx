import React, { type ReactNode } from 'react';
import { Search } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  counter?: string | ReactNode;
  actions?: ReactNode;
  searchProps?: {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
  };
  children?: ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  counter,
  actions,
  searchProps,
  children
}) => {
  return (
    <header className="sticky top-0 z-20 bg-[#0a0b0e]/85 backdrop-blur-md border-b border-zinc-800/80 px-8 py-4 transition-all">
      <div className="max-w-6xl w-full mx-auto">
        {/* Row 1: Title + Action Buttons */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-baseline min-w-0">
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight truncate">
              {title}
            </h1>
            {counter && (
              <span className="text-xs text-zinc-500 ml-3 font-normal truncate">
                {counter}
              </span>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>

        {/* Row 2: Search Input & Optional Extra Controls */}
        {(searchProps || children) && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            {searchProps && (
              <div className="h-8 px-2.5 bg-zinc-900/60 border border-zinc-800 focus-within:border-zinc-600 rounded-md flex items-center gap-2 text-xs text-zinc-200 w-full sm:w-72 transition-colors">
                <Search className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                <input
                  type="text"
                  value={searchProps.value}
                  onChange={(e) => searchProps.onChange(e.target.value)}
                  placeholder={searchProps.placeholder || 'Search...'}
                  className="bg-transparent w-full text-xs text-zinc-100 placeholder:text-zinc-500 outline-none"
                />
              </div>
            )}
            {children}
          </div>
        )}
      </div>
    </header>
  );
};
