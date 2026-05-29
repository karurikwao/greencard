/**
 * Upgrade Prompt Component
 * 
 * Reusable component for displaying upgrade prompts when users
 * try to access premium features.
 * 
 * CONVERSION OPTIMIZED: Improved copy, better value framing,
 * and clearer CTAs for higher upgrade rates.
 */

import { Sparkles, Lock, X, Check, Crown, Gift, Calendar, Clock } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PLAN_CONFIG, PAID_PLANS, type PlanType, type FeatureKey } from '@/lib/plans';

interface ProgressStats {
  questionsPracticed?: number;
  readinessScore?: number;
  streakDays?: number;
}

interface UpgradePromptProps {
  /** Whether the prompt is visible */
  isOpen: boolean;
  /** Called when the prompt is closed */
  onClose: () => void;
  /** Current user's plan */
  currentPlan: PlanType;
  /** The feature the user is trying to access */
  feature: FeatureKey;
  /** Custom title (optional) */
  title?: string;
  /** Custom message (optional) */
  message?: string;
  /** Called when user chooses to upgrade */
  onUpgrade?: (plan: PlanType) => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Context for why the prompt is shown (for better messaging) */
  context?: 'trial_limit' | 'ai_limit' | 'feature_locked' | 'pdf_locked';
  /** User progress stats for personalized messaging */
  progressStats?: ProgressStats;
}

/**
 * Get human-readable feature name
 */
function getFeatureName(feature: FeatureKey): string {
  const featureNames: Record<FeatureKey, string> = {
    practiceQuestions: 'Practice Questions',
    readinessCheck: 'Readiness Check',
    aiInterview: 'AI Interview Simulation',
    pdfDownloads: 'PDF Downloads',
    coupleCompare: 'Couple Comparison',
    canChooseProvider: 'AI Provider Selection',
    canChooseModel: 'AI Model Selection',
  };
  return featureNames[feature];
}

/**
 * Get feature description with value focus
 */
function getFeatureDescription(feature: FeatureKey): string {
  const descriptions: Record<FeatureKey, string> = {
    practiceQuestions: 'Access hundreds of real USCIS interview questions',
    readinessCheck: 'Track your preparation progress and interview readiness',
    aiInterview: 'Practice with realistic AI-powered interview simulation',
    pdfDownloads: 'Download printable study guides and preparation checklists',
    coupleCompare: 'Review and align your answers with your partner',
    canChooseProvider: 'Choose between different AI providers for best results',
    canChooseModel: 'Select from available AI models for your practice',
  };
  return descriptions[feature];
}

/**
 * Get icon for plan
 */
function getPlanIcon(planId: PlanType) {
  switch (planId) {
    case 'lifetime':
      return Crown;
    case 'monthly':
      return Calendar;
    case 'interviewPass':
      return Gift;
    default:
      return Sparkles;
  }
}

/**
 * Get context-aware title and message
 * Enhanced with progress psychology when stats are provided
 */
function getContextualCopy(
  context: UpgradePromptProps['context'],
  feature: FeatureKey,
  featureName: string,
  progressStats?: ProgressStats
): { title: string; message: string; primaryCta: string; secondaryCta: string } {
  const { questionsPracticed = 0, readinessScore = 0 } = progressStats || {};
  
  // Build progress-aware message prefix
  let progressPrefix = '';
  if (questionsPracticed > 0 && readinessScore > 0) {
    progressPrefix = `You've practiced ${questionsPracticed} questions and reached ${readinessScore}% readiness. `;
  } else if (questionsPracticed > 0) {
    progressPrefix = `You've practiced ${questionsPracticed} questions. `;
  } else if (readinessScore > 0) {
    progressPrefix = `You've reached ${readinessScore}% readiness. `;
  }
  
  switch (context) {
    case 'trial_limit':
      return {
        title: "You've reached your free trial limit",
        message: `${progressPrefix}Upgrade to continue improving your interview preparation with Robin.`,
        primaryCta: 'Upgrade to Continue',
        secondaryCta: 'View Pricing',
      };
    case 'ai_limit':
      return {
        title: 'Continue practicing with Robin',
        message: `${progressPrefix}Robin helps you rehearse realistic follow-up questions before your interview. Upgrade to continue practicing and get detailed feedback.`,
        primaryCta: 'Unlock AI Practice',
        secondaryCta: 'Maybe Later',
      };
    case 'pdf_locked':
      return {
        title: 'Download your preparation guide',
        message: 'Premium members get printable PDF study guides and checklists to review offline and bring to your interview.',
        primaryCta: 'Get PDF Access',
        secondaryCta: 'Continue Without',
      };
    case 'feature_locked':
    default:
      return {
        title: `${featureName} is part of Premium`,
        message: `${progressPrefix}Premium members get full access to ${getFeatureDescription(feature).toLowerCase()}, plus all other premium preparation tools.`,
        primaryCta: 'Upgrade Now',
        secondaryCta: 'Not Now',
      };
  }
}

