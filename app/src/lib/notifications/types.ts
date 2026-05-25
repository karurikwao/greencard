/**
 * Notifications, Broadcasts, and Support Tickets Types
 */

// ============================================================================
// Notifications
// ============================================================================

export type NotificationType = 'general' | 'refund' | 'subscription' | 'support' | 'milestone' | 'broadcast';

export interface UserNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Broadcasts
// ============================================================================

export type BroadcastAudience = 'all_users' | 'trial_users' | 'premium_users' | 'expired_users' | 'free_users';

export interface BroadcastMessage {
  id: string;
  title: string;
  message: string;
  audienceType: BroadcastAudience;
  isActive: boolean;
  sentCount: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBroadcastInput {
  title: string;
  message: string;
  audienceType: BroadcastAudience;
}

export const BROADCAST_AUDIENCE_LABELS: Record<BroadcastAudience, string> = {
  all_users: 'All Users',
  trial_users: 'Trial Users',
  premium_users: 'Premium Users',
  expired_users: 'Expired Subscriptions',
  free_users: 'Free Users',
};

// ============================================================================
// Support Tickets
// ============================================================================

export type TicketCategory = 'billing' | 'technical' | 'account' | 'feature_request' | 'other';
export type TicketStatus = 'open' | 'replied' | 'closed';

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  category: TicketCategory;
  message: string;
  status: TicketStatus;
  adminReply?: string;
  repliedBy?: string;
  repliedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSupportTicket extends SupportTicket {
  userEmail: string;
}

export interface CreateTicketInput {
  subject: string;
  category: TicketCategory;
  message: string;
}

export const TICKET_CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'billing', label: 'Billing Issue' },
  { value: 'technical', label: 'Technical Problem' },
  { value: 'account', label: 'Account Question' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'other', label: 'Other' },
];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  replied: 'Replied',
  closed: 'Closed',
};
