/**
 * Related Questions Component - Professional Design
 * Displays clickable related/follow-up questions
 */

import { ArrowRight, Lightbulb } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { RelatedQuestionResult } from '@/lib/practice';

interface RelatedQuestionsProps {
  relatedQuestions: RelatedQuestionResult[];
  onQuestionClick: (result: RelatedQuestionResult) => void;
  className?: string;
}

const reasonLabels: Record<RelatedQuestionResult['reason'], string> = {
  'explicit': 'Follow-up',
  'same-topic': 'Related',
  'same-category': 'Similar topic',
  'fallback': 'You might also consider',
};

export function RelatedQuestions({
  relatedQuestions,
  onQuestionClick,
  className,
}: RelatedQuestionsProps) {
  // Don't render if no related questions (graceful hide)
  if (!relatedQuestions || relatedQuestions.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2 text-slate-800">
        <Lightbulb className="w-4 h-4 text-slate-600" />
        <h4 className="font-semibold text-sm">Related questions to consider</h4>
      </div>

      <div className="space-y-2">
        {relatedQuestions.map((result, index) => (
          <RelatedQuestionCard
            key={result.question.id}
            result={result}
            index={index}
            onClick={() => onQuestionClick(result)}
          />
        ))}
      </div>
    </div>
  );
}

interface RelatedQuestionCardProps {
  result: RelatedQuestionResult;
  index: number;
  onClick: () => void;
}

function RelatedQuestionCard({ result, index, onClick }: RelatedQuestionCardProps) {
  const { question, topicTitle, reason } = result;
  
  return (
    <Card 
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-all duration-200',
        'hover:shadow-sm hover:border-slate-400 hover:bg-slate-50/70',
        'border-slate-300 group'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-semibold group-hover:bg-slate-200 transition-colors">
            {index + 1}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-950 leading-relaxed font-medium">
              {question.prompt}
            </p>
            
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-medium text-slate-600">
                {topicTitle}
              </span>
              <span className="text-slate-500">-</span>
              <span className="text-xs font-medium text-slate-600">
                {reasonLabels[reason]}
              </span>
            </div>
          </div>
          
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5" />
        </div>
      </CardContent>
    </Card>
  );
}