export function UpgradePrompt({
  isOpen,
  onClose,
  currentPlan,
  feature,
  title,
  message,
  onUpgrade,
  size = 'md',
  context = 'feature_locked',
  progressStats,
}: UpgradePromptProps) {
  if (!isOpen) return null;

  const currentPlanConfig = PLAN_CONFIG[currentPlan];
  const featureName = getFeatureName(feature);
  // Feature description available for future use
  // const featureDescription = getFeatureDescription(feature);

  // Get contextual copy or use provided overrides
  const contextualCopy = getContextualCopy(context, feature, featureName, progressStats);
  const displayTitle = title || contextualCopy.title;
  const displayMessage = message || contextualCopy.message;
  const primaryCta = contextualCopy.primaryCta;
  const secondaryCta = contextualCopy.secondaryCta;

  // Get plans that have this feature
  const eligiblePlans = PAID_PLANS.filter(
    plan => plan.features[feature]
  );
  const isPdfPrompt = context === 'pdf_locked';

  const sizeClasses = {
    sm: 'max-w-lg',
    md: 'max-w-3xl',
    lg: 'max-w-5xl',
  };
  const modalWidthClass = isPdfPrompt ? 'max-w-6xl' : sizeClasses[size];

  const prompt = (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:items-center sm:p-6">
      <Card className={cn('relative w-full max-h-[calc(100vh-2rem)] overflow-y-auto', modalWidthClass)}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close upgrade options"
        >
          <X className="w-5 h-5" />
        </button>

        <CardHeader className={cn('text-center pb-4', isPdfPrompt && 'px-5 pt-7 sm:px-8')}>
          <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-amber-600" />
          </div>
          <CardTitle className={cn('text-xl', isPdfPrompt && 'text-2xl')}>
            {displayTitle}
          </CardTitle>
          <CardDescription className={cn('max-w-md mx-auto text-base', isPdfPrompt && 'max-w-2xl')}>
            {displayMessage}
          </CardDescription>
        </CardHeader>

        <CardContent className={cn('space-y-6', isPdfPrompt && 'px-5 pb-7 sm:px-8')}>
          {/* Current plan info */}
          <div className={cn('bg-slate-50 rounded-lg p-4', isPdfPrompt && 'mx-auto max-w-3xl')}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Your Current Plan</span>
              <Badge variant="secondary">{currentPlanConfig.name}</Badge>
            </div>
            <p className="text-sm text-slate-500">
              {currentPlan === 'trial' 
                ? "You're on the free trial with limited access. Upgrade for unlimited practice."
                : `You're currently on the ${currentPlanConfig.name}.`
              }
            </p>
          </div>

          {/* Upgrade options */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-3 text-center">
              Choose the plan that works for you
            </h4>
            
            <div className={cn(
              isPdfPrompt ? 'grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-5' : 'grid gap-3',
              !isPdfPrompt && (size === 'sm' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3')
            )}>
              {eligiblePlans.map((plan) => {
                const Icon = getPlanIcon(plan.id);
                const isRecommended = plan.id === 'lifetime';
                const isPopular = plan.id === 'monthly';
                
                return (
                  <div
                    key={plan.id}
                    className={cn(
                      'relative rounded-xl border-2 p-4 transition-all cursor-pointer hover:shadow-md',
                      isPdfPrompt && 'p-5 sm:p-6',
                      isPopular
                        ? 'border-blue-200 bg-blue-50/30 ring-1 ring-blue-100'
                        : isRecommended
                        ? 'border-amber-200 bg-amber-50/30'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                    onClick={() => onUpgrade?.(plan.id)}
                  >
                    {isPopular && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs">
                        Most Popular
                      </Badge>
                    )}
                    {isRecommended && !isPopular && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs">
                        Best Value
                      </Badge>
                    )}

                    <div className="text-center mb-3">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white mb-2">
                        <Icon className="w-5 h-5 text-slate-600" />
                      </div>
                      <h5 className={cn('font-medium text-slate-800 text-sm', isPdfPrompt && 'text-base')}>{plan.name}</h5>
                      <div className={cn('text-lg font-bold text-slate-900', isPdfPrompt && 'text-xl')}>
                        {'priceLabel' in plan ? plan.priceLabel : 'Free'}
                      </div>
                    </div>

                    <ul className={cn('space-y-1.5 mb-3', isPdfPrompt && 'space-y-2 mb-4')}>
                      <li className="flex items-center gap-2 text-xs text-slate-600">
                        <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                        <span>{featureName}</span>
                      </li>
                      <li className="flex items-center gap-2 text-xs text-slate-600">
                        <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                        <span>{plan.aiLimits.maxTurnsPerSession} AI turns/session</span>
                      </li>
                      <li className="flex items-center gap-2 text-xs text-slate-600">
                        <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                        <span>{plan.aiLimits.maxSessionsPerDay} sessions/day</span>
                      </li>
                    </ul>

                    <Button 
                      size="sm" 
                      className={cn(
                        'w-full',
                        isPopular 
                          ? 'bg-blue-500 hover:bg-blue-600' 
                          : isRecommended 
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-slate-700 hover:bg-slate-800'
                      )}
                      onClick={() => onUpgrade?.(plan.id)}
                    >
                      {isPopular ? primaryCta : 'Choose Plan'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trust footer */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-500" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-500" />
              <span>30-day money back</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-500" />
              <span>Secure payment</span>
            </div>
          </div>

          {/* Secondary action */}
          <div className="text-center">
            <button 
              onClick={onClose}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              {secondaryCta}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (typeof document === 'undefined') {
    return prompt;
  }

  return createPortal(prompt, document.body);
}

/**
 * Compact inline upgrade prompt for embedding in other components
 * CONVERSION OPTIMIZED: Better copy and clearer value proposition
 */
interface InlineUpgradePromptProps {
  feature: FeatureKey;
  onUpgrade?: () => void;
  className?: string;
  context?: 'trial_limit' | 'ai_limit' | 'feature_locked';
  progressStats?: ProgressStats;
}

export function InlineUpgradePrompt({
  feature,
  onUpgrade,
  className,
  context = 'feature_locked',
  progressStats,
}: InlineUpgradePromptProps) {
  const featureName = getFeatureName(feature);
  const { questionsPracticed = 0, readinessScore = 0 } = progressStats || {};
  
  const getContextualContent = () => {
    // Build progress-aware message
    let progressMessage = '';
    if (questionsPracticed > 0 && readinessScore > 0) {
      progressMessage = `You've practiced ${questionsPracticed} questions and reached ${readinessScore}% readiness. `;
    } else if (questionsPracticed > 0) {
      progressMessage = `You've practiced ${questionsPracticed} questions. `;
    }
    
    switch (context) {
      case 'trial_limit':
        return {
          title: 'Continue Your Interview Practice',
          message: `${progressMessage}Upgrade to continue improving your interview preparation with Robin.`,
          cta: 'Upgrade to Premium',
        };
      case 'ai_limit':
        return {
          title: 'Keep Practicing With Robin',
          message: `${progressMessage}Upgrade to continue rehearsing with Robin and get detailed feedback before your interview.`,
          cta: 'Unlock AI Practice',
        };
      default:
        return {
          title: `${featureName} — Premium Feature`,
          message: `${progressMessage}Upgrade to access this and all other premium preparation tools.`,
          cta: 'Upgrade Now',
        };
    }
  };

  const content = getContextualContent();

  return (
    <div className={cn(
      'bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 rounded-xl p-5',
      className
    )}>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-800">{content.title}</h4>
          <p className="text-sm text-slate-600 mt-1">
            {content.message}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <Button 
              size="sm" 
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={onUpgrade}
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              {content.cta}
            </Button>
            <span className="text-xs text-slate-500">
              Cancel anytime
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Trial banner for showing trial status and urgency
 */
interface TrialBannerProps {
  daysRemaining: number;
  onUpgrade?: () => void;
  className?: string;
}

export function TrialBanner({ daysRemaining, onUpgrade, className }: TrialBannerProps) {
  const isEndingSoon = daysRemaining <= 2;
  
  return (
    <div className={cn(
      'rounded-lg p-4 flex items-center justify-between gap-4',
      isEndingSoon 
        ? 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200'
        : 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200',
      className
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
          isEndingSoon ? 'bg-amber-100' : 'bg-blue-100'
        )}>
          {isEndingSoon ? (
            <Clock className="w-5 h-5 text-amber-600" />
          ) : (
            <Sparkles className="w-5 h-5 text-blue-600" />
          )}
        </div>
        <div>
          <p className={cn(
            'font-medium',
            isEndingSoon ? 'text-amber-800' : 'text-blue-800'
          )}>
            {isEndingSoon 
              ? `Your free trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`
              : `Free trial — ${daysRemaining} days remaining`
            }
          </p>
          <p className={cn(
            'text-sm',
            isEndingSoon ? 'text-amber-600' : 'text-blue-600'
          )}>
            {isEndingSoon 
              ? 'Upgrade now to keep your progress and continue preparing'
              : 'Upgrade anytime for unlimited access'
            }
          </p>
        </div>
      </div>
      <Button 
        size="sm"
        className={cn(
          'flex-shrink-0',
          isEndingSoon 
            ? 'bg-amber-500 hover:bg-amber-600'
            : 'bg-blue-500 hover:bg-blue-600'
        )}
        onClick={onUpgrade}
      >
        {isEndingSoon ? 'Upgrade Now' : 'View Plans'}
      </Button>
    </div>
  );
}

/**
 * Feature gate wrapper component
 * Shows upgrade prompt when user doesn't have access to a feature
 */
interface FeatureGateProps {
  /** Required feature */
  feature: FeatureKey;
  /** Current user's plan */
  currentPlan: PlanType;
  /** Children to render if feature is available */
  children: React.ReactNode;
  /** Called when user chooses to upgrade */
  onUpgrade?: (plan: PlanType) => void;
  /** Custom fallback component */
  fallback?: React.ReactNode;
  /** Context for the upgrade prompt */
  context?: 'trial_limit' | 'ai_limit' | 'feature_locked';
}

export function FeatureGate({
  feature,
  currentPlan,
  children,
  onUpgrade,
  fallback,
  context = 'feature_locked',
}: FeatureGateProps) {
  const [showUpgrade, setShowUpgrade] = React.useState(false);
  
  // Check if feature is enabled for current plan
  const hasAccess = PLAN_CONFIG[currentPlan].features[feature];
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  return (
    <>
      <InlineUpgradePrompt 
        feature={feature}
        onUpgrade={() => setShowUpgrade(true)}
        context={context}
      />
      <UpgradePrompt
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        currentPlan={currentPlan}
        feature={feature}
        onUpgrade={(plan) => {
          setShowUpgrade(false);
          onUpgrade?.(plan);
        }}
        context={context}
      />
    </>
  );
}

// React import for FeatureGate
import React from 'react';
