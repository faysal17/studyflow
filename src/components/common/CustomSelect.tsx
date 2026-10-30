import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
  colorDot?: string;
}

interface CustomSelectProps {
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Select option...',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Handle keyboard Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button (Linear / Radix UI style) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="h-8.5 w-full inline-flex items-center justify-between gap-2 px-2.5 py-1.5 bg-[#161821] hover:bg-[#1a1d26] border border-zinc-800 hover:border-zinc-700 rounded-md text-xs font-medium text-zinc-200 transition-colors focus:ring-1 focus:ring-zinc-600 outline-none cursor-pointer select-none"
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.colorDot && (
            <span className={`w-2 h-2 rounded-full ${selectedOption.colorDot} flex-shrink-0`} />
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown 
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-150 flex-shrink-0 ${
            isOpen ? 'rotate-180 text-zinc-200' : ''
          }`} 
        />
      </button>

      {/* Dropdown Popover Menu */}
      {isOpen && (
        <div 
          className="absolute left-0 top-full mt-1.5 z-50 min-w-full sm:min-w-[220px] max-h-60 overflow-y-auto bg-[#12141a] border border-[#222634] rounded-lg p-1 shadow-2xl space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
          role="listbox"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer text-left select-none ${
                  isSelected 
                    ? 'bg-zinc-800/80 text-zinc-100 font-medium' 
                    : 'text-zinc-300 hover:bg-zinc-800/50 hover:text-zinc-100'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {option.colorDot && (
                    <span className={`w-2 h-2 rounded-full ${option.colorDot} flex-shrink-0`} />
                  )}
                  <span className="truncate">{option.label}</span>
                </div>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
