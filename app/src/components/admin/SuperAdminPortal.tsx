/**
 * SuperAdmin Portal
 * Comprehensive admin dashboard for:
 * - User management
 * - Billing/subscription configuration
 * - Ad configuration
 * - AI API settings
 * - System analytics
 */

import { useEffect, useState } from 'react';
import { 
  Users, 
  CreditCard, 
  Settings, 
  BarChart3, 
  Shield, 
  DollarSign,
  Activity,
  Search,
  RefreshCw,
  Tag,
  TrendingUp,
  Plus,
  Trash2,
  Edit,
  Percent,
  Globe,
  Megaphone,
  MessageSquare,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  Sparkles,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
// import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOptionalAuth } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/utils';
import { SEOSettingsTab } from './SEOSettingsTab';
import { SEOExpansionTab } from './SEOExpansionTab';
import { AdminRefundDashboard } from '@/components/refunds';
import { PAID_PLANS } from '@/lib/plans';
import {
  fetchAdminAISettings,
  fetchAdminSystemStatus,
  fetchAdminWelcomeMessages,
  saveAdminAISettings,
  saveAdminWelcomeMessages,
  type AdminAISettings,
  type AdminProviderStatus,
  type AdminSystemStatus,
  type AdminWelcomeMessageSettings,
} from '@/lib/admin/systemStatus';
import { fetchAdminUsers, sendAdminUserMessage, type AdminUserSnapshot, type AdminUsersResponse } from '@/lib/admin/users';
import { fetchAdminMemoryStatus, type AdminMemoryStatus } from '@/lib/admin/memory';
import {
  closeTicket,
  createBroadcast,
  draftSupportTicketReply,
  getBroadcastMessages,
  getOpenTicketsForAdmin,
  publishBroadcast,
  replyToTicket,
  toggleBroadcastStatus,
} from '@/lib/notifications/api';
import type { AdminSupportTicket, BroadcastAudience, BroadcastMessage } from '@/lib/notifications';
import { BROADCAST_AUDIENCE_LABELS } from '@/lib/notifications';
import { RichMessageContent } from '@/components/messages/RichMessageContent';
import {
  getCandidateDetails,
  getCandidateStats,
  getPendingCandidates,
  updateCandidateReview,
  type AdminCandidateView,
  type CandidateStats,
} from '@/lib/answer-candidates/api';

interface SuperAdminPortalProps {
  onClose: () => void;
}

function useAdminSystemStatus() {
  const [status, setStatus] = useState<AdminSystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setStatus(await fetchAdminSystemStatus());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load system status');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { status, isLoading, error, refresh };
}

function useAdminMemoryStatus() {
  const [status, setStatus] = useState<AdminMemoryStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setStatus(await fetchAdminMemoryStatus());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load memory status');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { status, isLoading, error, refresh };
}

function formatCents(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function ConfigBadge({ configured, label }: { configured: boolean; label?: string }) {
  return (
    <Badge
      variant="outline"
      className={configured
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-amber-50 text-amber-700 border-amber-200'
      }
    >
      {configured ? (label || 'Configured') : 'Missing'}
    </Badge>
  );
}

function StatusLoadState({
  isLoading,
  error,
  onRefresh,
}: {
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Loading live configuration...
      </div>
    );
  }

  if (!error) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh}>Retry</Button>
    </div>
  );
}

