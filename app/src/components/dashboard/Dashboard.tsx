/**
 * Main Dashboard
 * Central hub for the app
 */

import { useEffect, useMemo, useState } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  BookOpen, 
  AlertCircle, 
  Calendar, 
  Users, 
  Mic, 
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
  Settings,
  Download,
  Trophy,
  ShieldCheck,
  MessageSquare,
  ClipboardCheck
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NotificationPanel } from '@/components/notifications';
import { SupportTicketPanel } from '@/components/support';
import { PlanStatusPanel } from '@/components/entitlements/PlanStatusPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useReadiness } from '@/hooks/useReadiness';
import { usePractice } from '@/lib/practice';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { usePricing } from '@/hooks/usePricing';
import { normalizeAllTopics } from '@/lib/practice/normalize';
import type { ComfortStatus, PracticeTopic } from '@/lib/practice/types';
import { getPlanDisplayName, type PlanType } from '@/lib/plans';
import { createBillingRefundRequest } from '@/lib/refunds/api';
import { REFUND_REASONS, type RefundReason } from '@/lib/refunds/types';
import { SecurePDFDownload } from '@/components/paywall/SecurePDFDownload';
import { apiClient } from '@/lib/apiClient';
import { compareProgress, getPartnerConnection, getPartnerProgress, syncProgressWithPartner } from '@/lib/practice/partnerSync';
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

