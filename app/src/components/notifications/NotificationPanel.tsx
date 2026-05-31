/**
 * Notification Panel
 * Shows user notifications in the dashboard
 */

import { useState, useEffect } from 'react';
import { Bell, Check, X, MessageSquare, CreditCard, Gift, Trophy, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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

export function NotificationPanel({ className }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

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

  return (
    <Card className={cn('overflow-hidden border-2 border-emerald-200 bg-gradient-to-br from-white via-emerald-50/80 to-cyan-50/70 shadow-lg shadow-emerald-100/60', className)}>
      <CardHeader className="flex flex-row items-center justify-between border-b border-emerald-200/70 bg-gradient-to-r from-emerald-100/90 via-white to-cyan-100/90 pb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-white p-2 text-emerald-700 shadow-sm ring-1 ring-emerald-200">
            <Bell className="h-5 w-5" />
          </div>
          <CardTitle className="text-lg text-slate-950">Notifications</CardTitle>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
            <Check className="w-4 h-4 mr-1" />
            Mark all read
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        <ScrollArea className="h-[300px]">
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
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex gap-3 rounded-xl border p-3 shadow-sm transition-colors',
                      notification.isRead
                        ? 'border-slate-200 bg-white/85'
                        : 'border-blue-200 bg-blue-50/80'
                    )}
                  >
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', typeColors[notification.type])}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('font-medium text-sm', !notification.isRead && 'text-slate-900')}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={() => handleMarkRead(notification.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      <RichMessageContent content={notification.message} className="mt-1 text-slate-700" />
                      <p className="text-xs text-slate-400 mt-2">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
