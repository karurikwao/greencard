/**
 * Support Ticket Panel
 * Allows users to view and create support tickets
 */

import { useState, useEffect } from 'react';
import { AlertCircle, Bot, HelpCircle, Plus, MessageSquare, Clock, CheckCircle, Send, Sparkles, RefreshCw, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RichMessageContent } from '@/components/messages/RichMessageContent';
import { cn } from '@/lib/utils';
import type { SupportTicket, TicketCategory, TicketStatus, UserNotification } from '@/lib/notifications';
import { TICKET_CATEGORIES, TICKET_STATUS_LABELS } from '@/lib/notifications';
import { getUserNotifications, getUserTickets, createSupportTicket, supportAiAssist, replyToSupportTicket } from '@/lib/notifications/api';
import type { SupportAiAssistResponse } from '@/lib/notifications';


interface SupportTicketPanelProps {
  className?: string;
}

const statusColors: Record<TicketStatus, string> = {
  open: 'bg-amber-100 text-amber-700 border-amber-200',
  replied: 'bg-blue-100 text-blue-700 border-blue-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
};

const statusIcons: Record<TicketStatus, typeof Clock> = {
  open: Clock,
  replied: MessageSquare,
  closed: CheckCircle,
};

export function SupportTicketPanel({ className }: SupportTicketPanelProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: '' as TicketCategory | '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiAssisting, setIsAiAssisting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiAssist, setAiAssist] = useState<SupportAiAssistResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [messageFallbacks, setMessageFallbacks] = useState<UserNotification[]>([]);
  const [ticketReply, setTicketReply] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);


  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setIsLoading(true);
    const [result, notificationResult] = await Promise.all([
      getUserTickets(),
      getUserNotifications(),
    ]);

    if (notificationResult.success && notificationResult.data) {
      setMessageFallbacks(notificationResult.data.filter(notification => {
        const haystack = `${notification.title} ${notification.message}`.toLowerCase();
        return notification.type === 'support'
          || notification.type === 'refund'
          || haystack.includes('ticket')
          || haystack.includes('refund');
      }).slice(0, 6));
    }

    if (result.success && result.data) {
      setTickets(result.data);
      setLoadError(null);
    } else if (result.error) {
      setLoadError(result.error);
    }
    setIsLoading(false);
  };

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.category || !newTicket.message.trim()) {
      return;
    }

    setIsSubmitting(true);
    const result = await createSupportTicket({
      subject: newTicket.subject,
      category: newTicket.category,
      message: newTicket.message,
      aiSummary: aiAssist?.summary,
      aiSuggestedReply: aiAssist?.reply,
      aiTriage: aiAssist ? {
        urgency: aiAssist.urgency,
        provider: aiAssist.provider,
        model: aiAssist.model,
        recommendedCategory: aiAssist.recommendedCategory,
        shouldCreateTicket: aiAssist.shouldCreateTicket,
        canResolve: aiAssist.canResolve,
        needsAdminReview: aiAssist.needsAdminReview,
        escalationReason: aiAssist.escalationReason,
        fallback: aiAssist.fallback || false,
      } : undefined,
    });

    if (result.success) {
      if (result.data) {
        setTickets(prev => [result.data!, ...prev.filter(ticket => ticket.id !== result.data!.id)]);
      }
      setNewTicket({ subject: '', category: '', message: '' });
      setAiAssist(null);
      setAiError(null);
      setIsCreateDialogOpen(false);
      window.dispatchEvent(new CustomEvent('dashboard-messages-refresh'));
      void loadTickets();
    } else if (result.error) {
      setAiError(result.error);
    }
    setIsSubmitting(false);
  };

  const handleAiAssist = async () => {
    if (!newTicket.subject.trim() && !newTicket.message.trim()) {
      setAiError('Add a subject or message first.');
      return;
    }

    setIsAiAssisting(true);
    setAiError(null);
    const result = await supportAiAssist({
      subject: newTicket.subject,
      category: newTicket.category || 'other',
      message: newTicket.message,
    });

    if (result.success && result.data) {
      setAiAssist(result.data);
      if (!newTicket.subject.trim() && result.data.suggestedTicketSubject) {
        setNewTicket(prev => ({ ...prev, subject: result.data!.suggestedTicketSubject }));
      }
      if (!newTicket.category && result.data.recommendedCategory) {
        setNewTicket(prev => ({ ...prev, category: result.data!.recommendedCategory }));
      }
    } else {
      const errorMessage = result.error || 'AI support is temporarily unavailable.';
      setAiError(
        errorMessage.toLowerCase().includes('authentication')
          ? 'Please sign in to save and submit a support ticket. You can still describe the issue here before signing in.'
          : errorMessage
      );
    }
    setIsAiAssisting(false);
  };

  const appendAiContext = () => {
    if (!aiAssist?.reply) return;
    setNewTicket(prev => ({
      ...prev,
      message: `${prev.message.trim()}\n\nAI support notes:\n${aiAssist.reply}`.trim(),
    }));
  };

  const openTicketDetails = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setTicketReply('');
    setReplyError(null);
  };

  const handleTicketReply = async () => {
    if (!selectedTicket || !ticketReply.trim()) return;

    setIsReplying(true);
    setReplyError(null);
    const result = await replyToSupportTicket(selectedTicket.id, ticketReply.trim());

    if (result.success && result.data) {
      setTickets(prev => prev.map(ticket => ticket.id === result.data!.id ? result.data! : ticket));
      setSelectedTicket(result.data);
      setTicketReply('');
      window.dispatchEvent(new CustomEvent('dashboard-messages-refresh'));
    } else {
      setReplyError(result.error || 'Unable to send your reply.');
    }
    setIsReplying(false);
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
    <Card className={cn('overflow-hidden border-2 border-amber-200 bg-gradient-to-br from-white via-amber-50/80 to-sky-50/80 shadow-lg shadow-amber-100/60', className)}>
      <CardHeader className="flex flex-row items-center justify-between border-b border-amber-200/70 bg-gradient-to-r from-amber-100/90 via-white to-sky-100/90 pb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-white p-2 text-amber-700 shadow-sm ring-1 ring-amber-200">
            <HelpCircle className="h-5 w-5" />
          </div>
          <CardTitle className="text-lg text-slate-950">Support Tickets</CardTitle>
          {tickets.filter(t => t.status === 'open').length > 0 && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              {tickets.filter(t => t.status === 'open').length} open
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadTickets}
            className="border-amber-200 bg-white font-bold text-amber-800 hover:bg-amber-50"
          >
            <RefreshCw className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              setAiAssist(null);
              setAiError(null);
            }
          }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-to-r from-blue-700 to-cyan-600 text-white shadow-md shadow-blue-200 hover:from-blue-800 hover:to-cyan-700">
              <Plus className="w-4 h-4 mr-1" />
              New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="top-4 max-h-[calc(100dvh-2rem)] translate-y-0 overflow-y-auto border-2 border-blue-200 bg-gradient-to-br from-white via-blue-50/95 to-emerald-50/80 p-0 shadow-2xl shadow-blue-200/70 sm:max-w-[560px]">
            <div className="h-1.5 bg-gradient-to-r from-blue-700 via-cyan-500 to-emerald-500" />
            <DialogHeader className="px-6 pb-2 pt-6">
              <DialogTitle className="text-xl font-semibold text-slate-950">Create Support Ticket</DialogTitle>
              <DialogDescription className="text-slate-700">
                Describe your issue and we'll help you as soon as possible.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 px-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="subject" className="font-semibold text-slate-900">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Brief description of your issue"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                  className="border-slate-300 bg-white text-slate-950 placeholder:text-slate-500 focus-visible:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="font-semibold text-slate-900">Category</Label>
                <Select
                  value={newTicket.category}
                  onValueChange={(value) => setNewTicket(prev => ({ ...prev, category: value as TicketCategory }))}
                >
                  <SelectTrigger id="category" className="border-slate-300 bg-white text-slate-950 focus:ring-blue-500">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message" className="font-semibold text-slate-900">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Please describe your issue in detail..."
                  rows={5}
                  value={newTicket.message}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, message: e.target.value }))}
                  className="border-slate-300 bg-white text-slate-950 placeholder:text-slate-500 focus-visible:ring-blue-500"
                />
              </div>
              <div className="space-y-3 rounded-xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-3 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-cyan-700" />
                    <span className="text-sm font-semibold text-slate-900">AI support assistant</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAiAssist}
                    disabled={isAiAssisting}
                  >
                    {isAiAssisting ? (
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin mr-2" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Get help
                  </Button>
                </div>
                {aiError && (
                  <div className="flex gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{aiError}</span>
                  </div>
                )}
                {aiAssist && (
                  <div className="space-y-3 rounded-md border border-blue-100 bg-white px-3 py-3">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{aiAssist.reply}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="capitalize">
                        {aiAssist.urgency} priority
                      </Badge>
                      {aiAssist.needsAdminReview && (
                        <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                          Admin review
                        </Badge>
                      )}
                      <Button type="button" variant="ghost" size="sm" onClick={appendAiContext}>
                        Add to ticket
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="sticky bottom-0 border-t border-blue-100 bg-white/95 px-6 py-4 backdrop-blur">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTicket} disabled={isSubmitting} className="bg-gradient-to-r from-blue-700 to-cyan-600 text-white shadow-md shadow-blue-200 hover:from-blue-800 hover:to-cyan-700">
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Ticket
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {loadError && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            Tickets are syncing. Refreshing usually resolves this shortly.
          </div>
        )}
        <ScrollArea className="h-[300px]">
          {tickets.length === 0 ? (
            messageFallbacks.length > 0 ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-amber-200 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-800">
                  Recent refund and support messages are shown here while the ticket thread syncs.
                </div>
                {messageFallbacks.map((message) => (
                  <div key={message.id} className="rounded-xl border border-amber-100 bg-white p-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-slate-950">{message.title}</p>
                        <p className="mt-1 line-clamp-3 text-sm font-medium text-slate-700">{message.message}</p>
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          {new Date(message.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-amber-300 bg-white/70 py-8 text-center text-slate-700">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-sky-200 text-slate-900 shadow-sm">
                  <HelpCircle className="h-7 w-7" />
                </div>
                <p className="font-semibold text-slate-950">No support tickets yet</p>
                <p className="text-sm text-slate-700">Need help? Create a ticket and we'll assist you</p>
              </div>
            )
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => {
                const StatusIcon = statusIcons[ticket.status];
                return (
                  <div
                    key={ticket.id}
                    className="flex gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                    onClick={() => openTicketDetails(ticket)}
                  >
                    <div className="flex-shrink-0">
                      <StatusIcon className={cn('w-5 h-5', {
                        'text-amber-500': ticket.status === 'open',
                        'text-blue-500': ticket.status === 'replied',
                        'text-slate-400': ticket.status === 'closed',
                      })} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm text-slate-900 truncate">
                          {ticket.subject}
                        </p>
                        <Badge variant="outline" className={cn('flex-shrink-0 text-xs', statusColors[ticket.status])}>
                          {TICKET_STATUS_LABELS[ticket.status]}
                        </Badge>
                        {ticket.adminUrgent && (
                          <Badge variant="outline" className="flex-shrink-0 border-rose-200 bg-rose-50 text-xs text-rose-700">
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                        {ticket.message}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span>{TICKET_CATEGORIES.find(c => c.value === ticket.category)?.label}</span>
                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="top-4 max-h-[calc(100dvh-2rem)] translate-y-0 overflow-y-auto border-2 border-blue-200 bg-gradient-to-br from-white via-blue-50/95 to-emerald-50/80 p-0 shadow-2xl shadow-blue-200/70 sm:max-w-[600px]">
          {selectedTicket && (
            <>
              <div className="h-1.5 bg-gradient-to-r from-blue-700 via-cyan-500 to-emerald-500" />
              <DialogHeader className="px-6 pb-2 pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle className="text-lg font-semibold text-slate-950">{selectedTicket.subject}</DialogTitle>
                    <DialogDescription className="mt-1 text-slate-700">
                      Ticket #{selectedTicket.id.slice(0, 8)} - {TICKET_CATEGORIES.find(c => c.value === selectedTicket.category)?.label}
                    </DialogDescription>
                  </div>
                  <Badge variant="outline" className={statusColors[selectedTicket.status]}>
                    {TICKET_STATUS_LABELS[selectedTicket.status]}
                  </Badge>
                  {selectedTicket.adminUrgent && (
                    <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                      Urgent admin review
                    </Badge>
                  )}
                </div>
              </DialogHeader>
              <div className="space-y-4 px-6 py-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedTicket.message}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    Submitted on {new Date(selectedTicket.createdAt).toLocaleString()}
                  </p>
                </div>

                {((selectedTicket.aiConversation?.length || 0) > 0 || selectedTicket.aiSuggestedReply) && (
                  <div className="space-y-3 rounded-xl border border-cyan-200 bg-white/80 p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-cyan-700" />
                      <span className="text-sm font-semibold text-slate-900">AI support conversation</span>
                    </div>
                    <div className="space-y-3">
                      {(selectedTicket.aiConversation?.length
                        ? selectedTicket.aiConversation
                        : [{ role: 'assistant' as const, content: selectedTicket.aiSuggestedReply || '', source: 'support_ai', createdAt: undefined }]
                      ).filter(item => item.content).map((item, index) => {
                        const isUser = item.role === 'user';
                        return (
                          <div key={`${item.role}-${index}-${item.createdAt || ''}`} className={cn(
                            'rounded-xl border p-3',
                            isUser
                              ? 'border-slate-200 bg-slate-50'
                              : 'border-cyan-100 bg-cyan-50/70'
                          )}>
                            <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
                              {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                              <span>{isUser ? 'You' : 'AI support assistant'}</span>
                            </div>
                            {isUser ? (
                              <p className="whitespace-pre-wrap text-sm text-slate-800">{item.content}</p>
                            ) : (
                              <RichMessageContent content={item.content} className="text-slate-800" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {selectedTicket.adminReply && (
                  <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Support Team Response</span>
                    </div>
                    <RichMessageContent content={selectedTicket.adminReply} className="text-slate-800" />
                    {selectedTicket.repliedAt && (
                      <p className="text-xs text-slate-400 mt-2">
                        Replied on {new Date(selectedTicket.repliedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {replyError && (
                  <div className="flex gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{replyError}</span>
                  </div>
                )}

                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <Label htmlFor="ticket-reply" className="font-semibold text-slate-900">Reply to AI support</Label>
                  <Textarea
                    id="ticket-reply"
                    placeholder="Add a follow-up question or share more details..."
                    rows={3}
                    value={ticketReply}
                    onChange={(event) => setTicketReply(event.target.value)}
                    className="border-slate-300 bg-white text-slate-950 placeholder:text-slate-500 focus-visible:ring-blue-500"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={handleTicketReply}
                      disabled={isReplying || !ticketReply.trim()}
                      className="bg-gradient-to-r from-blue-700 to-cyan-600 text-white shadow-md shadow-blue-200 hover:from-blue-800 hover:to-cyan-700"
                    >
                      {isReplying ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send Reply
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter className="sticky bottom-0 border-t border-blue-100 bg-white/95 px-6 py-4 backdrop-blur">
                <Button variant="outline" onClick={() => setSelectedTicket(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
