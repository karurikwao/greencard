/**
 * Plan Configuration
 * 
 * Central configuration for all pricing plans.
 * This is the single source of truth for plan definitions.
 * 
 * All pricing values and limits are defined here for easy maintenance.
 * In the future, these can be loaded from Supabase for admin editing.
 */

import type {
  PlanType,
  PlanConfig,
  AnonymousPlanConfig,
  TrialPlanConfig,
  SubscriptionPlanConfig,
  LifetimePlanConfig,
  PassPlanConfig,
  AILimits,
  PlanFeatures,
} from './types';

// ============================================================================
// DEFAULT AI LIMITS BY TIER
// ============================================================================

/**
 * Low-tier AI limits (for free trial)
 */
const LOW_AI_LIMITS: AILimits = {
  maxTurnsPerSession: 5,
  maxSessionsPerDay: 1,
};

/**
 * Medium-tier AI limits (for interview pass)
 */
const MEDIUM_AI_LIMITS: AILimits = {
  maxTurnsPerSession: 20,
  maxSessionsPerDay: 5,
};

/**
 * High-tier AI limits (for monthly subscription)
 */
const HIGH_AI_LIMITS: AILimits = {
  maxTurnsPerSession: 20,
  maxSessionsPerDay: 5,
};

/**
 * Unlimited-tier AI limits (for lifetime)
 */
const UNLIMITED_AI_LIMITS: AILimits = {
  maxTurnsPerSession: 50,
  maxSessionsPerDay: 10,
};

// ============================================================================
// DEFAULT FEATURE SETS
// ============================================================================

/**
 * Trial plan features - limited access
 */
const TRIAL_FEATURES: PlanFeatures = {
  practiceQuestions: true,
  readinessCheck: true,
  aiInterview: true,
  pdfDownloads: false,
  coupleCompare: false,
  canChooseProvider: false,
  canChooseModel: false,
};

/**
 * Premium plan features - full access
 */
const PREMIUM_FEATURES: PlanFeatures = {
  practiceQuestions: true,
  readinessCheck: true,
  aiInterview: true,
  pdfDownloads: true,
  coupleCompare: true,
  canChooseProvider: true,
  canChooseModel: true,
};

// ============================================================================
// PLAN CONFIGURATIONS
// ============================================================================

/**
 * Free Trial Plan
 * - 7 days duration
 * - Limited AI usage
 * - Practice questions and readiness check allowed
 * - No PDF downloads or couple comparison
 */
const TRIAL_CONFIG: TrialPlanConfig = {
  id: 'trial',
  name: 'Free Trial',
  description: 'Try all features risk-free for 7 days with limited AI practice',
  price: 0,
  durationDays: 7,
  aiLimits: LOW_AI_LIMITS,
  features: TRIAL_FEATURES,
};

/**
 * Monthly Premium Plan
 * - $19.99/month
 * - Unlimited practice
 * - Full AI interview access
 * - All features enabled
 */
const MONTHLY_CONFIG: SubscriptionPlanConfig = {
  id: 'monthly',
  name: 'Premium Monthly',
  description: 'Full access with unlimited AI practice and all features',
  price: 19.99,
  billingInterval: 'month',
  priceLabel: '$19.99/month',
  aiLimits: HIGH_AI_LIMITS,
  features: PREMIUM_FEATURES,
};

/**
 * Lifetime Plan
 * - $79.99 one-time
 * - Same features as premium
 * - Highest AI limits
 * - Best value
 */
const LIFETIME_CONFIG: LifetimePlanConfig = {
  id: 'lifetime',
  name: 'Lifetime Access',
  description: 'Full access forever with the highest AI limits - best value',
  price: 79.99,
  priceLabel: '$79.99 one-time',
  aiLimits: UNLIMITED_AI_LIMITS,
  features: PREMIUM_FEATURES,
};

/**
 * 90-Day Interview Pass
 * - $39.99 one-time
 * - 90 days duration
 * - Same features as premium
 * - Medium AI limits
 */