export function SuperAdminPortal({ onClose }: SuperAdminPortalProps) {
  const { isAdmin, isSuperAdmin, user } = useOptionalAuth();
  const [activeTab, setActiveTab] = useState('overview');
  // Notification state - available for future use
  // const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Redirect if not an admin
  if (!isAdmin && !isSuperAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-slate-800 mb-2">Access Denied</h2>
            <p className="text-slate-500 mb-4">You need an admin role to access the admin portal.</p>
            <Button onClick={onClose} className="bg-slate-700 hover:bg-slate-800">
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 overflow-auto">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-slate-700" />
              <h1 className="text-xl font-medium text-slate-800">Admin Portal</h1>
              <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                {isSuperAdmin ? 'SuperAdmin' : 'Admin'}
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">{user?.email}</span>
              <Button variant="outline" size="sm" onClick={onClose}>
                Exit Admin
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notification alert - available for future use */}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-12 mb-8">
            <TabsTrigger value="overview" className="gap-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
            <TabsTrigger value="promocodes" className="gap-2">
              <Tag className="w-4 h-4" />
              <span className="hidden sm:inline">Promo Codes</span>
            </TabsTrigger>
            <TabsTrigger value="refunds" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refunds</span>
            </TabsTrigger>
            <TabsTrigger value="broadcasts" className="gap-2">
              <Megaphone className="w-4 h-4" />
              <span className="hidden sm:inline">Broadcasts</span>
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Support</span>
            </TabsTrigger>
            <TabsTrigger value="answers" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Answers</span>
            </TabsTrigger>
            <TabsTrigger value="seo" className="gap-2">
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">SEO</span>
            </TabsTrigger>
            <TabsTrigger value="seo-expansion" className="gap-2">
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">SEO Expansion</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">AI APIs</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">System</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          <TabsContent value="billing">
            <BillingTab />
          </TabsContent>

          <TabsContent value="promocodes">
            <PromoCodesTab />
          </TabsContent>

          <TabsContent value="refunds">
            <AdminRefundDashboard />
          </TabsContent>

          <TabsContent value="broadcasts">
            <BroadcastsTab />
          </TabsContent>

          <TabsContent value="support">
            <SupportTicketsTab />
          </TabsContent>

          <TabsContent value="answers">
            <AnswerExamplesTab />
          </TabsContent>

          <TabsContent value="seo">
            <SEOSettingsTab />
          </TabsContent>

          <TabsContent value="seo-expansion">
            <SEOExpansionTab />
          </TabsContent>

          <TabsContent value="ads">
            <AdsTab />
          </TabsContent>

          <TabsContent value="ai">
            <AIConfigTab />
          </TabsContent>

          <TabsContent value="system">
            <SystemTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Overview Tab
function OverviewTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value="0"
          change=""
          trend="up"
          icon={Users}
        />
        <StatCard
          title="Active Subscriptions"
          value="0"
          change=""
          trend="up"
          icon={CreditCard}
        />
        <StatCard
          title="Monthly Revenue"
          value="$0"
          change=""
          trend="up"
          icon={DollarSign}
        />
        <StatCard
          title="PDF Downloads"
          value="0"
          change=""
          trend="up"
          icon={Activity}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
              No admin activity yet.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <HealthItem name="Database" status="healthy" />
              <HealthItem name="Authentication" status="healthy" />
              <HealthItem name="AI API" status="healthy" />
              <HealthItem name="Storage" status="healthy" />
              <HealthItem name="Email Service" status="healthy" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Users Tab
function UsersTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [usersResponse, setUsersResponse] = useState<AdminUsersResponse | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userMessage, setUserMessage] = useState({ title: '', message: '', sendEmail: true });
  const [userMessageStatus, setUserMessageStatus] = useState<string | null>(null);
  const [isSendingUserMessage, setIsSendingUserMessage] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setUsersResponse(await fetchAdminUsers(150));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      setUserMessage({
        title: 'Message from InterviewReady support',
        message: '',
        sendEmail: true,
      });
      setUserMessageStatus(null);
    }
  }, [selectedUser]);

  const formatDate = (value?: string | null) => {
    if (!value) return 'Not set';
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  const filteredUsers = (usersResponse?.users ?? []).filter(user => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return [user.email, user.display_name, user.id, user.plan_type, user.subscription_status]
      .some(value => String(value || '').toLowerCase().includes(query));
  });

  const planBadgeClass = (planType: AdminUserSnapshot['plan_type']) => {
    if (planType === 'lifetime') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (planType === 'monthly' || planType === 'interviewPass') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const handleSendUserMessage = async () => {
    if (!selectedUser || !userMessage.title.trim() || !userMessage.message.trim()) return;
    setIsSendingUserMessage(true);
    setUserMessageStatus(null);
    try {
      await sendAdminUserMessage(selectedUser.id, userMessage);
      setUserMessageStatus('Message sent to dashboard inbox.');
      setUserMessage(prev => ({ ...prev, message: '' }));
      void loadUsers();
    } catch (err) {
      setUserMessageStatus(err instanceof Error ? err.message : 'Unable to send message');
    } finally {
      setIsSendingUserMessage(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={(usersResponse?.totals.totalUsers ?? 0).toLocaleString()} change="" trend="up" icon={Users} />
        <StatCard title="Paid Users" value={(usersResponse?.totals.paidUsers ?? 0).toLocaleString()} change="" trend="up" icon={CreditCard} />
        <StatCard title="Trial Users" value={(usersResponse?.totals.trialUsers ?? 0).toLocaleString()} change="" trend="up" icon={Activity} />
        <StatCard title="Need Help" value={(usersResponse?.totals.usersWithOpenTickets ?? 0).toLocaleString()} change="" trend="up" icon={MessageSquare} />
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
          <Button variant="outline" size="sm" onClick={loadUsers}>Retry</Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">User Management</CardTitle>
              <CardDescription>Live account, billing, PDF download, support, and spouse-sync snapshots.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" size="sm" onClick={loadUsers}>
                <RefreshCw className={cn('w-4 h-4 mr-1', isLoading && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-600">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No users match this search.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium text-slate-600">User</th>
                      <th className="text-left p-3 font-medium text-slate-600">Plan</th>
                      <th className="text-left p-3 font-medium text-slate-600">Dashboard Snapshot</th>
                      <th className="text-left p-3 font-medium text-slate-600">Joined</th>
                      <th className="text-left p-3 font-medium text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b last:border-0">
                        <td className="p-3">
                          <div>
                            <div className="font-medium text-slate-900">{user.display_name}</div>
                            <div className="text-xs text-slate-600">{user.email}</div>
                            <div className="text-xs text-slate-400">ID: {user.id.slice(0, 8)}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <Badge variant="outline" className={cn('capitalize', planBadgeClass(user.plan_type))}>
                              {user.plan_type}
                            </Badge>
                            <div className="text-xs text-slate-500 capitalize">{user.subscription_status.replace('_', ' ')}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{user.unique_pdfs_downloaded} PDFs</Badge>
                            <Badge variant="outline">{user.connected_partners} partner</Badge>
                            <Badge variant="outline" className={user.open_tickets ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}>
                              {user.open_tickets} open tickets
                            </Badge>
                          </div>
                        </td>
                        <td className="p-3 text-slate-600">{formatDate(user.joined_at)}</td>
                        <td className="p-3">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedUser(user)}>Assist</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>User Dashboard Snapshot</CardTitle>
                  <CardDescription>{selectedUser.email}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedUser(null)}>Close</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan</div>
                  <div className="mt-1 font-semibold text-slate-900 capitalize">{selectedUser.plan_type}</div>
                  <div className="text-xs text-slate-500 capitalize">{selectedUser.subscription_status.replace('_', ' ')}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">PDF Usage</div>
                  <div className="mt-1 font-semibold text-slate-900">{selectedUser.total_downloads} downloads</div>
                  <div className="text-xs text-slate-500">{selectedUser.unique_pdfs_downloaded} unique files</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Partner Sync</div>
                  <div className="mt-1 font-semibold text-slate-900">{selectedUser.connected_partners} connected</div>
                  <div className="text-xs text-slate-500">{selectedUser.pending_partners} pending</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="font-medium text-slate-900">Support</div>
                  <p className="mt-1 text-slate-600">
                    {selectedUser.open_tickets} open of {selectedUser.total_tickets} total tickets.
                    Last ticket: {formatDate(selectedUser.last_ticket_at)}.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="font-medium text-slate-900">Billing Assistance</div>
                  <p className="mt-1 text-slate-600">
                    Customer ID: {selectedUser.provider_customer_id || 'Not attached'}.
                    Access ends: {formatDate(selectedUser.current_period_ends_at || selectedUser.trial_ends_at || selectedUser.ends_at)}.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-4">
                <div className="mb-3">
                  <div className="font-extrabold text-slate-950">Send this user a dashboard message</div>
                  <p className="text-sm font-semibold text-slate-600">Supports plain text or safe HTML and can also email the user.</p>
                </div>
                <div className="space-y-3">
                  <Input
                    value={userMessage.title}
                    onChange={(event) => setUserMessage(prev => ({ ...prev, title: event.target.value }))}
                    placeholder="Message title"
                    className="bg-white font-semibold text-slate-950"
                  />
                  <textarea
                    value={userMessage.message}
                    onChange={(event) => setUserMessage(prev => ({ ...prev, message: event.target.value }))}
                    placeholder="Write the message or paste simple HTML with links..."
                    className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-950 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Switch
                        checked={userMessage.sendEmail}
                        onCheckedChange={(checked) => setUserMessage(prev => ({ ...prev, sendEmail: checked }))}
                      />
                      Email user too
                    </label>
                    <Button onClick={handleSendUserMessage} disabled={isSendingUserMessage || !userMessage.message.trim()} className="bg-gradient-to-r from-blue-700 to-cyan-700 text-white">
                      {isSendingUserMessage ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                      Send Message
                    </Button>
                  </div>
                  {userMessageStatus && <p className="text-sm font-bold text-emerald-700">{userMessageStatus}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Billing Tab
function BillingTab() {
  const { status, isLoading, error, refresh } = useAdminSystemStatus();

  return (
    <div className="space-y-6">
      <StatusLoadState isLoading={isLoading} error={error} onRefresh={refresh} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Subscription Plans</CardTitle>
              <CardDescription>Live app pricing and Stripe test price wiring.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {PAID_PLANS.map((plan) => {
              const price = status?.stripe.prices[plan.id as keyof AdminSystemStatus['stripe']['prices']];
              const amount = price ? formatCents(price.expectedAmount, price.currency) : ('price' in plan ? `$${plan.price}` : 'Paid');

              return (
              <div key={plan.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium text-slate-800">{plan.name}</div>
                  <div className="text-sm text-slate-600">{amount} {price?.mode === 'subscription' ? 'recurring monthly' : 'one-time'}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    PDFs, partner sync, Robin practice, provider/model choice
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <ConfigBadge configured={Boolean(price?.configured)} />
                  <span className="hidden sm:inline text-xs text-slate-500">{price?.envVar}</span>
                </div>
              </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stripe Test Mode Status</CardTitle>
          <CardDescription>Secrets are stored in Coolify environment variables and are never displayed here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mode</div>
              <div className="mt-2">
                <Badge className={status?.stripe.mode === 'test' ? 'bg-blue-600' : 'bg-slate-600'}>
                  {status?.stripe.mode || 'unknown'}
                </Badge>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Secret key</div>
              <div className="mt-2"><ConfigBadge configured={Boolean(status?.stripe.secretKeyConfigured)} /></div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Publishable key</div>
              <div className="mt-2"><ConfigBadge configured={Boolean(status?.stripe.publishableKeyConfigured)} /></div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Webhook</div>
              <div className="mt-2"><ConfigBadge configured={Boolean(status?.stripe.webhookConfigured)} /></div>
            </div>
          </div>

          {status?.stripe.autoCreateTestPrices && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              Test-mode price auto-creation is enabled. If explicit price IDs are missing, checkout will create or reuse
              Stripe test prices with fixed lookup keys for the three paid plans.
            </div>
          )}

          <div className={cn(
            'rounded-lg border p-4 text-sm',
            status?.stripe.checkoutReady
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          )}>
            <div className="font-medium">
              {status?.stripe.checkoutReady ? 'Checkout is ready.' : 'Checkout needs Stripe test configuration.'}
            </div>
            <p className="mt-1">
              Required env vars: STRIPE_SECRET_KEY plus STRIPE_PRICE_ID_MONTHLY, STRIPE_PRICE_ID_LIFETIME, and STRIPE_PRICE_ID_INTERVIEW_PASS.
              Webhooks also need STRIPE_WEBHOOK_SECRET to automatically move users from trial to paid after payment.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Promo Codes Tab
interface PromoCode {
  code: string;
  influencer_name: string;
  discount_percent: number;
  is_active: boolean;
  total_referrals: number;
  total_signups: number;
  total_purchases: number;
  total_paid_users: number;
}

function PromoCodesTab() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newInfluencer, setNewInfluencer] = useState('');
  const [newDiscount, setNewDiscount] = useState(10);

  const handleToggleActive = (code: string) => {
    setPromoCodes(codes => codes.map(c => 
      c.code === code ? { ...c, is_active: !c.is_active } : c
    ));
  };

  const handleAddCode = () => {
    if (newCode && newInfluencer) {
      setPromoCodes(codes => [...codes, {
        code: newCode.toUpperCase(),
        influencer_name: newInfluencer,
        discount_percent: newDiscount,
        is_active: true,
        total_referrals: 0,
        total_signups: 0,
        total_purchases: 0,
        total_paid_users: 0,
      }]);
      setNewCode('');
      setNewInfluencer('');
      setNewDiscount(10);
      setShowAddForm(false);
    }
  };

  const totalReferrals = promoCodes.reduce((sum, c) => sum + c.total_referrals, 0);
  const totalSignups = promoCodes.reduce((sum, c) => sum + c.total_signups, 0);
  const totalPurchases = promoCodes.reduce((sum, c) => sum + c.total_purchases, 0);
  const totalPaidUsers = promoCodes.reduce((sum, c) => sum + c.total_paid_users, 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Referrals"
          value={totalReferrals.toLocaleString()}
          change=""
          trend="up"
          icon={TrendingUp}
        />
        <StatCard
          title="Total Signups"
          value={totalSignups.toLocaleString()}
          change=""
          trend="up"
          icon={Users}
        />
        <StatCard
          title="Total Purchases"
          value={totalPurchases.toLocaleString()}
          change=""
          trend="up"
          icon={DollarSign}
        />
        <StatCard
          title="Paid Users"
          value={totalPaidUsers.toLocaleString()}
          change=""
          trend="up"
          icon={Activity}
        />
      </div>

      {/* Promo Codes List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Promo Codes</CardTitle>
              <CardDescription>Manage influencer promo codes and track performance</CardDescription>
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-slate-700 hover:bg-slate-800">
              <Plus className="w-4 h-4 mr-2" />
              Add Code
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Add New Code Form */}
          {showAddForm && (
            <div className="mb-6 p-4 border rounded-lg bg-slate-50 space-y-4">
              <h4 className="font-medium text-slate-700">Add New Promo Code</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input
                    placeholder="e.g., MARIA10"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Influencer Name</Label>
                  <Input
                    placeholder="e.g., Maria Garcia"
                    value={newInfluencer}
                    onChange={(e) => setNewInfluencer(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discount %</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={newDiscount}
                    onChange={(e) => setNewDiscount(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddCode} className="bg-slate-700 hover:bg-slate-800">
                  Create Code
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Codes Table */}
          <div className="border rounded-lg">
            {promoCodes.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Tag className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="font-medium">No promo codes yet</p>
                <p className="text-sm">Click "Add Code" to create your first promo code.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium text-slate-600">Code</th>
                    <th className="text-left p-3 font-medium text-slate-600">Influencer</th>
                    <th className="text-left p-3 font-medium text-slate-600">Discount</th>
                    <th className="text-left p-3 font-medium text-slate-600">Referrals</th>
                    <th className="text-left p-3 font-medium text-slate-600">Signups</th>
                    <th className="text-left p-3 font-medium text-slate-600">Purchases</th>
                    <th className="text-left p-3 font-medium text-slate-600">Paid Users</th>
                    <th className="text-left p-3 font-medium text-slate-600">Status</th>
                    <th className="text-left p-3 font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promoCodes.map((code) => (
                    <tr key={code.code} className="border-b last:border-0">
                      <td className="p-3">
                        <div className="font-medium text-slate-800">{code.code}</div>
                      </td>
                      <td className="p-3 text-slate-600">{code.influencer_name}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                          <Percent className="w-3 h-3 mr-1" />
                          {code.discount_percent}%
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-600">{code.total_referrals.toLocaleString()}</td>
                      <td className="p-3 text-slate-600">{code.total_signups.toLocaleString()}</td>
                      <td className="p-3 text-slate-600">{code.total_purchases.toLocaleString()}</td>
                      <td className="p-3 text-slate-600">{code.total_paid_users.toLocaleString()}</td>
                      <td className="p-3">
                        <Switch
                          checked={code.is_active}
                          onCheckedChange={() => handleToggleActive(code.code)}
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Referral URL Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Referral URL Examples</CardTitle>
          <CardDescription>Share these URLs with influencers. Both formats work identically.</CardDescription>
        </CardHeader>
        <CardContent>
          {promoCodes.filter(c => c.is_active).length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No active promo codes.</p>
              <p className="text-sm">Create a promo code to generate referral URLs.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {promoCodes.filter(c => c.is_active).slice(0, 3).map((code) => (
                <div key={code.code} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-slate-800">{code.influencer_name}</div>
                    <Badge variant="outline">{code.discount_percent}% off</Badge>
                  </div>
                  <div className="space-y-1">
                    <code className="text-sm text-slate-500 block">{`https://interviewready.com/?ref=${code.code}`}</code>
                    <code className="text-sm text-slate-500 block">{`https://interviewready.com/ref/${code.code}`}</code>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Ads Tab
function AdsTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ad Configuration</CardTitle>
          <CardDescription>Manage ad networks and display settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium text-slate-800">Enable Ads</div>
              <div className="text-sm text-slate-500">Show ads to free tier users</div>
            </div>
            <Switch defaultChecked />
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium text-slate-700">Ad Networks</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Google AdSense ID</Label>
                <Input placeholder="ca-pub-..." />
              </div>
              <div className="space-y-2">
                <Label>Ad Placement ID</Label>
                <Input placeholder="1234567890" />
              </div>
            </div>
          </div>

          <Button className="bg-slate-700 hover:bg-slate-800">Save Ad Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}

const COOLIFY_ENVIRONMENT_URL = import.meta.env.VITE_COOLIFY_ENVIRONMENT_URL
  || 'http://coolify.peterdowney.tech:8000/project/xfx4ad1mmeym1e2e70n91u4g/environment/o6s3zqos2c585okjqh3vpur0/application/stslm34sk12x83ih2fufqht5/environment-variables';

function buildProviderEnvLines(provider: AdminProviderStatus) {
  const lines: string[] = [];

  if (provider.apiKeyEnvVar) {
    lines.push(`${provider.apiKeyEnvVar}=<paste ${provider.label} API key here>`);
  }

  if (provider.baseUrlEnvVar) {
    lines.push(`${provider.baseUrlEnvVar}=${provider.baseUrl || 'https://your-openai-compatible-host/v1'}`);
  }

  if (provider.defaultModelEnvVar) {
    lines.push(`${provider.defaultModelEnvVar}=${provider.defaultModel || 'auto'}`);
  }

  lines.push(`AI_DEFAULT_PROVIDER=${provider.provider}`);
  lines.push('AI_FALLBACK_PROVIDERS=unified,nvidia,deepseek,anthropic,openai');

  return lines;
}

// AI Config Tab
function AIConfigTab() {
  const { status, isLoading, error, refresh } = useAdminSystemStatus();
  const memory = useAdminMemoryStatus();
  const [configureProvider, setConfigureProvider] = useState<AdminProviderStatus | null>(null);
  const [copyNotice, setCopyNotice] = useState('');
  const [aiSettings, setAiSettings] = useState<AdminAISettings | null>(null);
  const [welcomeSettings, setWelcomeSettings] = useState<AdminWelcomeMessageSettings | null>(null);
  const [settingsNotice, setSettingsNotice] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const envLines = configureProvider ? buildProviderEnvLines(configureProvider) : [];
  const openCoolifyEnv = () => window.open(COOLIFY_ENVIRONMENT_URL, '_blank', 'noopener,noreferrer');
  const copyEnvBlock = async () => {
    if (!configureProvider) return;
    await navigator.clipboard.writeText(envLines.join('\n'));
    setCopyNotice('Copied environment variable names.');
    window.setTimeout(() => setCopyNotice(''), 2500);
  };

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([fetchAdminAISettings(), fetchAdminWelcomeMessages()]).then((results) => {
      if (!mounted) return;
      const aiResult = results[0];
      const welcomeResult = results[1];
      if (aiResult.status === 'fulfilled') setAiSettings(aiResult.value);
      if (welcomeResult.status === 'fulfilled') setWelcomeSettings(welcomeResult.value);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (aiSettings || !status?.ai.settings) return;
    setAiSettings(status.ai.settings);
  }, [aiSettings, status]);

  const updateAIProviderSetting = (provider: string, patch: Partial<AdminAISettings['providers'][string]>) => {
    setAiSettings(prev => {
      const current = prev || {
        defaultProvider: status?.ai.defaultProvider || 'unified',
        defaultModel: status?.ai.defaultModel || 'auto',
        fallbackProviders: ['unified', 'nvidia', 'deepseek', 'anthropic', 'openai'],
        providers: {},
      };
      return {
        ...current,
        providers: {
          ...current.providers,
          [provider]: {
            ...(current.providers[provider] || {}),
            ...patch,
          },
        },
      };
    });
  };

  const saveAISettings = async () => {
    if (!aiSettings) return;
    setIsSavingSettings(true);
    setSettingsNotice('');
    try {
      const saved = await saveAdminAISettings(aiSettings);
      setAiSettings(saved);
      setSettingsNotice('AI routing settings saved. New Robin requests will use this configuration.');
      await refresh();
    } catch (err) {
      setSettingsNotice(err instanceof Error ? err.message : 'Unable to save AI settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const saveWelcomeSettings = async () => {
    if (!welcomeSettings) return;
    setIsSavingSettings(true);
    setSettingsNotice('');
    try {
      setWelcomeSettings(await saveAdminWelcomeMessages(welcomeSettings));
      setSettingsNotice('Automatic welcome and upgrade messages saved.');
    } catch (err) {
      setSettingsNotice(err instanceof Error ? err.message : 'Unable to save welcome messages');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      <StatusLoadState isLoading={isLoading} error={error} onRefresh={refresh} />

      <Card className="border-2 border-emerald-200 bg-gradient-to-br from-white via-emerald-50/70 to-cyan-50/80 shadow-lg shadow-emerald-100/60">
        <CardHeader>
          <CardTitle className="text-base">Editable LLM Routing</CardTitle>
          <CardDescription>Set Robin's live provider, model, fallback order, and API keys without opening Coolify.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {aiSettings && (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-900">Default provider</Label>
                  <select
                    value={aiSettings.defaultProvider || status?.ai.defaultProvider || 'unified'}
                    onChange={(event) => setAiSettings(prev => prev ? { ...prev, defaultProvider: event.target.value } : prev)}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950"
                  >
                    {(status?.ai.providers || []).map(provider => (
                      <option key={provider.provider} value={provider.provider}>{provider.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-900">Default model</Label>
                  <Input
                    value={aiSettings.defaultModel || status?.ai.defaultModel || 'auto'}
                    onChange={(event) => setAiSettings(prev => prev ? { ...prev, defaultModel: event.target.value } : prev)}
                    className="bg-white font-semibold text-slate-950"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-900">Fallback order</Label>
                  <Input
                    value={(aiSettings.fallbackProviders?.length ? aiSettings.fallbackProviders : ['unified', 'nvidia', 'deepseek', 'anthropic', 'openai']).join(', ')}
                    onChange={(event) => setAiSettings(prev => prev ? {
                      ...prev,
                      fallbackProviders: event.target.value.split(',').map(item => item.trim()).filter(Boolean),
                    } : prev)}
                    className="bg-white font-semibold text-slate-950"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {(status?.ai.providers || []).map(provider => {
                  const providerSetting = aiSettings.providers?.[provider.provider] || {};
                  return (
                    <div key={provider.provider} className="space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="font-extrabold text-slate-950">{provider.label}</h4>
                          <p className="text-xs font-semibold text-slate-600">{provider.openAICompatible ? 'OpenAI-compatible gateway' : 'Native provider'}</p>
                        </div>
                        <ConfigBadge configured={Boolean(provider.configured || providerSetting.apiKeyConfigured || providerSetting.apiKey)} />
                      </div>
                      {provider.openAICompatible && (
                        <Input
                          value={providerSetting.baseUrl ?? provider.baseUrl ?? ''}
                          onChange={(event) => updateAIProviderSetting(provider.provider, { baseUrl: event.target.value })}
                          placeholder="Base URL ending in /v1"
                          className="bg-white font-semibold text-slate-950"
                        />
                      )}
                      <Input
                        type="password"
                        value={providerSetting.apiKey || ''}
                        onChange={(event) => updateAIProviderSetting(provider.provider, {
                          apiKey: event.target.value,
                          keepExistingApiKey: !event.target.value && Boolean(providerSetting.apiKeyConfigured),
                        })}
                        placeholder={providerSetting.apiKeyConfigured ? `Existing key ${providerSetting.apiKeyMasked || 'saved'} - leave blank to keep` : 'Paste API key'}
                        className="bg-white font-semibold text-slate-950"
                      />
                      <Input
                        value={providerSetting.defaultModel ?? provider.defaultModel ?? ''}
                        onChange={(event) => updateAIProviderSetting(provider.provider, { defaultModel: event.target.value })}
                        placeholder="Default model"
                        className="bg-white font-semibold text-slate-950"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  Current live default: {status?.ai.defaultProvider || 'unknown'} / {status?.ai.defaultModel || 'unknown'}
                </p>
                <Button onClick={saveAISettings} disabled={isSavingSettings} className="bg-gradient-to-r from-emerald-700 to-cyan-700 text-white">
                  {isSavingSettings ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Save LLM Settings
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {welcomeSettings && (
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-white via-blue-50/70 to-amber-50/60 shadow-lg shadow-blue-100/60">
          <CardHeader>
            <CardTitle className="text-base">Automatic Dashboard Messages</CardTitle>
            <CardDescription>Send a welcome message after signup and an unlock message after upgrade.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-2xl border border-blue-100 bg-white/90 p-4">
                <label className="flex items-center justify-between gap-3 font-bold text-slate-900">
                  Signup welcome
                  <Switch checked={welcomeSettings.signupEnabled} onCheckedChange={(checked) => setWelcomeSettings(prev => prev ? { ...prev, signupEnabled: checked } : prev)} />
                </label>
                <Input value={welcomeSettings.signupTitle} onChange={(event) => setWelcomeSettings(prev => prev ? { ...prev, signupTitle: event.target.value } : prev)} className="font-semibold text-slate-950" />
                <textarea value={welcomeSettings.signupMessage} onChange={(event) => setWelcomeSettings(prev => prev ? { ...prev, signupMessage: event.target.value } : prev)} className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-950" />
              </div>
              <div className="space-y-3 rounded-2xl border border-amber-100 bg-white/90 p-4">
                <label className="flex items-center justify-between gap-3 font-bold text-slate-900">
                  Upgrade welcome
                  <Switch checked={welcomeSettings.upgradeEnabled} onCheckedChange={(checked) => setWelcomeSettings(prev => prev ? { ...prev, upgradeEnabled: checked } : prev)} />
                </label>
                <Input value={welcomeSettings.upgradeTitle} onChange={(event) => setWelcomeSettings(prev => prev ? { ...prev, upgradeTitle: event.target.value } : prev)} className="font-semibold text-slate-950" />
                <textarea value={welcomeSettings.upgradeMessage} onChange={(event) => setWelcomeSettings(prev => prev ? { ...prev, upgradeMessage: event.target.value } : prev)} className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-950" />
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Switch checked={welcomeSettings.sendEmail} onCheckedChange={(checked) => setWelcomeSettings(prev => prev ? { ...prev, sendEmail: checked } : prev)} />
                Also send email alerts
              </label>
              <Button onClick={saveWelcomeSettings} disabled={isSavingSettings} className="bg-gradient-to-r from-blue-700 to-cyan-700 text-white">
                Save Automatic Messages
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {settingsNotice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {settingsNotice}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">AI API Configuration</CardTitle>
              <CardDescription>Live provider status from server environment variables.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(status?.ai.providers || []).map((provider) => (
              <div
                key={provider.provider}
                className={cn(
                  'rounded-xl border p-4 shadow-sm',
                  provider.configured
                    ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50'
                    : 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-slate-50'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-slate-950">{provider.label}</h4>
                      {provider.openAICompatible && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          OpenAI-compatible
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 mt-1">{provider.defaultModel}</p>
                    {provider.baseUrl && (
                      <p className="mt-2 truncate text-xs text-slate-600" title={provider.baseUrl}>
                        Base URL: {provider.baseUrl}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <ConfigBadge configured={provider.configured} />
                    <Button
                      type="button"
                      size="sm"
                      variant={provider.configured ? 'outline' : 'default'}
                      onClick={() => {
                        setConfigureProvider(provider);
                        setCopyNotice('');
                      }}
                      className={cn(
                        'font-semibold',
                        !provider.configured && 'bg-blue-700 text-white hover:bg-blue-800'
                      )}
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Configure
                    </Button>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
                  <span>{provider.modelCount} models available</span>
                  <span>
                    {provider.configured
                        ? 'Enabled for Robin practice'
                      : provider.openAICompatible && !provider.baseUrlConfigured
                        ? 'Add key and base URL above'
                        : 'Add API key above'}
                  </span>
                </div>
                {(provider.apiKeyEnvVar || provider.baseUrlEnvVar || provider.defaultModelEnvVar) && (
                  <div className="mt-3 grid grid-cols-1 gap-1 rounded-lg bg-white/80 p-3 text-xs text-slate-700 ring-1 ring-slate-200">
                    {provider.apiKeyEnvVar && <span>Key: <span className="font-mono">{provider.apiKeyEnvVar}</span></span>}
                    {provider.baseUrlEnvVar && <span>Base URL: <span className="font-mono">{provider.baseUrlEnvVar}</span></span>}
                    {provider.defaultModelEnvVar && <span>Default model: <span className="font-mono">{provider.defaultModelEnvVar}</span></span>}
                  </div>
                )}
                {provider.configurationHint && (
                  <p className="mt-3 text-xs text-slate-600">{provider.configurationHint}</p>
                )}
              </div>
            ))}

            {!isLoading && !status?.ai.providers.length && (
              <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500 md:col-span-2">
                Provider status is unavailable.
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Default provider</div>
                <div className="mt-1 font-medium text-slate-800">{status?.ai.defaultProvider || 'Not loaded'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Default model</div>
                <div className="mt-1 font-medium text-slate-800">{status?.ai.defaultModel || 'Not loaded'}</div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-600 p-2 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-950">Add More LLM Gateways</h4>
                <p className="text-sm text-slate-700">
                  Use the editable routing panel above for Robin's live providers, models, keys, and fallback order.
                  Brand-new custom gateway types can still be registered with
                  <span className="font-mono"> AI_OPENAI_COMPATIBLE_PROVIDERS</span> when needed.
                </p>
                <div className="rounded-lg bg-white/85 p-3 text-xs text-slate-700 ring-1 ring-blue-100">
                  <div><span className="font-mono">AI_FALLBACK_PROVIDERS</span>: unified,nvidia,deepseek,anthropic,openai</div>
                  <div><span className="font-mono">AI_OPENAI_COMPATIBLE_PROVIDERS</span>: provider id, label, base URL env, key env, default model</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-slate-700">How settings are applied</h4>
            <p className="text-sm text-slate-600">
              Admin-saved routing settings override environment defaults immediately for new Robin requests.
              If a key, model, or base URL is left blank here, the server falls back to the matching runtime variable.
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!configureProvider} onOpenChange={(open) => !open && setConfigureProvider(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-950">
              Configure {configureProvider?.label}
            </DialogTitle>
            <DialogDescription className="text-slate-700">
              Use the Editable LLM Routing card for normal key and model changes. These environment variables remain available as a secure fallback.
            </DialogDescription>
          </DialogHeader>

          {configureProvider && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
                <div className="font-extrabold">Fallback environment setup</div>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>For day-to-day changes, edit this provider in the Editable LLM Routing card above.</li>
                  <li>If you prefer environment secrets, open this app in Coolify.</li>
                  <li>Go to <span className="font-semibold">Configuration</span> then <span className="font-semibold">Environment Variables</span>.</li>
                  <li>Add or update the variables below, make them available at runtime, save, then redeploy.</li>
                </ol>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-extrabold text-slate-950">Variables to set</div>
                    <div className="text-sm text-slate-600">Paste your real key in place of the placeholder.</div>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={copyEnvBlock}>
                    <Copy className="h-4 w-4" />
                    Copy block
                  </Button>
                </div>
                <div className="space-y-2">
                  {envLines.map((line) => (
                    <code
                      key={line}
                      className="block overflow-x-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-950"
                    >
                      {line}
                    </code>
                  ))}
                </div>
                {copyNotice && <div className="mt-3 text-sm font-semibold text-emerald-700">{copyNotice}</div>}
              </div>

              {configureProvider.openAICompatible && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                  <div className="font-extrabold">OpenAI-compatible gateway note</div>
                  <p className="mt-1">
                    For your unified LLM proxy, keep the base URL ending in <span className="font-mono font-bold">/v1</span>.
                    Use <span className="font-mono font-bold">auto</span> as the default model if the gateway routes models itself.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" onClick={openCoolifyEnv} className="bg-slate-950 text-white hover:bg-slate-800">
                  <ExternalLink className="h-4 w-4" />
                  Open Coolify Environment Variables
                </Button>
                <Button type="button" variant="outline" onClick={() => setConfigureProvider(null)}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage Limits</CardTitle>
          <CardDescription>Current plan limits used by the entitlement system.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(memory.status?.planLimits || []).map((plan) => (
            <div key={plan.plan_type} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <div>
                <div className="font-medium text-slate-800">{plan.name}</div>
                <div className="text-sm text-slate-500">
                  {plan.max_turns_per_session} daily Robin chats
                </div>
              </div>
              <Badge variant={plan.can_choose_provider ? 'default' : 'secondary'}>
                {plan.can_choose_provider ? 'Provider choice' : 'Default AI'}
              </Badge>
            </div>
          ))}
          {!memory.isLoading && !memory.status?.planLimits.length && (
            <div className="text-sm text-slate-500">Plan limits are unavailable.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Memory Bank and Indexing</CardTitle>
              <CardDescription>Live status for captured answers and expansion pages.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={memory.refresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <StatusLoadState isLoading={memory.isLoading} error={memory.error} onRefresh={memory.refresh} />
          {memory.status && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Captured answers</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">{memory.status.answerCandidates.total_candidates || 0}</div>
                  <div className="text-xs text-slate-500">{memory.status.answerCandidates.pending_review || 0} pending review</div>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Approved for public use</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">{memory.status.answerCandidates.approved_for_publication || 0}</div>
                  <div className="text-xs text-slate-500">{memory.status.answerCandidates.published_examples || 0} published examples</div>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expansion pages</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">{memory.status.seoExpansionPages.published_pages || 0}</div>
                  <div className="text-xs text-slate-500">{memory.status.seoExpansionPages.sitemap_pages || 0} in sitemap</div>
                </div>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                User answers are captured silently, sanitized, and queued for manual review. Original answers stay private unless an admin opens a candidate detail.
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// System Tab
function SystemTab() {
  const { status, isLoading, error, refresh } = useAdminSystemStatus();

  return (
    <div className="space-y-6">
      <StatusLoadState isLoading={isLoading} error={error} onRefresh={refresh} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Production Configuration</CardTitle>
              <CardDescription>Read-only status for the deployed server.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Environment</div>
              <div className="mt-1 font-medium text-slate-800">{status?.environment || 'Unknown'}</div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Database</div>
              <div className="mt-2"><ConfigBadge configured={Boolean(status?.database.urlConfigured)} /></div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stripe checkout</div>
              <div className="mt-2"><ConfigBadge configured={Boolean(status?.stripe.checkoutReady)} /></div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stripe webhook</div>
              <div className="mt-2"><ConfigBadge configured={Boolean(status?.stripe.webhookReady)} /></div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Mail className="h-3.5 w-3.5" />
                Email
              </div>
              <div className="mt-2"><ConfigBadge configured={Boolean(status?.email.plunkConfigured)} /></div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="font-medium text-slate-800">Server time</div>
            <div>{status?.serverTime ? new Date(status.serverTime).toLocaleString() : 'Not loaded'}</div>
            {status?.frontendUrl && (
              <>
                <div className="font-medium text-slate-800 mt-3">Frontend URL</div>
                <div className="break-all">{status.frontendUrl}</div>
              </>
            )}
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="font-medium text-slate-800">Transactional email</div>
            <div className="mt-1">
              Provider: <span className="font-medium">{status?.email.provider || 'Not loaded'}</span>
            </div>
            <div className="mt-1">
              Welcome, password reset, and purchase confirmation emails use the configured server email provider.
            </div>
            {status?.email.fromAddress && (
              <div className="mt-2 break-all">From: {status.email.fromAddress}</div>
            )}
            {status?.email.apiUrl && (
              <div className="mt-1 break-all">API: {status.email.apiUrl}</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Operational Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            Test-mode payments require matching Stripe test price IDs in Coolify. Once checkout succeeds,
            the Stripe webhook is what updates the user subscription from trial to paid in the database.
          </div>
          <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-600">
            Robin's provider keys and fallback models can be managed in the AI API Configuration tab. Coolify environment
            variables are still supported as a fallback for teams that prefer infrastructure-managed secrets.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Broadcasts Tab
function BroadcastsTab() {
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [newBroadcast, setNewBroadcast] = useState({
    title: '',
    message: '',
    audienceType: 'all_users' as BroadcastAudience,
    scheduledAt: '',
    sendEmail: true,
  });

  const loadBroadcasts = async () => {
    setIsLoading(true);
    setBroadcastError(null);
    const result = await getBroadcastMessages();
    if (result.success && result.data) {
      setBroadcasts(result.data);
    } else {
      setBroadcastError(result.error || 'Unable to load broadcasts');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void loadBroadcasts();
  }, []);

  const scheduleDate = newBroadcast.scheduledAt ? newBroadcast.scheduledAt.slice(0, 10) : '';
  const scheduleTime = newBroadcast.scheduledAt ? newBroadcast.scheduledAt.slice(11, 16) : '';
  const updateSchedulePart = (part: 'date' | 'time', value: string) => {
    const nextDate = part === 'date' ? value : scheduleDate;
    const nextTime = part === 'time' ? value : scheduleTime;
    setNewBroadcast(prev => ({
      ...prev,
      scheduledAt: nextDate ? `${nextDate}T${nextTime || '09:00'}` : '',
    }));
  };

  const handleToggleActive = async (broadcast: BroadcastMessage) => {
    setBroadcasts(prev => prev.map(b =>
      b.id === broadcast.id ? { ...b, isActive: !b.isActive } : b
    ));
    const result = await toggleBroadcastStatus(broadcast.id, !broadcast.isActive);
    if (!result.success) {
      setBroadcastError(result.error || 'Unable to update broadcast');
      void loadBroadcasts();
    }
  };

  const handleAddBroadcast = async () => {
    if (!newBroadcast.title.trim() || !newBroadcast.message.trim()) return;

    setIsSaving(true);
    setBroadcastError(null);
    const scheduledAt = newBroadcast.scheduledAt ? new Date(newBroadcast.scheduledAt).toISOString() : null;
    const publishNow = !scheduledAt || new Date(scheduledAt).getTime() <= Date.now();
    const result = await createBroadcast({
      title: newBroadcast.title,
      message: newBroadcast.message,
      audienceType: newBroadcast.audienceType,
      scheduledAt,
      sendEmail: newBroadcast.sendEmail,
      publishNow,
    });

    if (result.success && result.data) {
      setBroadcasts(prev => [result.data!, ...prev.filter(broadcast => broadcast.id !== result.data!.id)]);
      setNewBroadcast({ title: '', message: '', audienceType: 'all_users', scheduledAt: '', sendEmail: true });
      setShowAddForm(false);
    } else {
      setBroadcastError(result.error || 'Unable to create broadcast');
    }
    setIsSaving(false);
  };

  const handlePublish = async (broadcastId: string) => {
    setBroadcastError(null);
    const result = await publishBroadcast(broadcastId);
    if (!result.success) {
      setBroadcastError(result.error || 'Unable to publish broadcast');
      return;
    }
    void loadBroadcasts();
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-white via-blue-50/80 to-emerald-50/70 shadow-xl shadow-blue-100/60">
        <CardHeader className="border-b border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Broadcast Messages</CardTitle>
              <CardDescription>Send rich HTML, links, and linked-image messages to free or pro member groups.</CardDescription>
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-gradient-to-r from-blue-700 to-cyan-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Broadcast
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {broadcastError && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
              {broadcastError}
            </div>
          )}
          {showAddForm && (
            <div className="mb-6 space-y-4 rounded-2xl border-2 border-cyan-200 bg-white p-4 shadow-sm">
              <h4 className="font-extrabold text-slate-950">Create New Broadcast</h4>
              <div className="space-y-2">
                <Label className="font-bold text-slate-900">Title</Label>
                <Input
                  placeholder="e.g., New Feature Announcement"
                  value={newBroadcast.title}
                  onChange={(e) => setNewBroadcast(prev => ({ ...prev, title: e.target.value }))}
                  className="border-slate-300 bg-white font-semibold text-slate-950"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-900">Message HTML or plain text</Label>
                <textarea
                  className="min-h-[150px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-950 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={'Use plain text or HTML, e.g. <p>New guide is live</p><a href="https://...">Open it</a><img src="https://..." alt="Preview">'}
                  value={newBroadcast.message}
                  onChange={(e) => setNewBroadcast(prev => ({ ...prev, message: e.target.value }))}
                />
                <p className="text-xs font-semibold text-slate-600">
                  Allowed in user inbox: links, basic formatting, lists, quotes, code blocks, and linked images.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-900">Target Audience</Label>
                  <select
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950"
                    value={newBroadcast.audienceType}
                    onChange={(e) => setNewBroadcast(prev => ({ ...prev, audienceType: e.target.value as BroadcastAudience }))}
                  >
                    <option value="all_users">All Users</option>
                    <option value="free_users">Free Members</option>
                    <option value="trial_users">Trial Users</option>
                    <option value="premium_users">Pro / Paid Members</option>
                    <option value="expired_users">Expired Subscriptions</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-900">Schedule</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => updateSchedulePart('date', e.target.value)}
                      className="border-slate-300 bg-white font-semibold text-slate-950"
                    />
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => updateSchedulePart('time', e.target.value)}
                      className="border-slate-300 bg-white font-semibold text-slate-950"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <div>
                    <Label className="font-bold text-slate-900">Email users too</Label>
                    <p className="text-xs font-semibold text-slate-600">Sends a personal email alert.</p>
                  </div>
                  <Switch
                    checked={newBroadcast.sendEmail}
                    onCheckedChange={(checked) => setNewBroadcast(prev => ({ ...prev, sendEmail: checked }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddBroadcast} disabled={isSaving} className="bg-gradient-to-r from-blue-700 to-cyan-700 text-white">
                  {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Megaphone className="mr-2 h-4 w-4" />}
                  {newBroadcast.scheduledAt ? 'Schedule Broadcast' : 'Send Broadcast'}
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm font-semibold text-slate-600">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading broadcasts...
              </div>
            ) : broadcasts.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Megaphone className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="font-medium">No broadcasts yet</p>
                <p className="text-sm">Click "New Broadcast" to create your first announcement.</p>
              </div>
            ) : (
              <div className="divide-y">
                {broadcasts.map((broadcast) => (
                  <div key={broadcast.id} className="p-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-slate-950">{broadcast.title}</h4>
                        <Badge variant={broadcast.isActive ? 'default' : 'secondary'}>
                          {broadcast.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {broadcast.sendEmail && (
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                            Email on
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                        <RichMessageContent content={broadcast.message} />
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span>Audience: {BROADCAST_AUDIENCE_LABELS[broadcast.audienceType]}</span>
                        <span>Sent to: {broadcast.sentCount.toLocaleString()} users</span>
                        <span>Created: {new Date(broadcast.createdAt).toLocaleDateString()}</span>
                        {broadcast.scheduledAt && <span>Scheduled: {new Date(broadcast.scheduledAt).toLocaleString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {broadcast.sentCount === 0 && (
                        <Button variant="outline" size="sm" onClick={() => handlePublish(broadcast.id)}>
                          Send now
                        </Button>
                      )}
                      <Switch
                        checked={broadcast.isActive}
                        onCheckedChange={() => handleToggleActive(broadcast)}
                      />
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LiveSupportTicketsTab() {
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<AdminSupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);

  const loadTickets = async () => {
    setIsLoading(true);
    setError(null);
    const result = await getOpenTicketsForAdmin();
    if (result.success && result.data) {
      setTickets(result.data);
    } else {
      setError(result.error || 'Unable to load support tickets');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const statusColors: Record<string, string> = {
    open: 'bg-amber-100 text-amber-700 border-amber-200',
    replied: 'bg-blue-100 text-blue-700 border-blue-200',
    closed: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const categoryLabels: Record<string, string> = {
    billing: 'Billing',
    refund: 'Refund',
    technical: 'Technical',
    account: 'Account',
    feature_request: 'Feature Request',
    other: 'Other',
  };

  const openReplyDialog = (ticket: AdminSupportTicket) => {
    setSelectedTicket(ticket);
    setReplyText(ticket.aiSuggestedReply || ticket.adminReply || '');
  };

  const handleDraft = async () => {
    if (!selectedTicket) return;
    setIsDrafting(true);
    const result = await draftSupportTicketReply(selectedTicket.id);
    if (result.success && result.data) {
      setReplyText(result.data.reply);
      setSelectedTicket(prev => prev ? {
        ...prev,
        aiSummary: result.data?.summary || prev.aiSummary,
        aiSuggestedReply: result.data?.reply || prev.aiSuggestedReply,
        aiTriage: {
          ...(prev.aiTriage || {}),
          adminDraft: {
            provider: result.data?.provider,
            model: result.data?.model,
            urgency: result.data?.urgency,
            retentionOfferRecommended: result.data?.retentionOfferRecommended,
          },
        },
      } : prev);
    } else {
      setError(result.error || 'Unable to draft a reply');
    }
    setIsDrafting(false);
  };

  const handleReply = async (ticketId: string) => {
    if (!replyText.trim()) return;
    setIsReplying(true);
    const result = await replyToTicket(ticketId, replyText.trim());
    if (result.success) {
      await loadTickets();
      setReplyText('');
      setSelectedTicket(null);
    } else {
      setError(result.error || 'Unable to send reply');
    }
    setIsReplying(false);
  };

  const handleClose = async (ticketId: string) => {
    const result = await closeTicket(ticketId);
    if (result.success) {
      await loadTickets();
      setSelectedTicket(null);
    } else {
      setError(result.error || 'Unable to close ticket');
    }
  };

  const openCount = tickets.filter(t => t.status === 'open').length;
  const repliedCount = tickets.filter(t => t.status === 'replied').length;
  const refundSignalCount = tickets.filter(t => t.refundSignal).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Open Tickets" value={openCount.toString()} change="" trend="up" icon={MessageSquare} />
        <StatCard title="Awaiting Reply" value={repliedCount.toString()} change="" trend="up" icon={Activity} />
        <StatCard title="Refund Signals" value={refundSignalCount.toString()} change="" trend="up" icon={AlertCircle} />
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Support Tickets</CardTitle>
              <CardDescription>Live support requests, AI summaries, refund signals, and retention offers.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadTickets}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-500">
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Loading tickets...
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="font-medium">No support tickets</p>
                <p className="text-sm">All caught up!</p>
              </div>
            ) : (
              <div className="divide-y">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="p-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-slate-800">{ticket.subject}</h4>
                        <Badge variant="outline" className={statusColors[ticket.status]}>
                          {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                        </Badge>
                        {ticket.refundSignal && (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                            Refund review
                          </Badge>
                        )}
                        {ticket.adminUrgent && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Urgent
                          </Badge>
                        )}
                        {ticket.retentionOffer?.eligible && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Save offer
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">{ticket.message}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-400">
                        <span>From: {ticket.userEmail}</span>
                        <span>Category: {categoryLabels[ticket.category]}</span>
                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      </div>
                      {ticket.aiSummary && (
                        <p className="mt-2 text-xs text-slate-500 line-clamp-1">AI summary: {ticket.aiSummary}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => openReplyDialog(ticket)}>
                        {ticket.status === 'open' ? 'Reply' : 'View'}
                      </Button>
                      {ticket.status !== 'closed' && (
                        <Button variant="ghost" size="sm" onClick={() => handleClose(ticket.id)}>
                          Close
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{selectedTicket.subject}</CardTitle>
              <CardDescription>
                {selectedTicket.userEmail} - {categoryLabels[selectedTicket.category]} - {selectedTicket.status}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedTicket.message}</p>
              </div>
              {(selectedTicket.refundSignal || selectedTicket.retentionOffer?.eligible) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                    <p className="font-medium">Refund signal</p>
                    <p className="mt-1">{selectedTicket.refundEligibility?.status || 'review'} - {selectedTicket.refundEligibility?.note || 'Manual review recommended.'}</p>
                    <p className="mt-1 text-xs">
                      {selectedTicket.usage?.questionsCompleted || 0} questions, {selectedTicket.usage?.totalPdfDownloads || 0} PDF downloads
                    </p>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                    <p className="font-medium">Retention option</p>
                    <p className="mt-1">
                      {selectedTicket.retentionOffer?.eligible
                        ? `${selectedTicket.retentionOffer.label} at $${selectedTicket.retentionOffer.amount.toFixed(2)}`
                        : 'No lower-cost offer recommended for this plan.'}
                    </p>
                    <p className="mt-1 text-xs">{selectedTicket.subscription?.planLabel || 'Plan unknown'} - {selectedTicket.subscription?.status || 'unknown'}</p>
                  </div>
                </div>
              )}
              {selectedTicket.aiSummary && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-600 font-medium mb-1">AI Summary</p>
                  <p className="text-sm text-slate-700">{selectedTicket.aiSummary}</p>
                </div>
              )}
              {selectedTicket.adminReply && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-blue-600 font-medium mb-1">Previous Reply:</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedTicket.adminReply}</p>
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Your Reply</Label>
                  <Button variant="outline" size="sm" onClick={handleDraft} disabled={isDrafting}>
                    {isDrafting ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    AI Draft
                  </Button>
                </div>
                <textarea
                  className="w-full min-h-[130px] px-3 py-2 rounded-md border border-slate-200 text-sm"
                  placeholder="Type your response..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
              </div>
            </CardContent>
            <CardContent className="flex justify-end gap-2 pt-0">
              <Button variant="outline" onClick={() => setSelectedTicket(null)}>
                Cancel
              </Button>
              <Button onClick={() => handleReply(selectedTicket.id)} disabled={isReplying || !replyText.trim()} className="bg-slate-700 hover:bg-slate-800">
                {isReplying && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                Send Reply
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Support Tickets Tab
function SupportTicketsTab() {
  return <LiveSupportTicketsTab />;
}

function LiveAnswerExamplesTab() {
  const [candidates, setCandidates] = useState<AdminCandidateView[]>([]);
  const [stats, setStats] = useState<CandidateStats>({
    totalCandidates: 0,
    pendingReview: 0,
    approvedCount: 0,
    rejectedCount: 0,
    needsEditCount: 0,
    todayCount: 0,
  });
  const [selectedCandidate, setSelectedCandidate] = useState<AdminCandidateView | null>(null);
  const [candidateDetails, setCandidateDetails] = useState<{ originalAnswer: string; qualityReason?: string | null } | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [showOriginal, setShowOriginal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    needs_edit: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  const qualityColors: Record<string, string> = {
    too_short: 'bg-slate-100 text-slate-600',
    usable_example: 'bg-blue-100 text-blue-700',
    needs_cleanup: 'bg-amber-100 text-amber-700',
    strong_story_structure: 'bg-emerald-100 text-emerald-700',
    uncategorized: 'bg-slate-100 text-slate-600',
  };

  const loadCandidates = async () => {
    setIsLoading(true);
    setError(null);
    const [candidateResult, statsResult] = await Promise.all([
      getPendingCandidates(100, 0),
      getCandidateStats(),
    ]);
    if (candidateResult.success && candidateResult.data) {
      setCandidates(candidateResult.data);
    } else {
      setError(candidateResult.error || 'Unable to load answer candidates');
    }
    if (statsResult.success && statsResult.data) {
      setStats(statsResult.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  const openCandidate = async (candidate: AdminCandidateView) => {
    setSelectedCandidate(candidate);
    setReviewerNotes('');
    setShowOriginal(false);
    setCandidateDetails(null);
    const result = await getCandidateDetails(candidate.id);
    if (result.success && result.data) {
      setCandidateDetails({
        originalAnswer: result.data.originalAnswer,
        qualityReason: result.data.qualityReason,
      });
    }
  };

  const handleReview = async (
    candidateId: string,
    status: 'approved' | 'rejected' | 'needs_edit',
    approvedForPublication = false
  ) => {
    const result = await updateCandidateReview(candidateId, status, reviewerNotes, approvedForPublication);
    if (result.success) {
      setSelectedCandidate(null);
      await loadCandidates();
    } else {
      setError(result.error || 'Unable to update candidate review');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Candidates" value={stats.totalCandidates.toString()} change="" trend="up" icon={FileText} />
        <StatCard title="Pending Review" value={(stats.pendingReview || candidates.length).toString()} change="" trend="up" icon={AlertCircle} />
        <StatCard title="Approved" value={stats.approvedCount.toString()} change="" trend="up" icon={CheckCircle} />
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Answer Example Candidates</CardTitle>
              <CardDescription>Sanitized answers captured from Robin practice for manual memory-bank review.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadCandidates}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-500">
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Loading answer candidates...
              </div>
            ) : candidates.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="font-medium">No pending answer candidates</p>
                <p className="text-sm">Captured answers will appear here after Robin interview practice.</p>
              </div>
            ) : (
              <div className="divide-y">
                {candidates.map((candidate) => (
                  <div key={candidate.id} className="p-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-slate-800">{candidate.questionPrompt}</h4>
                        <Badge variant="outline" className={statusColors[candidate.reviewStatus]}>
                          {candidate.reviewStatus.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className={qualityColors[candidate.qualityScore] || qualityColors.uncategorized}>
                          {candidate.qualityScore.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mt-2 line-clamp-2">{candidate.sanitizedAnswer}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-400">
                        <span>Pattern: {candidate.answerPattern}</span>
                        <span>From: {candidate.userEmail || 'Unknown user'}</span>
                        <span>{new Date(candidate.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openCandidate(candidate)}>
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Review Answer Candidate</CardTitle>
              <CardDescription>{selectedCandidate.questionPrompt}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={statusColors[selectedCandidate.reviewStatus]}>
                  Status: {selectedCandidate.reviewStatus}
                </Badge>
                <Badge variant="outline" className={qualityColors[selectedCandidate.qualityScore] || qualityColors.uncategorized}>
                  Quality: {selectedCandidate.qualityScore}
                </Badge>
                <Badge variant="outline">Pattern: {selectedCandidate.answerPattern}</Badge>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-xs font-medium text-slate-500 mb-2">SANITIZED ANSWER</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedCandidate.sanitizedAnswer}</p>
                {candidateDetails?.qualityReason && (
                  <p className="mt-3 text-xs text-slate-500">{candidateDetails.qualityReason}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Switch id="show-original-live" checked={showOriginal} onCheckedChange={setShowOriginal} />
                <Label htmlFor="show-original-live" className="text-sm text-slate-600">Show original answer (private)</Label>
              </div>

              {showOriginal && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <p className="text-xs font-medium text-amber-700 mb-2">ORIGINAL ANSWER - ADMIN ONLY</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {candidateDetails?.originalAnswer || 'Original answer is loading or unavailable.'}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Reviewer Notes</Label>
                <textarea
                  className="w-full min-h-[80px] px-3 py-2 rounded-md border border-slate-200 text-sm"
                  placeholder="Add notes about this candidate..."
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                />
              </div>
            </CardContent>
            <CardContent className="flex justify-end gap-2 pt-0">
              <Button variant="outline" onClick={() => setSelectedCandidate(null)}>
                Cancel
              </Button>
              <Button variant="outline" onClick={() => handleReview(selectedCandidate.id, 'needs_edit')} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                <AlertCircle className="w-4 h-4 mr-2" />
                Needs Edit
              </Button>
              <Button variant="outline" onClick={() => handleReview(selectedCandidate.id, 'rejected')} className="text-red-600 border-red-200 hover:bg-red-50">
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button onClick={() => handleReview(selectedCandidate.id, 'approved', true)} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve for Bank
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Answer Examples Tab
function AnswerExamplesTab() {
  return <LiveAnswerExamplesTab />;
}

// Helper Components
function StatCard({ title, value, change, trend, icon: Icon }: {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: typeof Users;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Icon className="w-5 h-5 text-slate-600" />
          </div>
          {change && (
            <Badge variant={trend === 'up' ? 'default' : 'destructive'} className="text-xs">
              {change}
            </Badge>
          )}
        </div>
        <div className="mt-4">
          <div className="text-2xl font-medium text-slate-800">{value}</div>
          <div className="text-sm text-slate-500">{title}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function HealthItem({ name, status, message }: {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  message?: string;
}) {
  const statusColors = {
    healthy: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={cn('w-2 h-2 rounded-full', statusColors[status])} />
        <span className="text-slate-700">{name}</span>
      </div>
      <div className="text-right">
        {message ? (
          <span className="text-sm text-amber-600">{message}</span>
        ) : (
          <span className="text-sm text-emerald-600">Operational</span>
        )}
      </div>
    </div>
  );
}
