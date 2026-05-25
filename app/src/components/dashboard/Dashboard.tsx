/**
 * Main Dashboard
 * Central hub for the app
 */

import { useMemo, useState } from 'react';
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
  Sparkles,
  Crown,
  Lock,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  XCircle,
  Settings
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
import { usePricing } from '@/hooks/usePricing';
import { normalizeAllTopics } from '@/lib/practice/normalize';
import type { PracticeTopic } from '@/lib/practice/types';
import { getPlanDisplayName, type PlanType } from '@/lib/plans';
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
  onUpgrade: () => void;
  onViewAdmin?: () => void;
  canViewAdmin?: boolean;
}

export function Dashboard({
  onPracticeTopic,
  onStartQuickPractice,
  onStartMockInterview,
  onViewSaved,
  onViewProgress,
  onViewTimeline,
  onViewCouplePractice,
  onUpgrade,
  onViewAdmin,
  canViewAdmin = false,
}: DashboardProps) {
  const { result: readinessResult } = useReadiness();
  const { getComfortStatus } = usePractice();
  const {
    entitlements,
    featureAccess,
    currentPlan,
    trialDaysLeft,
    passDaysLeft,
    hasPremium,
    isLoadingServer,
    upgradeToLifetime,
    cancelPlanRenewal,
    resumePlanRenewal,
  } = usePricing();
  const [lastTopic] = useLocalStorage<string | null>('interview-last-topic', null);
  const [milestones] = useLocalStorage('interview-timeline-v2', []);
  const [billingAction, setBillingAction] = useState<'cancel' | 'resume' | 'lifetime' | null>(null);
  const [billingMessage, setBillingMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  
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

  const currentPlanType = (entitlements?.subscription.planType || currentPlan.id) as PlanType;
  const planName = getPlanDisplayName(currentPlanType);
  const planStatusLabel = entitlements?.subscription.effectiveStatus?.replace('_', ' ') || 'trialing';
  const subscriptionStatus = entitlements?.subscription.status || 'trialing';
  const daysRemaining = currentPlanType === 'trial'
    ? trialDaysLeft
    : currentPlanType === 'interviewPass'
    ? passDaysLeft
    : entitlements?.subscription.daysRemaining;
  const canUpgradeToLifetime = hasPremium && currentPlanType !== 'lifetime';
  const canCancelMonthly = currentPlanType === 'monthly' && subscriptionStatus === 'active';
  const canResumeMonthly = currentPlanType === 'monthly' && subscriptionStatus === 'canceled';
  const formatBillingDate = (date: string | null | undefined) => {
    if (!date) return null;
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(date));
    } catch {
      return null;
    }
  };
  const runCancelRenewal = async () => {
    const confirmed = window.confirm('Cancel monthly renewal? Premium access stays active until the current billing period ends.');
    if (!confirmed) return;

    setBillingAction('cancel');
    setBillingMessage(null);
    const result = await cancelPlanRenewal();
    if (result.success) {
      const endDate = formatBillingDate(result.currentPeriodEndsAt);
      setBillingMessage({
        tone: 'success',
        text: endDate
          ? `Renewal canceled. Access remains active until ${endDate}.`
          : 'Renewal canceled. Access remains active until the current billing period ends.',
      });
    } else {
      setBillingMessage({ tone: 'error', text: result.error || 'Unable to cancel renewal.' });
    }
    setBillingAction(null);
  };
  const runResumeRenewal = async () => {
    setBillingAction('resume');
    setBillingMessage(null);
    const result = await resumePlanRenewal();
    if (result.success) {
      setBillingMessage({ tone: 'success', text: 'Monthly renewal resumed.' });
    } else {
      setBillingMessage({ tone: 'error', text: result.error || 'Unable to resume renewal.' });
    }
    setBillingAction(null);
  };
  const runLifetimeUpgrade = async () => {
    setBillingAction('lifetime');
    setBillingMessage(null);
    const result = await upgradeToLifetime();
    if (!result.success) {
      setBillingMessage({ tone: 'error', text: result.error || 'Unable to start lifetime checkout.' });
      setBillingAction(null);
    }
  };
  const featureTiles = [
    { label: 'Premium PDFs', enabled: featureAccess.pdfDownloads },
    { label: 'Partner sync', enabled: featureAccess.coupleCompare },
    { label: 'AI interview coach', enabled: featureAccess.mockInterview },
    { label: 'Provider/model choice', enabled: hasPremium },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-6 h-6 text-slate-600" />
              <h1 className="text-xl font-semibold text-slate-900">Your Dashboard</h1>
            </div>
            {canViewAdmin && onViewAdmin && (
              <Button variant="outline" size="sm" onClick={onViewAdmin}>
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}
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

        {/* Subscription + Premium Access */}
        <Card className="border-slate-200/80 bg-white">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2 text-slate-900">
                  {hasPremium ? (
                    <Crown className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-500" />
                  )}
                  Plan & Premium Access
                </CardTitle>
                <p className="text-sm text-slate-600 mt-1">
                  Trial access upgrades to paid access through Stripe Checkout.
                </p>
              </div>
              <Badge variant={hasPremium ? 'default' : 'secondary'} className="w-fit capitalize">
                {isLoadingServer ? 'Checking...' : planStatusLabel}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current plan</p>
                <p className="mt-1 font-semibold text-slate-900">{planName}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Access window</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {hasPremium && currentPlanType === 'lifetime'
                    ? 'Lifetime'
                    : daysRemaining != null
                    ? `${Math.max(0, daysRemaining)} days left`
                    : 'Active'}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment path</p>
                <p className="mt-1 font-semibold text-slate-900">{hasPremium ? 'Paid account' : 'Trial to paid'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {featureTiles.map((feature) => (
                <div
                  key={feature.label}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                    feature.enabled
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  )}
                >
                  {feature.enabled ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400" />
                  )}
                  <span>{feature.label}</span>
                </div>
              ))}
            </div>

            {billingMessage && (
              <div className={cn(
                'rounded-lg border px-3 py-2 text-sm',
                billingMessage.tone === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              )}>
                {billingMessage.text}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
              <Button onClick={onUpgrade} className="bg-slate-800 hover:bg-slate-900">
                <CreditCard className="w-4 h-4 mr-2" />
                {hasPremium ? 'View Billing Options' : 'Upgrade for Premium'}
              </Button>
              {canUpgradeToLifetime && (
                <Button
                  variant="outline"
                  onClick={runLifetimeUpgrade}
                  disabled={billingAction !== null}
                >
                  {billingAction === 'lifetime' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Crown className="w-4 h-4 mr-2" />
                  )}
                  Upgrade to Lifetime
                </Button>
              )}
              {canCancelMonthly && (
                <Button
                  variant="outline"
                  onClick={runCancelRenewal}
                  disabled={billingAction !== null}
                  className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                >
                  {billingAction === 'cancel' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Cancel monthly renewal
                </Button>
              )}
              {canResumeMonthly && (
                <Button
                  variant="outline"
                  onClick={runResumeRenewal}
                  disabled={billingAction !== null}
                >
                  {billingAction === 'resume' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Resume monthly renewal
                </Button>
              )}
              <Button variant="outline" onClick={onViewCouplePractice}>
                <Users className="w-4 h-4 mr-2" />
                Open Partner Sync
              </Button>
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
              {!featureAccess.coupleCompare && (
                <Badge variant="secondary" className="mb-3">Premium</Badge>
              )}
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
