import { useState, useEffect, createContext, useContext, type ElementType, useMemo } from 'react';
import { 
  Search, 
  BookOpen, 
  Heart, 
  Shield, 
  Lightbulb,
  Menu,
  X,
  Home,
  Calendar,
  Wallet,
  Users,
  Smartphone,
  Target,
  FileText,
  CheckCircle,
  AlertCircle,
  Info,
  UtensilsCrossed,
  Sofa,
  Bed,
  Bath,
  Utensils,
  Key,
  Archive,
  Trees,
  Clock,
  Shirt,
  Car,
  Monitor,
  Sparkles,
  CircleDot,
  Gift,
  Plane,
  CreditCard,
  HeartPulse,
  Briefcase,
  MapPin,
  Building2,
  Baby,
  Handshake,
  Camera,
  Zap,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  Quote,
  Plus,
  Trash2,
  Printer,
  Eye,
  EyeOff,
  RotateCcw,
  Square,
  Download as DownloadIcon,
  Settings,
  Play,
  Bookmark,
  ChevronRight,
  // BookmarkCheck - available for future use
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { topics, categories, testimonials, defaultMilestones, type Topic, type Testimonial } from '@/data/topics';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { CookieConsent, CookieSettingsButton } from '@/components/CookieConsent';
import { PrivacyPolicy } from '@/pages/PrivacyPolicy';
import { Terms } from '@/pages/Terms';
import { Contact } from '@/pages/Contact';
import { RefundPolicy } from '@/pages/RefundPolicy';
import { TermsOfService } from '@/pages/TermsOfService';
import { AdminPanel } from '@/components/AdminPanel';
// Note: InterstitialAd removed - PDFs now use SecurePDFDownload
// Note: Admin settings imports removed - PDFs now use SecurePDFDownload
// Note: getAdSettings removed - PDFs now use SecurePDFDownload
import { 
  PracticeProvider, 
  usePractice, 
  normalizeAllTopics, 
  type PracticeTopic
} from '@/lib/practice';
import { 
  TopicPracticePage, 
  SavedForLaterPage, 
  ProgressDashboard,
  QuickPractice,
  MockInterview,
  StressReviewPage,
  ReadinessCheckPage,
  SecurePartnerSync,
} from '@/components/practice';
import { AuthModal } from '@/components/auth/AuthModal';
import { SuperAdminPortal } from '@/components/admin/SuperAdminPortal';
import { AuthProvider, useOptionalAuth } from '@/lib/auth/AuthContext';
import { Dashboard } from '@/components/dashboard';
import { PricingModal } from '@/components/pricing';
import {
  SITUATION_PAGES_CONFIG as SITUATION_PAGES,
} from '@/lib/seo/expansion';
import { CONTENT_CLUSTERS, getClusterBySlug, getAllSupportingPages } from '@/lib/seo/clusters';
import { SEOQuestionPage } from '@/components/seo/SEOQuestionPage';
import {
  AuthorityPreparationPage,
  InterviewTopicsPage,
  PillarPage,
  QuestionDatabasePage,
  SituationGuidePage,
  SupportingPage,
  TopQuestionsPage,
  TopicHubPage,
} from '@/components/seo/SEORoutePages';
import { AIInterviewPage } from '@/components/ai';
import { InvitePage } from '@/components/invite/InvitePage';
import { PricingPage } from '@/pages/PricingPage';
import { BillingSuccessPage } from '@/pages/billing/BillingSuccessPage';
import { BillingCancelPage } from '@/pages/billing/BillingCancelPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { AccountSettingsPage } from '@/pages/AccountSettingsPage';
import { usePricing } from '@/hooks/usePricing';
import { AnnouncementBanner, TrustSnippets, ContentBlocks } from '@/components/content';
import { VerificationCodeInjector } from '@/components/verification/VerificationCodeInjector';
import { useCaptureReferralOnMount } from '@/hooks/useReferralTracking';
// Note: trackPDFDownload is now handled internally by SecurePDFDownload component
import { SecurePDFDownload } from '@/components/paywall';
import './App.css';

// ==================== ROUTING ====================
type Page = 'home' | 'privacy' | 'terms' | 'contact' | 'dashboard' | 'question' | 'readiness' | 'stress-review' | 'invite' | 'topic' | 'situation' | 'top-questions' | 'question-database' | 'authority-preparation' | 'ai-interview' | 'pricing' | 'billing-success' | 'billing-cancel' | 'refund-policy' | 'terms-of-service' | 'pillar' | 'supporting' | 'interview-topics' | 'reset-password' | 'account';

function usePage() {
  const [page, setPage] = useState<Page>('home');
  const [questionSlug, setQuestionSlug] = useState<string>('');
  const [inviteCode, setInviteCode] = useState<string>('');
  const [topicSlug, setTopicSlug] = useState<string>('');
  const [situationSlug, setSituationSlug] = useState<string>('');
  const [clusterSlug, setClusterSlug] = useState<string>('');
  const [supportingSlug, setSupportingSlug] = useState<string>('');

  useEffect(() => {
    const path = window.location.pathname;
    
    // Handle /ref/CODE path-based referrals
    if (path.startsWith('/ref/')) {
      const code = path.replace('/ref/', '').trim();
      if (code) {
        // Store the referral code
        import('@/lib/promo').then(({ storeReferralContext, recordReferralEvent }) => {
          const source = new URLSearchParams(window.location.search).get('utm_source') || 'direct';
          storeReferralContext(code, source, window.location.href);
          
          // Record visit event (non-blocking)
          recordReferralEvent({
            promoCode: code,
            referrer: source,
            landingPage: window.location.href,
            eventType: 'visit',
          }).catch(console.error);
        });
        
        // Redirect to home after storing code
        window.history.replaceState({}, '', '/');
        setPage('home');
        return;
      }
    }
    if (path === '/privacy') setPage('privacy');
    else if (path === '/terms') setPage('terms');
    else if (path === '/contact') setPage('contact');
    else if (path === '/refund-policy') setPage('refund-policy');
    else if (path === '/terms-of-service') setPage('terms-of-service');
    else if (path === '/dashboard') setPage('dashboard');
    else if (path === '/readiness') setPage('readiness');
    else if (path === '/stress-review') setPage('stress-review');
    else if (path === '/marriage-interview-questions') setPage('top-questions');
    else if (path === '/immigration-interview-question-database') setPage('question-database');
    else if (path === '/marriage-green-card-interview-preparation') setPage('authority-preparation');
    else if (path === '/interview-topics') setPage('interview-topics');
    else if (path.startsWith('/questions/')) {
      setPage('question');
      setQuestionSlug(path.replace('/questions/', ''));
    }
    else if (path.startsWith('/invite/')) {
      setPage('invite');
      setInviteCode(path.replace('/invite/', ''));
    }
    else if (path.startsWith('/topics/')) {
      setPage('topic');
      setTopicSlug(path.replace('/topics/', ''));
    }
    else if (SITUATION_PAGES.some(s => path === `/${s.slug}`)) {
      setPage('situation');
      setSituationSlug(path.replace('/', ''));
    }
    else if (CONTENT_CLUSTERS.some(c => `/${c.pillarPage.slug}` === path)) {
      const cluster = CONTENT_CLUSTERS.find(c => `/${c.pillarPage.slug}` === path);
      if (cluster) {
        setPage('pillar');
        setClusterSlug(cluster.slug);
      }
    }
    else if (getAllSupportingPages().some(p => `/${p.slug}` === path)) {
      const page = getAllSupportingPages().find(p => `/${p.slug}` === path);
      if (page) {
        setPage('supporting');
        setClusterSlug(page.parentCluster);
        setSupportingSlug(page.slug);
      }
    }
    else if (path === '/mock-interview') {
      setPage('ai-interview');
    }
    else if (path === '/pricing') {
      setPage('pricing');
    }
    else if (path === '/billing/success') {
      setPage('billing-success');
    }
    else if (path === '/billing/cancel') {
      setPage('billing-cancel');
    }
    else if (path === '/reset-password') {
      setPage('reset-password');
    }
    else if (path === '/account') {
      setPage('account');
    }
    else setPage('home');
  }, []);

  const navigate = (newPage: Page, slug?: string) => {
    setPage(newPage);
    let path = '/';
    if (newPage === 'home') path = '/';
    else if (newPage === 'question' && slug) path = `/questions/${slug}`;
    else if (newPage === 'topic' && slug) path = `/topics/${slug}`;
    else if (newPage === 'situation' && slug) path = `/${slug}`;
    else if (newPage === 'pillar' && slug) {
      const cluster = getClusterBySlug(slug);
      path = cluster ? `/${cluster.pillarPage.slug}` : '/';
    }
    else if (newPage === 'supporting' && slug) {
      const page = getAllSupportingPages().find(p => p.slug === slug);
      path = page ? `/${page.slug}` : '/';
    }
    else if (newPage === 'top-questions') path = '/marriage-interview-questions';
    else if (newPage === 'question-database') path = '/immigration-interview-question-database';
    else if (newPage === 'authority-preparation') path = '/marriage-green-card-interview-preparation';
    else if (newPage === 'interview-topics') path = '/interview-topics';
    else if (newPage === 'ai-interview') path = '/mock-interview';
    else if (newPage === 'pricing') path = '/pricing';
    else if (newPage === 'billing-success') path = '/billing/success';
    else if (newPage === 'billing-cancel') path = '/billing/cancel';
    else if (newPage === 'reset-password') path = '/reset-password';
    else if (newPage === 'account') path = '/account';
    else path = `/${newPage}`;
    window.history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return { page, navigate, setPage, questionSlug, inviteCode, topicSlug, situationSlug, clusterSlug, supportingSlug };
}

// ==================== PWA INSTALL PROMPT ====================
function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 animate-slide-up">
      <Card className="bg-white shadow-2xl border-2 border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-rose-500 rounded-xl flex items-center justify-center">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Install InterviewReady</CardTitle>
                <CardDescription className="text-xs">Add to your home screen for easy access</CardDescription>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-slate-600 mb-4">
            Get quick access to practice questions, track your progress, and prepare for your interview anytime, anywhere - even offline!
          </p>
          <div className="flex gap-2">
            <Button onClick={handleInstall} className="flex-1 bg-blue-600 hover:bg-blue-700">
              <DownloadIcon className="mr-2 h-4 w-4" />
              Install App
            </Button>
            <Button variant="outline" onClick={handleDismiss} className="text-slate-600">
              Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== CONTEXT FOR PROGRESS TRACKING ====================
interface ProgressContextType {
  reviewedTopics: string[];
  checkedItems: Record<string, string[]>;
  markTopicReviewed: (topicId: string) => void;
  unmarkTopicReviewed: (topicId: string) => void;
  isTopicReviewed: (topicId: string) => boolean;
  toggleChecklistItem: (topicId: string, item: string) => void;
  isItemChecked: (topicId: string, item: string) => boolean;
  getProgressPercentage: () => number;
  resetProgress: () => void;
}

const ProgressContext = createContext<ProgressContextType | null>(null);

function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) throw new Error('useProgress must be used within ProgressProvider');
  return context;
}

