/**
 * Progress Dashboard
 * Shows statistics and insights about practice progress
 */

import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, TrendingUp, CheckCircle, RefreshCw, AlertCircle, Bookmark, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { usePractice, normalizeAllTopics } from '@/lib/practice';
import { topics } from '@/data/topics';

interface ProgressDashboardProps {
  onBack: () => void;
  onPracticeTopic: (topicId: string) => void;
}

interface Stats {
  totalQuestionsReviewed: number;
  understoodCount: number;
  needsPracticeCount: number;
  nervousCount: number;
  savedCount: number;
  topicsStarted: number;
}

export function ProgressDashboard({ onBack, onPracticeTopic }: ProgressDashboardProps) {
  const { getStats, getNeedsPractice, getNervousQuestions, isSyncing } = usePractice();
  const [stats, setStats] = useState<Stats | null>(null);
  const [needsPracticeIds, setNeedsPracticeIds] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_nervousIds, setNervousIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const normalizedTopics = useMemo(() => normalizeAllTopics(topics), []);
  const totalQuestions = useMemo(() => 
    normalizedTopics.reduce((sum, t) => sum + t.questions.length, 0),
    [normalizedTopics]
  );

  // Load stats
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      const [statsData, needsPracticeData, nervousData] = await Promise.all([
        getStats(),
        getNeedsPractice(),
        getNervousQuestions(),
      ]);

      setStats(statsData);
      setNeedsPracticeIds(needsPracticeData);
      setNervousIds(nervousData);
      setIsLoading(false);
    };
    loadData();
  }, [getStats, getNeedsPractice, getNervousQuestions]);

  // Calculate percentages
  const percentages = useMemo(() => {
    if (!stats || totalQuestions === 0) return null;
    return {
      reviewed: Math.round((stats.totalQuestionsReviewed / totalQuestions) * 100),
      understood: Math.round((stats.understoodCount / totalQuestions) * 100),
      needsPractice: Math.round((stats.needsPracticeCount / totalQuestions) * 100),
      nervous: Math.round((stats.nervousCount / totalQuestions) * 100),
    };
  }, [stats, totalQuestions]);

  // Find topics with most "needs practice" questions
  const topicsNeedingAttention = useMemo(() => {
    const topicCounts: Record<string, { topic: typeof normalizedTopics[0]; count: number }> = {};

    for (const questionId of needsPracticeIds) {
      const topicId = questionId.split('-q')[0];
      const topic = normalizedTopics.find(t => t.id === topicId);
      if (topic) {
        if (!topicCounts[topicId]) {
          topicCounts[topicId] = { topic, count: 0 };
        }
        topicCounts[topicId].count++;
      }
    }

    return Object.values(topicCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [needsPracticeIds, normalizedTopics]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <p className="text-slate-500">Loading your progress...</p>
      </div>
    );
  }

  if (!stats || !percentages) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <p className="text-slate-500">Unable to load statistics</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mb-4 -ml-2 text-slate-500 hover:text-slate-800 font-normal"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back
          </Button>

          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-slate-400" />
            <div>
              <h1 className="text-2xl text-slate-800 font-medium">
                Your Progress
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Track your preparation journey
              </p>
            </div>
          </div>

          {isSyncing && (
            <p className="text-xs text-slate-400 mt-2">Syncing...</p>
          )}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-20">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={BookOpen}
            label="Questions reviewed"
            value={stats.totalQuestionsReviewed}
            subValue={`of ${totalQuestions}`}
            color="slate"
          />
          <StatCard
            icon={CheckCircle}
            label="Comfortable with"
            value={stats.understoodCount}
            percentage={percentages.understood}
            color="emerald"
          />
          <StatCard
            icon={RefreshCw}
            label="Need more review"
            value={stats.needsPracticeCount}
            percentage={percentages.needsPractice}
            color="amber"
          />
          <StatCard
            icon={Bookmark}
            label="Saved for later"
            value={stats.savedCount}
            color="blue"
          />
        </div>

        {/* Overall Progress */}
        <Card className="border-slate-200/60 shadow-sm mb-8">
          <CardHeader>
            <CardTitle className="text-base font-medium text-slate-700">
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Questions reviewed</span>
                <span className="text-slate-800 font-medium">{percentages.reviewed}%</span>
              </div>
              <Progress value={percentages.reviewed} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Topics started</span>
                <span className="text-slate-800 font-medium">{stats.topicsStarted} of {normalizedTopics.length}</span>
              </div>
              <Progress 
                value={(stats.topicsStarted / normalizedTopics.length) * 100} 
                className="h-2" 
              />
            </div>
          </CardContent>
        </Card>

        {/* Topics Needing Attention */}
        {topicsNeedingAttention.length > 0 && (
          <Card className="border-slate-200/60 shadow-sm mb-8">
            <CardHeader>
              <CardTitle className="text-base font-medium text-slate-700">
                Topics to review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topicsNeedingAttention.map(({ topic, count }) => (
                  <div 
                    key={topic.id}
                    className="flex items-center justify-between p-3 bg-slate-50/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span className="text-slate-700">{topic.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-500">
                        {count} questions need review
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onPracticeTopic(topic.id)}
                        className="text-xs"
                      >
                        Practice
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comfort Level Breakdown */}
        <Card className="border-slate-200/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium text-slate-700">
              Comfort level breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ComfortBar
                label="Comfortable"
                count={stats.understoodCount}
                percentage={percentages.understood}
                color="bg-emerald-400"
              />
              <ComfortBar
                label="Needs review"
                count={stats.needsPracticeCount}
                percentage={percentages.needsPractice}
                color="bg-amber-400"
              />
              <ComfortBar
                label="Unsure"
                count={stats.nervousCount}
                percentage={percentages.nervous}
                color="bg-rose-400"
              />
              <ComfortBar
                label="Not yet reviewed"
                count={totalQuestions - stats.totalQuestionsReviewed}
                percentage={100 - percentages.reviewed}
                color="bg-slate-200"
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

interface StatCardProps {
  icon: typeof TrendingUp;
  label: string;
  value: number;
  subValue?: string;
  percentage?: number;
  color: 'slate' | 'emerald' | 'amber' | 'blue' | 'rose';
}

function StatCard({ icon: Icon, label, value, subValue, percentage, color }: StatCardProps) {
  const colorClasses = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <Card className="border-slate-200/60 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={cn('p-2 rounded-md', colorClasses[color])}>
            <Icon className="w-4 h-4" />
          </div>
          {percentage !== undefined && (
            <span className="text-xs text-slate-400">{percentage}%</span>
          )}
        </div>
        <div className="mt-3">
          <div className="text-2xl text-slate-800 font-medium">
            {value}
            {subValue && (
              <span className="text-sm text-slate-400 font-normal ml-1">{subValue}</span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ComfortBarProps {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

function ComfortBar({ label, count, percentage, color }: ComfortBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-800">{count}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
