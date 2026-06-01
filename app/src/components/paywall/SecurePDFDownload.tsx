/**
 * Secure PDF Download Component
 * 
 * Wraps PDF download buttons/links with entitlement checking and secure delivery.
 * Only allows downloads for users with active premium subscriptions.
 * 
 * Uses signed URLs from Supabase Storage for secure delivery.
 * Premium PDFs are stored in a private bucket, not publicly accessible.
 * 
 * This component enforces PDF access control at both UI and server level.
 */

import { useState } from 'react';
import { Download, FileText, Lock, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useFeatureGate } from './FeatureGate';
import { UpgradePrompt } from './UpgradePrompt';
import { requestSecurePDFAccess, downloadPDFWithSignedUrl } from '@/lib/downloads/secureAccess';
import { cn } from '@/lib/utils';

interface SecurePDFDownloadProps {
  /** PDF file name (e.g., "Kitchen_Household_Interview_Practice_Questions.pdf") */
  pdfFileName: string;
  /** Display title for the PDF */
  pdfTitle: string;
  /** Optional topic ID for tracking */
  topicId?: string;
  /** Optional category ID for tracking */
  categoryId?: string;
  /** Download source for analytics */
  source?: 'topic_page' | 'practice_mode' | 'direct_link' | 'seo_page' | 'pdf_library';
  /** Visual variant */
  variant?: 'button' | 'link' | 'icon';
  /** Button size if variant is 'button' */
  size?: 'default' | 'sm' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Called when download is initiated (after entitlement check passes) */
  onDownload?: () => void;
  /** Called when user clicks but doesn't have access */
  onBlocked?: () => void;
  /** Whether to show label or just icon */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
}

const PDF_TERMS_STORAGE_KEY = 'spouse-interview-pdf-terms-accepted-v1';

function hasAcceptedPdfTerms() {
  try {
    return window.localStorage.getItem(PDF_TERMS_STORAGE_KEY) === 'accepted';
  } catch {
    return false;
  }
}

function savePdfTermsAccepted() {
  try {
    window.localStorage.setItem(PDF_TERMS_STORAGE_KEY, 'accepted');
  } catch {
    // The user can continue even if private browsing blocks local storage.
  }
}

/**
 * Secure PDF Download Button/Link
 * 
 * Checks Supabase entitlements before allowing download.
 * Uses signed URLs from private Supabase Storage bucket.
 * Shows upgrade prompt for non-premium users.
 */