function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [reviewedTopics, setReviewedTopics] = useLocalStorage<string[]>('interview-reviewed-topics-v2', []);
  const [checkedItems, setCheckedItems] = useLocalStorage<Record<string, string[]>>('interview-checklist-items-v2', {});

  const markTopicReviewed = (topicId: string) => {
    setReviewedTopics(prev => {
      if (prev.includes(topicId)) return prev;
      return [...prev, topicId];
    });
  };

  const unmarkTopicReviewed = (topicId: string) => {
    setReviewedTopics(prev => prev.filter(id => id !== topicId));
  };

  const isTopicReviewed = (topicId: string) => reviewedTopics.includes(topicId);

  const toggleChecklistItem = (topicId: string, item: string) => {
    setCheckedItems(prev => {
      const topicChecks = prev[topicId] || [];
      const newChecks = topicChecks.includes(item)
        ? topicChecks.filter(i => i !== item)
        : [...topicChecks, item];
      return { ...prev, [topicId]: newChecks };
    });
  };

  const isItemChecked = (topicId: string, item: string) => {
    return (checkedItems[topicId] || []).includes(item);
  };

  const getProgressPercentage = () => {
    return Math.round((reviewedTopics.length / topics.length) * 100);
  };

  const resetProgress = () => {
    setReviewedTopics([]);
    setCheckedItems({});
  };

  return (
    <ProgressContext.Provider value={{
      reviewedTopics,
      checkedItems,
      markTopicReviewed,
      unmarkTopicReviewed,
      isTopicReviewed,
      toggleChecklistItem,
      isItemChecked,
      getProgressPercentage,
      resetProgress
    }}>
      {children}
    </ProgressContext.Provider>
  );
}

// Icon mapping
const iconMap: Record<string, ElementType> = {
  Home, Calendar, Heart, Wallet, Users, Smartphone, Target,
  UtensilsCrossed, Sofa, Bed, Bath, Utensils, Key, Archive, Trees,
  Clock, Shirt, Car, Monitor, Sparkles, CircleDot, Gift, Plane,
  CreditCard, HeartPulse, Briefcase, MapPin, Building2, Baby, Handshake,
  Camera, Zap, AlertTriangle, FileText
};

function getIcon(iconName: string): ElementType {
  return iconMap[iconName] || FileText;
}

// ==================== COMPONENTS ====================

