/**
* Notifications, Broadcasts, and Support Tickets API
*/

import { apiClient, getToken } from '@/lib/apiClient';
import type {
UserNotification,
BroadcastMessage,
CreateBroadcastInput,
SupportTicket,
AdminSupportTicket,
CreateTicketInput,
SupportAiAssistInput,
SupportAiAssistResponse,
AdminSupportDraftResponse,
} from './types';

const API_URL = import.meta.env.VITE_API_URL || '';

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
const token = getToken();
const headers: Record<string, string> = { 'Content-Type': 'application/json' };
if (token) headers.Authorization = `Bearer ${token}`;

try {
const response = await fetch(`${API_URL}${path}`, {
method: 'POST',
headers,
body: JSON.stringify(body),
});
const payload = await response.json().catch(() => ({}));
if (!response.ok) {
return { data: null, error: payload.error || response.statusText || 'Request failed' };
}
return { data: payload as T, error: null };
} catch (err) {
return { data: null, error: err instanceof Error ? err.message : 'Network error' };
}
}

// ============================================================================
// Notifications API
// ============================================================================

/**
* Get user's notifications
*/
export async function getUserNotifications(): Promise<{
success: boolean;
data?: UserNotification[];
error?: string;
}> {
try {
const { data, error } = await apiClient
.from('user_notifications')
.select('*')
.order('created_at', { ascending: false });

if (error) {
console.error('Error fetching notifications:', error);
return { success: false, error: error.message };
}

return { success: true, data: data as UserNotification[] };
} catch (err) {
console.error('Error fetching notifications:', err);
return {
success: false,
error: err instanceof Error ? err.message : 'Unknown error',
};
}
}

/**
* Get unread notification count
*/
export async function getUnreadNotificationCount(): Promise<{
success: boolean;
count?: number;
error?: string;
}> {
try {
const { data, error } = await apiClient.rpc('get_unread_notification_count', {});

if (error) {
console.error('Error fetching unread count:', error);
return { success: false, error: error.message };
}

  return { success: true, count: (data as number) || 0 };
} catch (err) {
console.error('Error fetching unread count:', err);
return {
success: false,
error: err instanceof Error ? err.message : 'Unknown error',
};
}
}

/**
* Mark notification as read
*/
export async function markNotificationRead(
notificationId: string
): Promise<{ success: boolean; error?: string }> {
try {
const { error } = await apiClient.rpc('mark_notification_read', {
notificationId,
});

if (error) {
console.error('Error marking notification read:', error);
return { success: false, error: error.message };
}

return { success: true };
} catch (err) {
console.error('Error marking notification read:', err);
return {
success: false,
error: err instanceof Error ? err.message : 'Unknown error',
};
}
}

/**
* Mark all notifications as read
*/
export async function markAllNotificationsRead(): Promise<{
success: boolean;
error?: string;
}> {
try {
const { error } = await apiClient
.from('user_notifications')
.update({ is_read: true, updated_at: new Date().toISOString() })
.eq('is_read', false);

if (error) {
console.error('Error marking all notifications read:', error);
return { success: false, error: error.message };
}

return { success: true };
} catch (err) {
console.error('Error marking all notifications read:', err);
return {
success: false,
error: err instanceof Error ? err.message : 'Unknown error',
};
}
}

// ============================================================================
// Broadcasts API
// ============================================================================

/**
* Get all broadcast messages (admin only)
*/
export async function getBroadcastMessages(): Promise<{
success: boolean;
data?: BroadcastMessage[];
error?: string;
}> {
try {
const { data, error } = await apiClient
.from('broadcast_messages')
.select('*')
.order('created_at', { ascending: false });

if (error) {
console.error('Error fetching broadcasts:', error);
return { success: false, error: error.message };
}

return { success: true, data: data as BroadcastMessage[] };
} catch (err) {
console.error('Error fetching broadcasts:', err);
return {
success: false,
error: err instanceof Error ? err.message : 'Unknown error',
};
}
}

/**
* Create a new broadcast (admin only)
*/
export async function createBroadcast(
input: CreateBroadcastInput
): Promise<{ success: boolean; data?: BroadcastMessage; error?: string }> {
try {
const { data: user } = await apiClient.auth.getUser();
if (!user) {
return { success: false, error: 'Not authenticated' };
}

const { data, error } = await apiClient
.from('broadcast_messages')
.insert({
title: input.title,
message: input.message,
audience_type: input.audienceType,
created_by: user.id,
})
.single();

if (error) {
console.error('Error creating broadcast:', error);
return { success: false, error: error.message };
}

return { success: true, data: data as BroadcastMessage };
} catch (err) {
console.error('Error creating broadcast:', err);
return {
success: false,
error: err instanceof Error ? err.message : 'Unknown error',
};
}
}

