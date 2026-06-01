/**
 * Notification Panel
 * Shows user notifications in the dashboard
 */

import { useState, useEffect } from 'react';
import { Bell, Check, ChevronRight, ExternalLink, MessageSquare, CreditCard, Gift, Trophy, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RichMessageContent } from '@/components/messages/RichMessageContent';
import { cn } from '@/lib/utils';
import type { UserNotification, NotificationType } from '@/lib/notifications';
import { getUserNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/notifications/api';

interface NotificationPanelProps {
  className?: string;
}

const typeIcons: Record<NotificationType, typeof Info> = {
  general: Info,
  refund: CreditCard,
  subscription: CreditCard,
  support: MessageSquare,
  milestone: Trophy,
  broadcast: Gift,
};

const typeColors: Record<NotificationType, string> = {
  general: 'bg-slate-100 text-slate-600',
  refund: 'bg-purple-100 text-purple-600',
  subscription: 'bg-blue-100 text-blue-600',
  support: 'bg-amber-100 text-amber-600',
  milestone: 'bg-emerald-100 text-emerald-600',
  broadcast: 'bg-rose-100 text-rose-600',
};

function getPreviewText(message: string) {
  return message
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatNotificationDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function NotificationPanel({ className }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState<UserNotification | null>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setIsLoading(true);
    const result = await getUserNotifications();
    if (result.success && result.data) {
      setNotifications(result.data);
      setUnreadCount(result.data.filter(n => !n.isRead).length);
    }
    setIsLoading(false);
  };

  const handleMarkRead = async (notificationId: string) => {
    const result = await markNotificationRead(notificationId);
    if (result.success) {
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
      window.dispatchEvent(new CustomEvent('dashboard-messages-refresh'));
    }
  };

  const handleOpenNotification = async (notification: UserNotification) => {
    setSelectedNotification(notification);
    if (notification.isRead) return;

    const result = await markNotificationRead(notification.id);
    if (result.success) {
      setNotifications(prev => prev.map(n =>
        n.id === notification.id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
      setSelectedNotification({ ...notification, isRead: true });
      window.dispatchEvent(new CustomEvent('dashboard-messages-refresh'));
    }
  };

  const handleMarkAllRead = async () => {
    const result = await markAllNotificationsRead();
    if (result.success) {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      window.dispatchEvent(new CustomEvent('dashboard-messages-refresh'));
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const SelectedIcon = selectedNotification ? typeIcons[selectedNotification.type] : Info;

  return (
    <>
      <Card className={cn('overflow-hidden border-2 border-emerald-200 bg-gradient-to-br from-white via-emerald-50/80 to-cyan-50/70 shadow-lg shadow-emerald-100/60', className)}>
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-emerald-200/70 bg-gradient-to-r from-emerald-100/90 via-white to-cyan-100/90 pb-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="rounded-xl bg-white p-2 text-emerald-700 shadow-sm ring-1 ring-emerald-200">
              <Bell className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg text-slate-950">Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-rose-600 text-white">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="shrink-0">
              <Check className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-4">
          <ScrollArea className="h-[min(68vh,520px)] pr-3">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-semibold text-slate-950">No notifications yet</p>
                <p className="text-sm text-slate-700">We'll notify you about important updates here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => {
                  const Icon = typeIcons[notification.type];
                  const preview = getPreviewText(notification.message);
                  return (
                    <button
                      type="button"
                      key={notification.id}
                      onClick={() => void handleOpenNotification(notification)}
                      className={cn(
                        'group flex w-full gap-3 rounded-xl border p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:shadow-md',
                        notification.isRead
                          ? 'border-slate-200 bg-white/85'
                          : 'border-blue-200 bg-blue-50/80'
                      )}
                    >
                      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', typeColors[notification.type])}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className={cn('line-clamp-1 text-sm font-extrabold', !notification.isRead ? 'text-slate-950' : 'text-slate-800')}>
                              {notification.title}
                            </p>
                            <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-slate-700">
                              {preview || 'Open message for details.'}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {!notification.isRead && (
                              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-rose-600" aria-label="Unread" />
                            )}
                            <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-700" />
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-slate-500">
                            {formatNotificationDate(notification.createdAt)}
                          </p>
                          {!notification.isRead && (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleMarkRead(notification.id);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  void handleMarkRead(notification.id);
                                }
                              }}
                              className="inline-flex items-center rounded-full bg-white px-2 py-1 text-xs font-extrabold text-blue-800 ring-1 ring-blue-100 hover:bg-blue-50"
                            >
                              <Check className="mr-1 h-3 w-3" />
                              Read
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedNotification)} onOpenChange={(open) => !open && setSelectedNotification(null)}>
        {selectedNotification && (
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <div className="flex items-start gap-3">
                <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', typeColors[selectedNotification.type])}>
                  <SelectedIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-xl font-extrabold text-slate-950">
                    {selectedNotification.title}
                  </DialogTitle>
                  <DialogDescription className="mt-1 font-medium text-slate-600">
                    {formatNotificationDate(selectedNotification.createdAt)}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <RichMessageContent content={selectedNotification.message} className="text-slate-800" />
            </div>

            {selectedNotification.actionUrl && (
              <div className="flex justify-end">
                <Button asChild className="bg-gradient-to-r from-blue-700 to-cyan-700 font-extrabold text-white">
                  <a href={selectedNotification.actionUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open link
                  </a>
                </Button>
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
