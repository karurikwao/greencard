/**
 * Stripe Refund Integration
 */

import type { RefundRequest } from './types';

// Stripe API key from environment
const STRIPE_SECRET_KEY = import.meta.env.VITE_STRIPE_SECRET_KEY || '';

interface StripeRefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
}

/**
 * Process a refund through Stripe
 * Note: In production, this should be done via a secure backend/edge function
 */
export async function processStripeRefund(
  paymentIntentId: string,
  amount?: number // Optional: partial refund amount in cents
): Promise<StripeRefundResult> {
  try {
    // Check if we're in a browser environment with limited Stripe access
    if (typeof window !== 'undefined' && !STRIPE_SECRET_KEY) {
      console.warn('Stripe refund must be processed server-side');
      return { 
        success: false, 
        error: 'Stripe refunds must be processed server-side for security' 
      };
    }

    const refundData: {
      payment_intent: string;
      amount?: number;
    } = {
      payment_intent: paymentIntentId,
    };

    if (amount) {
      refundData.amount = amount;
    }

    const response = await fetch('https://api.stripe.com/v1/refunds', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(refundData as unknown as Record<string, string>),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { 
        success: false, 
        error: errorData.error?.message || 'Failed to process refund' 
      };
    }

    const data = await response.json();
    return { success: true, refundId: data.id };
  } catch (err) {
    console.error('Error processing Stripe refund:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

/**
 * Record a Stripe refund in the database
 * This is called after the refund is processed via server-side function
 */
export async function recordStripeRefund(
  refundRequestId: string,
  stripeRefundId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // This should be handled by the server-side function
    // that processes the refund
    const { supabase } = await import('@/lib/supabase');
    
    const { error } = await supabase
      .from('refund_requests')
      .update({
        stripeRefundId: stripeRefundId,
        refunded_at: new Date().toISOString(),
        eligibilityStatus: 'refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', refundRequestId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

/**
 * Check if a refund can be processed for a given request
 */
export function canProcessRefund(request: RefundRequest): {
  canRefund: boolean;
  reason?: string;
} {
  if (request.eligibilityStatus === 'refunded') {
    return { canRefund: false, reason: 'Already refunded' };
  }

  if (!request.stripePaymentIntentId) {
    return { canRefund: false, reason: 'No payment intent ID found' };
  }

  if (request.eligibilityStatus === 'denied') {
    return { canRefund: false, reason: 'Refund request was denied' };
  }

  return { canRefund: true };
}
