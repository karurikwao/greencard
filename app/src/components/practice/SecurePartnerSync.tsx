/**
 * Secure Partner Sync Component
 * 
 * Wraps the PartnerSync component with entitlement checking.
 * Only allows access for users with active premium subscriptions.
 * 
 * Trial users see an upgrade prompt instead of the partner sync UI.
 */

import { useState } from 'react';
import { Users, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useFeatureGate } from '@/components/paywall/FeatureGate';
import { UpgradePrompt } from '@/components/paywall/UpgradePrompt';
import { PartnerSync } from './PartnerSync';
import { cn } from '@/lib/utils';

interface SecurePartnerSyncProps {
  /** Additional CSS classes */
  className?: string;
  /** Called when user upgrades */
  onUpgrade?: () => void;
}

/**
 * Secure Partner Sync with Entitlement Checking
 * 
 * Shows upgrade prompt for trial users.
 * Full PartnerSync for paid users.
 */
export function SecurePartnerSync({
  className,
  onUpgrade,
}: SecurePartnerSyncProps) {
  const { hasAccess, isLoading, currentPlan } = useFeatureGate('coupleCompare');
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn('border-slate-200/60', className)}>
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-slate-400 animate-pulse" />
          </div>
          <p className="text-slate-500">Checking access...</p>
        </CardContent>
      </Card>
    );
  }

  // No access - show upgrade prompt
  if (!hasAccess) {
    return (
      <>
        <Card className={cn('border-amber-200/60 bg-gradient-to-br from-amber-50/50 to-orange-50/30', className)}>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-amber-500" />
              </div>
              
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Partner Sync — Premium Feature
              </h3>
              
              <p className="text-slate-600 mb-4 max-w-sm mx-auto">
                Connect with your partner to track each other's progress and ensure 
                you're both prepared with consistent answers.
              </p>
              
              <div className="space-y-3 max-w-xs mx-auto mb-6">
                <div className="flex items-center gap-3 text-sm text-slate-600 bg-white/60 rounded-lg p-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span>Compare answers side-by-side</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 bg-white/60 rounded-lg p-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span>Track partner's progress</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 bg-white/60 rounded-lg p-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span>Get alignment scores</span>
                </div>
              </div>
              
              <Button
                className="bg-amber-500 hover:bg-amber-600"
                onClick={() => setShowUpgrade(true)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Upgrade to Unlock
              </Button>
              
              <p className="text-xs text-slate-400 mt-3">
                Included in all premium plans
              </p>
            </div>
          </CardContent>
        </Card>
        
        <UpgradePrompt
          isOpen={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          currentPlan={currentPlan}
          feature="coupleCompare"
          context="feature_locked"
          onUpgrade={() => {
            setShowUpgrade(false);
            onUpgrade?.();
          }}
        />
      </>
    );
  }

  // User has access - show full PartnerSync
  return <PartnerSync />;
}

export default SecurePartnerSync;
