/**
 * Billing Cancel Page
 * 
 * Shown when user cancels Stripe Checkout.
 * Provides options to retry or continue with free trial.
 * 
 * Route: /billing/cancel
 */

import { XCircle, Sparkles, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function BillingCancelPage() {

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-slate-500" />
          </div>
          
          <CardTitle className="text-2xl">Checkout Canceled</CardTitle>
          
          <CardDescription className="max-w-sm mx-auto">
            Your payment was not processed. You can try again or continue with the free trial.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-amber-50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  You can still practice with the free trial
                </p>
                <p className="text-sm text-amber-600 mt-1">
                  Try a limited AI interview session and explore practice questions. 
                  Upgrade anytime when you're ready.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline"
              className="flex-1"
              onClick={() => window.location.href = '/pricing'}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <Button 
              className="flex-1"
              onClick={() => window.location.href = '/dashboard'}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Continue with Trial
            </Button>
          </div>

          <p className="text-center text-xs text-slate-500">
            Changed your mind?{' '}
            <button 
              onClick={() => window.location.href = '/pricing'}
              className="text-blue-600 hover:underline"
            >
              View pricing options
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default BillingCancelPage;
