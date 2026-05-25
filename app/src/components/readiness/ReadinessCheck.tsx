/**
 * Interview Readiness Check
 * Quick assessment tool for users
 */

import { useState, useCallback } from 'react';
import { ArrowRight, RotateCcw, AlertCircle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useReadiness } from '@/hooks/useReadiness';
import { READINESS_CATEGORIES } from '@/lib/readiness/types';

interface ReadinessCheckProps {
  onComplete?: () => void;
  embedded?: boolean;
}

export function ReadinessCheck({ onComplete, embedded = false }: ReadinessCheckProps) {
  const { 
    result, 
    shouldRetake, 
    getRandomizedQuestions, 
    calculateScore, 
    saveResult,
    getRecommendedTopics,
  } = useReadiness();

  const [questions] = useState(() => getRandomizedQuestions());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex) / questions.length) * 100;

  const handleAnswer = useCallback((answer: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }));
  }, [currentQuestion]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      const newResult = calculateScore(questions, answers);
      saveResult(newResult);
      setShowResults(true);
      onComplete?.();
    }
  }, [currentIndex, questions, answers, calculateScore, saveResult, onComplete]);

  const handleRetake = useCallback(() => {
    setAnswers({});
    setCurrentIndex(0);
    setShowResults(false);
  }, []);

  // Show results if already completed and not retaking
  if (result && !showResults && !shouldRetake) {
    return (
      <ResultsView 
        result={result} 
        onRetake={handleRetake}
        recommendedTopics={getRecommendedTopics()}
      />
    );
  }

  // Show results after completing
  if (showResults) {
    const newResult = calculateScore(questions, answers);
    return (
      <ResultsView 
        result={newResult} 
        onRetake={handleRetake}
        recommendedTopics={getRecommendedTopics()}
      />
    );
  }

  return (
    <Card className={cn('border-slate-200/60', embedded ? '' : 'max-w-2xl mx-auto')}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-slate-500" />
          <div>
            <CardTitle className="text-lg">Interview Readiness Check</CardTitle>
            <CardDescription>
              Question {currentIndex + 1} of {questions.length}
            </CardDescription>
          </div>
        </div>
        <Progress value={progress} className="h-2 mt-2" />
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          <Badge variant="secondary" className="mb-3">
            {READINESS_CATEGORIES[currentQuestion.category].label}
          </Badge>
          <h3 className="text-lg text-slate-800 leading-relaxed">
            {currentQuestion.question}
          </h3>
        </div>

        <RadioGroup
          value={answers[currentQuestion.id] || ''}
          onValueChange={handleAnswer}
          className="space-y-3"
        >
          {currentQuestion.options.map((option, idx) => (
            <div
              key={idx}
              className={cn(
                'flex items-start gap-3 p-4 rounded-lg border transition-all cursor-pointer',
                answers[currentQuestion.id] === option.text
                  ? 'border-slate-400 bg-slate-50'
                  : 'border-slate-200 hover:border-slate-300'
              )}
              onClick={() => handleAnswer(option.text)}
            >
              <RadioGroupItem 
                value={option.text} 
                id={`option-${idx}`}
                className="mt-0.5"
              />
              <Label 
                htmlFor={`option-${idx}`}
                className="text-slate-700 cursor-pointer flex-1"
              >
                {option.text}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="flex justify-end">
          <Button
            onClick={handleNext}
            disabled={!answers[currentQuestion.id]}
            className="bg-slate-700 hover:bg-slate-800"
          >
            {currentIndex < questions.length - 1 ? (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              'See Results'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ResultsView({ 
  result, 
  onRetake,
  recommendedTopics,
}: { 
  result: NonNullable<ReturnType<typeof useReadiness>['result']>;
  onRetake: () => void;
  recommendedTopics: string[];
}) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-rose-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'bg-amber-50 border-amber-200';
    return 'bg-rose-50 border-rose-200';
  };

  return (
    <Card className="border-slate-200/60 max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Your Interview Readiness</CardTitle>
        <CardDescription>
          Completed {new Date(result.completedAt).toLocaleDateString()}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className={cn('p-6 rounded-xl border text-center', getScoreBg(result.overallScore))}>
          <div className={cn('text-5xl font-bold mb-2', getScoreColor(result.overallScore))}>
            {result.overallScore}%
          </div>
          <p className="text-slate-600">
            {result.overallScore >= 80 
              ? 'You\'re well prepared for your interview!' 
              : result.overallScore >= 60 
              ? 'You\'re on the right track. Keep practicing!'
              : 'Focus on the recommended areas below to improve.'}
          </p>
        </div>

        {/* Category Scores */}
        <div className="space-y-3">
          <h4 className="font-medium text-slate-700">Breakdown by Category</h4>
          {(Object.keys(result.categoryScores) as Array<keyof typeof READINESS_CATEGORIES>).map((cat) => {
            const score = result.categoryScores[cat];
            return (
              <div key={cat} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{READINESS_CATEGORIES[cat].label}</span>
                  <span className={getScoreColor(score)}>{score}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={cn('h-full rounded-full', 
                      score >= 80 ? 'bg-emerald-400' : score >= 60 ? 'bg-amber-400' : 'bg-rose-400'
                    )}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Recommendations */}
        {result.recommendations.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-slate-700">Recommendations</h4>
            <ul className="space-y-2">
              {result.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Topics */}
        {recommendedTopics.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-slate-700">Recommended Topics to Study</h4>
            <div className="flex flex-wrap gap-2">
              {recommendedTopics.map(topicId => (
                <Badge key={topicId} variant="secondary">
                  {topicId.replace(/-/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onRetake} className="flex-1">
            <RotateCcw className="w-4 h-4 mr-2" />
            Retake Assessment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Need to import Badge
import { Badge } from '@/components/ui/badge';
