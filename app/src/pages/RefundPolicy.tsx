/**
 * Refund Policy Page
 */

import { ArrowLeft, Shield, Clock, HelpCircle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface RefundPolicyProps {
  onBack: () => void;
}

export function RefundPolicy({ onBack }: RefundPolicyProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-medium text-slate-800">Refund Policy</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">
            Our Refund Policy
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            We want you to be satisfied with your purchase. Here's everything you need to know about requesting a refund.
          </p>
        </div>

        {/* Eligibility Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Refund Eligibility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              You may be eligible for a refund if you meet the following criteria:
            </p>
            
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-600 text-sm font-medium">1</span>
                </div>
                <div>
                  <p className="font-medium text-slate-800">7-Day Refund Window</p>
                  <p className="text-sm text-slate-600">
                    You must request a refund within 7 days of your purchase date.
                  </p>
                </div>
              </li>
              
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-600 text-sm font-medium">2</span>
                </div>
                <div>
                  <p className="font-medium text-slate-800">Limited Usage</p>
                  <p className="text-sm text-slate-600">
                    You must have completed fewer than 25 practice questions.
                  </p>
                </div>
              </li>
              
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-600 text-sm font-medium">3</span>
                </div>
                <div>
                  <p className="font-medium text-slate-800">Mock Interview Limit</p>
                  <p className="text-sm text-slate-600">
                    You must have completed no more than 1 mock interview session.
                  </p>
                </div>
              </li>
            </ul>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Refund eligibility is automatically calculated based on your account activity. 
                Unauthorized transaction and unclear purchase claims are prioritized for manual review, and we may ask for receipt or charge details.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Processing Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Processing & Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-800 mb-1">Review Time</p>
                <p className="text-sm text-slate-600">
                  Refund requests are typically reviewed within 2-3 business days.
                </p>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-800 mb-1">Refund Timeline</p>
                <p className="text-sm text-slate-600">
                  Once approved, refunds are processed within 5-10 business days.
                </p>
              </div>
            </div>
            
            <Separator />
            
            <p className="text-slate-600">
              Refunds are issued to the original payment method used for the purchase. 
              Depending on your bank or credit card company, it may take additional time 
              for the refund to appear in your account.
            </p>
          </CardContent>
        </Card>

        {/* How to Request Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              How to Request a Refund
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 text-sm font-medium">1</span>
                <p className="text-slate-600">
                  Go to your <strong>Account Dashboard</strong> and click "Request refund review"
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 text-sm font-medium">2</span>
                <p className="text-slate-600">
                  Choose the reason that matches the facts of your purchase
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 text-sm font-medium">3</span>
                <p className="text-slate-600">
                  Fill out the refund request form with your reason for requesting a refund
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 text-sm font-medium">4</span>
                <p className="text-slate-600">
                  Submit your request and wait for our team to review it
                </p>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Contact Section */}
        <Card>
          <CardContent className="p-6">
            <p className="text-slate-600 text-center">
              If you have questions about your refund request or need assistance, 
              please contact us at{' '}
              <a href="mailto:support@greencardprep.com" className="text-blue-600 hover:underline">
                support@greencardprep.com
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Last Updated */}
        <p className="text-center text-sm text-slate-500 mt-8">
          Last updated: May 25, 2026
        </p>
      </main>
    </div>
  );
}
