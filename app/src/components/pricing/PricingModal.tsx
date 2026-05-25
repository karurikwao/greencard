/**
 * Pricing Modal
 * Shows pricing plans and handles upgrades
 * 
 * CONVERSION OPTIMIZED: Improved headlines, trial urgency messaging,
 * value-focused descriptions, and clearer CTAs.
 * VISUAL PSYCHOLOGY: Plan ordering, hierarchy, and trust elements optimized.
 */

import { useState } from 'react';
import { X, Check, Sparkles, Crown, Gift, Calendar, Loader2, Clock, Shield, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PlanType } from '@/lib/plans';
import { DISPLAY_PLANS } from '@/lib/plans';
import { createCheckoutSession } from '@/lib/subscriptions/stripe';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: PlanType;
  onUpgrade: (plan: PlanType) => void;
  trialDaysLeft?: number;
  /** Context for why the modal was opened */
  context?: 'trial_ended' | 'feature_limit' | 'upgrade_prompt';
}

/**
 * Get icon for plan type
 */
function getPlanIcon(planId: PlanType) {
  switch (planId) {
    case 'lifetime':
      return Crown;
    case 'monthly':
      return Calendar;
    case 'interviewPass':
      return Gift;
    case 'trial':
      return Sparkles;
    default:
      return Sparkles;
  }
}

/**
 * Plan value descriptions for conversion
 * Psychologically tuned micro-copy
 */
const PLAN_VALUE_DESCRIPTIONS: Record<string, { 
  title: string; 
  benefits: string[]; 
  microCopy: string;
  ctaText: string;
}> = {
  trial: {
    title: 'Free Trial',
    benefits: [
      'Limited AI practice',
      'Basic readiness check',
      'No credit card required',
    ],
    microCopy: 'Try first',
    ctaText: 'Start Trial',
  },
  monthly: {
    title: 'Premium Monthly',
    benefits: [
      'Unlimited practice questions',
      'Full AI interview simulation',
      'Readiness scoring',
      'Couple comparison',
      'PDF downloads',
    ],
    microCopy: 'Cancel anytime',
    ctaText: 'Choose Monthly',
  },
  lifetime: {
    title: 'Lifetime Access',
    benefits: [
      'Everything in Monthly',
      'One-time payment',
      'No monthly fees',
      'Lifetime access',
    ],
    microCopy: 'Pay once. Prepare forever.',
    ctaText: 'Choose Lifetime',
  },
  interviewPass: {
    title: '90-Day Pass',
    benefits: [
      'Full premium access',
      '90 days to prepare',
      'Perfect for upcoming interviews',
    ],
    microCopy: 'Great for tight timelines',
    ctaText: 'Choose Pass',
  },
};

/**
 * Compact trust strip for modal
 */
function TrustStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
      <div className="flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-emerald-500" />
        <span>30-day money back</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Check className="w-3.5 h-3.5 text-emerald-500" />
        <span>Cancel anytime</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Check className="w-3.5 h-3.5 text-emerald-500" />
        <span>Secure payment</span>
      </div>
    </div>
  );
}

