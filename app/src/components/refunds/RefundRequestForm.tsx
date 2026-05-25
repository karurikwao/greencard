/**
 * Refund Request Form
 * Form for users to submit refund requests
 */

import { useState } from 'react';
import { ArrowLeft, Send, AlertCircle, CheckCircle, Clock, HelpCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { REFUND_REASONS, type RefundReason } from '@/lib/refunds';

interface RefundRequestFormProps {
  eligibility: {
    daysSincePurchase: number;
    questionsCompleted: number;
    mockInterviewsCompleted: number;
    isEligible: boolean;
    reason: string;
  };
  planName: string;
  amount: number;
  onSubmit: (reason: RefundReason, additionalComments: string) => Promise<void>;
  onBack: () => void;
}

export function RefundRequestForm({
  eligibility,
  planName,
  amount,
  onSubmit,
  onBack,
}: RefundRequestFormProps) {
  const [selectedReason, setSelectedReason] = useState<RefundReason>('' as RefundReason);
  const [additionalComments, setAdditionalComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);



  const handleSubmit = async () => {
    if (!selectedReason) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(selectedReason, additionalComments);
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50">
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
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                Refund Request Submitted
              </h2>
              <p className="text-slate-600 mb-6">
                We've received your refund request and will review it within 2-3 business days.
                You'll receive an email notification once a decision has been made.
              </p>
              <Button onClick={onBack}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

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
          <CardHeader>
            <CardTitle>Refund Request</CardTitle>
            <CardDescription>
              Please provide details about why you're requesting a refund.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Eligibility Status */}
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-slate-500" />
                <h3 className="font-medium text-slate-800">Eligibility Check</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">
                    {eligibility.daysSincePurchase} days since purchase
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">
                    {eligibility.questionsCompleted} questions completed
                  </span>
                </div>
              </div>

              {eligibility.isEligible ? (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Eligible for refund
                </Badge>
              ) : (
                <div className="space-y-2">
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    May not be eligible
                  </Badge>
                  <p className="text-xs text-slate-500">
                    {eligibility.reason}. You can still submit a request, but it may be denied.
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Refund Details */}
            <div className="flex justify-between items-center py-2">
              <div>
                <p className="text-sm text-slate-600">Plan</p>
                <p className="font-medium text-slate-800">{planName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">Refund Amount</p>
                <p className="font-medium text-slate-800">${amount.toFixed(2)}</p>
              </div>
            </div>

            <Separator />

            {/* Reason Selection */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for refund *</Label>
              <Select
                value={selectedReason}
                onValueChange={(value) => setSelectedReason(value as RefundReason)}
              >
                <SelectTrigger id="reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REFUND_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Additional Comments */}
            <div className="space-y-2">
              <Label htmlFor="comments">Additional comments (optional)</Label>
              <Textarea
                id="comments"
                placeholder="Please provide any additional details about your refund request..."
                value={additionalComments}
                onChange={(e) => setAdditionalComments(e.target.value)}
                rows={4}
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!selectedReason || isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Send className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Refund Request
                </>
              )}
            </Button>

            <Alert className="bg-slate-100 border-slate-200">
              <AlertDescription className="text-xs text-slate-600">
                Refund requests are typically reviewed within 2-3 business days. 
                If approved, refunds are processed within 5-10 business days to your original payment method.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
