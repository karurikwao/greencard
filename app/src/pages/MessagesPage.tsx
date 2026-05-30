import { ArrowLeft, Bell, MessageSquare, ShieldCheck } from 'lucide-react';
import { NotificationPanel } from '@/components/notifications';
import { SupportTicketPanel } from '@/components/support';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOptionalAuth } from '@/lib/auth/AuthContext';

interface MessagesPageProps {
  onBack: () => void;
}

export function MessagesPage({ onBack }: MessagesPageProps) {
  const { isAuthenticated, user } = useOptionalAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-blue-50 pb-16 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-emerald-100 bg-white/95 shadow-sm shadow-emerald-100/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="text-blue-800 hover:bg-blue-50 hover:text-blue-950"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-emerald-700">Account messages</p>
              <h1 className="text-xl font-extrabold text-slate-950 sm:text-2xl">Messages & Support</h1>
            </div>
          </div>
          <Badge className="hidden border-0 bg-blue-100 px-3 py-1.5 text-blue-800 sm:inline-flex">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            {isAuthenticated ? user?.email || 'Signed in' : 'Sign in to save tickets'}
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <section className="overflow-hidden rounded-3xl border-2 border-emerald-200 bg-gradient-to-r from-white via-emerald-50 to-cyan-50 p-5 shadow-xl shadow-emerald-100/70">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-cyan-600 text-white shadow-lg shadow-emerald-200">
                <MessageSquare className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-slate-950">Your support inbox</h2>
                <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-700">
                  Notifications, support replies, refund updates, and admin messages live here so the dashboard stays clean.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => document.getElementById('support-tickets-tab')?.click()}
              className="bg-gradient-to-r from-blue-700 to-cyan-700 font-extrabold text-white shadow-lg shadow-blue-200 hover:from-blue-800 hover:to-cyan-800"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Send Support Ticket
            </Button>
          </div>
        </section>

        <Tabs defaultValue="inbox" className="space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-2xl border border-blue-100 bg-white p-2 shadow-sm sm:grid-cols-2">
            <TabsTrigger
              value="inbox"
              className="rounded-xl px-4 py-3 text-sm font-extrabold data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-cyan-600 data-[state=active]:text-white"
            >
              <Bell className="mr-2 h-4 w-4" />
              Inbox
            </TabsTrigger>
            <TabsTrigger
              id="support-tickets-tab"
              value="support"
              className="rounded-xl px-4 py-3 text-sm font-extrabold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-700 data-[state=active]:to-cyan-700 data-[state=active]:text-white"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Support Tickets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="mt-0">
            <NotificationPanel />
          </TabsContent>
          <TabsContent value="support" className="mt-0">
            <SupportTicketPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
