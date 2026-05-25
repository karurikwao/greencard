/**
* Secure PDF Access API
*
* Handles requesting signed URLs for premium PDF downloads.
* This ensures PDFs are only accessible after entitlement checks.
*/

import { apiClient } from '@/lib/apiClient';

export interface SecurePDFAccessRequest {
  fileKey: string;
  topicId?: string;
  categoryId?: string;
}

export interface SecurePDFAccessResult {
  success: boolean;
  signedUrl?: string;
  expiresIn?: number;
  error?: string;
  requiresUpgrade?: boolean;
}

/**
* Request a secure signed URL for PDF download
*
* This function:
* 1. Checks user entitlements server-side
* 2. Generates a time-limited signed URL if authorized
* 3. Records the download attempt for tracking
*
* @param request PDF access request
* @returns Secure access result with signed URL
*/
export async function requestSecurePDFAccess(
  request: SecurePDFAccessRequest
): Promise<SecurePDFAccessResult> {
  try {
    // Check if user is authenticated
    const { data: user } = await apiClient.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'Please sign up to download PDFs',
        requiresUpgrade: true,
      };
    }

    // Call the API to generate signed URL
    const { data, error } = await apiClient.invokeFunction<SecurePDFAccessResult>(
      'generate-pdf-signed-url',
      {
        fileKey: request.fileKey,
        topicId: request.topicId,
        categoryId: request.categoryId,
      }
    );

    if (error) {
      console.error('API error:', error);
      return {
        success: false,
        error: 'Failed to generate download link',
      };
    }

  if (data && !((data as unknown as Record<string, unknown>).success)) {
    const d = data as unknown as Record<string, unknown>;
    return {
      success: false,
      error: (d.error as string) || 'Access denied',
      requiresUpgrade: d.requiresUpgrade as boolean | undefined,
    };
  }

  if (data) {
    const d = data as unknown as Record<string, unknown>;
    return {
      success: true,
      signedUrl: d.signedUrl as string,
      expiresIn: d.expiresIn as number,
    };
  }

  return {
    success: false,
    error: 'No data returned',
  };

  } catch (err) {
    console.error('Error requesting secure PDF access:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
* Download PDF using signed URL
*
* @param signedUrl The signed URL from requestSecurePDFAccess
* @param fileName The filename for the download
*/
export function downloadPDFWithSignedUrl(signedUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = signedUrl;
  link.download = fileName;
  link.target = '_blank'; // Open in new tab if download fails
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
* Check if a file should use secure delivery
*
* Currently all PDFs in the premium-pdfs bucket require secure delivery.
* Public samples (if any) would be marked separately.
*/
export function requiresSecureDelivery(_fileKey: string): boolean {
  // All premium PDFs require secure delivery
  // This could be expanded to check a registry of public samples
  return true;
}
