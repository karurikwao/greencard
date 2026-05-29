import { getToken } from '@/lib/apiClient';

const API_URL = import.meta.env.VITE_API_URL || '';

export type StripeMode = 'test' | 'live' | 'not_configured' | 'unknown';

export interface AdminProviderStatus {
  provider: string;
  label: string;
  configured: boolean;
  defaultModel: string;
  modelCount: number;
}

export interface AdminStripePriceStatus {
  planType: 'monthly' | 'lifetime' | 'interviewPass';
  label: string;
  configured: boolean;
  envVar: string;
  expectedAmount: number;
  currency: string;
  mode: 'subscription' | 'payment';
}

export interface AdminSystemStatus {
  serverTime: string;
  environment: string;
  frontendUrl: string;
  ai: {
    defaultProvider: string;
    defaultModel: string;
    providers: AdminProviderStatus[];
  };
  stripe: {
    mode: StripeMode;
    secretKeyConfigured: boolean;
    publishableKeyConfigured: boolean;
    webhookConfigured: boolean;
    autoCreateTestPrices: boolean;
    checkoutReady: boolean;
    webhookReady: boolean;
    prices: Record<'monthly' | 'lifetime' | 'interviewPass', AdminStripePriceStatus>;
  };
  database: {
    urlConfigured: boolean;
  };
  email: {
    provider: 'plunk' | 'dev';
    plunkConfigured: boolean;
    fromConfigured: boolean;
    fromAddress: string;
    apiUrl?: string;
  };
}

export async function fetchAdminSystemStatus(): Promise<AdminSystemStatus> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/api/admin/system-status`, {
    method: 'GET',
    headers,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || response.statusText || 'Unable to load admin system status');
  }

  return payload as AdminSystemStatus;
}
