/**
 * SEO Question Page
 * Indexable page for individual questions
 */

import { useMemo } from 'react';
import { ArrowLeft, Lightbulb, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { normalizeAllTopics } from '@/lib/practice/normalize';
import { topics } from '@/data/topics';
import { getRelatedQuestions } from '@/lib/practice/relatedQuestions';
import type { PracticeQuestion, PracticeTopic } from '@/lib/practice/types';

interface SEOQuestionPageProps {
  questionSlug: string;
  onBack: () => void;
  onPractice: () => void;
}

export function SEOQuestionPage({ questionSlug, onBack, onPractice }: SEOQuestionPageProps) {
  const normalizedTopics = useMemo(() => normalizeAllTopics(topics), []);

  // Find the question from slug
  const { question, topic, relatedQuestions } = useMemo(() => {
    let foundQuestion: PracticeQuestion | null = null;
    let foundTopic: PracticeTopic | null = null;
    
    // Search through all topics
    for (const t of normalizedTopics) {
      for (const q of t.questions) {
        const slugFromQuestion = q.prompt
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '-')
          .slice(0, 50);
        
        if (slugFromQuestion === questionSlug || q.id.includes(questionSlug)) {
          foundQuestion = q;
          foundTopic = t;
          break;
        }
      }
      if (foundQuestion) break;
    }

    if (!foundQuestion || !foundTopic) {
      return { question: null, topic: null, relatedQuestions: [] };
    }

    const related = getRelatedQuestions({
      currentQuestion: foundQuestion,
      currentTopic: foundTopic,
      allTopics: normalizedTopics,
      maxItems: 4,
    });

    return { 
      question: foundQuestion, 
      topic: foundTopic, 
      relatedQuestions: related 
    };
  }, [questionSlug, normalizedTopics]);

  if (!question || !topic) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-medium text-slate-800 mb-2">Question Not Found</h2>
            <p className="text-slate-500 mb-4">
              This question may have been moved or removed.
            </p>
            <Button onClick={onBack} className="bg-slate-700 hover:bg-slate-800">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/60">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <article className="space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Interview Questions</span>
            <span>/</span>
            <span>{topic.title}</span>
          </div>

          {/* Question */}
          <div>
            <Badge className="mb-3">USCIS Interview Question</Badge>
            <h1 className="text-2xl sm:text-3xl text-slate-800 font-medium leading-tight">
              {question.prompt}
            </h1>
          </div>

          {/* Answer */}
          {question.sampleAnswer && (
            <Card className="border-slate-200/60">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-slate-400" />
                  <h2 className="text-lg font-medium text-slate-700">Suggested Response</h2>
                </div>
                <blockquote className="text-slate-700 leading-relaxed pl-4 border-l-2 border-slate-300 italic">
                  &ldquo;{question.sampleAnswer}&rdquo;
                </blockquote>
                <p className="text-sm text-slate-500 mt-4">
                  This is one natural way to answer. Adapt it to match your own experience.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tip */}
          {question.tip && (
            <Card className="border-amber-200 bg-amber-50/30">
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-amber-800 mb-2">Helpful Context</h3>
                <p className="text-amber-700">{question.tip}</p>
              </CardContent>
            </Card>
          )}

          {/* CTA */}
          <Card className="bg-slate-800 text-white border-slate-800">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium mb-1">Practice This Question</h3>
                  <p className="text-slate-300 text-sm">
                    Get access to all 1,200+ practice questions and track your progress
                  </p>
                </div>
                <Button onClick={onPractice} className="bg-white text-slate-800 hover:bg-slate-100">
                  Start Practicing
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Related Questions */}
          {relatedQuestions.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-800">Related Questions</h3>
              <div className="space-y-3">
                {relatedQuestions.map((related, idx) => (
                  <Card key={idx} className="border-slate-200/60">
                    <CardContent className="p-4">
                      <p className="text-slate-700">{related.question.prompt}</p>
                      <p className="text-sm text-slate-400 mt-2">{related.topicTitle}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>
    </div>
  );
}
