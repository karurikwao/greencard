/**
 * Support Ticket Panel
 * Allows users to view and create support tickets
 */

import { useState, useEffect } from 'react';
import { AlertCircle, Bot, HelpCircle, Plus, MessageSquare, Clock, CheckCircle, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { SupportTicket, TicketCategory, TicketStatus } from '@/lib/notifications';
import { TICKET_CATEGORIES, TICKET_STATUS_LABELS } from '@/lib/notifications';
import { getUserTickets, createSupportTicket, supportAiAssist } from '@/lib/notifications/api';
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


  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setIsLoading(true);
    const result = await getUserTickets();
    if (result.success && result.data) {
      setTickets(result.data);
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
        recommendedCategory: aiAssist.recommendedCategory,
        fallback: aiAssist.fallback || false,
      } : undefined,
    });

    if (result.success) {
      setNewTicket({ subject: '', category: '', message: '' });
      setAiAssist(null);
      setAiError(null);
      setIsCreateDialogOpen(false);
      loadTickets();
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
      setAiError(result.error || 'AI support is temporarily unavailable.');
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
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">Support Tickets</CardTitle>
          {tickets.filter(t => t.status === 'open').length > 0 && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              {tickets.filter(t => t.status === 'open').length} open
            </Badge>
          )}
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            setAiAssist(null);
            setAiError(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
              <DialogDescription>
                Describe your issue and we'll help you as soon as possible.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Brief description of your issue"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newTicket.category}
                  onValueChange={(value) => setNewTicket(prev => ({ ...prev, category: value as TicketCategory }))}
                >
                  <SelectTrigger id="category">
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
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Please describe your issue in detail..."
                  rows={4}
                  value={newTicket.message}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, message: e.target.value }))}
                />
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-slate-600" />
                    <span className="text-sm font-medium text-slate-800">AI support assistant</span>
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
                      <Button type="button" variant="ghost" size="sm" onClick={appendAiContext}>
                        Add to ticket
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTicket} disabled={isSubmitting}>
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
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {tickets.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No support tickets yet</p>
              <p className="text-sm">Need help? Create a ticket and we'll assist you</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => {
                const StatusIcon = statusIcons[ticket.status];
                return (
                  <div
                    key={ticket.id}
                    className="flex gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                    onClick={() => setSelectedTicket(ticket)}
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
        <DialogContent className="sm:max-w-[550px]">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle className="text-lg">{selectedTicket.subject}</DialogTitle>
                    <DialogDescription className="mt-1">
                      Ticket #{selectedTicket.id.slice(0, 8)} - {TICKET_CATEGORIES.find(c => c.value === selectedTicket.category)?.label}
                    </DialogDescription>
                  </div>
                  <Badge variant="outline" className={statusColors[selectedTicket.status]}>
                    {TICKET_STATUS_LABELS[selectedTicket.status]}
                  </Badge>
                </div>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedTicket.message}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    Submitted on {new Date(selectedTicket.createdAt).toLocaleString()}
                  </p>
                </div>
                
                {selectedTicket.adminReply && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Support Team Response</span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedTicket.adminReply}</p>
                    {selectedTicket.repliedAt && (
                      <p className="text-xs text-slate-400 mt-2">
                        Replied on {new Date(selectedTicket.repliedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
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
