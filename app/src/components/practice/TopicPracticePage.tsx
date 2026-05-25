/**
 * Topic Practice Page - Professional, Calm Design
 * Main practice interface showing one question at a time
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, List, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { 
  usePractice, 
  getRelatedQuestions, 
  hasRelatedQuestions,
  type PracticeTopic,
  type RelatedQuestionResult,
} from '@/lib/practice';
import { PracticeHeader } from './PracticeHeader';
import { QuestionCard } from './QuestionCard';
import { ComfortActions } from './ComfortActions';
import { RelatedQuestions } from './RelatedQuestions';
import type { ComfortStatus } from '@/lib/practice';

interface TopicPracticePageProps {
  topic: PracticeTopic;
  allTopics: PracticeTopic[];
  onBack: () => void;
}

export function TopicPracticePage({
  topic,
  allTopics,
  onBack,
}: TopicPracticePageProps) {
  const {
    getCurrentIndex,
    setCurrentIndex,
    getComfortStatus,
    setComfortStatus,
    isSavedForLater,
    toggleSaveForLater,
  } = usePractice();

  // Get persisted index or start at 0
  const [currentIndex, setLocalIndex] = useState(() => getCurrentIndex(topic.id));
  
  // Sync with persistence when index changes
  useEffect(() => {
    setCurrentIndex(topic.id, currentIndex);
  }, [currentIndex, topic.id, setCurrentIndex]);

  const currentQuestion = topic.questions[currentIndex];
  const totalQuestions = topic.questions.length;

  // Get related questions for current question
  const relatedQuestions = useMemo(() => {
    if (!currentQuestion) return [];
    return getRelatedQuestions({
      currentQuestion,
      currentTopic: topic,
      allTopics,
      maxItems: 4,
      excludeCurrent: true,
    });
  }, [currentQuestion, topic, allTopics]);

  // Check if we have related questions to show
  const hasRelated = useMemo(() => {
    if (!currentQuestion) return false;
    return hasRelatedQuestions(currentQuestion, topic, allTopics, 1);
  }, [currentQuestion, topic, allTopics]);

  // Navigation handlers
  const goToNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      setLocalIndex(prev => prev + 1);
    }
  }, [currentIndex, totalQuestions]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setLocalIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < totalQuestions) {
      setLocalIndex(index);
    }
  }, [totalQuestions]);

  // Handle related question click - navigate to that question
  const handleRelatedQuestionClick = useCallback((result: RelatedQuestionResult) => {
    const targetQuestion = result.question;
    
    // If it's in the same topic, just jump to that index
    if (targetQuestion.topicId === topic.id) {
      goToQuestion(targetQuestion.sortOrder);
    } else {
      // For cross-topic navigation, show a message for now
      // In Phase 2, this would navigate to the other topic
      alert(`This question is from "${result.topicTitle}". Cross-topic navigation coming in a future update.`);
    }
  }, [topic.id, goToQuestion]);

  // Comfort action handlers
  const handleComfortChange = useCallback((status: ComfortStatus) => {
    if (currentQuestion) {
      setComfortStatus(currentQuestion.id, status);
    }
  }, [currentQuestion, setComfortStatus]);

  const handleSaveToggle = useCallback(() => {
    if (currentQuestion) {
      toggleSaveForLater(currentQuestion.id);
    }
  }, [currentQuestion, toggleSaveForLater]);

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="border-slate-200">
          <CardContent className="p-8 text-center">
            <p className="text-slate-600">No questions available for this topic.</p>
            <Button onClick={onBack} variant="outline" className="mt-4">
              Return to topics
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentComfortStatus = getComfortStatus(currentQuestion.id);
  const currentSavedStatus = isSavedForLater(currentQuestion.id);

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <PracticeHeader
        topic={topic}
        currentQuestionIndex={currentIndex}
        totalQuestions={totalQuestions}
        onBack={onBack}
      />

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-20">
        <div className="space-y-6">
          {/* Question Navigation */}
          <div className="flex items-center justify-between">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="border-slate-300 text-slate-700 font-medium">
                  <List className="w-4 h-4 mr-2" />
                  All questions
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 sm:w-96">
                <SheetHeader>
                <SheetTitle className="text-slate-950 font-semibold">Questions in this topic</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-1 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
                  {topic.questions.map((q, idx) => {
                    const comfort = getComfortStatus(q.id);
                    const isCurrent = idx === currentIndex;
                    
                    return (
                      <button
                        key={q.id}
                        onClick={() => goToQuestion(idx)}
                        className={cn(
                          'w-full text-left p-3 rounded-md border transition-all text-sm',
                          isCurrent 
                            ? 'bg-slate-50 border-slate-300' 
                            : 'bg-white border-slate-100 hover:border-slate-200',
                          comfort === 'understood' && !isCurrent && 'border-l-2 border-l-emerald-300',
                          comfort === 'needs-practice' && !isCurrent && 'border-l-2 border-l-amber-300',
                          comfort === 'nervous' && !isCurrent && 'border-l-2 border-l-rose-300',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <span className={cn(
                            'text-xs w-5',
                            isCurrent ? 'text-slate-800 font-semibold' : 'text-slate-600 font-medium'
                          )}>
                            {idx + 1}
                          </span>
                          <span className={cn(
                            'line-clamp-2 leading-relaxed',
                            isCurrent ? 'text-slate-950 font-medium' : 'text-slate-700'
                          )}>
                            {q.prompt}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>

            {/* Quick Stats */}
            <div className="text-sm font-medium text-slate-700">
              <span className="text-slate-700">{currentIndex + 1}</span>
              <span className="text-slate-500 mx-1.5">/</span>
              <span className="text-slate-600">{totalQuestions}</span>
            </div>
          </div>

          {/* Question Card */}
          <QuestionCard
            question={currentQuestion}
            questionNumber={currentIndex + 1}
            totalQuestions={totalQuestions}
          />

          {/* Comfort Actions */}
          <Card className="border-slate-300 shadow-sm">
            <CardContent className="p-6">
              <ComfortActions
                comfortStatus={currentComfortStatus}
                isSavedForLater={currentSavedStatus}
                onComfortChange={handleComfortChange}
                onSaveToggle={handleSaveToggle}
              />
            </CardContent>
          </Card>

          {/* Related Questions */}
          {hasRelated && (
            <Card className="border-slate-300 shadow-sm">
              <CardContent className="p-6">
                <RelatedQuestions
                  relatedQuestions={relatedQuestions}
                  onQuestionClick={handleRelatedQuestionClick}
                />
              </CardContent>
            </Card>
          )}

          {/* Checklist Preview */}
          {topic.checklist.length > 0 && (
            <Card className="border-slate-300 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-4 h-4 text-slate-600" />
                  <h4 className="font-semibold text-slate-900">Preparation checklist</h4>
                </div>
                <div className="space-y-2">
                  {topic.checklist.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-md bg-slate-50/50">
                      <Checkbox id={`checklist-${idx}`} className="mt-0.5 border-slate-300" />
                      <Label 
                        htmlFor={`checklist-${idx}`}
                        className="text-sm text-slate-800 cursor-pointer leading-relaxed"
                      >
                        {item}
                      </Label>
                    </div>
                  ))}
                  {topic.checklist.length > 3 && (
                    <p className="text-xs font-medium text-slate-600 text-center pt-2">
                      {topic.checklist.length - 3} more items available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200/60">
            <Button
              variant="outline"
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className="min-w-[100px] border-slate-300 text-slate-700 font-medium"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>

            <Button
              onClick={goToNext}
              disabled={currentIndex >= totalQuestions - 1}
              className="min-w-[100px] bg-slate-800 hover:bg-slate-900 text-white font-medium"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
