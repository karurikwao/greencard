/**
 * Refund Intercept Screen
 * Shown before the refund request form to encourage using the mock interview feature
 */

import { ArrowLeft, MessageSquare, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RefundInterceptScreenProps {
  onContinueToRefund: () => void;
  onTryMockInterview: () => void;
  onBack: () => void;
}

export function RefundInterceptScreen({
  onContinueToRefund,
  onTryMockInterview,
  onBack,
}: RefundInterceptScreenProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-medium text-slate-800">Request Refund</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <CardTitle className="text-2xl">Before requesting a refund</CardTitle>
            <CardDescription className="text-base">
              Many couples find the Mock Interview feature extremely helpful when preparing
              for their USCIS marriage interview.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Feature Highlight */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-800 mb-1">
                    Practice with Robin (AI Interviewer)
                  </h3>
                  <p className="text-sm text-slate-600">
                    Get realistic practice with our AI interviewer that asks follow-up questions
                    just like a real USCIS officer. Many users say this is the most valuable
                    part of their preparation.
                  </p>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-3">
              <p className="text-sm text-slate-600 font-medium">Why try the Mock Interview first:</p>
              <ul className="space-y-2">
                {[
                  'Experience realistic interview conditions',
                  'Practice answering under pressure',
                  'Get feedback on your responses',
                  'Build confidence before the real interview',
                ].map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <Alert className="bg-slate-100 border-slate-200">
              <AlertDescription className="text-sm text-slate-600">
                If you've already tried the Mock Interview and still want a refund,
                we're happy to process your request.
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Button
                onClick={onTryMockInterview}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Try Mock Interview
              </Button>
              
              <Button
                onClick={onContinueToRefund}
                variant="outline"
                className="w-full"
              >
                Continue to Refund Request
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
