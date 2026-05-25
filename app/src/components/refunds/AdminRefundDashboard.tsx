/**
 * Admin Refund Dashboard
 * Manage refund requests in the SuperAdmin portal
 */

import { useState, useEffect } from 'react';
import { 
  RefreshCcw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  DollarSign,
  Clock,
  User,
  Filter,
  CheckSquare,
  CreditCard,
  Loader2,
  RefreshCw,
  Download,
  FileText,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { RefundStatus } from '@/lib/refunds';
import { denyRefundRequest } from '@/lib/refunds/api';
import { processRefundViaEdgeFunction } from '@/lib/refunds/edge-function';
import type { AdminRefundRequestWithDownloads, DownloadReviewFlag } from '@/lib/downloads';
import { getRefundRequestsWithDownloads, DOWNLOAD_REVIEW_HELP_TEXT } from '@/lib/downloads';

export function AdminRefundDashboard() {
  const [refunds, setRefunds] = useState<AdminRefundRequestWithDownloads[]>([]);

  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<RefundStatus | 'all'>('all');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load refund requests on mount
  useEffect(() => {
    loadRefunds();
  }, []);

  const loadRefunds = async () => {
    setIsLoading(true);
    // Use the new function that includes download evidence
    const result = await getRefundRequestsWithDownloads();
    if (result.success && result.data) {
      setRefunds(result.data);
    } else {
      setNotification({ type: 'error', message: result.error || 'Failed to load refunds' });
    }
    setIsLoading(false);
  };

  const filteredRefunds = refunds.filter(r => 
    filter === 'all' || r.eligibilityStatus === (filter as string)
  );

  const stats = {
    total: refunds.length,
    eligible: refunds.filter(r => r.eligibilityStatus === ('eligible' as string)).length,
    notEligible: refunds.filter(r => r.eligibilityStatus === ('not_eligible' as string)).length,
    pending: refunds.filter(r => ['pending', 'eligible', 'not_eligible'].includes(r.eligibilityStatus as string)).length,
    refunded: refunds.filter(r => r.eligibilityStatus === ('refunded' as string)).length,
  };

  const handleApprove = async (refundId: string) => {
    setIsProcessing(true);
    setNotification(null);
    
    // Call the edge function to process the Stripe refund
    const result = await processRefundViaEdgeFunction(refundId, adminNotes);
    
    if (result.success) {
      // Update local state
      setRefunds(prev => prev.map(r => 
        r.refundId === refundId 
          ? { ...r, eligibilityStatus: 'refunded' as RefundStatus, stripeRefundId: result.refundId }
          : r
      ));

      setAdminNotes('');
      setNotification({ type: 'success', message: `Refund processed successfully${result.refundId ? ` (ID: ${result.refundId})` : ''}` });
    } else {
      setNotification({ type: 'error', message: result.message || 'Failed to process refund' });
    }
    
    setIsProcessing(false);
  };

  const handleDeny = async (refundId: string) => {
    if (!adminNotes.trim()) {
      setNotification({ type: 'error', message: 'Please provide a reason for denial' });
      return;
    }
    
    setIsProcessing(true);
    setNotification(null);
    
    // Update status via API
    const result = await denyRefundRequest(refundId, adminNotes);
    
    if (result.success) {
      setRefunds(prev => prev.map(r => 
        r.refundId === refundId 
          ? { ...r, eligibilityStatus: 'denied', adminNotes }
          : r
      ));

      setAdminNotes('');
      setNotification({ type: 'success', message: 'Refund denied' });
    } else {
      setNotification({ type: 'error', message: result.error || 'Failed to deny refund' });
    }
    
    setIsProcessing(false);
  };

  const handleApproveAllEligible = async () => {
    const eligibleRefunds = refunds.filter(r => r.eligibilityStatus === ('eligible' as string));
    if (eligibleRefunds.length === 0) return;
    
    if (!confirm(`Approve and refund all ${eligibleRefunds.length} eligible refunds? This will process actual Stripe refunds.`)) return;
    
    setIsProcessing(true);
    setNotification(null);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const refund of eligibleRefunds) {
      const result = await processRefundViaEdgeFunction(refund.refundId, 'Batch approval');
      if (result.success) {
        successCount++;
        setRefunds(prev => prev.map(r => 
          r.refundId === refund.refundId 
            ? { ...r, eligibilityStatus: 'refunded' as RefundStatus, stripeRefundId: result.refundId }
            : r
        ));
      } else {
        failCount++;
      }
    }
    
    setNotification({ 
      type: failCount === 0 ? 'success' : 'error', 
      message: `Processed ${successCount} refunds${failCount > 0 ? `, ${failCount} failed` : ''}` 
    });
    setIsProcessing(false);
  };

  const getStatusBadge = (status: RefundStatus) => {
    const styles: Record<RefundStatus, string> = {
      pending: 'bg-slate-100 text-slate-700',
      eligible: 'bg-emerald-100 text-emerald-700',
      not_eligible: 'bg-amber-100 text-amber-700',
      approved: 'bg-blue-100 text-blue-700',
      denied: 'bg-red-100 text-red-700',
      refunded: 'bg-purple-100 text-purple-700',
    };
    return <Badge className={styles[status]}>{status.replace('_', ' ')}</Badge>;
  };

  // Download status badge for refund review
  const DownloadStatusBadge = ({ flag }: { flag: DownloadReviewFlag }) => {
    const styles: Record<DownloadReviewFlag, string> = {
      no_downloads: 'bg-slate-100 text-slate-600 border-slate-200',
      downloaded_once: 'bg-blue-50 text-blue-600 border-blue-200',
      downloaded_multiple: 'bg-amber-50 text-amber-600 border-amber-200',
      heavy_usage: 'bg-rose-50 text-rose-600 border-rose-200',
    };
    
    const labels: Record<DownloadReviewFlag, string> = {
      no_downloads: 'No Downloads',
      downloaded_once: 'Downloaded Once',
      downloaded_multiple: 'Multiple Downloads',
      heavy_usage: 'Heavy Usage',
    };
    
    return (
      <Badge variant="outline" className={styles[flag]}>
        <FileText className="w-3 h-3 mr-1" />
        {labels[flag]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <Alert className={notification.type === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}>
          <AlertDescription className={notification.type === 'success' ? 'text-emerald-800' : 'text-red-800'}>
            {notification.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Eligible</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.eligible}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Not Eligible</p>
            <p className="text-2xl font-bold text-amber-600">{stats.notEligible}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Pending</p>
            <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Refunded</p>
            <p className="text-2xl font-bold text-purple-600">{stats.refunded}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-slate-100' : ''}
        >
          <Filter className="w-4 h-4 mr-2" />
          All
        </Button>
        <Button
          variant="outline"
          onClick={() => setFilter('eligible')}
          className={filter === 'eligible' ? 'bg-emerald-50' : ''}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Eligible
        </Button>
        <Button
          variant="outline"
          onClick={() => setFilter('not_eligible')}
          className={filter === 'not_eligible' ? 'bg-amber-50' : ''}
        >
          <AlertCircle className="w-4 h-4 mr-2" />
          Not Eligible
        </Button>
        <Button
          variant="outline"
          onClick={() => setFilter('refunded')}
          className={filter === 'refunded' ? 'bg-purple-50' : ''}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Refunded
        </Button>
        <Button
          variant="outline"
          onClick={loadRefunds}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
        <Button
          onClick={handleApproveAllEligible}
          disabled={stats.eligible === 0 || isProcessing}
          className="ml-auto bg-emerald-600 hover:bg-emerald-700"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckSquare className="w-4 h-4 mr-2" />
          )}
          Approve All Eligible ({stats.eligible})
        </Button>
      </div>

      {/* Refund List */}
      <Card>
        <CardHeader>
          <CardTitle>Refund Requests</CardTitle>
          <CardDescription>
            {filteredRefunds.length} requests ({filter === 'all' ? 'showing all' : filter.replace('_', ' ')})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRefunds.map((refund) => (
                <div
                  key={refund.refundId}
                  className="border rounded-lg p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{refund.userEmail}</span>
                        {getStatusBadge(refund.eligibilityStatus as RefundStatus)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />
                          {refund.planType}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${refund.amount.toFixed(2)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {refund.daysSincePurchase} days ago
                        </span>
                        {refund.totalPdfDownloads > 0 && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <Download className="w-3 h-3" />
                            {refund.totalPdfDownloads} PDF{refund.totalPdfDownloads !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500">
                        Questions: {refund.questionsCompleted} | 
                        Mock Interviews: {refund.mockInterviewsCompleted}
                      </div>
                      {refund.reason && (
                        <p className="text-sm text-slate-600 mt-2">
                          <strong>Reason:</strong> {refund.reason}
                        </p>
                      )}
                    </div>
                    
                    {['eligible', 'not_eligible', 'pending'].includes(refund.eligibilityStatus) && (
                      <Dialog>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Review Refund Request</DialogTitle>
                            <DialogDescription>
                              Review and process this refund request from {refund.userEmail}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-slate-500">Plan</p>
                                <p className="font-medium">{refund.planType}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Amount</p>
                                <p className="font-medium">${refund.amount.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Days Since Purchase</p>
                                <p className="font-medium">{refund.daysSincePurchase}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Eligibility</p>
                                <p className="font-medium">{getStatusBadge(refund.eligibilityStatus as RefundStatus)}</p>
                              </div>
                            </div>
                            
                            <Separator />
                            
                            <div>
                              <p className="text-slate-500 text-sm mb-1">Usage</p>
                              <p className="text-sm">
                                {refund.questionsCompleted} questions completed,{' '}
                                {refund.mockInterviewsCompleted} mock interviews
                              </p>
                            </div>
                            
                            {/* PDF Download Evidence Section */}
                            <div className="bg-slate-50 rounded-lg p-3 space-y-3">
                              <div className="flex items-center gap-2">
                                <Download className="w-4 h-4 text-slate-500" />
                                <p className="font-medium text-sm">PDF Download Activity</p>
                                <DownloadStatusBadge flag={refund.downloadReviewFlag} />
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-slate-500 text-xs">Total Downloads</p>
                                  <p className="font-medium">{refund.totalPdfDownloads}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500 text-xs">Unique PDFs</p>
                                  <p className="font-medium">{refund.uniquePdfsDownloaded}</p>
                                </div>
                                {refund.firstDownloadAt && (
                                  <div>
                                    <p className="text-slate-500 text-xs">First Download</p>
                                    <p className="font-medium">{new Date(refund.firstDownloadAt).toLocaleDateString()}</p>
                                  </div>
                                )}
                                {refund.lastDownloadAt && (
                                  <div>
                                    <p className="text-slate-500 text-xs">Last Download</p>
                                    <p className="font-medium">{new Date(refund.lastDownloadAt).toLocaleDateString()}</p>
                                  </div>
                                )}
                              </div>
                              
                              <p className="text-xs text-slate-600 bg-white p-2 rounded border">
                                {refund.downloadReviewNote}
                              </p>
                              
                              <p className="text-xs text-slate-400 flex items-center gap-1">
                                <Info className="w-3 h-3" />
                                {DOWNLOAD_REVIEW_HELP_TEXT.honestyNote}
                              </p>
                            </div>
                            
                            {refund.reason && (
                              <div>
                                <p className="text-slate-500 text-sm mb-1">Reason</p>
                                <p className="text-sm">{refund.reason}</p>
                              </div>
                            )}
                            
                            {refund.additionalComments && (
                              <div>
                                <p className="text-slate-500 text-sm mb-1">Additional Comments</p>
                                <p className="text-sm">{refund.additionalComments}</p>
                              </div>
                            )}
                            
                            <div className="space-y-2">
                              <Label htmlFor="admin-notes">Admin Notes</Label>
                              <Textarea
                                id="admin-notes"
                                placeholder="Add notes about this refund decision..."
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                              />
                            </div>
                          </div>
                          
                          <div className="flex gap-3">
                            <Button
                              variant="outline"
                              onClick={() => handleDeny(refund.refundId)}
                              disabled={isProcessing}
                              className="flex-1"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Deny
                            </Button>
                            <Button
                              onClick={() => handleApprove(refund.refundId)}
                              disabled={isProcessing}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                            >
                              {isProcessing ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4 mr-2" />
                              )}
                              Approve & Refund
                            </Button>
                          </div>
                        </DialogContent>
                        <Button
                          size="sm"
                          onClick={() => setAdminNotes('')}
                        >
                          Review
                        </Button>
                      </Dialog>
                    )}
                  </div>
                </div>
              ))}
              
              {filteredRefunds.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <RefreshCcw className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No refund requests found</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
