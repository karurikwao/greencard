import { getToken } from '@/lib/apiClient';

const API_URL = import.meta.env.VITE_API_URL || '';

export interface AdminUserSnapshot {
  id: string;
  email: string;
  joined_at: string;
  updated_at: string;
  display_name: string;
  role: 'user' | 'admin' | 'superadmin';
  is_active: boolean;
  plan_type: 'trial' | 'monthly' | 'lifetime' | 'interviewPass';
  subscription_status: string;
  provider?: string | null;
  provider_customer_id?: string | null;
  provider_subscription_id?: string | null;
  trial_ends_at?: string | null;
  current_period_ends_at?: string | null;
  ends_at?: string | null;
  total_downloads: number;
  unique_pdfs_downloaded: number;
  last_download_at?: string | null;
  total_tickets: number;
  open_tickets: number;
  last_ticket_at?: string | null;
  connected_partners: number;
  pending_partners: number;
}

export interface AdminUsersResponse {
  users: AdminUserSnapshot[];
  totals: {
    totalUsers: number;
    paidUsers: number;
    trialUsers: number;
    usersWithOpenTickets: number;
  };
}

export async function fetchAdminUsers(limit = 100): Promise<AdminUsersResponse> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/api/admin/users?limit=${limit}`, {
    method: 'GET',
    headers,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || response.statusText || 'Unable to load users');
  }

  return payload as AdminUsersResponse;
}

export async function sendAdminUserMessage(
  userId: string,
  input: { title: string; message: string; sendEmail?: boolean }
): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/api/admin/users/${userId}/message`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || response.statusText || 'Unable to send user message');
  }
}