const INTERVIEW_PASS_CONFIG: PassPlanConfig = {
  id: 'interviewPass',
  name: '90-Day Interview Pass',
  description: 'Full access for 90 days - perfect for upcoming interviews',
  price: 39.99,
  durationDays: 90,
  priceLabel: '$39.99 for 90 days',
  aiLimits: MEDIUM_AI_LIMITS,
  features: PREMIUM_FEATURES,
};

/**
 * Anonymous/Basic Plan
 * - No authentication required
 * - Browse questions only
 * - No AI, no PDFs, no premium features
 * - Used for non-logged-in visitors
 */
const ANONYMOUS_CONFIG: AnonymousPlanConfig = {
  id: 'anonymous',
  name: 'Basic Access',
  description: 'Browse questions and topics. Sign up for full access.',
  price: 0,
  durationDays: 0,
  aiLimits: { maxTurnsPerSession: 0, maxSessionsPerDay: 0 },
  features: TRIAL_FEATURES, // Same restrictions as trial
};

// ============================================================================
// CENTRAL PLAN CONFIGURATION EXPORT
// ============================================================================

/**
 * Central plan configuration object.
 * This is the single source of truth for all plan definitions.
 */
export const PLAN_CONFIG: Record<PlanType, PlanConfig> = {
  anonymous: ANONYMOUS_CONFIG,
  trial: TRIAL_CONFIG,
  monthly: MONTHLY_CONFIG,
  lifetime: LIFETIME_CONFIG,
  interviewPass: INTERVIEW_PASS_CONFIG,
};

/**
 * Array of all plans in display order
 */
export const PLANS_ARRAY: PlanConfig[] = [
  ANONYMOUS_CONFIG,
  TRIAL_CONFIG,
  MONTHLY_CONFIG,
  LIFETIME_CONFIG,
  INTERVIEW_PASS_CONFIG,
];

/**
 * Public-facing plans (excluding anonymous and trial, which are automatic)
 */
export const PAID_PLANS: PlanConfig[] = [
  MONTHLY_CONFIG,
  LIFETIME_CONFIG,
  INTERVIEW_PASS_CONFIG,
];

/**
 * Display order for pricing page (psychological ordering)
 * Order: Trial (safe entry) → Monthly (primary anchor) → Lifetime (value upsell) → Interview Pass (situational)
 */
export const DISPLAY_PLANS: PlanConfig[] = [
  TRIAL_CONFIG,
  MONTHLY_CONFIG,
  LIFETIME_CONFIG,
  INTERVIEW_PASS_CONFIG,
];

// ============================================================================
// DEFAULT SUBSCRIPTION STATE
// ============================================================================

/**
 * Default subscription for new users
 */
export const DEFAULT_SUBSCRIPTION = {
  plan: 'trial' as PlanType,
  status: 'trialing' as const,
  currentPeriodEnd: null,
  trialEnd: null,
  passEnd: null,
  pdfDownloadsLocked: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ============================================================================
// LEGACY MAPPING (for backward compatibility)
// ============================================================================

/**
 * Maps legacy 'basic' plan to new 'monthly' plan
 * @deprecated Use PlanType directly
 */
export const LEGACY_PLAN_MAP: Record<string, PlanType> = {
  'basic': 'monthly',
  'trial': 'trial',
  'lifetime': 'lifetime',
};

// ============================================================================
// CONFIGURATION VERSION (for future migrations)
// ============================================================================

/**
 * Current configuration version
 * Increment when making breaking changes to plan structure
 */
export const PLAN_CONFIG_VERSION = '2.0.0';

/**
 * Storage key for subscription data
 */
export const SUBSCRIPTION_STORAGE_KEY = 'interview-subscription-v2';

/**
 * Storage key for trial start date
 */
export const TRIAL_START_KEY = 'interview-trial-start-v2';

/**
 * Storage key for usage data
 */
export const USAGE_STORAGE_KEY = 'ai-interview-usage-v2';
