/**
 * Pricing Page
 * 
 * Public-facing pricing page displaying all available plans.
 * Route: /pricing
 * 
 * CONVERSION OPTIMIZED: Improved headlines, value descriptions, 
 * trust elements, and FAQ for better trial-to-paid conversion.
 * SUBSCRIPTION UX: Shows contextual banners for billing states.
 * VISUAL PSYCHOLOGY: Plan ordering, hierarchy, and trust elements optimized.
 */

import { useState } from 'react';
import { 
  Check, 
  Sparkles, 
  Crown, 
  Gift, 
  Calendar,
  ArrowLeft,
  Loader2,
  Shield,
  Heart,
  Users,
  FileText,
  Bot,
  Clock,
  Infinity,
  Star,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { 
  PLAN_CONFIG, 
  DISPLAY_PLANS,
  getPlanDisplayName,
  type PlanType,
} from '@/lib/plans';
import { SubscriptionStatusBanner } from '@/components/subscription';
import type { EffectiveSubscription } from '@/lib/subscriptions';
import { AnnouncementBanner, TrustSnippets, ContentBlocks } from '@/components/content';

interface PricingPageProps {
  /** Current user's plan (if logged in) */
  currentPlan?: PlanType;
  /** Full subscription state for showing billing banners */
  effectiveSubscription?: EffectiveSubscription | null;
  /** Called when user selects a plan */
  onSelectPlan?: (plan: PlanType) => void;
  /** Called when user navigates back */
  onBack?: () => void;
  /** Whether a plan is being processed */
  isProcessing?: boolean;
  /** Called when user wants to manage billing */
  onManageBilling?: () => void;
  /** Called when user wants to refresh subscription status */
  onRefreshSubscription?: () => void;
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
 * Plan value descriptions for conversion optimization
 * Psychologically tuned micro-copy for each plan
 */
const PLAN_VALUE_DESCRIPTIONS: Record<PlanType, { 
  title: string; 
  subtitle: string; 
  benefits: string[]; 
  microCopy: string;
  ctaText: string;
}> = {
  anonymous: {
    title: 'Basic Access',
    subtitle: 'Browse questions and topics. Sign up for full access.',
    benefits: [
      'Browse all practice questions',
      'View topic details',
      'Basic readiness check',
    ],
    microCopy: 'Free to browse',
    ctaText: 'Sign Up Free',
  },
  trial: {
    title: 'Free Trial',
    subtitle: 'Try the experience first. No credit card required.',
    benefits: [
      'Limited AI interview practice',
      'Basic readiness check',
      'Try before upgrading',
    ],
    microCopy: 'Try the experience first',
    ctaText: 'Start Free Trial',
  },
  monthly: {
    title: 'Premium Monthly',
    subtitle: 'Everything you need to prepare confidently.',
    benefits: [
      'Unlimited practice questions',
      'Practice with Robin, your AI interview coach',
      'Interview readiness scoring',
      'Compare answers with your partner',
      'Printable preparation PDFs',
    ],
    microCopy: 'Cancel anytime',
    ctaText: 'Choose Monthly',
  },
  lifetime: {
    title: 'Lifetime Access',
    subtitle: 'The smartest value for complete peace of mind.',
    benefits: [
      'Everything in Monthly',
      'Practice with Robin whenever you need',
      'No monthly subscription',
      'Lifetime interview preparation access',
    ],
    microCopy: 'Pay once. Prepare forever.',
    ctaText: 'Choose Lifetime',
  },
  interviewPass: {
    title: '90-Day Interview Pass',
    subtitle: 'Full premium access when your interview is approaching.',
    benefits: [
      'Full premium access for 90 days',
      'Practice with Robin before your real interview',
    ],
    microCopy: 'Perfect if your interview date is close',
    ctaText: 'Choose Pass',
  },
};

/**
 * FAQ items for SEO and conversion
 */
const FAQ_ITEMS = [
  {
    q: 'Do we both need accounts?',
    a: 'No—one account works for both of you. You can practice together, compare answers, and track your combined readiness from a single account.',
  },
  {
    q: 'Can we practice together?',
    a: 'Yes! The couple comparison feature lets you review each other\'s answers and ensure you\'re both prepared with consistent responses.',
  },
  {
    q: 'What happens after my interview?',
    a: 'You keep access to your timeline and notes forever. Many couples continue using the tools to prepare for the removal of conditions interview (2-year green card renewal).',
  },
  {
    q: 'Is the AI interview realistic?',
    a: 'Robin is your AI interview coach that asks follow-up questions similar to what USCIS officers may ask. It helps you practice under realistic conditions based on actual interview experiences.',
  },
  {
    q: 'Can I cancel the monthly plan?',
    a: 'Yes, you can cancel anytime. You\'ll continue to have access until the end of your billing period. No contracts, no hassle.',
  },
  {
    q: 'What\'s included in the free trial?',
    a: 'The trial lets you try a limited AI interview session and explore the practice questions. Upgrade anytime for unlimited access.',
  },
];

/**
 * Individual pricing card component
 * Visual hierarchy: Monthly (primary) → Lifetime (value) → Interview Pass (situational) → Trial (entry)
 */
interface PricingCardProps {
  plan: typeof DISPLAY_PLANS[0];
  isCurrentPlan: boolean;
  onSelect: () => void;
  isProcessing: boolean;
}

function PricingCard({ plan, isCurrentPlan, onSelect, isProcessing }: PricingCardProps) {
  const Icon = getPlanIcon(plan.id);
  const isRecommended = plan.id === 'lifetime';
  const isPopular = plan.id === 'monthly';
  const isTrial = plan.id === 'trial';
  const valueDesc = PLAN_VALUE_DESCRIPTIONS[plan.id];
  
  // Determine button state
  const buttonText = isCurrentPlan 
    ? 'Current Plan' 
    : isProcessing 
    ? 'Processing...' 
    : valueDesc.ctaText;
  
  return (
    <div
      className={cn(
        'relative rounded-2xl border-2 p-6 transition-all duration-300',
        isCurrentPlan
          ? 'border-emerald-500 bg-emerald-50/30'
          : isPopular
          ? 'border-blue-400 bg-gradient-to-b from-blue-50/80 to-white shadow-xl scale-[1.03] ring-4 ring-blue-100/50 z-10'
          : isRecommended
          ? 'border-amber-300 bg-gradient-to-b from-amber-50/60 to-white shadow-lg'
          : isTrial
          ? 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md',
        'flex flex-col h-full'
      )}
    >
      {/* Badges */}
      {isCurrentPlan && (
        <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white">
          Current Plan
        </Badge>
      )}
      {isPopular && !isCurrentPlan && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-1 text-xs font-semibold shadow-md">
          <Star className="w-3.5 h-3.5 mr-1.5 fill-white" />
          Most Popular
        </Badge>
      )}
      {isRecommended && !isCurrentPlan && !isPopular && (
        <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white">
          Best Value
        </Badge>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <div className={cn(
          'inline-flex items-center justify-center w-14 h-14 rounded-full mb-4',
          isPopular ? 'bg-blue-100' : isRecommended ? 'bg-amber-100' : isTrial ? 'bg-slate-100' : 'bg-slate-100'
        )}>
          <Icon className={cn(
            'w-7 h-7',
            isPopular ? 'text-blue-600' : isRecommended ? 'text-amber-600' : isTrial ? 'text-slate-500' : 'text-slate-600'
          )} />
        </div>
        <h3 className={cn(
          'text-xl font-semibold',
          isPopular ? 'text-blue-900' : 'text-slate-800'
        )}>{valueDesc.title}</h3>
        <div className="mt-2 flex items-baseline justify-center gap-1">
          <span className={cn(
            'text-4xl font-bold',
            isPopular ? 'text-blue-700' : 'text-slate-900'
          )}>
            ${(plan as { price: number }).price}
          </span>
          {plan.id === 'monthly' && (
            <span className="text-slate-500">/month</span>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-2">{valueDesc.subtitle}</p>
        
        {/* Micro-conversion nudge - prominently displayed */}
        <p className={cn(
          'text-xs mt-3 font-medium px-3 py-1 rounded-full inline-block',
          isPopular ? 'bg-blue-100 text-blue-700' : 
          isRecommended ? 'bg-amber-100 text-amber-700' : 
          isTrial ? 'bg-slate-100 text-slate-600' :
          'bg-slate-100 text-slate-600'
        )}>
          {valueDesc.microCopy}
        </p>
      </div>

      {/* AI Limits - subtle */}
      <div className="bg-white/60 rounded-lg p-3 mb-4 border border-slate-100">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          AI Practice Limits
        </p>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">{plan.aiLimits.maxTurnsPerSession} turns/session</span>
          <span className="text-slate-600">{plan.aiLimits.maxSessionsPerDay} sessions/day</span>
        </div>
      </div>

      {/* Value-focused benefits */}
      <div className="flex-1 mb-6">
        <ul className="space-y-2.5">
          {valueDesc.benefits.map((benefit, idx) => (
            <li 
              key={idx}
              className="flex items-start gap-2 text-sm text-slate-700"
            >
              <Check className={cn(
                'w-4 h-4 mt-0.5 flex-shrink-0',
                isPopular ? 'text-blue-500' : 'text-emerald-500'
              )} />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA Button - Visual hierarchy */}
      <Button
        className={cn(
          'w-full font-medium',
          isCurrentPlan
            ? 'bg-emerald-500 hover:bg-emerald-600'
            : isPopular
            ? 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200'
            : isRecommended
            ? 'bg-amber-500 hover:bg-amber-600'
            : isTrial
            ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            : 'bg-slate-800 hover:bg-slate-900'
        )}
        disabled={isCurrentPlan || isProcessing}
        onClick={onSelect}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {buttonText}
          </>
        ) : (
          buttonText
        )}
      </Button>
    </div>
  );
}

/**
 * Compact trust strip for below pricing cards
 */
function TrustStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-emerald-500" />
        <span>Cancel anytime</span>
      </div>
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-emerald-500" />
        <span>Private & secure</span>
      </div>
      <div className="flex items-center gap-2">
        <Infinity className="w-4 h-4 text-emerald-500" />
        <span>Keep your progress forever</span>
      </div>
    </div>
  );
}

export function PricingPage({ 
  currentPlan = 'trial',
  effectiveSubscription,
  onSelectPlan,
  onBack,
  isProcessing: externalIsProcessing = false,
  onManageBilling,
  onRefreshSubscription,
}: PricingPageProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  
  // Determine if we should show subscription status banner
  const showStatusBanner = effectiveSubscription && 
    ['grace_period', 'past_due', 'canceled', 'expired'].includes(effectiveSubscription.effectiveStatus);

  const handleSelectPlan = async (plan: PlanType) => {
    // Skip checkout for trial
    if (plan === 'trial') {
      onSelectPlan?.(plan);
      return;
    }
    
    setCheckoutError(null);
    
    // Start checkout process
    setIsProcessing(true);
    
    try {
      // Dynamically import to avoid loading Stripe code unless needed
      const { createCheckoutSession } = await import('@/lib/subscriptions/stripe');
      
      const result = await createCheckoutSession(
        plan,
        `${window.location.origin}/billing/success`,
        `${window.location.origin}/billing/cancel`
      );
      
      if (result.success && result.checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = result.checkoutUrl;
      } else {
        setCheckoutError(result.error || 'Unable to start checkout. Please try again.');
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setCheckoutError('An unexpected error occurred. Please try again.');
      setIsProcessing(false);
    }
  };

  // Get trial days left if on trial
  const trialDaysLeft = currentPlan === 'trial' 
    ? (PLAN_CONFIG.trial as { durationDays: number }).durationDays 
    : undefined;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-rose-500" />
              <span className="font-bold text-slate-800">InterviewReady</span>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            {onRefreshSubscription && (
              <button
                onClick={onRefreshSubscription}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                title="Refresh subscription status"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            {currentPlan !== 'trial' && (
              <Badge variant="secondary">
                Current: {getPlanDisplayName(currentPlan)}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Pricing Page Announcements */}
          <AnnouncementBanner placement="pricing.top" className="mb-6" />
          
          {/* Hero - Clear, benefit-focused headline */}
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-rose-100 text-rose-700 hover:bg-rose-100 border-0">
              <Heart className="w-3 h-3 mr-1 fill-rose-500" />
              For Marriage-Based Green Card Interviews
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Prepare for Your Marriage Green Card Interview With Confidence
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Practice real USCIS interview questions, simulate a real interview with AI, 
              and track your readiness together.
            </p>
          </div>

          {/* Trial Urgency Banner */}
          {currentPlan === 'trial' && trialDaysLeft !== undefined && (
            <div className="mb-8 max-w-2xl mx-auto">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex items-center justify-center gap-3">
                <Clock className="w-5 h-5 text-blue-500" />
                <p className="text-blue-800 font-medium">
                  Free trial — <span className="font-bold">{trialDaysLeft} days remaining</span>
                </p>
              </div>
            </div>
          )}

          {/* Subscription Status Banner - Shows billing issues, canceled, expired states */}
          {showStatusBanner && effectiveSubscription && (
            <div className="mb-8 max-w-3xl mx-auto">
              <SubscriptionStatusBanner
                subscription={effectiveSubscription}
                onManageBilling={onManageBilling}
                onViewPricing={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              />
            </div>
          )}

          {/* Checkout Error Alert */}
          {checkoutError && (
            <Alert className="mb-8 max-w-2xl mx-auto bg-red-50 border-red-200">
              <AlertDescription className="text-red-800">
                <strong>Checkout Error:</strong> {checkoutError}
              </AlertDescription>
            </Alert>
          )}

          {/* Helper Text - Psychological plan guidance */}
          <div className="text-center mb-6">
            <p className="text-slate-500 text-sm">
              Choose the plan that fits your interview timeline
            </p>
          </div>

          {/* Pricing Cards - Psychological order: Trial → Monthly (anchor) → Lifetime (value) → Pass (situational) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 items-start">
            {DISPLAY_PLANS.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={currentPlan === plan.id}
                onSelect={() => handleSelectPlan(plan.id)}
                isProcessing={isProcessing || externalIsProcessing}
              />
            ))}
          </div>

          {/* Trust Strip - Reassurance elements */}
          <div className="mb-12">
            <TrustStrip />
          </div>
          
          {/* Admin-Managed Trust Snippets */}
          <div className="mb-8">
            <TrustSnippets placement="pricing.top" layout="row" />
          </div>

          {/* Risk Reduction Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-12">
            {/* Additional Content Blocks */}
            <ContentBlocks placement="pricing.after_comparison" />
            <div className="text-center mb-6">
              <Badge className="mb-3 bg-slate-100 text-slate-700 border-0">
                Designed for Real USCIS Interviews
              </Badge>
              <h2 className="text-2xl font-bold text-slate-900">
                Everything You Need to Feel Confident
              </h2>
              <p className="text-slate-600 mt-2 max-w-2xl mx-auto">
                This preparation tool was built to help couples feel confident answering real interview questions.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-medium text-slate-800 mb-1">Hundreds of Real Questions</h3>
                <p className="text-sm text-slate-500">Based on actual USCIS interview experiences</p>
              </div>
              
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                  <Bot className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-medium text-slate-800 mb-1">Practice with Robin</h3>
                <p className="text-sm text-slate-500">Your AI interview coach asks follow-up questions similar to what USCIS officers may ask</p>
              </div>
              
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-rose-600" />
                </div>
                <h3 className="font-medium text-slate-800 mb-1">Practice Together</h3>
                <p className="text-sm text-slate-500">Compare answers and prepare as a couple</p>
              </div>
              
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                  <Check className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-medium text-slate-800 mb-1">Track Readiness</h3>
                <p className="text-sm text-slate-500">Know when you're ready for your interview</p>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {FAQ_ITEMS.map((faq, idx) => (
                <div key={idx} className="bg-white rounded-lg border border-slate-200 p-5">
                  <h4 className="font-medium text-slate-800 mb-2">{faq.q}</h4>
                  <p className="text-sm text-slate-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Money Back Guarantee */}
          <div className="mt-12 text-center">
            <p className="text-sm text-slate-500">
              <strong>30-Day Money Back Guarantee:</strong> Not satisfied? 
              Contact us within 30 days for a full refund, no questions asked.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-slate-500">
          <p>© {new Date().getFullYear()} InterviewReady. All rights reserved.</p>
          <p className="mt-1">
            Questions? Contact us at support@interviewready.app
          </p>
        </div>
      </footer>
    </div>
  );
}

export default PricingPage;
