/**
 * Question Card Component - Professional, Calm Design
 * Displays a single practice question with reveal-answer interaction
 */

import { useState } from 'react';
import { Eye, EyeOff, MessageSquare, Sparkles, AlertTriangle, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PracticeQuestion } from '@/lib/practice';

interface QuestionCardProps {
  question: PracticeQuestion;
  questionNumber: number;
  totalQuestions: number;
  className?: string;
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  className,
}: QuestionCardProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  const hasGuidance = question.tip || question.officerLookingFor || question.avoidThis;
  const progress = (questionNumber / totalQuestions) * 100;

  return (
    <Card className={cn('overflow-hidden border-slate-200/60 shadow-sm', className)}>
      {/* Progress Header - Minimal */}
      <div className="bg-slate-50/50 border-b border-slate-100 px-5 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600 uppercase">
            Question {questionNumber} of {totalQuestions}
          </span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-slate-400 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-6 sm:p-8">
        {/* Question Prompt */}
        <div className="mb-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-xl sm:text-2xl text-slate-950 leading-relaxed font-medium">
                {question.prompt}
              </h3>
            </div>
          </div>
        </div>

        {/* Reveal Answer Button - Calm, inviting */}
        {!isRevealed && (
          <Button
            onClick={() => setIsRevealed(true)}
            variant="outline"
            className="w-full py-6 border-slate-300 hover:border-slate-500 hover:bg-slate-50 text-slate-700 hover:text-slate-950 transition-all group text-base font-medium"
          >
            <Eye className="w-4 h-4 mr-2 text-slate-400 group-hover:text-slate-600" />
            View suggested response
          </Button>
        )}

        {/* Revealed Answer Section */}
        {isRevealed && (
          <div className="space-y-5 animate-in fade-in duration-500">
            {/* Sample Answer - Calm, professional */}
            {question.sampleAnswer && (
              <div className="bg-slate-50 border border-slate-300 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-semibold text-slate-800">
                    One way to respond
                  </span>
                </div>
                <blockquote className="text-slate-950 leading-8 pl-4 border-l-2 border-slate-400">
                  {question.sampleAnswer}
                </blockquote>
                <p className="text-xs font-medium text-slate-600 mt-4">
                  Adapt this to match your own experience and speaking style.
                </p>
              </div>
            )}

            {/* Guidance Blocks - Muted colors */}
            {hasGuidance && (
              <div className="space-y-3 pt-2">
                {question.tip && (
                  <GuidanceBlock 
                    type="tip"
                    content={question.tip}
                  />
                )}
                {question.officerLookingFor && (
                  <GuidanceBlock 
                    type="looking-for"
                    content={question.officerLookingFor}
                  />
                )}
                {question.avoidThis && (
                  <GuidanceBlock 
                    type="avoid"
                    content={question.avoidThis}
                  />
                )}
              </div>
            )}

            {/* Hide Answer Button - Subtle */}
            <Button
              onClick={() => setIsRevealed(false)}
              variant="ghost"
              size="sm"
              className="text-slate-600 hover:text-slate-900"
            >
              <EyeOff className="w-4 h-4 mr-2" />
              Hide response
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface GuidanceBlockProps {
  type: 'tip' | 'looking-for' | 'avoid';
  content: string;
}

function GuidanceBlock({ type, content }: GuidanceBlockProps) {
  const configs = {
    tip: {
      icon: Sparkles,
      label: 'Helpful context',
      colors: 'bg-amber-50/50 border-amber-100 text-amber-900',
      iconColor: 'text-amber-700',
    },
    'looking-for': {
      icon: Shield,
      label: 'What helps your case',
      colors: 'bg-emerald-50/50 border-emerald-100 text-emerald-900',
      iconColor: 'text-emerald-700',
    },
    avoid: {
      icon: AlertTriangle,
      label: 'Consider adding more detail',
      colors: 'bg-rose-50/50 border-rose-100 text-rose-900',
      iconColor: 'text-rose-700',
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className={cn('rounded-lg border p-4', config.colors)}>
      <div className="flex items-start gap-3">
        <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', config.iconColor)} />
        <div>
          <div className="text-xs font-semibold mb-1">{config.label}</div>
          <p className="text-sm leading-relaxed">{content}</p>
        </div>
      </div>
    </div>
  );
}
