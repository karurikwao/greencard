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
import { Download, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  source?: 'topic_page' | 'practice_mode' | 'direct_link' | 'seo_page';
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

  const handleClick = async () => {
    // If no access, show upgrade prompt
    if (!hasAccess) {
      onBlocked?.();
      setShowUpgrade(true);
      return;
    }

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
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title={reason || 'PDF downloads require a premium plan'}
          >
            <Lock className="w-4 h-4 text-amber-500" />
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
              'inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium',
              className
            )}
          >
            <Lock className="w-4 h-4" />
            {showLabel && 'Premium PDF'}
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
          className={cn('border-amber-200 hover:border-amber-300', className)}
        >
          <Lock className="w-4 h-4 mr-2 text-amber-500" />
          {showLabel && 'Premium PDF'}
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
    );
  }

  if (variant === 'link') {
    return (
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
    );
  }

  // Button variant (default)
  return (
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
  );
}

export default SecurePDFDownload;
