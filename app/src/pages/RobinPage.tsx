import { ArrowLeft, Bot, ShieldCheck } from 'lucide-react';
import { VirtualAgentPanel } from '@/components/dashboard/VirtualAgentPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOptionalAuth } from '@/lib/auth/AuthContext';

interface RobinPageProps {
  onBack: () => void;
}

export function RobinPage({ onBack }: RobinPageProps) {
  const { isAuthenticated, user } = useOptionalAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-cyan-50 pb-16 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-indigo-100 bg-white/95 shadow-sm shadow-indigo-100/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="text-indigo-800 hover:bg-indigo-50 hover:text-indigo-950"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-700 to-cyan-600 text-white shadow-lg shadow-indigo-200 sm:flex">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-indigo-700">Robin Practice</p>
                <h1 className="text-xl font-extrabold text-slate-950 sm:text-2xl">Chat with Robin</h1>
              </div>
            </div>
          </div>
          <Badge className="hidden border-0 bg-emerald-100 px-3 py-1.5 text-emerald-800 sm:inline-flex">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            {isAuthenticated ? user?.email || 'Signed in' : 'Sign in to save memory'}
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <section className="overflow-hidden rounded-3xl border-2 border-indigo-200 bg-gradient-to-r from-white via-indigo-50 to-cyan-50 p-5 shadow-xl shadow-indigo-100/70">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-950">Robin keeps your practice conversations organized</h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-700">
                Ask immigration interview questions, billing questions, and preparation questions in one dedicated chat area.
                Answers are grouped by date and indexed into your memory bank for later review.
              </p>
            </div>
          </div>
        </section>

        <VirtualAgentPanel mode="page" />
      </main>
    </div>
  );
}
