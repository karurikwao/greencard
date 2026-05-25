/**
 * Main Dashboard
 * Central hub for the app
 */

import { useMemo } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  BookOpen, 
  AlertCircle, 
  Calendar, 
  Users, 
  Mic, 
  FileText, 
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { NotificationPanel } from '@/components/notifications';
import { SupportTicketPanel } from '@/components/support';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useReadiness } from '@/hooks/useReadiness';
import { usePractice } from '@/lib/practice';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { normalizeAllTopics } from '@/lib/practice/normalize';
import type { PracticeTopic } from '@/lib/practice/types';
import { topics } from '@/data/topics';
import { cn } from '@/lib/utils';

interface DashboardProps {
  onPracticeTopic: (topic: PracticeTopic) => void;
  onStartQuickPractice: () => void;
  onStartMockInterview: () => void;
  onViewSaved: () => void;
  onViewProgress: () => void;
  onViewTimeline: () => void;
  onViewCouplePractice: () => void;
}

export function Dashboard({
  onPracticeTopic,
  onStartQuickPractice,
  onStartMockInterview,
  onViewSaved,
  onViewProgress,
  onViewTimeline,
  onViewCouplePractice,
}: DashboardProps) {
  const { result: readinessResult } = useReadiness();
  const { getComfortStatus } = usePractice();
  const [lastTopic] = useLocalStorage<string | null>('interview-last-topic', null);
  const [milestones] = useLocalStorage('interview-timeline-v2', []);
  
  const normalizedTopics = useMemo(() => normalizeAllTopics(topics), []);

  // Get saved questions count (computed for future use)
  useMemo(() => {
    let count = 0;
    normalizedTopics.forEach(topic => {
      topic.questions.forEach(q => {
        if (getComfortStatus(q.id) === 'nervous') {
          count++;
        }
      });
    });
    return count;
  }, [normalizedTopics, getComfortStatus]);

  // Get nervous/stress questions
  const stressQuestions = useMemo(() => {
    const nervous: { topicId: string; questionId: string; prompt: string }[] = [];
    normalizedTopics.forEach(topic => {
      topic.questions.forEach(q => {
        if (getComfortStatus(q.id) === 'nervous') {
          nervous.push({ topicId: topic.id, questionId: q.id, prompt: q.prompt });
        }
      });
    });
    return nervous.slice(0, 5);
  }, [normalizedTopics, getComfortStatus]);

  // Get recommended topics based on readiness
  const recommendedTopics = useMemo(() => {
    if (!readinessResult) {
      return ['relationship-timeline', 'daily-routine', 'kitchen-household'];
    }
    
    const topics: string[] = [];
    const sortedCategories = Object.entries(readinessResult.categoryScores)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3);

    sortedCategories.forEach(([cat]) => {
      switch (cat) {
        case 'relationship-story':
          topics.push('relationship-timeline', 'wedding-celebrations');
          break;
        case 'timeline-clarity':
          topics.push('relationship-timeline', 'address-history');
          break;
        case 'daily-life':
          topics.push('daily-routine', 'kitchen-household');
          break;
        case 'family-knowledge':
          topics.push('family-inlaws');
          break;
        case 'sensitive-questions':
          topics.push('red-flag');
          break;
        case 'document-prep':
          topics.push('evidence-shared-life');
          break;
      }
    });

    return [...new Set(topics)].slice(0, 4);
  }, [readinessResult]);

  // Get last practiced topic
  const lastPracticedTopic = useMemo(() => {
    if (!lastTopic) return null;
    return normalizedTopics.find(t => t.id === lastTopic);
  }, [lastTopic, normalizedTopics]);

  // Timeline completion
  const timelineCompletion = useMemo(() => {
    const filled = milestones.filter((m: { date: string }) => m.date).length;
    return Math.round((filled / milestones.length) * 100);
  }, [milestones]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-6 h-6 text-slate-500" />
            <h1 className="text-xl font-medium text-slate-800">Your Dashboard</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Welcome + Readiness Score */}
        <Card className="border-slate-200/60">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium text-slate-800">Welcome back</h2>
                <p className="text-slate-500">Track your progress and continue preparing</p>
              </div>
              
              {readinessResult ? (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-slate-500">Readiness Score</div>
                    <div className={cn(
                      'text-2xl font-bold',
                      readinessResult.overallScore >= 80 ? 'text-emerald-600' :
                      readinessResult.overallScore >= 60 ? 'text-amber-600' : 'text-rose-600'
                    )}>
                      {readinessResult.overallScore}%
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={onViewProgress}>
                    Details
                  </Button>
                </div>
              ) : (
                <Button onClick={onViewProgress} className="bg-slate-700 hover:bg-slate-800">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Take Readiness Check
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Continue Practicing */}
          {lastPracticedTopic && (
            <Card className="border-slate-200/60">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-slate-500" />
                  Continue Practicing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 mb-4">{lastPracticedTopic.title}</p>
                <Button 
                  onClick={() => onPracticeTopic(lastPracticedTopic)}
                  className="w-full bg-slate-700 hover:bg-slate-800"
                >
                  Resume
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick Practice */}
          <Card className="border-slate-200/60">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                Quick Practice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">
                10-minute session with important questions from different topics
              </p>
              <Button 
                onClick={onStartQuickPractice}
                variant="outline"
                className="w-full"
              >
                Start 10-Minute Session
              </Button>
            </CardContent>
          </Card>

          {/* Recommended Topics */}
          <Card className="border-slate-200/60">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-500" />
                Recommended Topics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recommendedTopics.map(topicId => {
                  const topic = normalizedTopics.find(t => t.id === topicId);
                  if (!topic) return null;
                  return (
                    <button
                      key={topicId}
                      onClick={() => onPracticeTopic(topic)}
                      className="w-full text-left p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="font-medium text-slate-700">{topic.title}</div>
                      <div className="text-xs text-slate-500">{topic.questionCount} questions</div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Stress Review */}
          <Card className="border-slate-200/60">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                Topics to Review Gently
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stressQuestions.length > 0 ? (
                <div className="space-y-2">
                  {stressQuestions.map((q, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-rose-50/50 border border-rose-100">
                      <p className="text-sm text-slate-700 line-clamp-2">{q.prompt}</p>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={onViewSaved} className="w-full">
                    View All
                  </Button>
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">
                  No questions marked as difficult yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Timeline Progress */}
          <Card className="border-slate-200/60">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                Relationship Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Completion</span>
                  <span className="text-slate-800 font-medium">{timelineCompletion}%</span>
                </div>
                <Progress value={timelineCompletion} className="h-2" />
                <Button variant="outline" size="sm" onClick={onViewTimeline} className="w-full">
                  Continue Building
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Couple Practice */}
          <Card className="border-slate-200/60">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                Couple Practice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">
                Invite your spouse to study together and compare answers
              </p>
              <Button variant="outline" size="sm" onClick={onViewCouplePractice} className="w-full">
                Invite Partner
              </Button>
            </CardContent>
          </Card>

          {/* Mock Interview */}
          <Card className="border-slate-200/60 md:col-span-2">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <Mic className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-800">Mock Interview</h3>
                  <p className="text-sm text-slate-500">
                    Practice with a simulated interview experience
                  </p>
                </div>
              </div>
              <Button onClick={onStartMockInterview} className="bg-slate-700 hover:bg-slate-800">
                Start Mock Interview
              </Button>
            </CardContent>
          </Card>

          {/* Printable Resources */}
          <Card className="border-slate-200/60 md:col-span-2">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-800">Printable Resources</h3>
                  <p className="text-sm text-slate-500">
                    Download study packs and checklists
                  </p>
                </div>
              </div>
              <Badge variant="secondary">Premium</Badge>
            </CardContent>
          </Card>

          {/* Notifications Panel */}
          <NotificationPanel className="md:col-span-1" />

          {/* Support Tickets Panel */}
          <SupportTicketPanel className="md:col-span-1" />
        </div>
      </main>
    </div>
  );
}
