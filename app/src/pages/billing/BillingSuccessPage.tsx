/**
 * Billing Success Page
 * 
 * Shown after successful Stripe Checkout.
 * Handles both immediate success and delayed webhook sync scenarios.
 * 
 * Route: /billing/success?session_id={CHECKOUT_SESSION_ID}
 */

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, Loader2, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { confirmCheckoutSession } from '@/lib/subscriptions';

export function BillingSuccessPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(true);
  const [checkCount, setCheckCount] = useState(0);
  const [confirmationAttempted, setConfirmationAttempted] = useState(false);

  // Get session_id from URL
  const sessionId = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get('session_id')
    : null;

  // Check if subscription is activated
  const checkSubscriptionStatus = useCallback(async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user) {
        // Not authenticated, can't check subscription
        setIsActivating(false);
        setIsLoading(false);
        return;
      }

      if (sessionId && !confirmationAttempted) {
        setConfirmationAttempted(true);
        const confirmation = await confirmCheckoutSession(sessionId);
        if (!confirmation.success) {
          console.warn('Checkout confirmation fallback did not activate access yet:', confirmation.error);
        }
      }

      // Fetch current subscription
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('status, plan_type, provider')
        .eq('user_id', user.id)
        .single();

      if (subError) {
        console.error('Error fetching subscription:', subError);
      }

      // Check if subscription is now active (Stripe webhook processed)
  const sub = subscription as Record<string, unknown> | null;
  const isActivated = sub &&
    sub.provider === 'stripe' &&
    sub.status === 'active' &&
    sub.plan_type !== 'trial';

      if (isActivated) {
        setIsActivating(false);
        setIsLoading(false);
      } else if (checkCount < 10) {
        // Still waiting for webhook, poll again
        setCheckCount(prev => prev + 1);
        setTimeout(checkSubscriptionStatus, 2000);
      } else {
        // Gave up waiting, but still show success (webhook may be delayed)
        setIsActivating(false);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error checking subscription:', err);
      setIsActivating(false);
      setIsLoading(false);
    }
  }, [checkCount, confirmationAttempted, sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setError('Invalid session. Please contact support if you believe this is an error.');
      setIsLoading(false);
      setIsActivating(false);
      return;
    }

    // Start polling for subscription activation
    const initialDelay = setTimeout(() => {
      checkSubscriptionStatus();
    }, 1500);

    return () => clearTimeout(initialDelay);
  }, [sessionId, checkSubscriptionStatus]);

  const handleRefresh = () => {
    setIsLoading(true);
    setIsActivating(true);
    setCheckCount(0);
    setConfirmationAttempted(false);
    checkSubscriptionStatus();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          {isLoading ? (
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-amber-600" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
          )}
          
          <CardTitle className="text-2xl">
            {isLoading 
              ? 'Processing Your Purchase...' 
              : error 
              ? 'Almost There!' 
              : isActivating 
              ? 'Activating Your Access...'
              : 'Thank You!'}
          </CardTitle>
          
          <CardDescription className="max-w-sm mx-auto">
            {isLoading ? (
              'Please wait while we confirm your payment...'
            ) : error ? (
              error
            ) : isActivating ? (
              <>
                Your payment was successful. We're activating your premium access now.
                <br /><br />
                <span className="text-xs text-slate-400">
                  (This usually takes a few seconds...)
                </span>
              </>
            ) : (
              <>
                Your payment was successful and your premium access is now active.
                <br /><br />
                You can now access all premium features including expanded Robin interview practice.
              </>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!isLoading && !error && (
            <div className="bg-emerald-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-emerald-800">Payment confirmed</span>
              </div>
              <div className="flex items-center gap-2">
                {isActivating ? (
                  <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                )}
                <span className="text-sm text-emerald-800">
                  {isActivating ? 'Activating premium access...' : 'Premium access activated'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-emerald-800">Ready to practice</span>
              </div>
            </div>
          )}

          {isActivating && !isLoading && (
            <Button 
              variant="outline"
              className="w-full"
              onClick={handleRefresh}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Activation Status
            </Button>
          )}

          <Button 
            className="w-full"
            onClick={() => window.location.href = '/dashboard'}
            disabled={isLoading}
          >
            {error ? 'Go to Dashboard' : isActivating ? 'Go to Dashboard' : 'Start Practicing'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          {!isLoading && !error && (
            <p className="text-center text-xs text-slate-500">
              A receipt has been sent to your email. 
              You can manage your subscription from your dashboard.
              {isActivating && (
                <>
                  <br />
                  <span className="text-amber-600">
                    If activation is delayed, your access will be available within a few minutes.
                  </span>
                </>
              )}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default BillingSuccessPage;
