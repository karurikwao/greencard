/**
 * Feature Gate Component
 * 
 * Reusable component for gating features based on Supabase-backed entitlements.
 * Replaces the localStorage-based FeatureGate in UpgradePrompt.tsx.
 * 
 * This component uses live Supabase entitlements as the source of truth,
 * NOT static PLAN_CONFIG. This ensures:
 * - Expired subscriptions are properly enforced
 * - Trial limits are checked server-side
 * - Anonymous users cannot bypass gates
 */

import { useState } from 'react';
import { useEntitlements } from '@/lib/entitlements';
import type { FeatureKey, PlanType } from '@/lib/plans';
import type { UserEntitlements } from '@/lib/entitlements';
import { UpgradePrompt, InlineUpgradePrompt } from './UpgradePrompt';
import { Loader2, Lock } from 'lucide-react';

interface EntitlementFeatureGateProps {
  /** Required feature */
  feature: FeatureKey;
  /** Children to render if feature is available */
  children: React.ReactNode;
  /** Called when user chooses to upgrade */
  onUpgrade?: (plan: PlanType) => void;
  /** Custom fallback component when locked */
  fallback?: React.ReactNode;
  /** Context for the upgrade prompt */
  context?: 'trial_limit' | 'ai_limit' | 'feature_locked' | 'pdf_locked';
  /** Whether to show inline prompt instead of full modal */
  inline?: boolean;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Whether to show locked state when loading (safer) or allow access */
  lockedWhileLoading?: boolean;
}

// Feature to entitlement feature mapping type
type EntitlementFeatureKey = keyof UserEntitlements['features'];

/**
 * Feature Gate using Supabase-backed entitlements
 * 
 * This is the SECURE version that checks live entitlements from Supabase.
 * Use this for all premium feature gating.
 */
export function EntitlementFeatureGate({
  feature,
  children,
  onUpgrade,
  fallback,
  context = 'feature_locked',
  inline = false,
  loadingComponent,
  lockedWhileLoading = true, // Safer default: lock while loading
}: EntitlementFeatureGateProps) {
  const { entitlements, isLoading } = useEntitlements();
  const [showUpgrade, setShowUpgrade] = useState(false);

  // While loading, show loading state or locked state
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    
    if (lockedWhileLoading) {
      return (
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          <span className="ml-2 text-slate-500">Checking access...</span>
        </div>
      );
    }
    
    // If not locked while loading, allow access (less safe but smoother UX)
    return <>{children}</>;
  }

  // Map feature key to entitlement feature
  const entitlementFeatureMap: Record<string, EntitlementFeatureKey> = {
    'pdfDownloads': 'pdfDownloads',
    'coupleCompare': 'coupleCompare',
    'aiInterview': 'aiInterview',
    'readinessCheck': 'readinessCheck',
    'practiceQuestions': 'progressTracking', // Mapped to progress tracking
    'canChooseProvider': 'aiInterview', // Requires AI access
    'canChooseModel': 'aiInterview', // Requires AI access
  };

  // Check if feature is allowed via entitlements
  const entitlementFeature = entitlementFeatureMap[feature];
  const featureCheck = entitlements?.features[entitlementFeature];
  const hasAccess = featureCheck?.allowed ?? false;

  // If access is granted, render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // If custom fallback provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Get current plan from entitlements
  const currentPlan = entitlements?.subscription.planType || 'trial';

  // Show upgrade prompt
  if (inline) {
    return (
      <InlineUpgradePrompt
        feature={feature}
        onUpgrade={() => setShowUpgrade(true)}
        context={context === 'pdf_locked' ? 'feature_locked' : context}
      />
    );
  }

  return (
    <>
      <div 
        className="relative cursor-pointer group"
        onClick={() => setShowUpgrade(true)}
      >
        <div className="absolute inset-0 bg-slate-100/80 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <div className="text-center">
            <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600 font-medium">Premium Feature</p>
            <p className="text-xs text-slate-500">Click to upgrade</p>
          </div>
        </div>
        <div className="blur-[2px] pointer-events-none select-none">
          {children}
        </div>
      </div>
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

/**
 * Hook to check if a feature is accessible based on live entitlements
 */
export function useFeatureGate(feature: FeatureKey) {
  const { entitlements, isLoading } = useEntitlements();

  const entitlementFeatureMap: Record<string, EntitlementFeatureKey> = {
    'pdfDownloads': 'pdfDownloads',
    'coupleCompare': 'coupleCompare',
    'aiInterview': 'aiInterview',
    'readinessCheck': 'readinessCheck',
    'practiceQuestions': 'progressTracking',
    'canChooseProvider': 'aiInterview',
    'canChooseModel': 'aiInterview',
  };

  const entitlementFeature = entitlementFeatureMap[feature];
  const featureCheck = entitlements?.features[entitlementFeature];
  
  return {
    hasAccess: featureCheck?.allowed ?? false,
    isLoading,
    reason: featureCheck?.reason,
    requiresUpgrade: featureCheck?.requiresUpgrade ?? true,
    currentPlan: entitlements?.subscription.planType || 'trial',
    effectiveStatus: entitlements?.subscription.effectiveStatus,
  };
}

export default EntitlementFeatureGate;
