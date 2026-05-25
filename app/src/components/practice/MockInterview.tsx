/**
 * Mock Interview Mode
 * Simulated interview experience
 */

import { useState, useMemo, useCallback } from 'react';
import { ArrowLeft, Mic, MessageSquare, Lightbulb, ArrowRight, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// cn utility available for future styling
import { normalizeAllTopics } from '@/lib/practice/normalize';
import { topics } from '@/data/topics';
import { getRelatedQuestions } from '@/lib/practice/relatedQuestions';
import type { PracticeQuestion, PracticeTopic } from '@/lib/practice/types';

interface MockInterviewProps {
  onBack: () => void;
}

export function MockInterview({ onBack }: MockInterviewProps) {
  const normalizedTopics = useMemo(() => normalizeAllTopics(topics), []);
  
  const [interviewState, setInterviewState] = useState<'intro' | 'question' | 'followup' | 'complete'>('intro');
  const [currentQuestion, setCurrentQuestion] = useState<PracticeQuestion | null>(null);
  const [currentTopic, setCurrentTopic] = useState<PracticeTopic | null>(null);
  const [relatedQuestion, setRelatedQuestion] = useState<PracticeQuestion | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<string[]>([]);
  const [followUpMode, setFollowUpMode] = useState(false);

  // Select a random question
  const selectRandomQuestion = useCallback(() => {
    const availableTopics = normalizedTopics.filter(t => 
      !answeredQuestions.includes(t.questions[0]?.id)
    );
    
    if (availableTopics.length === 0) {
      setInterviewState('complete');
      return;
    }

    const randomTopic = availableTopics[Math.floor(Math.random() * availableTopics.length)];
    const randomQuestion = randomTopic.questions[Math.floor(Math.random() * Math.min(3, randomTopic.questions.length))];
    
    setCurrentTopic(randomTopic);
    setCurrentQuestion(randomQuestion);
    setShowAnswer(false);
    setRelatedQuestion(null);
    setFollowUpMode(false);
    setInterviewState('question');
  }, [normalizedTopics, answeredQuestions]);

  // Get related question
  const showRelatedQuestion = useCallback(() => {
    if (!currentQuestion || !currentTopic) return;
    
    const related = getRelatedQuestions({
      currentQuestion,
      currentTopic,
      allTopics: normalizedTopics,
      maxItems: 3,
    });

    if (related.length > 0) {
      const randomRelated = related[Math.floor(Math.random() * related.length)];
      setRelatedQuestion(randomRelated.question);
      setFollowUpMode(true);
      setInterviewState('followup');
      setShowAnswer(false);
    } else {
      // If no related questions, move to next
      handleNextQuestion();
    }
  }, [currentQuestion, currentTopic, normalizedTopics]);

  const handleNextQuestion = () => {
    if (currentQuestion) {
      setAnsweredQuestions(prev => [...prev, currentQuestion.id]);
    }
    selectRandomQuestion();
  };

  // handleComplete available for future use

  // Intro screen
  if (interviewState === 'intro') {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Mic className="w-8 h-8 text-slate-600" />
            </div>
            <h2 className="text-2xl font-medium text-slate-800 mb-2">Mock Interview</h2>
            <p className="text-slate-500 mb-6">
              Practice with a simulated interview experience. Questions will be presented 
              one at a time, with follow-up questions based on your responses.
            </p>
            <div className="space-y-2 text-sm text-slate-500 mb-6">
              <p>• No scoring or grades</p>
              <p>• Practice at your own pace</p>
              <p>• Review suggested responses</p>
            </div>
            <Button onClick={selectRandomQuestion} className="bg-slate-700 hover:bg-slate-800">
              Start Mock Interview
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Complete screen
  if (interviewState === 'complete') {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-medium text-slate-800 mb-2">Practice Complete</h2>
            <p className="text-slate-500 mb-6">
              You practiced {answeredQuestions.length} questions. 
              Great work preparing for your interview!
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => {
                setAnsweredQuestions([]);
                selectRandomQuestion();
              }}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Practice More
              </Button>
              <Button onClick={onBack} className="bg-slate-700 hover:bg-slate-800">
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeQuestion = followUpMode && relatedQuestion ? relatedQuestion : currentQuestion;
  const isFollowUp = followUpMode && relatedQuestion;

  if (!activeQuestion || !currentTopic) return null;

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Exit
            </Button>
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-500">Mock Interview</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-6">
          {/* Question Card */}
          <Card className="border-slate-200/60">
            <CardContent className="p-6">
              {isFollowUp && (
                <Badge variant="secondary" className="mb-4">
                  Follow-up Question
                </Badge>
              )}
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <h3 className="text-xl text-slate-800 leading-relaxed">
                    {activeQuestion.prompt}
                  </h3>
                  <p className="text-sm text-slate-400 mt-2">{currentTopic.title}</p>
                </div>
              </div>

              {/* Reveal Answer Button */}
              {!showAnswer && (
                <Button
                  onClick={() => setShowAnswer(true)}
                  variant="outline"
                  className="w-full mt-6 py-6 border-dashed border-2"
                >
                  View Suggested Response
                </Button>
              )}

              {/* Answer */}
              {showAnswer && activeQuestion.sampleAnswer && (
                <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-500">One way to respond</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    {activeQuestion.sampleAnswer}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {!isFollowUp && (
              <Button
                variant="outline"
                onClick={showRelatedQuestion}
                className="flex-1"
              >
                Practice Follow-up
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            <Button
              onClick={handleNextQuestion}
              className="flex-1 bg-slate-700 hover:bg-slate-800"
            >
              {isFollowUp ? 'Next Question' : 'Skip to Next'}
            </Button>
          </div>

          {/* Progress */}
          <p className="text-center text-sm text-slate-400">
            Question {answeredQuestions.length + 1} • Practice at your own pace
          </p>
        </div>
      </main>
    </div>
  );
}