export function PricingModal({
  isOpen,
  onClose,
  currentPlan = 'trial',
  onUpgrade,
  trialDaysLeft,
  context = 'upgrade_prompt',
}: PricingModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpgrade = async (plan: PlanType) => {
    // Skip for trial
    if (plan === 'trial') {
      onUpgrade(plan);
      return;
    }
    
    setSelectedPlan(plan);
    setIsProcessing(true);
    setCheckoutError(null);
    
    const result = await createCheckoutSession(
      plan,
      `${window.location.origin}/billing/success`,
      `${window.location.origin}/billing/cancel`
    );

    if (result.success && result.checkoutUrl) {
      window.location.href = result.checkoutUrl;
      return;
    }

    setCheckoutError(result.error || 'Unable to start checkout. Please try again.');
    setIsProcessing(false);
  };

  // Get contextual headline based on why modal was opened
  const getHeadline = () => {
    if (context === 'trial_ended' || (currentPlan === 'trial' && (trialDaysLeft === 0 || trialDaysLeft === undefined))) {
      return {
        title: "Your trial has ended",
        subtitle: "Continue preparing with Premium access to unlock unlimited AI interview practice.",
        badge: 'Upgrade to Continue',
      };
    }
    if (context === 'feature_limit') {
      return {
        title: "Unlock premium features",
        subtitle: "Get unlimited access to AI-powered interview practice and premium tools.",
        badge: 'Premium Access',
      };
    }
    if (currentPlan === 'trial' && trialDaysLeft !== undefined && trialDaysLeft > 0) {
      return {
        title: "Upgrade for unlimited access",
        subtitle: `Your free trial has ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} remaining. Upgrade now for uninterrupted preparation.`,
        badge: `${trialDaysLeft} Days Left`,
      };
    }
    return {
      title: "Choose Your Plan",
      subtitle: "Select the plan that works best for your interview preparation.",
      badge: 'Simple Pricing',
    };
  };

  const headline = getHeadline();
  const isTrialUrgent = currentPlan === 'trial' && trialDaysLeft !== undefined && trialDaysLeft <= 2;

  // Filter out trial for upgrade modal (except when explicitly showing all plans)
  const showTrial = context === 'trial_ended' || currentPlan === 'trial';
  const plansToShow = DISPLAY_PLANS.filter(p => showTrial || p.id !== 'trial');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-auto">
      <Card className="w-full max-w-5xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>

        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <Badge className={cn(
              'px-3 py-1',
              isTrialUrgent ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
            )}>
              {isTrialUrgent ? (
                <><Clock className="w-3 h-3 mr-1 inline" />{headline.badge}</>
              ) : (
                headline.badge
              )}
            </Badge>
          </div>
          <CardTitle className="text-2xl">{headline.title}</CardTitle>
          <CardDescription className="max-w-md mx-auto">
            {headline.subtitle}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {checkoutError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
              {checkoutError}
            </div>
          )}

          {/* Helper Text */}
          <div className="text-center mb-4">
            <p className="text-slate-500 text-sm">
              Choose the plan that fits your interview timeline
            </p>
          </div>

          {/* Pricing Cards - Visual hierarchy */}
          <div className={cn(
            'grid gap-4',
            plansToShow.length === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'
          )}>
            {plansToShow.map((plan) => {
              const isCurrent = currentPlan === plan.id;
              const Icon = getPlanIcon(plan.id);
              const isRecommended = plan.id === 'lifetime';
              const isPopular = plan.id === 'monthly';
              const isTrial = plan.id === 'trial';
              const valueDesc = PLAN_VALUE_DESCRIPTIONS[plan.id];
              
              return (
                <div
                  key={plan.id}
                  className={cn(
                    'relative rounded-xl border-2 p-5 transition-all',
                    isCurrent
                      ? 'border-emerald-500 bg-emerald-50/30'
                      : isPopular
                      ? 'border-blue-400 bg-gradient-to-b from-blue-50/80 to-white shadow-lg scale-[1.02] ring-2 ring-blue-100'
                      : isRecommended
                      ? 'border-amber-300 bg-gradient-to-b from-amber-50/60 to-white shadow-md'
                      : isTrial
                      ? 'border-slate-200 bg-slate-50/50'
                      : 'border-slate-200 hover:border-slate-300',
                    'flex flex-col'
                  )}
                >
                  {isCurrent && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-500">
                      Current Plan
                    </Badge>
                  )}
                  
                  {isPopular && !isCurrent && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-500 px-3">
                      <Star className="w-3 h-3 mr-1 fill-white" />
                      Most Popular
                    </Badge>
                  )}

                  {isRecommended && !isCurrent && !isPopular && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500">
                      Best Value
                    </Badge>
                  )}

                  <div className="text-center mb-4">
                    <div className={cn(
                      'inline-flex items-center justify-center w-10 h-10 rounded-full mb-2',
                      isPopular ? 'bg-blue-100' : isRecommended ? 'bg-amber-100' : isTrial ? 'bg-slate-100' : 'bg-slate-100'
                    )}>
                      <Icon className={cn(
                        'w-5 h-5',
                        isPopular ? 'text-blue-600' : isRecommended ? 'text-amber-600' : isTrial ? 'text-slate-500' : 'text-slate-600'
                      )} />
                    </div>
                    <h3 className="text-base font-semibold text-slate-800">{valueDesc.title}</h3>
                    <div className="mt-1">
                      <span className={cn(
                        'text-2xl font-bold',
                        isPopular ? 'text-blue-700' : 'text-slate-900'
                      )}>
                        ${'price' in plan ? (plan as { price: number }).price : 0}
                      </span>
                      {plan.id === 'monthly' && (
                        <span className="text-slate-500 text-sm">/month</span>
                      )}
                    </div>
                    <p className={cn(
                      'text-xs mt-2 font-medium px-2 py-0.5 rounded-full inline-block',
                      isPopular ? 'bg-blue-100 text-blue-700' : 
                      isRecommended ? 'bg-amber-100 text-amber-700' : 
                      isTrial ? 'bg-slate-100 text-slate-600' :
                      'bg-slate-100 text-slate-600'
                    )}>
                      {valueDesc.microCopy}
                    </p>
                  </div>

                  <ul className="space-y-1.5 mb-4 flex-1">
                    {valueDesc.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className={cn(
                          'w-3.5 h-3.5 mt-0.5 flex-shrink-0',
                          isPopular ? 'text-blue-500' : 'text-emerald-500'
                        )} />
                        <span className="text-slate-700 text-sm">{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    size="sm"
                    className={cn(
                      'w-full',
                      isCurrent
                        ? 'bg-emerald-500 hover:bg-emerald-600'
                        : isPopular
                        ? 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200'
                        : isRecommended
                        ? 'bg-amber-500 hover:bg-amber-600'
                        : isTrial
                        ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                        : 'bg-slate-700 hover:bg-slate-800'
                    )}
                    disabled={isCurrent || isProcessing}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {isProcessing && selectedPlan === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      isCurrent ? 'Current' : valueDesc.ctaText
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Trust footer */}
          <div className="mt-6">
            <TrustStrip />
          </div>

          <p className="text-center text-sm text-slate-500 mt-4">
            All plans include access to your saved timeline and notes. 
            {currentPlan === 'trial' && ' Upgrade anytime to unlock premium features.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