/**
* Publish a broadcast to matching users (admin only)
*/
export async function publishBroadcast(
broadcastId: string
): Promise<{ success: boolean; sentCount?: number; error?: string }> {
try {
const { data, error } = await apiClient.rpc('publish_broadcast', {
broadcastId,
});

if (error) {
console.error('Error publishing broadcast:', error);
return { success: false, error: error.message };
}

  return { success: true, sentCount: (data as number) || 0 };
} catch (err) {
console.error('Error publishing broadcast:', err);
return {
success: false,
error: err instanceof Error ? err.message : 'Unknown error',
};
}
}

/**
* Toggle broadcast active status (admin only)
*/
export async function toggleBroadcastStatus(
broadcastId: string,
isActive: boolean
): Promise<{ success: boolean; error?: string }> {
try {
const { error } = await apiClient
.from('broadcast_messages')
.update({ is_active: isActive, updated_at: new Date().toISOString() })
.eq('id', broadcastId);

if (error) {
console.error('Error updating broadcast:', error);
return { success: false, error: error.message };
}

return { success: true };
} catch (err) {
console.error('Error updating broadcast:', err);
return {
success: false,
error: err instanceof Error ? err.message : 'Unknown error',
};
}
}

// ============================================================================
// Support Tickets API
// ============================================================================

function normalizeTicket(row: Record<string, unknown>): SupportTicket & Partial<AdminSupportTicket> {
return {
id: String(row.id || ''),
userId: String(row.userId || row.user_id || ''),
subject: String(row.subject || ''),
category: (row.category || 'other') as SupportTicket['category'],
message: String(row.message || ''),
status: (row.status || 'open') as SupportTicket['status'],
adminReply: (row.adminReply || row.admin_reply || undefined) as string | undefined,
aiSummary: (row.aiSummary || row.ai_summary || undefined) as string | undefined,
aiSuggestedReply: (row.aiSuggestedReply || row.ai_suggested_reply || undefined) as string | undefined,
aiTriage: (row.aiTriage || row.ai_triage || undefined) as Record<string, unknown> | undefined,
repliedBy: (row.repliedBy || row.replied_by || undefined) as string | undefined,
repliedAt: (row.repliedAt || row.replied_at || undefined) as string | undefined,
closedAt: (row.closedAt || row.closed_at || undefined) as string | undefined,
createdAt: String(row.createdAt || row.created_at || new Date().toISOString()),
updatedAt: String(row.updatedAt || row.updated_at || row.createdAt || row.created_at || new Date().toISOString()),
...(row.userEmail || row.user_email ? { userEmail: String(row.userEmail || row.user_email) } : {}),
...(row.refundSignal !== undefined || row.refund_signal !== undefined ? { refundSignal: Boolean(row.refundSignal ?? row.refund_signal) } : {}),
...(row.cancelSignal !== undefined || row.cancel_signal !== undefined ? { cancelSignal: Boolean(row.cancelSignal ?? row.cancel_signal) } : {}),
...(row.refundEligibility || row.refund_eligibility ? { refundEligibility: (row.refundEligibility || row.refund_eligibility) as AdminSupportTicket['refundEligibility'] } : {}),
...(row.retentionOffer || row.retention_offer ? { retentionOffer: (row.retentionOffer || row.retention_offer) as AdminSupportTicket['retentionOffer'] } : {}),
...(row.subscription ? { subscription: row.subscription as AdminSupportTicket['subscription'] } : {}),
...(row.usage ? { usage: row.usage as AdminSupportTicket['usage'] } : {}),
};
}

/**
* Create a new support ticket
*/
export async function createSupportTicket(
input: CreateTicketInput
): Promise<{ success: boolean; data?: SupportTicket; error?: string }> {
try {
const { data: user } = await apiClient.auth.getUser();
if (!user) {
return { success: false, error: 'Not authenticated' };
}

const { data, error } = await apiClient.invokeFunction<{ success: boolean; ticket?: Record<string, unknown> }>('create-support-ticket', {
subject: input.subject,
category: input.category,
message: input.message,
aiSummary: input.aiSummary || null,
aiSuggestedReply: input.aiSuggestedReply || null,
aiTriage: input.aiTriage || {},
});

if (error) {
console.error('Error creating ticket:', error);
return { success: false, error: error.message };
}

if (!data?.success || !data.ticket) {
return { success: false, error: 'Ticket was submitted but could not be loaded.' };
}

return { success: true, data: normalizeTicket(data.ticket) };
} catch (err) {
console.error('Error creating ticket:', err);
return {
success: false,
error: err instanceof Error ? err.message : 'Unknown error',
};
}
}

