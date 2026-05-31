/**
 * Plan Status Panel
 * 
 * User-facing panel showing current plan status, AI usage, and feature access.
 * Displays trial days remaining, AI limits, and upgrade CTAs.
 */

import { useState } from 'react';
import {
  Crown,
  Zap,
  Download,
  Users,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePlanStatus, useAIUsageDisplay } from '@/lib/entitlements';

interface PlanStatusPanelProps {
  onUpgrade?: () => void;
  showDetails?: boolean;
  className?: string;
}

export function PlanStatusPanel({
  onUpgrade,
  showDetails = true,
  className = '',
}: PlanStatusPanelProps) {
  const { planStatus, isLoading, error, refresh } = usePlanStatus();
  const { usage: aiUsage } = useAIUsageDisplay();
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !planStatus) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <p className="text-sm text-red-600">Unable to load plan status</p>
          <Button variant="ghost" size="sm" onClick={refresh} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const {
    planName,
    isActive,
    isExpired,
    isInTrial,
    trialDaysLeft,
    isInterviewPass,
    passDaysLeft,
    isLifetime,
    canUpgrade,
    canRenew,
    hasPremiumAccess,
  } = planStatus;

  // Determine urgency level
  const getUrgencyColor = () => {
    if (isExpired) return 'red';
    if (isInTrial && trialDaysLeft !== null && trialDaysLeft <= 2) return 'amber';
    if (isInTrial && trialDaysLeft !== null && trialDaysLeft <= 5) return 'yellow';
    return 'green';
  };

  const urgencyColor = getUrgencyColor();

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLifetime ? (
              <Crown className="w-5 h-5 text-amber-500" />
            ) : (
              <Zap className="w-5 h-5 text-blue-500" />
            )}
            <CardTitle className="text-base">{planName}</CardTitle>
          </div>
          <StatusBadge
            isActive={isActive}
            isExpired={isExpired}
            isLifetime={isLifetime}
            urgencyColor={urgencyColor}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Trial/Pass countdown */}
        {(isInTrial || isInterviewPass) && !isExpired && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">
                {isInTrial ? 'Trial ends in' : 'Pass expires in'}
              </span>
              <span className={`font-medium ${
                urgencyColor === 'red' ? 'text-red-600' :
                urgencyColor === 'amber' ? 'text-amber-600' :
                'text-slate-700'
              }`}>
                {isInTrial ? trialDaysLeft : passDaysLeft} days
              </span>
            </div>
            <Progress
              value={isInTrial && trialDaysLeft !== null
                ? (trialDaysLeft / 7) * 100
                : isInterviewPass && passDaysLeft !== null
                  ? (passDaysLeft / 90) * 100
                  : 100
              }
              className={`h-2 ${
                urgencyColor === 'red' ? 'bg-red-100' :
                urgencyColor === 'amber' ? 'bg-amber-100' :
                'bg-slate-100'
              }`}
            />
          </div>
        )}

        {/* Expired notice */}
        {isExpired && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">
                Your {isInTrial ? 'trial' : 'plan'} has expired
              </p>
              <p className="text-xs text-red-600 mt-1">
                Upgrade to continue with unlimited access
              </p>
            </div>
          </div>
        )}

        {/* AI Usage */}
        {aiUsage && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">Robin Practice Today</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <UsageMetric
                label="Sessions"
                used={aiUsage.sessionsUsed}
                total={aiUsage.sessionsTotal}
                remaining={aiUsage.sessionsRemaining}
              />
              <UsageMetric
                label="Chats"
                used={aiUsage.turnsUsed}
                total={aiUsage.turnsTotal}
                remaining={aiUsage.turnsRemaining}
              />
            </div>
            {aiUsage.hasReachedLimit && (
              <p className="text-xs text-amber-600">
                Daily limit reached. Upgrade for more.
              </p>
            )}
          </div>
        )}

        {/* Feature Access Summary */}
        {showDetails && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4" /> Hide features
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" /> Show features
                </>
              )}
            </button>

            {expanded && (
              <div className="space-y-2 pt-2 border-t">
                <FeatureRow
                  icon={<Zap className="w-4 h-4" />}
                  name="Practice with Robin"
                  status={hasPremiumAccess ? 'full' : 'limited'}
                  description={hasPremiumAccess ? 'Expanded access' : '5 chats, 1 session/day'}
                />
                <FeatureRow
                  icon={<Download className="w-4 h-4" />}
                  name="PDF Downloads"
                  status={hasPremiumAccess ? 'included' : 'locked'}
                />
                <FeatureRow
                  icon={<Users className="w-4 h-4" />}
                  name="Couple Compare"
                  status={hasPremiumAccess ? 'included' : 'locked'}
                />
                <FeatureRow
                  icon={<CheckCircle className="w-4 h-4" />}
                  name="Readiness Check"
                  status="included"
                />
              </div>
            )}
          </>
        )}

        {/* CTA Buttons */}
        <div className="pt-2">
          {canUpgrade && onUpgrade && (
            <Button onClick={onUpgrade} className="w-full bg-blue-600 hover:bg-blue-700">
              {isInTrial ? 'Upgrade Now' : 'Upgrade Plan'}
            </Button>
          )}
          {canRenew && onUpgrade && (
            <Button onClick={onUpgrade} variant="outline" className="w-full">
              Renew Subscription
            </Button>
          )}
          {isLifetime && (
            <p className="text-sm text-center text-amber-600 flex items-center justify-center gap-1">
              <Crown className="w-4 h-4" />
              Lifetime member - all features unlocked
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StatusBadge({
  isActive,
  isExpired,
  isLifetime,
  urgencyColor,
}: {
  isActive: boolean;
  isExpired: boolean;
  isLifetime: boolean;
  urgencyColor: string;
}) {
  if (isLifetime) {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200">
        <Crown className="w-3 h-3 mr-1" />
        Lifetime
      </Badge>
    );
  }

  if (isExpired) {
    return (
      <Badge variant="destructive">
        <AlertCircle className="w-3 h-3 mr-1" />
        Expired
      </Badge>
    );
  }

  if (isActive) {
    const colorClass = urgencyColor === 'red'
      ? 'bg-red-100 text-red-700 border-red-200'
      : urgencyColor === 'amber'
        ? 'bg-amber-100 text-amber-700 border-amber-200'
        : 'bg-green-100 text-green-700 border-green-200';

    return (
      <Badge variant="outline" className={colorClass}>
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-slate-100 text-slate-600">
      Inactive
    </Badge>
  );
}

function UsageMetric({
  label,
  used,
  total,
  remaining,
}: {
  label: string;
  used: number;
  total: number;
  remaining: number;
}) {
  const percentage = total > 0 ? (used / total) * 100 : 0;
  const isLow = remaining <= 1;

  return (
    <div className="p-2 bg-slate-50 rounded-lg">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-lg font-semibold ${isLow ? 'text-amber-600' : 'text-slate-700'}`}>
        {remaining}
        <span className="text-sm font-normal text-slate-400">/{total}</span>
      </p>
      <Progress
        value={percentage}
        className="h-1 mt-1"
      />
    </div>
  );
}

function FeatureRow({
  icon,
  name,
  status,
  description,
}: {
  icon: React.ReactNode;
  name: string;
  status: 'included' | 'locked' | 'full' | 'limited';
  description?: string;
}) {
  const statusConfig = {
    included: { color: 'text-green-600', bg: 'bg-green-50', label: 'Included' },
    locked: { color: 'text-slate-400', bg: 'bg-slate-100', label: 'Locked' },
    full: { color: 'text-green-600', bg: 'bg-green-50', label: 'Full' },
    limited: { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Limited' },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <span className="text-slate-400">{icon}</span>
        <span className="text-sm text-slate-700">{name}</span>
        {description && (
          <span className="text-xs text-slate-400">({description})</span>
        )}
      </div>
      <Badge variant="outline" className={`${config.color} ${config.bg} text-xs`}>
        {config.label}
      </Badge>
    </div>
  );
}
