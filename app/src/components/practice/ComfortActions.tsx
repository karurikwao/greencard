/**
 * Comfort Actions Component - Calm, Professional Design
 * Allows users to mark their comfort level with a question
 */

import { CheckCircle, RefreshCw, AlertCircle, Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ComfortStatus } from '@/lib/practice';

interface ComfortActionsProps {
  comfortStatus: ComfortStatus;
  isSavedForLater: boolean;
  onComfortChange: (status: ComfortStatus) => void;
  onSaveToggle: () => void;
  className?: string;
}

const comfortOptions: { 
  value: ComfortStatus; 
  label: string; 
  description: string;
  icon: typeof CheckCircle;
  colors: string;
  selectedColors: string;
}[] = [
  {
    value: 'understood',
    label: 'Comfortable',
    description: 'I can answer this confidently',
    icon: CheckCircle,
    colors: 'bg-white border-slate-300 text-slate-800 hover:border-slate-400 hover:bg-slate-50',
    selectedColors: 'bg-emerald-50 border-emerald-300 text-emerald-900',
  },
  {
    value: 'needs-practice',
    label: 'Needs review',
    description: 'I want to practice this more',
    icon: RefreshCw,
    colors: 'bg-white border-slate-300 text-slate-800 hover:border-slate-400 hover:bg-slate-50',
    selectedColors: 'bg-amber-50 border-amber-300 text-amber-900',
  },
  {
    value: 'nervous',
    label: 'Unsure',
    description: 'This question feels difficult',
    icon: AlertCircle,
    colors: 'bg-white border-slate-300 text-slate-800 hover:border-slate-400 hover:bg-slate-50',
    selectedColors: 'bg-rose-50 border-rose-300 text-rose-900',
  },
];

export function ComfortActions({
  comfortStatus,
  isSavedForLater,
  onComfortChange,
  onSaveToggle,
  className,
}: ComfortActionsProps) {
  const SaveIcon = isSavedForLater ? BookmarkCheck : Bookmark;

  return (
    <div className={cn('space-y-5', className)}>
      <div>
        <div className="text-sm font-semibold text-slate-950 mb-1">
          How comfortable are you with this question?
        </div>
        <div className="text-xs font-medium text-slate-600">
          Track your confidence to focus your study time
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {comfortOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = comfortStatus === option.value;
          
          return (
            <button
              key={option.value}
              onClick={() => onComfortChange(isSelected ? null : option.value)}
              className={cn(
                'relative flex flex-col items-start gap-2.5 p-4 rounded-lg border text-left transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2',
                isSelected ? option.selectedColors : option.colors
              )}
            >
              <Icon className={cn(
                'w-4 h-4',
                isSelected ? 'opacity-90' : 'text-slate-600'
              )} />
              <div>
                <div className="font-semibold text-sm">{option.label}</div>
                <div className={cn(
                  'text-xs mt-0.5 font-medium',
                  isSelected ? 'opacity-90' : 'text-slate-600'
                )}>
                  {option.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onSaveToggle}
        className={cn(
          'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium',
          isSavedForLater && 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
        )}
      >
        <SaveIcon className="w-4 h-4 mr-2" />
        {isSavedForLater ? 'Saved to review later' : 'Save to review later'}
      </Button>
    </div>
  );
}
