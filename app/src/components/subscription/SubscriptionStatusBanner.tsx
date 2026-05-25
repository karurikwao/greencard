/**
 * Subscription Status Banner
 * 
 * Reusable component for displaying subscription status alerts and CTAs.
 * Handles all subscription edge states with clear messaging.
 */

import { 
  AlertTriangle, 
  CreditCard, 
  Calendar, 
  Clock, 
  Sparkles, 
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { EffectiveSubscription } from '@/lib/subscriptions';

interface SubscriptionStatusBannerProps {
  subscription: EffectiveSubscription;
  onManageBilling?: () => void;
  onViewPricing?: () => void;
  onDismiss?: () => void;
  className?: string;
  variant?: 'full' | 'compact';
}

/**
 * Get banner configuration based on subscription status
 */
function getBannerConfig(subscription: EffectiveSubscription) {
  const { effectiveStatus, daysRemaining, accessEndsAt } = subscription;
  
  switch (effectiveStatus) {
    case 'grace_period':
      return {
        icon: AlertTriangle,
        title: 'Billing Issue',
        message: 'Your subscription has a billing issue, but your access is still active for now. Please update your payment method to avoid interruption.',
        severity: 'warning',
        primaryAction: 'Update Billing',
        secondaryAction: 'View Plans',
        showSecondary: true,
        colorClasses: {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          icon: 'text-amber-600',
          title: 'text-amber-900',
          message: 'text-amber-800',
          button: 'bg-amber-500 hover:bg-amber-600',
        },
      };
      
    case 'past_due':
      return {
        icon: AlertCircle,
        title: 'Payment Failed',
        message: 'There was a problem processing your payment. Please update your billing details to keep your premium access active.',
        severity: 'error',
        primaryAction: 'Fix Billing',
        secondaryAction: undefined,
        showSecondary: false,
        colorClasses: {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-600',
          title: 'text-red-900',
          message: 'text-red-800',
          button: 'bg-red-500 hover:bg-red-600',
        },
      };
      
    case 'canceled': {
      const endDate = accessEndsAt 
        ? new Date(accessEndsAt).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          })
        : 'the end of your billing period';
      return {
        icon: Calendar,
        title: 'Subscription Canceled',
        message: `Your subscription has been canceled. You will keep premium access until ${endDate}.`,
        severity: 'info',
        primaryAction: 'Manage Billing',
        secondaryAction: undefined,
        showSecondary: false,
        colorClasses: {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-600',
          title: 'text-blue-900',
          message: 'text-blue-800',
          button: 'bg-blue-500 hover:bg-blue-600',
        },
      };
    }
      
    case 'expired':
      return {
        icon: Clock,
        title: 'Access Expired',
        message: 'Your premium access has ended. You can continue preparing by choosing a plan below.',
        severity: 'error',
        primaryAction: 'View Pricing',
        secondaryAction: undefined,
        showSecondary: false,
        colorClasses: {
          bg: 'bg-slate-100',
          border: 'border-slate-200',
          icon: 'text-slate-600',
          title: 'text-slate-900',
          message: 'text-slate-700',
          button: 'bg-slate-800 hover:bg-slate-900',
        },
      };
      
    case 'trialing':
      if (daysRemaining !== null && daysRemaining <= 3 && daysRemaining > 0) {
        return {
          icon: Clock,
          title: 'Trial Ending Soon',
          message: `Your free trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Upgrade to continue AI interview practice and premium preparation tools.`,
          severity: 'warning',
          primaryAction: 'Upgrade Now',
          secondaryAction: undefined,
          showSecondary: false,
          colorClasses: {
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            icon: 'text-amber-600',
            title: 'text-amber-900',
            message: 'text-amber-800',
            button: 'bg-amber-500 hover:bg-amber-600',
          },
        };
      }
      return null; // Don't show banner for normal trial
      
    default:
      return null;
  }
}