/**
* Get user's support tickets
*/
export async function getUserTickets(): Promise<{
success: boolean;
data?: SupportTicket[];
error?: string;
}> {
try {
const { data, error } = await apiClient.rpc('get_user_tickets_with_replies', {});

if (error) {
console.error('Error fetching tickets:', error);
return { success: false, error: error.message };
}

return { success: true, data: ((data as Record<string, unknown>[]) || []).map(normalizeTicket) };
} catch (err) {
console.error('Error fetching tickets:', err);
return {
success: false,
error: err instanceof Error ? err.message : 'Unknown error',
};
}
}

/**
* Ask the AI support assistant for quick help and ticket triage.
*/
export async function supportAiAssist(
input: SupportAiAssistInput
): Promise<{ success: boolean; data?: SupportAiAssistResponse; error?: string }> {
try {
const { data, error } = await apiClient.invokeFunction<SupportAiAssistResponse>('support-ai-assist', {
subject: input.subject || '',
category: input.category || 'other',
message: input.message || '',
});

if (error) {
return { success: false, error: error.message };
}

return { success: true, data: data as SupportAiAssistResponse };
} catch (err) {
console.error('Error asking support AI:', err);
return {
success: false,
error: err instanceof Error ? err.message : 'Unknown error',
};
}
}

/**
* Get open tickets for admin
*/
export async function getOpenTicketsForAdmin(): Promise<{
success: boolean;
data?: AdminSupportTicket[];
error?: string;
}> {
try {
const { data, error } = await apiClient.invokeFunction<{ tickets?: Record<string, unknown>[] }>('admin-support-tickets', {
status: 'active',
limit: 150,
});

if (error) {
console.error('Error fetching admin tickets:', error);
return { success: false, error: error.message };
}

return { success: true, data: ((data?.tickets || []) as Record<string, unknown>[]).map(normalizeTicket) as AdminSupportTicket[] };
} catch (err) {
console.error('Error fetching admin tickets:', err);
return {
success: false,
error: err instanceof Error ? err.message : 'Unknown error',
};
}
}

/**
* Ask the admin support copilot to draft a reply for a live ticket.
*/
export async function draftSupportTicketReply(
ticketId: string
): Promise<{ success: boolean; data?: AdminSupportDraftResponse; error?: string }> {
try {
const { data, error } = await apiClient.invokeFunction<AdminSupportDraftResponse>('admin-support-ticket-draft', {
ticketId,
});

if (error) {
return { success: false, error: error.message };
}

return { success: true, data: data as AdminSupportDraftResponse };
} catch (err) {
return {
success: false,
error: err instanceof Error ? err.message : 'Unknown error',
};
}
}

/**
* Reply to a support ticket (admin only)
*/
export async function replyToTicket(
ticketId: string,
reply: string
): Promise<{ success: boolean; error?: string }> {
try {
const { data: user } = await apiClient.auth.getUser();
if (!user) {
return { success: false, error: 'Not authenticated' };
}

const { error } = await postJson<{ success: boolean; ticket?: Record<string, unknown> }>(
`/api/admin/support/tickets/${ticketId}/reply`,
{ reply }
);

if (error) {
console.error('Error replying to ticket:', error);
return { success: false, error };
}

return { success: true };
} catch (err) {
console.error('Error replying to ticket:', err);
return {
success: false,
error: err instanceof Error ? err.message : 'Unknown error',
};
}
}

/**
* Close a support ticket (admin only)
*/
export async function closeTicket(
ticketId: string
): Promise<{ success: boolean; error?: string }> {
try {
const { error } = await postJson<{ success: boolean; ticket?: Record<string, unknown> }>(
`/api/admin/support/tickets/${ticketId}/close`,
{}
);

if (error) {
console.error('Error closing ticket:', error);
return { success: false, error };
}

return { success: true };
} catch (err) {
console.error('Error closing ticket:', err);
return {
success: false,
error: err instanceof Error ? err.message : 'Unknown error',
};
}
}