interface PartnerDashboardSummary {
  status: 'loading' | 'none' | 'connected';
  partnerEmail?: string;
  currentTopic?: string | null;
  lastUpdated?: string | null;
  bothNeedPractice: number;
  aligned: number;
  partnerNeedsPractice: number;
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
  const { getComfortStatus, isSavedForLater } = usePractice();
  const {
    entitlements,
    featureAccess,
    currentPlan,
    trialDaysLeft,
    passDaysLeft,
    hasPremium,
    isLoadingServer,
    upgradeToLifetime,
    startRetentionOffer,
    cancelPlanRenewal,
    resumePlanRenewal,
    manageSubscription,
  } = usePricing();
  const [lastTopic] = useLocalStorage<string | null>('interview-last-topic', null);
  const [milestones] = useLocalStorage('interview-timeline-v2', []);
  const [billingAction, setBillingAction] = useState<'cancel' | 'resume' | 'lifetime' | 'retention' | 'manage' | null>(null);
  const [billingMessage, setBillingMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundReason, setRefundReason] = useState<RefundReason>('not_satisfied');
  const [refundComments, setRefundComments] = useState('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundMessage, setRefundMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [partnerSummary, setPartnerSummary] = useState<PartnerDashboardSummary>({
    status: 'loading',
    bothNeedPractice: 0,
    aligned: 0,
    partnerNeedsPractice: 0,
  });
  
  const normalizedTopics = useMemo(() => normalizeAllTopics(topics), []);

  const practiceSummary = useMemo(() => {
    let reviewed = 0;
    let understood = 0;
    let needsPractice = 0;
    let nervous = 0;
    let saved = 0;

    normalizedTopics.forEach(topic => {
      topic.questions.forEach(q => {
        const comfortStatus = getComfortStatus(q.id);
        if (comfortStatus) {
          reviewed++;
        }
        if (comfortStatus === 'understood') {
          understood++;
        }
        if (comfortStatus === 'needs-practice') {
          needsPractice++;
        }
        if (comfortStatus === 'nervous') {
          nervous++;
        }
        if (isSavedForLater(q.id)) {
          saved++;
        }
      });
    });

    const totalQuestions = normalizedTopics.reduce((sum, topic) => sum + topic.questions.length, 0);
    return {
      reviewed,
      understood,
      needsPractice,
      nervous,
      saved,
      totalQuestions,
      reviewedPercent: totalQuestions ? Math.round((reviewed / totalQuestions) * 100) : 0,
    };
  }, [normalizedTopics, getComfortStatus, isSavedForLater]);

  const localQuestionStates = useMemo(() => {
    const states: Record<string, { comfortStatus: ComfortStatus; isSavedForLater: boolean }> = {};
    normalizedTopics.forEach(topic => {
      topic.questions.forEach(q => {
        const comfortStatus = getComfortStatus(q.id);
        const saved = isSavedForLater(q.id);
        if (comfortStatus || saved) {
          states[q.id] = { comfortStatus, isSavedForLater: saved };
        }
      });
    });
    return states;
  }, [normalizedTopics, getComfortStatus, isSavedForLater]);

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

  useEffect(() => {
    let isMounted = true;

    const loadPartnerSummary = async () => {
      const connection = await getPartnerConnection();
      if (!isMounted) return;

      if (!connection) {
        setPartnerSummary({
          status: 'none',
          bothNeedPractice: 0,
          aligned: 0,
          partnerNeedsPractice: 0,
        });
        return;
      }

      const { data: user } = await apiClient.auth.getUser();
      const partnerId = user?.id === connection.partnerId ? connection.userId : connection.partnerId;
      const partnerProgress = partnerId ? await getPartnerProgress(partnerId) : null;
      const comparison = partnerProgress
        ? compareProgress(localQuestionStates, partnerProgress.questionStates)
        : null;

      if (!isMounted) return;

      setPartnerSummary({
        status: 'connected',
        partnerEmail: connection.partnerEmail,
        currentTopic: partnerProgress?.currentTopic ?? null,
        lastUpdated: partnerProgress?.lastUpdated ?? null,
        bothNeedPractice: comparison?.bothNeedPractice.length ?? 0,
        aligned: comparison?.bothComfortable.length ?? 0,
        partnerNeedsPractice: comparison?.partnerNeedsPractice.length ?? 0,
      });
    };

    loadPartnerSummary();

    return () => {
      isMounted = false;
    };
  }, [localQuestionStates]);

  useEffect(() => {
    if (!featureAccess.coupleCompare || Object.keys(localQuestionStates).length === 0) return;
    syncProgressWithPartner(localQuestionStates, lastTopic);
  }, [featureAccess.coupleCompare, localQuestionStates, lastTopic]);

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
    if (!Array.isArray(milestones) || milestones.length === 0) return 0;
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
  const canUseRetentionOffer = currentPlanType === 'monthly' && ['active', 'canceled', 'past_due', 'grace_period'].includes(subscriptionStatus);
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
  const runManageBilling = async () => {
    setBillingAction('manage');
    setBillingMessage(null);
    const result = await manageSubscription();
    if (!result.success) {
      setBillingMessage({
        tone: 'error',
        text: result.error || 'Unable to open Stripe billing management.',
      });
      setBillingAction(null);
    }
  };
  const runRetentionOffer = async () => {
    setBillingAction('retention');
    setBillingMessage(null);
    const result = await startRetentionOffer();
    if (!result.success) {
      setBillingMessage({
        tone: 'error',
        text: result.error || 'Unable to start the lower-cost 90-day pass checkout.',
      });
      setBillingAction(null);
    }
  };
  const submitRefundRequest = async () => {
    setRefundSubmitting(true);
    setRefundMessage(null);
    const result = await createBillingRefundRequest({
      reason: refundReason,
      additionalComments: refundComments,
    });

    if (result.success) {
      setRefundMessage({
        tone: 'success',
        text: result.message || 'Refund request submitted for review.',
      });
      setRefundComments('');
    } else {
      setRefundMessage({
        tone: 'error',
        text: result.error || 'Unable to submit the refund request.',
      });
    }
    setRefundSubmitting(false);
  };
  const featureTiles = [
    { label: 'Premium PDFs', enabled: featureAccess.pdfDownloads },
    { label: 'Partner sync', enabled: featureAccess.coupleCompare },
    { label: 'AI interview coach', enabled: featureAccess.mockInterview },
    { label: 'Provider/model choice', enabled: hasPremium },
  ];
  const reviewQueueCount = practiceSummary.saved + practiceSummary.needsPractice + practiceSummary.nervous;
  const prepPlanItems = useMemo(() => {
    const items: {
      label: string;
      detail: string;
      action: string;
      icon: LucideIcon;
      onClick: () => void;
    }[] = [];

    items.push(readinessResult
      ? {
        label: 'Review readiness details',
        detail: `${readinessResult.overallScore}% readiness score`,
        action: 'Open score',
        icon: ShieldCheck,
        onClick: onViewProgress,
      }
      : {
        label: 'Take readiness check',
        detail: 'Set your baseline before practice',
        action: 'Start check',
        icon: Sparkles,
        onClick: onViewProgress,
      });

    if (reviewQueueCount > 0) {
      items.push({
        label: 'Clear review queue',
        detail: `${reviewQueueCount} saved or difficult items`,
        action: 'Review now',
        icon: AlertCircle,
        onClick: onViewSaved,
      });
    } else {
      items.push({
        label: 'Start focused practice',
        detail: 'Build momentum with a short session',
        action: 'Practice',
        icon: ClipboardCheck,
        onClick: onStartQuickPractice,
      });
    }

    items.push(timelineCompletion < 100
      ? {
        label: 'Strengthen your timeline',
        detail: `${timelineCompletion}% complete`,
        action: 'Open timeline',
        icon: Calendar,
        onClick: onViewTimeline,
      }
      : {
        label: 'Rehearse timeline answers',
        detail: 'Use your finished milestones',
        action: 'Mock interview',
        icon: Mic,
        onClick: onStartMockInterview,
      });

    items.push(partnerSummary.status === 'connected'
      ? {
        label: 'Compare spouse progress',
        detail: `${partnerSummary.bothNeedPractice} shared review points`,
        action: 'Open sync',
        icon: Users,
        onClick: onViewCouplePractice,
      }
      : {
        label: 'Invite spouse to sync',
        detail: 'Compare answers before the interview',
        action: 'Invite',
        icon: Users,
        onClick: onViewCouplePractice,
      });

    return items;
  }, [
    onStartMockInterview,
    onStartQuickPractice,
    onViewCouplePractice,
    onViewProgress,
    onViewSaved,
    onViewTimeline,
    partnerSummary.bothNeedPractice,
    partnerSummary.status,
    readinessResult,
    reviewQueueCount,
    timelineCompletion,
  ]);
  const pdfLibraryTopics = useMemo(
    () => normalizedTopics.filter(topic => topic.pdfFileName).slice(0, 4),
    [normalizedTopics]
  );
  const achievementTiles = [
    {
      label: 'Readiness check',
      detail: readinessResult ? `${readinessResult.overallScore}% score` : 'Not started',
      complete: Boolean(readinessResult),
      icon: ShieldCheck,
    },
    {
      label: 'Practice momentum',
      detail: `${practiceSummary.reviewed} questions reviewed`,
      complete: practiceSummary.reviewed > 0,
      icon: ClipboardCheck,
    },
    {
      label: 'Review list',
      detail: `${practiceSummary.saved + practiceSummary.needsPractice + practiceSummary.nervous} items to revisit`,
      complete: practiceSummary.saved > 0 || practiceSummary.needsPractice > 0 || practiceSummary.nervous > 0,
      icon: Trophy,
    },
  ];
  const cardClass = 'border-slate-200 bg-white shadow-sm shadow-slate-200/60';
  const surfaceClass = 'rounded-lg border border-slate-200 bg-slate-50/80 p-3';

  return (
    <div className="min-h-screen bg-slate-100/70 pb-20 text-slate-900">
      {/* Header */}
      <header className="bg-white/95 border-b border-slate-200 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Welcome + Readiness Score */}
        <Card className={cn(cardClass, 'overflow-hidden')}>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preparation center</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">Welcome back</h2>
                <p className="mt-1 text-slate-700">Track progress, premium access, spouse practice, and support from one place.</p>
              </div>
              
              {readinessResult ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left sm:text-right">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Readiness Score</div>
                    <div className="flex items-end gap-2 sm:justify-end">
                      <span className={cn(
                        'text-3xl font-bold leading-none',
                        readinessResult.overallScore >= 80 ? 'text-emerald-700' :
                        readinessResult.overallScore >= 60 ? 'text-amber-700' : 'text-rose-700'
                      )}>
                        {readinessResult.overallScore}%
                      </span>
                      <span className="text-xs text-slate-500 pb-1">overall</span>
                    </div>
                  </div>
                  <Button variant="outline" onClick={onViewProgress}>
                    Details
                  </Button>
                </div>
              ) : (
                <Button onClick={onViewProgress} className="bg-slate-900 hover:bg-slate-800">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Take Readiness Check
                </Button>
              )}
            </div>
            <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className={surfaceClass}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reviewed</p>
                <p className="mt-1 text-xl font-semibold text-slate-950">{practiceSummary.reviewedPercent}%</p>
              </div>
              <div className={surfaceClass}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Comfortable</p>
                <p className="mt-1 text-xl font-semibold text-emerald-700">{practiceSummary.understood}</p>
              </div>
              <div className={surfaceClass}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Needs review</p>
                <p className="mt-1 text-xl font-semibold text-amber-700">{practiceSummary.needsPractice}</p>
              </div>
              <div className={surfaceClass}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saved</p>
                <p className="mt-1 text-xl font-semibold text-blue-700">{practiceSummary.saved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prep Plan */}
        <Card className={cardClass}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2 text-slate-950">
                  <ClipboardCheck className="w-4 h-4 text-slate-600" />
                  Today's Prep Plan
                </CardTitle>
                <p className="text-sm text-slate-700 mt-1">
                  A short path based on readiness, review items, timeline progress, and spouse sync.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={onStartMockInterview}>
                <Mic className="w-4 h-4 mr-2" />
                Mock Interview
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {prepPlanItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={`${item.label}-${index}`}
                    type="button"
                    onClick={item.onClick}
                    className="group rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-left transition hover:border-slate-300 hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-500">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-950">{item.label}</p>
                    <p className="mt-1 min-h-10 text-sm text-slate-700">{item.detail}</p>
                    <span className="mt-3 inline-flex items-center text-sm font-medium text-slate-800 group-hover:text-slate-950">
                      {item.action}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Subscription + Premium Access */}
        <Card className={cardClass}>
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
                <p className="text-sm text-slate-700 mt-1">
                  Checkout, cancellations, lifetime upgrades, refunds, and paid access all resolve through Stripe.
                </p>
              </div>
              <Badge variant={hasPremium ? 'default' : 'secondary'} className="w-fit capitalize">
                {isLoadingServer ? 'Checking...' : planStatusLabel}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={surfaceClass}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current plan</p>
                <p className="mt-1 font-semibold text-slate-900">{planName}</p>
              </div>
              <div className={surfaceClass}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Access window</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {hasPremium && currentPlanType === 'lifetime'
                    ? 'Lifetime'
                    : daysRemaining != null
                    ? `${Math.max(0, daysRemaining)} days left`
                    : 'Active'}
                </p>
              </div>
              <div className={surfaceClass}>
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
              <Button onClick={onUpgrade} className="bg-slate-900 hover:bg-slate-800">
                <CreditCard className="w-4 h-4 mr-2" />
                {hasPremium ? 'View Billing Options' : 'Upgrade for Premium'}
              </Button>
              {hasPremium && (
                <Button
                  variant="outline"
                  onClick={runManageBilling}
                  disabled={billingAction !== null}
                >
                  {billingAction === 'manage' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Settings className="w-4 h-4 mr-2" />
                  )}
                  Manage billing
                </Button>
              )}
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
              {canUseRetentionOffer && (
                <Button
                  variant="outline"
                  onClick={runRetentionOffer}
                  disabled={billingAction !== null}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                >
                  {billingAction === 'retention' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  Switch to 90-day pass
                </Button>
              )}
              {hasPremium && (
                <Button
                  variant="outline"
                  onClick={() => setRefundDialogOpen(true)}
                  className="border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Request refund review
                </Button>
              )}
              <Button variant="outline" onClick={onViewCouplePractice}>
                <Users className="w-4 h-4 mr-2" />
                Open Partner Sync
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className={cardClass}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-slate-950">
                <Download className="w-4 h-4 text-slate-600" />
                Purchased PDF Library
              </CardTitle>
              <p className="text-sm text-slate-700">
                Paid accounts can download these study packs directly from the dashboard.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {pdfLibraryTopics.map(topic => (
                <div key={topic.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-950">{topic.title}</p>
                    <p className="text-xs text-slate-600">{topic.questionCount} questions</p>
                  </div>
                  <SecurePDFDownload
                    pdfFileName={topic.pdfFileName}
                    pdfTitle={topic.title}
                    topicId={topic.id}
                    categoryId={topic.categoryId}
                    source="direct_link"
                    size="sm"
                    label={hasPremium ? 'Download' : 'Premium'}
                    className="shrink-0"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-slate-950">
                <Trophy className="w-4 h-4 text-amber-600" />
                Achievements
              </CardTitle>
              <p className="text-sm text-slate-700">Milestones based on real preparation activity.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {achievementTiles.map((achievement) => {
                const Icon = achievement.icon;
                return (
                  <div
                    key={achievement.label}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border px-3 py-3',
                      achievement.complete
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    )}
                  >
                    <div className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg border bg-white',
                      achievement.complete ? 'border-emerald-200 text-emerald-700' : 'border-slate-200 text-slate-500'
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{achievement.label}</p>
                      <p className="text-xs opacity-80">{achievement.detail}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-slate-950">
                <MessageSquare className="w-4 h-4 text-slate-600" />
                Spouse Interaction
              </CardTitle>
              <p className="text-sm text-slate-700">Partner sync status and shared review pressure points.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {partnerSummary.status === 'loading' ? (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking partner activity...
                </div>
              ) : partnerSummary.status === 'connected' ? (
                <>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
                    <p className="text-sm font-semibold text-emerald-900">Connected</p>
                    <p className="text-xs text-emerald-800">{partnerSummary.partnerEmail}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className={surfaceClass}>
                      <p className="text-xs text-slate-500">Aligned</p>
                      <p className="font-semibold text-slate-950">{partnerSummary.aligned}</p>
                    </div>
                    <div className={surfaceClass}>
                      <p className="text-xs text-slate-500">Both review</p>
                      <p className="font-semibold text-amber-700">{partnerSummary.bothNeedPractice}</p>
                    </div>
                    <div className={surfaceClass}>
                      <p className="text-xs text-slate-500">Partner</p>
                      <p className="font-semibold text-blue-700">{partnerSummary.partnerNeedsPractice}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-700">
                  No spouse account is connected yet. Invite them when you are ready to compare progress.
                </div>
              )}
              <Button variant="outline" size="sm" onClick={onViewCouplePractice} className="w-full">
                <Users className="w-4 h-4 mr-2" />
                Open Partner Sync
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Continue Practicing */}
          {lastPracticedTopic && (
            <Card className={cardClass}>
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
                  className="w-full bg-slate-900 hover:bg-slate-800"
                >
                  Resume
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick Practice */}
          <Card className={cardClass}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                Quick Practice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 mb-4">
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
          <Card className={cardClass}>
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
                      className="w-full text-left p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                    >
                      <div className="font-medium text-slate-900">{topic.title}</div>
                      <div className="text-xs text-slate-600">{topic.questionCount} questions</div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Stress Review */}
          <Card className={cardClass}>
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
                <p className="text-slate-600 text-center py-4">
                  No questions marked as difficult yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Timeline Progress */}
          <Card className={cardClass}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                Relationship Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">Completion</span>
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
          <Card className={cardClass}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                Couple Practice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 mb-4">
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
          <Card className={cn(cardClass, 'md:col-span-2')}>
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <Mic className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-800">Mock Interview</h3>
                  <p className="text-sm text-slate-700">
                    Practice with a simulated interview experience
                  </p>
                </div>
              </div>
              <Button onClick={onStartMockInterview} className="bg-slate-900 hover:bg-slate-800">
                Start Mock Interview
              </Button>
            </CardContent>
          </Card>

          {/* AI Usage and Plan Limits */}
          <PlanStatusPanel onUpgrade={onUpgrade} className="md:col-span-1" />

          {/* Notifications Panel */}
          <NotificationPanel className="md:col-span-1" />

          {/* Support Tickets Panel */}
          <SupportTicketPanel className="md:col-span-1" />
        </div>
      </main>
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Request Refund Review</DialogTitle>
            <DialogDescription>
              We use your Stripe payment record and account usage to route the request for review.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Choose the reason that matches the facts. Unauthorized or unclear purchase claims are prioritized, and refunds are not issued automatically.
            </div>
            {canUseRetentionOffer && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                Before submitting, you can switch to a lower-cost 90-day pass from the dashboard if cost is the main reason.
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="refund-reason">Reason</Label>
              <Select value={refundReason} onValueChange={(value) => setRefundReason(value as RefundReason)}>
                <SelectTrigger id="refund-reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REFUND_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-comments">Details</Label>
              <Textarea
                id="refund-comments"
                rows={4}
                value={refundComments}
                onChange={(e) => setRefundComments(e.target.value)}
                placeholder="Add receipt details, charge date, or anything support should review."
              />
            </div>
            {refundMessage && (
              <div className={cn(
                'rounded-lg border px-3 py-2 text-sm',
                refundMessage.tone === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              )}>
                {refundMessage.text}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={submitRefundRequest} disabled={refundSubmitting}>
              {refundSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Submit review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
