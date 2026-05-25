/**
 * Refund Request Button
 * Button to initiate refund request flow from the dashboard
 */

import { useState } from 'react';
import { RefreshCcw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RefundRequestButtonProps {
  onRequestRefund: () => void;
  disabled?: boolean;
}

export function RefundRequestButton({
  onRequestRefund,
  disabled = false,
}: RefundRequestButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirm = () => {
    setShowConfirm(false);
    onRequestRefund();
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowConfirm(true)}
        disabled={disabled}
        className="text-slate-600"
      >
        <RefreshCcw className="w-4 h-4 mr-2" />
        Request Refund
      </Button>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Request a Refund
            </DialogTitle>
            <DialogDescription className="space-y-3">
              <p>
                We're sorry to see you go. Before you request a refund:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                <li>Refunds must be requested within 7 days of purchase</li>
                <li>You must have completed fewer than 25 questions</li>
                <li>You must have completed no more than 1 mock interview</li>
              </ul>
              <p className="text-sm text-slate-600">
                Would you like to continue with your refund request?
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowConfirm(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
