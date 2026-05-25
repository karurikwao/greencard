/**
 * Practice Header Component - Professional, Calm Design
 * Shows topic title, description, and progress
 */

import { ArrowLeft, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SecurePDFDownload } from '@/components/paywall';
import type { PracticeTopic } from '@/lib/practice';

interface PracticeHeaderProps {
  topic: PracticeTopic;
  currentQuestionIndex: number;
  totalQuestions: number;
  onBack: () => void;
  onOpenChecklist?: () => void;
  className?: string;
}

export function PracticeHeader({
  topic,
  currentQuestionIndex,
  totalQuestions,
  onBack,
  onOpenChecklist,
  className,
}: PracticeHeaderProps) {
  const progress = Math.round((currentQuestionIndex / totalQuestions) * 100);

  return (
    <div className={cn('bg-white border-b border-slate-200/60 sticky top-0 z-10', className)}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-4 -ml-2 text-slate-600 hover:text-slate-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Topics
        </Button>

        {/* Title Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-slate-950 leading-tight">
              {topic.title}
            </h1>
            <p className="text-sm text-slate-700 mt-1 line-clamp-2">
              {topic.description}
            </p>
          </div>

          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-2">
            {onOpenChecklist && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenChecklist}
                className="border-slate-300 text-slate-700 font-medium"
              >
                <CheckSquare className="w-4 h-4 mr-1.5" />
                Checklist
              </Button>
            )}
            {/* SECURE PDF DOWNLOAD - Uses Supabase private storage + signed URLs */}
            <SecurePDFDownload
              pdfFileName={topic.pdfFileName}
              pdfTitle={topic.title}
              topicId={topic.id}
              categoryId={topic.categoryId}
              source="practice_mode"
              variant="button"
              size="sm"
              className="border-slate-300 text-slate-700 font-medium hover:text-slate-950"
              label="PDF"
            />
          </div>
        </div>

        {/* Progress Bar - Minimal */}
        <div className="mt-5 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-slate-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
            {currentQuestionIndex + 1} of {totalQuestions}
          </span>
        </div>

        {/* Mobile Actions */}
        <div className="flex sm:hidden gap-2 mt-4">
          {onOpenChecklist && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenChecklist}
              className="flex-1 border-slate-300 text-slate-700 font-medium"
            >
              <CheckSquare className="w-4 h-4 mr-1.5" />
              Checklist
            </Button>
          )}
          {/* SECURE PDF DOWNLOAD - Mobile */}
          <SecurePDFDownload
            pdfFileName={topic.pdfFileName}
            pdfTitle={topic.title}
            topicId={topic.id}
            categoryId={topic.categoryId}
            source="practice_mode"
            variant="button"
            size="sm"
            className="flex-1 border-slate-300 text-slate-700 font-medium"
            label="PDF"
          />
        </div>
      </div>
    </div>
  );
}
