/**
 * Terms of Service Page
 */

import { ArrowLeft, FileText, Scale, AlertCircle, CreditCard, RefreshCw, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TermsOfServiceProps {
  onBack: () => void;
}

export function TermsOfService({ onBack }: TermsOfServiceProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-medium text-slate-800">Terms of Service</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">
            Terms of Service
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Please read these terms carefully before using InterviewReady.
          </p>
        </div>

        {/* Service Description */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Service Description
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              InterviewReady is an online platform that provides practice resources and tools 
              for couples preparing for marriage-based green card interviews with USCIS. Our 
              services include:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-600 ml-4">
              <li>Practice question databases</li>
              <li>AI-powered mock interview simulations (Robin)</li>
              <li>Progress tracking and readiness assessments</li>
              <li>Educational materials and guides</li>
              <li>PDF downloads and study resources</li>
            </ul>
            <p className="text-slate-600">
              Our service is designed for educational and practice purposes only and does not 
              constitute legal advice or guarantee interview outcomes.
            </p>
          </CardContent>
        </Card>

        {/* User Responsibilities */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-600" />
              User Responsibilities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              By using our service, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-600 ml-4">
              <li>Provide accurate and truthful information</li>
              <li>Use the service only for lawful purposes</li>
              <li>Not share your account credentials with others</li>
              <li>Not attempt to access, modify, or disrupt our systems</li>
              <li>Respect intellectual property rights</li>
              <li>Be at least 18 years old or have parental consent</li>
            </ul>
          </CardContent>
        </Card>

        {/* No Legal Advice Disclaimer */}
        <Card className="mb-8 border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Important: No Legal Advice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 font-medium mb-2">
                InterviewReady is not a law firm and does not provide legal advice.
              </p>
              <p className="text-amber-700 text-sm">
                The information, materials, and tools provided on this platform are for educational 
                and practice purposes only. They do not constitute legal advice and should not be 
                relied upon as such. For legal guidance specific to your situation, please consult 
                with a qualified immigration attorney.
              </p>
            </div>
            <p className="text-slate-600">
              Using our service does not create an attorney-client relationship. We are not 
              responsible for any decisions you make based on information obtained through our platform.
            </p>
          </CardContent>
        </Card>

        {/* Payment Terms */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Payment Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              <strong>Subscriptions:</strong> We offer various subscription plans with different 
              features and pricing. By subscribing, you agree to pay the fees associated with your 
              selected plan.
            </p>
            <p className="text-slate-600">
              <strong>Billing:</strong> Subscription fees are billed in advance on a recurring basis 
              (monthly or annually, depending on your plan). You authorize us to charge your 
              payment method for these fees.
            </p>
            <p className="text-slate-600">
              <strong>Cancellation:</strong> You may cancel your subscription at any time. 
              Cancellation will take effect at the end of your current billing period. No refunds 
              will be provided for partial months, except as outlined in our Refund Policy.
            </p>
            <p className="text-slate-600">
              <strong>Price Changes:</strong> We reserve the right to modify our pricing. Any price 
              changes will be communicated to you in advance and will take effect on your next 
              billing cycle.
            </p>
          </CardContent>
        </Card>

        {/* Refund Policy */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-600" />
              Refund Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              We offer refunds under specific conditions outlined in our{' '}
              <a href="/refund-policy" className="text-blue-600 hover:underline">
                Refund Policy
              </a>.
              To be eligible for a refund, you must:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-600 ml-4">
              <li>Request a refund within 7 days of purchase</li>
              <li>Have completed fewer than 25 practice questions</li>
              <li>Have completed no more than 1 mock interview session</li>
            </ul>
            <p className="text-slate-600">
              Refund eligibility is automatically calculated based on your account activity. 
              We reserve the right to deny refund requests that do not meet these criteria.
            </p>
          </CardContent>
        </Card>

        {/* Limitation of Liability */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Limitation of Liability
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              To the maximum extent permitted by law, InterviewReady and its affiliates, officers, 
              employees, agents, and licensors shall not be liable for:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-600 ml-4">
              <li>Any indirect, incidental, special, consequential, or punitive damages</li>
              <li>Loss of profits, data, use, goodwill, or other intangible losses</li>
              <li>The outcome of your actual USCIS interview</li>
              <li>Any decisions made by immigration officials</li>
              <li>Any errors or omissions in our content</li>
            </ul>
            <p className="text-slate-600">
              Our total liability for any claims arising from or related to these terms shall not 
              exceed the amount you paid us in the 12 months preceding the claim.
            </p>
          </CardContent>
        </Card>

        {/* Account Termination */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Account Termination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              We reserve the right to suspend or terminate your account at any time for violations 
              of these terms, fraudulent activity, or any other reason at our sole discretion. 
              Upon termination, your right to use the service will immediately cease.
            </p>
          </CardContent>
        </Card>

        {/* Changes to Terms */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Changes to These Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              We may modify these terms at any time. We will notify you of significant changes 
              by posting the updated terms on our website and updating the "Last Updated" date. 
              Your continued use of the service after such changes constitutes acceptance of the 
              modified terms.
            </p>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardContent className="p-6">
            <p className="text-slate-600 text-center">
              If you have any questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:support@greencardprep.com" className="text-blue-600 hover:underline">
                support@greencardprep.com
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Last Updated */}
        <p className="text-center text-sm text-slate-500 mt-8">
          Last updated: March 2024
        </p>
      </main>
    </div>
  );
}