export function SubscriptionStatusBanner({
  subscription,
  onManageBilling,
  onViewPricing,
  onDismiss,
  className,
  variant = 'full',
}: SubscriptionStatusBannerProps) {
  const config = getBannerConfig(subscription);
  
  if (!config) return null;
  
  const Icon = config.icon;
  const isCompact = variant === 'compact';
  
  // Determine CTA handler based on action type
  const handlePrimaryAction = () => {
    if (config.primaryAction === 'Update Billing' || config.primaryAction === 'Fix Billing' || config.primaryAction === 'Manage Billing') {
      onManageBilling?.();
    } else {
      onViewPricing?.();
    }
  };
  
  const handleSecondaryAction = () => {
    onViewPricing?.();
  };
  
  if (isCompact) {
    return (
      <div className={cn(
        'rounded-lg border p-3',
        config.colorClasses.bg,
        config.colorClasses.border,
        className
      )}>
        <div className="flex items-start gap-3">
          <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', config.colorClasses.icon)} />
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-medium', config.colorClasses.title)}>
              {config.title}
            </p>
            <p className={cn('text-xs mt-0.5', config.colorClasses.message)}>
              {config.message}
            </p>
            <Button
              size="sm"
              className={cn('mt-2 text-xs h-8', config.colorClasses.button)}
              onClick={handlePrimaryAction}
            >
              {config.primaryAction}
            </Button>
          </div>
          {onDismiss && (
            <button 
              onClick={onDismiss}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn(
      'rounded-xl border p-4 sm:p-5',
      config.colorClasses.bg,
      config.colorClasses.border,
      className
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
          config.severity === 'error' ? 'bg-red-100' :
          config.severity === 'warning' ? 'bg-amber-100' :
          'bg-blue-100'
        )}>
          <Icon className={cn('w-5 h-5', config.colorClasses.icon)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className={cn('font-semibold', config.colorClasses.title)}>
                {config.title}
              </h3>
              <p className={cn('text-sm mt-1', config.colorClasses.message)}>
                {config.message}
              </p>
            </div>
            {onDismiss && (
              <button 
                onClick={onDismiss}
                className="text-slate-400 hover:text-slate-600 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <Button
              size="sm"
              className={config.colorClasses.button}
              onClick={handlePrimaryAction}
            >
              {config.primaryAction === 'Update Billing' && <CreditCard className="w-4 h-4 mr-1.5" />}
              {config.primaryAction === 'Fix Billing' && <CreditCard className="w-4 h-4 mr-1.5" />}
              {config.primaryAction === 'Manage Billing' && <CreditCard className="w-4 h-4 mr-1.5" />}
              {config.primaryAction === 'View Pricing' && <Sparkles className="w-4 h-4 mr-1.5" />}
              {config.primaryAction === 'Upgrade Now' && <Sparkles className="w-4 h-4 mr-1.5" />}
              {config.primaryAction}
            </Button>
            
            {config.showSecondary && config.secondaryAction && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSecondaryAction}
              >
                {config.secondaryAction}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact status badge for inline display
 */
export function SubscriptionStatusBadge({
  subscription,
}: {
  subscription: EffectiveSubscription;
}) {
  const { effectiveStatus, daysRemaining } = subscription;
  
  const getConfig = () => {
    switch (effectiveStatus) {
      case 'grace_period':
        return { label: 'Billing Issue', variant: 'warning' as const, icon: AlertTriangle };
      case 'past_due':
        return { label: 'Payment Failed', variant: 'error' as const, icon: AlertCircle };
      case 'canceled':
        return { label: 'Canceled', variant: 'info' as const, icon: Calendar };
      case 'expired':
        return { label: 'Expired', variant: 'error' as const, icon: Clock };
      case 'trialing':
        if (daysRemaining !== null && daysRemaining <= 3) {
          return { label: `Trial ends in ${daysRemaining}d`, variant: 'warning' as const, icon: Clock };
        }
        return { label: 'Trial', variant: 'info' as const, icon: Sparkles };
      case 'active':
        return { label: 'Active', variant: 'success' as const, icon: CheckCircle };
      default:
        return { label: 'Inactive', variant: 'secondary' as const, icon: Clock };
    }
  };
  
  const config = getConfig();
  const Icon = config.icon;
  
  const variantClasses = {
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    error: 'bg-red-100 text-red-700 border-red-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200',
    secondary: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'gap-1.5 font-medium',
        variantClasses[config.variant]
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

export default SubscriptionStatusBanner;
