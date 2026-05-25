/**
* Notifications, Broadcasts, and Support Tickets API
*/

import { apiClient } from '@/lib/apiClient';
import type {
UserNotification,
BroadcastMessage,
CreateBroadcastInput,
SupportTicket,
AdminSupportTicket,
CreateTicketInput,
SupportAiAssistInput,
SupportAiAssistResponse,
} from './types';

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

function normalizeTicket(row: Record<string, unknown>): SupportTicket {
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

const { data, error } = await apiClient.rpc('create_support_ticket', {
userId: user.id,
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

// Fetch the created ticket
const { data: ticketData, error: fetchError } = await apiClient
.from('support_tickets')
.select('*')
.eq('id', data)
.single();

if (fetchError) {
return { success: false, error: fetchError.message };
}

return { success: true, data: normalizeTicket(ticketData as Record<string, unknown>) };
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
const { data, error } = await apiClient.rpc('get_open_tickets_for_admin', {});

if (error) {
console.error('Error fetching admin tickets:', error);
return { success: false, error: error.message };
}

return { success: true, data: data as AdminSupportTicket[] };
} catch (err) {
console.error('Error fetching admin tickets:', err);
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

const { error } = await apiClient.rpc('reply_to_support_ticket', {
ticketId,
adminUserId: user.id,
reply,
});

if (error) {
console.error('Error replying to ticket:', error);
return { success: false, error: error.message };
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
const { error } = await apiClient
.from('support_tickets')
.update({
status: 'closed',
closed_at: new Date().toISOString(),
updated_at: new Date().toISOString(),
})
.eq('id', ticketId);

if (error) {
console.error('Error closing ticket:', error);
return { success: false, error: error.message };
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