function Navigation({ navigate }: { navigate: (page: Page) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsOpen(false);
    }
  };

  const navLinks = [
    { id: 'progress', label: 'Progress' },
    { id: 'topics', label: 'Topics' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'checklist', label: 'Checklist' },
    { id: 'testimonials', label: 'Stories' },
    { id: 'tips', label: 'Tips' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('home')}>
            <Heart className={`h-6 w-6 transition-colors duration-300 ${scrolled ? 'text-rose-500' : 'text-rose-400'}`} />
            <span className={`font-bold text-lg transition-colors duration-300 ${scrolled ? 'text-slate-800' : 'text-white'}`}>InterviewReady</span>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-2">
            {navLinks.map(link => (
              <button 
                key={link.id} 
                onClick={() => scrollToSection(link.id)} 
                className={`px-4 py-2 rounded-lg transition-all duration-200 font-bold text-sm border-2 ${
                  scrolled 
                    ? 'text-slate-700 border-slate-300 hover:text-blue-700 hover:border-blue-500 hover:bg-blue-50' 
                    : 'text-white border-white/40 hover:text-white hover:border-white hover:bg-white/20'
                }`}
              >
                {link.label}
              </button>
            ))}
            <Button onClick={() => scrollToSection('topics')} size="sm" className="ml-2 bg-slate-700 hover:bg-slate-800 text-white font-normal">
              Begin studying
            </Button>
          </div>

          {/* Mobile menu button */}
          <button className={`lg:hidden p-2 rounded-lg transition-colors ${scrolled ? 'hover:bg-slate-100' : 'hover:bg-white/20'}`} onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className={`h-6 w-6 ${scrolled ? 'text-slate-800' : 'text-white'}`} /> : <Menu className={`h-6 w-6 ${scrolled ? 'text-slate-800' : 'text-white'}`} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="lg:hidden py-4 border-t bg-white">
            <div className="flex flex-col gap-1">
              {navLinks.map(link => (
                <button 
                  key={link.id} 
                  onClick={() => scrollToSection(link.id)} 
                  className="text-left px-4 py-3 text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg font-semibold transition-colors"
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-2 px-4">
                <Button onClick={() => scrollToSection('topics')} className="w-full bg-slate-700 hover:bg-slate-800 font-normal">
                  Begin studying
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function Hero() {
  const scrollToTopics = () => document.getElementById('topics')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src="/couple-hero.jpg" 
          alt="Happy couple prepared for their interview" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/85 via-slate-900/70 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-24 pb-16">
        <div className="max-w-2xl">
          <Badge className="mb-6 bg-blue-700 text-white hover:bg-blue-800 border-0 font-semibold">
            Free Interview Practice Resources
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Marriage Green Card Interview Questions &{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-rose-300">
              Practice Tools
            </span>{' '}
            for Couples
          </h1>
          
          <p className="text-lg sm:text-xl text-slate-200 mb-8 leading-relaxed">
            Practice USCIS marriage interview questions with your partner. Access 1,200+ questions, 
            sample answers, progress tracking, and free PDF downloads to prepare for your green card interview together.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Button 
              onClick={scrollToTopics} 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 shadow-lg hover:shadow-xl transition-all font-semibold"
            >
              <BookOpen className="mr-2 h-5 w-5" />
              View all topics
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => document.getElementById('progress')?.scrollIntoView({ behavior: 'smooth' })}
              className="border-white/40 text-white hover:bg-white/15 hover:text-white hover:border-white/60 backdrop-blur-sm font-semibold bg-white/5"
            >
              <TrendingUp className="mr-2 h-5 w-5" />
              Track Progress
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <div className="text-3xl font-bold text-white">28</div>
              <div className="text-sm font-medium text-white/90">Topics</div>
            </div>
            <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <div className="text-3xl font-bold text-white">1,200+</div>
              <div className="text-sm font-medium text-white/90">Questions</div>
            </div>
            <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <div className="text-3xl font-bold text-white">100%</div>
              <div className="text-sm font-medium text-white/90">Free</div>
            </div>
            <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <div className="text-3xl font-bold text-white">150+</div>
              <div className="text-sm font-medium text-white/90">Sample Answers</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StudyProgressSection({ 
  onViewDashboard, 
  onViewSaved 
}: { 
  onViewDashboard?: () => void;
  onViewSaved?: () => void;
}) {
  const { reviewedTopics, getProgressPercentage, resetProgress, unmarkTopicReviewed } = useProgress();
  const percentage = getProgressPercentage();

  return (
    <section id="progress" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl text-slate-800 mb-4 font-medium">Track Your USCIS Interview Preparation</h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Monitor your progress through marriage green card interview questions and see how prepared you are for your USCIS interview.
          </p>
        </div>

        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Progress Overview
                </CardTitle>
                <CardDescription>{reviewedTopics.length} of {topics.length} topics reviewed</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={resetProgress} className="text-slate-500 font-semibold">
                <RotateCcw className="mr-1 h-4 w-4" />
                Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 font-medium">Overall Progress</span>
                <span className="font-bold text-slate-900">{percentage}%</span>
              </div>
              <Progress value={percentage} className="h-3" />
            </div>

            {reviewedTopics.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3">Reviewed Topics:</h4>
                <div className="flex flex-wrap gap-2">
                  {reviewedTopics.map(topicId => {
                    const topic = topics.find(t => t.id === topicId);
                    if (!topic) return null;
                    const Icon = getIcon(topic.icon);
                    return (
                      <Badge key={topicId} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                        <Icon className="h-3 w-3" />
                        {topic.title}
                        <button onClick={() => unmarkTopicReviewed(topicId)} className="ml-1 hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
              {onViewDashboard && (
                <Button 
                  variant="outline" 
                  onClick={onViewDashboard}
                  className="flex-1 sm:flex-none border-slate-200 text-slate-600 font-normal"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View detailed stats
                </Button>
              )}
              {onViewSaved && (
                <Button 
                  variant="outline" 
                  onClick={onViewSaved}
                  className="flex-1 sm:flex-none border-slate-200 text-slate-600 font-normal"
                >
                  <Bookmark className="w-4 h-4 mr-2" />
                  Saved questions
                </Button>
              )}
            </div>

            {percentage === 100 && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 text-center">
                <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-emerald-800 font-medium">You've reviewed all topics</p>
                <p className="text-emerald-600 text-sm">Continue practicing to build confidence</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function TopicCard({ 
  topic, 
  isReviewed, 
  onToggleReviewed, 
  onPractice, 
  onView,
  isSaved 
}: { 
  topic: Topic; 
  isReviewed: boolean; 
  onToggleReviewed: () => void;
  onPractice: () => void;
  onView: () => void;
  isSaved: boolean;
}) {
  const Icon = getIcon(topic.icon);
  
  return (
    <Card className={`group hover:shadow-lg transition-all duration-300 border-slate-200 hover:border-blue-300 ${isReviewed ? 'bg-green-50/30 border-green-200' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-blue-100 transition-colors">
            <Icon className="h-5 w-5 text-slate-600 group-hover:text-blue-600" />
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {isSaved && <Badge className="bg-blue-100 text-blue-700 border-0 font-semibold"><Bookmark className="h-3 w-3 mr-1" />Saved</Badge>}
            {isReviewed && <Badge className="bg-green-100 text-green-700 border-0 font-semibold"><CheckCircle className="h-3 w-3 mr-1" />Done</Badge>}
            <Badge variant="secondary" className="text-xs font-semibold">{topic.questionCount} questions</Badge>
          </div>
        </div>
        <CardTitle className="text-lg mt-3 group-hover:text-blue-600 transition-colors">{topic.title}</CardTitle>
        <CardDescription className="text-sm line-clamp-2">{topic.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            size="sm" 
            onClick={onPractice}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            <Play className="mr-1 h-4 w-4" />
            Practice
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onView}
            className="font-semibold"
          >
            <FileText className="mr-1 h-4 w-4" />
            Details
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onToggleReviewed} 
            className={isReviewed ? 'text-green-600 hover:text-green-700 hover:bg-green-100 font-semibold' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50 font-semibold ml-auto'}
          >
            {isReviewed ? <><CheckCircle className="mr-1 h-4 w-4" /> Done</> : <><Square className="mr-1 h-4 w-4" /> Mark Done</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TopicsSection({ 
  onPractice,
  onNavigateToInterviewTopics
}: { 
  onPractice: (topic: Topic) => void;
  onNavigateToInterviewTopics?: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const { isTopicReviewed, markTopicReviewed, unmarkTopicReviewed, toggleChecklistItem, isItemChecked } = useProgress();
  const { isSavedForLater } = usePractice();

  const filteredTopics = topics.filter(topic => {
    const matchesSearch = topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         topic.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? topic.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const handleToggleReviewed = (topicId: string) => {
    if (isTopicReviewed(topicId)) {
      unmarkTopicReviewed(topicId);
    } else {
      markTopicReviewed(topicId);
    }
  };

  const handlePractice = (topic: Topic) => {
    onPractice(topic);
  };

  const handleViewDetails = (topic: Topic) => {
    setSelectedTopic(topic);
  };

  // Check if any questions in this topic are saved for later
  const isTopicSaved = (topicId: string) => {
    const practiceTopic = normalizedTopics.find(t => t.id === topicId);
    if (!practiceTopic) return false;
    return practiceTopic.questions.some(q => isSavedForLater(q.id));
  };

  // Normalize topics for checking saved status - memoized to avoid recalculation
  const normalizedTopics = useMemo(() => normalizeAllTopics(topics), []);

  return (
    <section id="topics" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl text-slate-800 mb-4 font-medium">Green Card Interview Questions for Couples</h2>
          <p className="text-slate-500 max-w-2xl mx-auto mb-4">
            Work through marriage green card interview questions by topic. Practice with your partner, track your confidence, 
            and prepare together for your USCIS interview.
          </p>
          {onNavigateToInterviewTopics && (
            <button 
              onClick={onNavigateToInterviewTopics}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm inline-flex items-center gap-1"
            >
              Browse all interview topics
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="mb-8 space-y-4">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input placeholder="Search topics..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={() => setSelectedCategory(null)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${selectedCategory === null ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}>
              All Topics
            </button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${selectedCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTopics.map(topic => (
            <TopicCard 
              key={topic.id}
              topic={topic} 
              isReviewed={isTopicReviewed(topic.id)} 
              onToggleReviewed={() => handleToggleReviewed(topic.id)}
              onPractice={() => handlePractice(topic)}
              onView={() => handleViewDetails(topic)}
              isSaved={isTopicSaved(topic.id)}
            />
          ))}
        </div>

        {filteredTopics.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">No topics found matching your search.</p>
          </div>
        )}

        {/* Topic Detail Dialog - Preserved for PDF/Checklist access */}
        <Dialog open={!!selectedTopic} onOpenChange={() => setSelectedTopic(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95%] sm:w-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                {selectedTopic && (() => {
                  const IconComponent = getIcon(selectedTopic.icon);
                  return <IconComponent className="h-5 w-5" />;
                })()}
                {selectedTopic?.title}
              </DialogTitle>
              <DialogDescription>{selectedTopic?.description}</DialogDescription>
            </DialogHeader>
            
            {selectedTopic && (
              <Tabs defaultValue="sample" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-1 h-auto">
                  <TabsTrigger 
                    value="sample" 
                    className="tab-sample text-xs sm:text-sm py-2 px-1 font-bold"
                  >
                    Sample Answers
                  </TabsTrigger>
                  <TabsTrigger 
                    value="checklist"
                    className="tab-checklist text-xs sm:text-sm py-2 px-1 font-bold"
                  >
                    Checklist
                  </TabsTrigger>
                  <TabsTrigger 
                    value="download"
                    className="tab-download text-xs sm:text-sm py-2 px-1 font-bold"
                  >
                    Download
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="sample" className="space-y-4 mt-4">
                  {selectedTopic.sampleQA && selectedTopic.sampleQA.length > 0 ? (
                    <div className="space-y-4">
                      {selectedTopic.sampleQA.map((qa, idx) => (
                        <Card key={idx} className="border-slate-200">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-slate-800 flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              {qa.question}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-slate-700 text-sm mb-2">"{qa.sampleAnswer}"</p>
                            {qa.tip && (
                              <p className="text-xs text-amber-600 flex items-center gap-1 font-medium">
                                <Lightbulb className="h-3 w-3" />
                                {qa.tip}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <p>Use the topic questions as live prompts with your spouse.</p>
                      <p className="text-sm">Download the PDF for the complete question list and answer notes.</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="checklist" className="mt-4">
                  {selectedTopic.checklist && selectedTopic.checklist.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-700 mb-4 font-medium">Check off items as you review them with your partner:</p>
                      {selectedTopic.checklist.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                          <Checkbox 
                            id={`check-${selectedTopic.id}-${idx}`}
                            checked={isItemChecked(selectedTopic.id, item)}
                            onCheckedChange={() => toggleChecklistItem(selectedTopic.id, item)}
                            className="mt-0.5 border-2 border-slate-500 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 h-5 w-5 flex-shrink-0"
                          />
                          <Label htmlFor={`check-${selectedTopic.id}-${idx}`} className="text-sm cursor-pointer leading-relaxed text-slate-700">
                            {item}
                          </Label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <p>Review the questions in this topic and mark evidence, dates, and daily-life details you both need to confirm.</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="download" className="space-y-4 mt-4">
                  <div className="text-center py-6">
                    <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-700 mb-2 font-medium">Download the complete PDF with all questions</p>
                    <p className="text-sm text-slate-500 mb-6">{selectedTopic.questionCount} questions • PDF format</p>
                    {/* SECURE PDF DOWNLOAD - Uses Supabase private storage + signed URLs */}
                    <SecurePDFDownload
                      pdfFileName={selectedTopic.pdfFileName}
                      pdfTitle={selectedTopic.title}
                      topicId={selectedTopic.id}
                      categoryId={selectedTopic.category}
                      source="topic_page"
                      variant="button"
                      size="default"
                      className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-2 text-lg shadow-md hover:shadow-lg transition-all font-semibold"
                      label="Download PDF"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}

function TimelineBuilderSection() {
  const [milestones, setMilestones] = useLocalStorage('interview-timeline-v2', defaultMilestones.map((m, i) => ({ ...m, id: `m-${i}` })));
  const [showPreview, setShowPreview] = useState(false);

  const updateMilestone = (id: string, field: keyof typeof defaultMilestones[0], value: string | boolean) => {
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const addMilestone = () => {
    const newId = `m-${Date.now()}`;
    setMilestones(prev => [...prev, { id: newId, title: 'New Milestone', date: '', location: '', notes: '', hasEvidence: false }]);
  };

  const removeMilestone = (id: string) => {
    setMilestones(prev => prev.filter(m => m.id !== id));
  };

  const filledCount = milestones.filter(m => m.date && m.location).length;

  return (
    <section id="timeline" className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Relationship Timeline Builder</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Document your relationship milestones. Having a clear timeline helps ensure you and your partner give consistent answers.
          </p>
        </div>

        <Card className="mb-6 border-2 border-slate-200 shadow-lg">
          <CardHeader className="bg-slate-50 border-b border-slate-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Your Timeline
                </CardTitle>
                <CardDescription className="font-medium">{filledCount} of {milestones.length} milestones documented</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="font-semibold border-slate-300">
                  {showPreview ? <><EyeOff className="mr-1 h-4 w-4" /> Hide</> : <><Eye className="mr-1 h-4 w-4" /> Preview</>}
                </Button>
                <Button variant="outline" size="sm" onClick={addMilestone} className="font-semibold border-slate-300">
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {!showPreview ? (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {milestones.map((milestone) => (
                  <div key={milestone.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 bg-white border-2 border-slate-200 rounded-lg hover:border-blue-300 transition-colors shadow-sm">
                    <div className="sm:col-span-3">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Milestone</Label>
                      <Input 
                        value={milestone.title} 
                        onChange={(e) => updateMilestone(milestone.id, 'title', e.target.value)} 
                        className="mt-1 font-semibold text-slate-900 border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200" 
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Date</Label>
                      <Input 
                        type="date" 
                        value={milestone.date} 
                        onChange={(e) => updateMilestone(milestone.id, 'date', e.target.value)} 
                        className="mt-1 font-semibold text-slate-900 border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200" 
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Location</Label>
                      <Input 
                        value={milestone.location} 
                        onChange={(e) => updateMilestone(milestone.id, 'location', e.target.value)} 
                        className="mt-1 font-semibold text-slate-900 border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200" 
                        placeholder="City, Venue" 
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Notes</Label>
                      <Input 
                        value={milestone.notes} 
                        onChange={(e) => updateMilestone(milestone.id, 'notes', e.target.value)} 
                        className="mt-1 font-semibold text-slate-900 border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200" 
                        placeholder="Details..." 
                      />
                    </div>
                    <div className="sm:col-span-1 flex items-end justify-end gap-2">
                      <Checkbox 
                        checked={milestone.hasEvidence} 
                        onCheckedChange={(checked: boolean) => updateMilestone(milestone.id, 'hasEvidence', checked)}
                        className="mb-3 border-2 border-slate-500 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 h-5 w-5"
                        title="Has evidence/photos"
                      />
                      <button onClick={() => removeMilestone(milestone.id)} className="mb-2 text-slate-500 hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 rounded-lg p-6 border-2 border-slate-200">
                <h3 className="font-bold text-slate-900 mb-4 text-center text-lg">Your Relationship Timeline</h3>
                <div className="space-y-4">
                  {milestones.filter(m => m.date).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((milestone, index) => (
                    <div key={milestone.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        {index < milestones.filter(m => m.date).length - 1 && <div className="w-0.5 h-full bg-blue-200 mt-2" />}
                      </div>
                      <div className="pb-6">
                        <p className="font-bold text-slate-900">{milestone.title}</p>
                        <p className="text-sm text-slate-600 font-medium">{new Date(milestone.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        {milestone.location && <p className="text-sm text-slate-700">{milestone.location}</p>}
                        {milestone.notes && <p className="text-sm text-slate-600 mt-1">{milestone.notes}</p>}
                        {milestone.hasEvidence && <Badge variant="secondary" className="mt-2 text-xs font-semibold"><Camera className="h-3 w-3 mr-1" />Has Photos</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
                {milestones.filter(m => m.date).length === 0 && (
                  <p className="text-center text-slate-600 py-8 font-medium">Add dates to your milestones to see your timeline.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function PrintableChecklistSection() {
  const handlePrint = () => {
    window.print();
  };

  const essentialTopics = topics.filter(t => 
    ['relationship-timeline', 'daily-routine', 'address-history', 'money-bills', 'kitchen-household', 'bedroom'].includes(t.id)
  );

  const keyQuestions = [
    "When and where did you first meet?",
    "When did you start dating?",
    "When did you move in together?",
    "When did you get engaged?",
    "When did you get married?",
    "What is your current address?",
    "What time do you usually wake up?",
    "Who cooks dinner most often?",
    "Do you have joint bank accounts?",
    "What are your work schedules?"
  ];

  return (
    <section id="checklist" className="py-20 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Last-Minute Review Checklist</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            A printable summary of the most important topics to review before your interview.
          </p>
        </div>

        <div className="flex justify-center mb-6 no-print">
          <Button onClick={handlePrint} variant="outline" className="bg-white hover:bg-slate-100 font-semibold">
            <Printer className="mr-2 h-4 w-4" />
            Print Checklist
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-6 sm:p-8 print:shadow-none print:border-0">
          <div className="text-center mb-8 border-b pb-6">
            <h1 className="text-2xl font-bold text-slate-900">Interview Preparation Checklist</h1>
            <p className="text-slate-600 mt-2 font-medium">Review these key topics with your partner before your interview</p>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Heart className="h-5 w-5 text-rose-500" />
                Essential Relationship Questions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {keyQuestions.map((q, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <Checkbox id={`q-${i}`} className="mt-0.5 border-2 border-slate-500 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 h-5 w-5 flex-shrink-0" />
                    <Label htmlFor={`q-${i}`} className="text-sm cursor-pointer text-slate-700 font-medium">{q}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-500" />
                Priority Topics to Review
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {essentialTopics.map(topic => {
                  const Icon = getIcon(topic.icon);
                  return (
                    <div key={topic.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <Checkbox id={`topic-${topic.id}`} className="mt-0.5 border-2 border-slate-500 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 h-5 w-5 flex-shrink-0" />
                      <Label htmlFor={`topic-${topic.id}`} className="text-sm cursor-pointer flex items-center gap-2 text-slate-700 font-medium">
                        <Icon className="h-4 w-4 text-slate-500" />
                        {topic.title}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-500" />
                Documents to Bring
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {['Marriage certificate', 'Photo ID / Passport', 'Joint bank statements', 'Lease or mortgage documents', 'Utility bills', 'Insurance cards', 'Tax returns (if applicable)', 'Photos together (organized by date)'].map((doc, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <Checkbox id={`doc-${i}`} className="mt-0.5 border-2 border-slate-500 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 h-5 w-5 flex-shrink-0" />
                    <Label htmlFor={`doc-${i}`} className="text-sm cursor-pointer text-slate-700 font-medium">{doc}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
              <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Final Reminders
              </h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside font-medium">
                <li>Get a good night's sleep before the interview</li>
                <li>Arrive 15-30 minutes early</li>
                <li>Dress professionally</li>
                <li>Answer truthfully - don't guess if unsure</li>
                <li>Stay calm and be yourselves</li>
                <li>Bring original documents plus copies</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t text-center text-sm text-slate-500 font-medium">
            <p>Generated from InterviewReady - Free Marriage-Based Immigration Interview Practice</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Success Stories</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Read about couples who used these resources to prepare for their interviews.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t: Testimonial) => (
            <Card key={t.id} className="border-2 border-slate-200 shadow-md">
              <CardHeader>
                <Quote className="h-8 w-8 text-blue-300 mb-2" />
                <CardDescription className="text-slate-700 italic leading-relaxed font-medium">
                  "{t.quote}"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-bold text-slate-900">{t.names}</p>
                    <p className="text-sm text-slate-600 font-medium">{t.location}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-0 font-semibold">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {t.result}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-2 font-medium">{t.date}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Card className="inline-block bg-gradient-to-r from-blue-600 to-rose-500 text-white border-0 mx-4">
            <CardContent className="py-6 px-8">
              <p className="text-lg font-bold mb-2">Ready to start your preparation?</p>
              <p className="text-white/90 mb-4 font-medium">Join thousands of couples who have successfully prepared for their interviews.</p>
              <Button onClick={() => document.getElementById('topics')?.scrollIntoView({ behavior: 'smooth' })} variant="secondary" className="bg-white text-slate-800 hover:bg-slate-50 font-normal">
                Begin your preparation
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function TipsSection() {
  const tips = [
    { icon: Heart, title: "Be Truthful", description: "Always answer honestly during your USCIS marriage interview. If you don't remember something, say so rather than guessing. Consistency between you and your spouse is key." },
    { icon: CheckCircle, title: "Practice Marriage Green Card Interview Questions Together", description: "Study common green card interview questions for couples with your partner. Quiz each other on daily routines, relationship history, and home life to build confidence." },
    { icon: Shield, title: "Stay Calm", description: "The USCIS interview is a conversation, not an interrogation. Take your time, breathe, and remember you've prepared together." },
    { icon: Info, title: "Know Your Documents", description: "Review your application and supporting documents before the interview. Be familiar with dates and details you provided to USCIS." },
    { icon: AlertCircle, title: "Don't Memorize Scripts", description: "Understand your answers to marriage green card interview questions rather than memorizing them. Natural, consistent responses are more convincing to officers." },
    { icon: Lightbulb, title: "Use These Questions as a Guide", description: "These USCIS marriage interview questions cover common topics officers ask. Your actual interview may include different or additional questions based on your situation." }
  ];

  return (
    <section id="tips" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Tips for Your Marriage Green Card Interview</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">Follow these guidelines to approach your USCIS interview with confidence and thorough preparation.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tips.map((tip, index) => {
            const Icon = tip.icon;
            return (
              <Card key={index} className="border-2 border-slate-200 shadow-md">
                <CardHeader>
                  <div className="p-3 bg-blue-100 rounded-lg w-fit mb-4">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg font-bold text-slate-900">{tip.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed text-slate-700 font-medium">{tip.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const faqs = [
    { question: "Are these the actual marriage green card interview questions I'll be asked?", answer: "These USCIS marriage interview questions cover common topics that immigration officers may ask during marriage-based interviews. While they represent typical areas of inquiry, your actual interview questions may vary based on your situation. Use these as a comprehensive study guide for green card interview questions for couples." },
    { question: "How should my partner and I practice marriage interview questions together?", answer: "Take turns asking each other USCIS marriage interview questions from different categories. Start with easier topics like daily routines, then move to more detailed questions about your relationship history. Practice regularly as a couple and review any areas where your answers differ to ensure consistency." },
    { question: "What if we don't remember exact dates during the green card interview?", answer: "It's okay to approximate (e.g., 'around March 2020' or 'summer of 2021'). What's important is that both partners give consistent timeframes. If you're truly unsure during your USCIS marriage interview, it's better to say 'I don't remember exactly' than to guess." },
    { question: "Should we bring these practice questions to the interview?", answer: "No, do not bring practice materials to your actual USCIS interview. These marriage green card interview questions are for preparation only. You should bring original documents, photos, and any evidence requested by USCIS." },
    { question: "How long should we practice USCIS marriage interview questions?", answer: "Start practicing marriage green card interview questions at least 2-3 weeks before your interview. Spend 30-60 minutes daily reviewing different topics together. The more familiar you are with your shared life details, the more confident you'll be during your actual interview." },
    { question: "Are these green card interview preparation resources really free?", answer: "Yes, all PDF downloads and practice tools are completely free. We believe all couples deserve access to quality marriage green card interview preparation resources regardless of their financial situation." }
  ];

  return (
    <section id="faq" className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Frequently Asked Questions About USCIS Interview Preparation</h2>
          <p className="text-slate-600">Common questions about practicing marriage green card interview questions</p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border-2 border-slate-200 rounded-lg mb-2 px-4">
              <AccordionTrigger className="text-left font-bold text-sm sm:text-base text-slate-800 py-4">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-slate-700 leading-relaxed text-sm sm:text-base font-medium pb-4">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function Footer({ navigate, onAdminClick }: { navigate: (page: Page) => void; onAdminClick: () => void }) {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-6 w-6 text-rose-500" />
              <span className="font-bold text-white text-lg">InterviewReady</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed font-medium">
              Free marriage green card interview questions and practice resources for couples preparing for their USCIS interview. Study together and build confidence.
            </p>
          </div>
          
          <div>
            <h3 className="font-bold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              {['progress', 'topics', 'timeline', 'checklist', 'testimonials', 'tips'].map(id => (
                <li key={id}>
                  <button onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors capitalize font-medium">
                    {id}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold text-white mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => navigate('privacy')} className="hover:text-white transition-colors font-medium">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => navigate('terms')} className="hover:text-white transition-colors font-medium">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={() => navigate('terms-of-service')} className="hover:text-white transition-colors font-medium">
                  Terms of Service (Full)
                </button>
              </li>
              <li>
                <button onClick={() => navigate('refund-policy')} className="hover:text-white transition-colors font-medium">
                  Refund Policy
                </button>
              </li>
              <li>
                <button onClick={() => navigate('contact')} className="hover:text-white transition-colors font-medium">
                  Contact Us
                </button>
              </li>
              <li>
                <CookieSettingsButton />
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold text-white mb-4">Important Notice</h3>
            <p className="text-sm text-slate-400 leading-relaxed font-medium">
              These resources are for practice purposes only and do not constitute legal advice. 
              Consult with an immigration attorney for guidance specific to your case.
            </p>
          </div>
        </div>
        
        <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-500 font-medium">
          <p>© {new Date().getFullYear()} InterviewReady. All rights reserved.</p>
          <button 
            onClick={onAdminClick}
            className="mt-2 text-slate-600 hover:text-slate-400 transition-colors text-xs flex items-center justify-center gap-1 mx-auto"
            title="Admin Panel (Ctrl+Shift+A)"
          >
            <Settings className="h-3 w-3" />
            Admin
          </button>
        </div>
      </div>
    </footer>
  );
}

// ==================== MAIN APP ====================
type ViewMode = 'home' | 'practice' | 'saved' | 'progress' | 'dashboard' | 'quick-practice' | 'mock-interview' | 'stress-review' | 'readiness' | 'partner-sync';

function HomePage({
  navigate,
  initialViewMode = 'home',
}: {
  navigate: (page: Page) => void;
  initialViewMode?: ViewMode;
}) {
  const { isAdmin, isSuperAdmin } = useOptionalAuth();
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  // Note: adminSettings and interstitial ad state removed - PDFs now use SecurePDFDownload
  
  // Pricing hook
  const { 
    trialDaysLeft, 
    currentPlan, 
    upgradePlan
  } = usePricing();
  
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [activePracticeTopic, setActivePracticeTopic] = useState<PracticeTopic | null>(null);
  const normalizedTopics = useMemo(() => normalizeAllTopics(topics), []);

  useEffect(() => {
    setViewMode(initialViewMode);
  }, [initialViewMode]);

  // Note: Ad settings fetching removed - PDFs now use SecurePDFDownload
  // The getAdSettings import and related code can be removed if not used elsewhere

  // Keyboard shortcut to open admin (Ctrl+Shift+A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setShowAdmin(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Legacy download handlers removed - PDFs now use SecurePDFDownload component
  // which handles entitlement checks and secure signed URL generation via Supabase
  // 
  // The InterstitialAd component and related state are kept for potential future use
  // but are no longer used for PDF downloads in the current secure flow

  // Handle entering practice mode for a topic
  const handlePractice = (topic: PracticeTopic) => {
    setActivePracticeTopic(topic);
    setViewMode('practice');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle exiting practice mode (legacy, now handled by handleReturnHome)

  // Note: PDF downloads in practice mode now use SecurePDFDownload component directly
  // The legacy handlePracticePDFDownload function has been removed
  // PDFs are now served through Supabase private storage with signed URLs

  // Cross-topic navigation is implemented via handlePracticeQuestion below

  // Handle viewing saved questions
  const handleViewSaved = () => {
    setViewMode('saved');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle viewing progress
  const handleViewProgress = () => {
    setViewMode('progress');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewPartnerSync = () => {
    setViewMode('partner-sync');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Note: handleViewDashboard and handleViewReadiness are integrated into the Dashboard component directly

  // Handle returning to home
  const handleReturnHome = () => {
    setViewMode('home');
    setActivePracticeTopic(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle practicing a specific question from saved/progress
  const handlePracticeQuestion = (topicId: string, _questionIndex: number) => {
    const targetTopic = normalizedTopics.find(t => t.id === topicId);
    if (targetTopic) {
      setActivePracticeTopic(targetTopic);
      setViewMode('practice');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const adminOverlays = showAdmin ? (
    isSuperAdmin ? (
      <SuperAdminPortal onClose={() => setShowAdmin(false)} />
    ) : (
      <AdminPanel onClose={() => setShowAdmin(false)} />
    )
  ) : null;

  // Render different views based on mode
  if (viewMode === 'saved') {
    return (
      <>
        <SavedForLaterPage
          onBack={handleReturnHome}
          onPracticeQuestion={handlePracticeQuestion}
        />
        {adminOverlays}
      </>
    );
  }

  if (viewMode === 'progress') {
    return (
      <>
        <ProgressDashboard
          onBack={handleReturnHome}
          onPracticeTopic={(topicId) => {
            const foundTopic = topics.find(t => t.id === topicId);
            if (foundTopic) {
              const practiceTopic = normalizedTopics.find(t => t.id === foundTopic.id);
              if (practiceTopic) {
                setActivePracticeTopic(practiceTopic);
                setViewMode('practice');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }
          }}
        />
        {adminOverlays}
      </>
    );
  }

  if (viewMode === 'practice' && activePracticeTopic) {
    return (
      <>
        <TopicPracticePage
          topic={activePracticeTopic}
          allTopics={normalizedTopics}
          onBack={handleReturnHome}
        />
        {adminOverlays}
      </>
    );
  }

  if (viewMode === 'dashboard') {
    return (
      <>
        <Dashboard
          onPracticeTopic={handlePractice}
          onStartQuickPractice={() => setViewMode('quick-practice')}
          onStartMockInterview={() => setViewMode('mock-interview')}
          onViewSaved={() => setViewMode('saved')}
          onViewProgress={() => setViewMode('progress')}
          onViewTimeline={() => { /* scroll to timeline */ }}
          onViewCouplePractice={handleViewPartnerSync}
          onUpgrade={() => navigate('pricing')}
          onViewAdmin={() => setShowAdmin(true)}
          canViewAdmin={isAdmin || isSuperAdmin}
        />
        {adminOverlays}
      </>
    );
  }

  if (viewMode === 'quick-practice') {
    return (
      <>
        <QuickPractice onBack={() => setViewMode('dashboard')} />
        {adminOverlays}
      </>
    );
  }

  if (viewMode === 'mock-interview') {
    return (
      <>
        <MockInterview onBack={() => setViewMode('dashboard')} />
        {adminOverlays}
      </>
    );
  }

  if (viewMode === 'stress-review') {
    return (
      <>
        <StressReviewPage 
          onBack={() => setViewMode('dashboard')}
          onPracticeQuestion={handlePracticeQuestion}
        />
        {adminOverlays}
      </>
    );
  }

  if (viewMode === 'readiness') {
    return (
      <>
        <ReadinessCheckPage 
          onBack={() => setViewMode('dashboard')}
        />
        {adminOverlays}
      </>
    );
  }

  if (viewMode === 'partner-sync') {
    return (
      <>
        <div className="min-h-screen bg-slate-50/50 pb-20">
          <header className="bg-white border-b border-slate-200/60 sticky top-0 z-10">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Premium collaboration</p>
                <h1 className="text-xl font-semibold text-slate-900">Partner Sync</h1>
              </div>
              <Button variant="outline" onClick={() => setViewMode('dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </header>
          <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
            <SecurePartnerSync onUpgrade={() => navigate('pricing')} />
          </main>
        </div>
        {adminOverlays}
      </>
    );
  }

  return (
    <>
      <Navigation navigate={navigate} />
      
      {/* Global Announcement Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <AnnouncementBanner placement="global.banner" />
      </div>
      
      <Hero />
      
      {/* Home Hero Announcements */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnnouncementBanner placement="home.hero" />
      </div>
      
      {/* Trust Snippets Section */}
      <section className="py-8 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <TrustSnippets placement="home.trust" />
        </div>
      </section>
      
      <StudyProgressSection 
        onViewDashboard={handleViewProgress}
        onViewSaved={handleViewSaved}
      />
      <TopicsSection 
        onPractice={(topic: Topic) => {
          const practiceTopic = normalizedTopics.find(t => t.id === topic.id);
          if (practiceTopic) {
            handlePractice(practiceTopic);
          }
        }}
        onNavigateToInterviewTopics={() => navigate('interview-topics')}
      />
      <TimelineBuilderSection />
      <PrintableChecklistSection />
      <TestimonialsSection />
      <TipsSection />
      {/* FAQ Content Blocks */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-slate-800 mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <ContentBlocks placement="home.faq" layout="accordion" />
        </div>
      </section>
      
      <FAQSection />
      <Footer navigate={navigate} onAdminClick={() => setShowAdmin(true)} />
      <PWAInstallPrompt />
      <CookieConsent />
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />

      {/* Pricing Modal */}
      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        currentPlan={currentPlan.id}
        onUpgrade={(plan) => {
          upgradePlan(plan);
          setShowPricingModal(false);
        }}
        trialDaysLeft={trialDaysLeft}
      />

      {/* Admin Portal */}
      {adminOverlays}
      
      {/* Note: InterstitialAd for PDF downloads has been removed */}
      {/* PDFs now use SecurePDFDownload with Supabase signed URLs */}
    </>
  );
}

function App() {
  // Capture referral codes from URL on app load
  useCaptureReferralOnMount();
  
  const { page, navigate, questionSlug, inviteCode, topicSlug, situationSlug, clusterSlug, supportingSlug } = usePage();
  const { subscription, upgradePlan, effectiveSubscription, manageSubscription, refreshSubscription } = usePricing();

  return (
    <AuthProvider>
      <ProgressProvider>
        <PracticeProvider>
          <div className="min-h-screen bg-white">
            {/* Verification code injection - head (injected via useEffect) */}
            <VerificationCodeInjector placement="head" />
            
            {page === 'home' && <HomePage navigate={navigate} />}
            {page === 'dashboard' && <HomePage navigate={navigate} initialViewMode="dashboard" />}
            {page === 'readiness' && <HomePage navigate={navigate} initialViewMode="readiness" />}
            {page === 'stress-review' && <HomePage navigate={navigate} initialViewMode="stress-review" />}
            {page === 'question' && (
              <SEOQuestionPage
                questionSlug={questionSlug}
                onBack={() => navigate('home')}
                onPractice={() => navigate('ai-interview')}
              />
            )}
            {page === 'topic' && (
              <TopicHubPage topicSlug={topicSlug} onBack={() => navigate('interview-topics')} />
            )}
            {page === 'situation' && (
              <SituationGuidePage situationSlug={situationSlug} onBack={() => navigate('home')} />
            )}
            {page === 'privacy' && <PrivacyPolicy />}
            {page === 'terms' && <Terms />}
            {page === 'contact' && <Contact />}
            {page === 'refund-policy' && <RefundPolicy onBack={() => navigate('home')} />}
            {page === 'terms-of-service' && <TermsOfService onBack={() => navigate('home')} />}
            {page === 'invite' && (
              <InvitePage 
                inviteCode={inviteCode}
                onBack={() => navigate('home')}
              />
            )}
            {page === 'top-questions' && <TopQuestionsPage onBack={() => navigate('home')} />}
            {page === 'question-database' && <QuestionDatabasePage onBack={() => navigate('home')} />}
            {page === 'authority-preparation' && <AuthorityPreparationPage onBack={() => navigate('home')} />}
            {page === 'interview-topics' && <InterviewTopicsPage onBack={() => navigate('home')} />}
            {page === 'pillar' && clusterSlug && (
              <PillarPage clusterSlug={clusterSlug} onBack={() => navigate('authority-preparation')} />
            )}
            {page === 'supporting' && clusterSlug && supportingSlug && (
              <SupportingPage clusterSlug={clusterSlug} supportingSlug={supportingSlug} onBack={() => navigate('pillar', clusterSlug)} />
            )}
            {page === 'ai-interview' && (
              <AIInterviewPage 
                mode="standard"
                onExit={() => navigate('home')}
              />
            )}
            {page === 'pricing' && (
              <PricingPage 
                currentPlan={subscription.plan}
                effectiveSubscription={effectiveSubscription}
                onSelectPlan={(plan) => {
                  upgradePlan(plan);
                  navigate('home');
                }}
                onBack={() => navigate('home')}
                onManageBilling={() => manageSubscription()}
                onRefreshSubscription={refreshSubscription}
              />
            )}
            {page === 'billing-success' && <BillingSuccessPage />}
            {page === 'billing-cancel' && <BillingCancelPage />}
            {page === 'reset-password' && <ResetPasswordPage />}
            {page === 'account' && <AccountSettingsPage />}
            
            {/* Verification code injection - body_end */}
            <VerificationCodeInjector placement="body_end" />
            
            {/* Verification code injection - footer (injected via useEffect before </body>) */}
            <VerificationCodeInjector placement="footer" />
          </div>
        </PracticeProvider>
      </ProgressProvider>
    </AuthProvider>
  );
}

export default App;