export function SecurePDFDownload({
  pdfFileName,
  pdfTitle,
  topicId,
  categoryId,
  variant = 'button',
  size = 'default',
  className,
  onDownload,
  onBlocked,
  showLabel = true,
  label = 'Download PDF',
}: SecurePDFDownloadProps) {
  const { hasAccess, isLoading, currentPlan, reason } = useFeatureGate('pdfDownloads');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const startSecureDownload = async () => {
    // User has access - request secure download
    setIsDownloading(true);
    
    try {
      // Request signed URL from Edge Function
      const result = await requestSecurePDFAccess({
        fileKey: pdfFileName,
        topicId,
        categoryId,
      });

      if (!result.success) {
        if (result.requiresUpgrade) {
          setShowUpgrade(true);
        }
        return;
      }

      if (result.signedUrl) {
        // Download using signed URL
        downloadPDFWithSignedUrl(result.signedUrl, pdfFileName);
        onDownload?.();
      }
    } catch (err) {
      console.error('Error downloading PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClick = async () => {
    // If no access, show upgrade prompt
    if (!hasAccess) {
      onBlocked?.();
      setShowUpgrade(true);
      return;
    }

    if (!hasAcceptedPdfTerms()) {
      setTermsAccepted(false);
      setShowTerms(true);
      return;
    }

    await startSecureDownload();
  };

  const handleTermsContinue = async () => {
    if (!termsAccepted) return;
    savePdfTermsAccepted();
    setShowTerms(false);
    await startSecureDownload();
  };

  const termsDialog = (
    <Dialog open={showTerms} onOpenChange={setShowTerms}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <FileText className="h-5 w-5" />
          </div>
          <DialogTitle>Review PDF access terms</DialogTitle>
          <DialogDescription>
            These study files are practice materials for Spouse Interview members.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 text-sm leading-6 text-slate-700">
          <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3">
            <p className="font-semibold text-slate-950">Before opening {pdfTitle}</p>
            <p className="mt-1">
              Use these materials for personal interview practice only. Spouse Interview is not a law firm,
              does not provide legal advice, and does not replace help from a qualified immigration professional.
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
            <p className="font-semibold text-amber-950">Refund note</p>
            <p className="mt-1">
              Accessing or downloading premium PDF materials may affect refund review because digital resources
              become available immediately. Refund requests are reviewed under the posted policy and applicable law.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
            <Checkbox
              id={`pdf-terms-${pdfFileName}`}
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked === true)}
              className="mt-1"
            />
            <Label htmlFor={`pdf-terms-${pdfFileName}`} className="cursor-pointer text-sm font-medium leading-6 text-slate-800">
              I have read and understand these terms for accessing Spouse Interview PDF practice materials.
            </Label>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setShowTerms(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleTermsContinue}
            disabled={!termsAccepted || isDownloading}
            className="bg-gradient-to-r from-blue-700 to-cyan-700 font-extrabold text-white"
          >
            {isDownloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            Access PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Loading state
  if (isLoading) {
    if (variant === 'icon') {
      return <Loader2 className="w-4 h-4 animate-spin text-slate-400" />;
    }
    return (
      <Button 
        variant="outline" 
        size={size} 
        disabled 
        className={className}
      >
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Checking...
      </Button>
    );
  }

  // Locked state (no access)
  if (!hasAccess) {
    if (variant === 'icon') {
      return (
        <>
          <button
            onClick={() => setShowUpgrade(true)}
            className="premium-pdf-icon-cta p-2 rounded-lg transition-colors"
            title={reason || 'PDF downloads require a premium plan'}
          >
            <Lock className="w-4 h-4 text-white" />
          </button>
          <UpgradePrompt
            isOpen={showUpgrade}
            onClose={() => setShowUpgrade(false)}
            currentPlan={currentPlan}
            feature="pdfDownloads"
            context="pdf_locked"
          />
        </>
      );
    }

    if (variant === 'link') {
      return (
        <>
          <button
            onClick={() => setShowUpgrade(true)}
            className={cn(
              'premium-pdf-link-cta inline-flex items-center gap-2 font-extrabold',
              className
            )}
          >
            <Lock className="w-4 h-4" />
            {showLabel && 'Unlock 1,200+ Now'}
          </button>
          <UpgradePrompt
            isOpen={showUpgrade}
            onClose={() => setShowUpgrade(false)}
            currentPlan={currentPlan}
            feature="pdfDownloads"
            context="pdf_locked"
          />
        </>
      );
    }

    // Button variant (default)
    return (
      <>
        <Button
          variant="outline"
          size={size}
          onClick={() => setShowUpgrade(true)}
          className={cn('premium-pdf-cta border-amber-200 hover:border-amber-300', className)}
        >
          <Lock className="w-4 h-4 mr-2 text-white" />
          {showLabel && 'Unlock 1,200+ Now'}
        </Button>
        <UpgradePrompt
          isOpen={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          currentPlan={currentPlan}
          feature="pdfDownloads"
          context="pdf_locked"
        />
      </>
    );
  }

  // User has access - show download button
  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={handleClick}
          disabled={isDownloading}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          title={`Download ${pdfTitle}`}
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          ) : (
            <Download className="w-4 h-4 text-slate-600" />
          )}
        </button>
        {termsDialog}
      </>
    );
  }

  if (variant === 'link') {
    return (
      <>
        <button
          onClick={handleClick}
          disabled={isDownloading}
          className={cn(
            'inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium',
            className
          )}
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {showLabel && (isDownloading ? 'Downloading...' : label)}
        </button>
        {termsDialog}
      </>
    );
  }

  // Button variant (default)
  return (
    <>
      <Button
        variant="outline"
        size={size}
        onClick={handleClick}
        disabled={isDownloading}
        className={className}
      >
        {isDownloading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Download className="w-4 h-4 mr-2" />
        )}
        {showLabel && (isDownloading ? 'Downloading...' : label)}
      </Button>
      {termsDialog}
    </>
  );
}

export default SecurePDFDownload;
