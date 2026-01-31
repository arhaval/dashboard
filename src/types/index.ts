/**
 * Arhaval Dashboard - Type Definitions
 * Central location for all TypeScript types
 */

// =============================================================================
// User & Auth Types
// =============================================================================

export type UserRole = 'ADMIN' | 'PUBLISHER' | 'EDITOR' | 'VOICE';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Contact & Payment info
  phone: string | null;
  iban: string | null;
  bank_name: string | null;
  address: string | null;
  notes: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface Session {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

// =============================================================================
// Work Item Types
// =============================================================================

export type WorkType = 'STREAM' | 'VOICE' | 'EDIT';
export type WorkStatus = 'DRAFT' | 'APPROVED' | 'PAID';
export type ContentLength = 'SHORT' | 'LONG';

export interface WorkItem {
  id: string;
  user_id: string;
  work_type: WorkType;
  status: WorkStatus;
  work_date: string;
  cost: number | null;
  notes: string | null;

  // STREAM specific
  match_name: string | null;
  duration_minutes: number | null;

  // VOICE/EDIT specific
  content_name: string | null;
  content_length: ContentLength | null;

  created_at: string;
  updated_at: string;

  // Joined data
  user?: User;
}

// =============================================================================
// Payment Types
// =============================================================================

export type PaymentStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  status: PaymentStatus;
  payment_date: string;
  notes: string | null;
  created_at: string;

  // Joined data
  user?: User;
  payment_items?: PaymentItem[];
}

export interface PaymentItem {
  id: string;
  payment_id: string;
  work_item_id: string;

  // Joined data
  work_item?: WorkItem;
}

// =============================================================================
// Financial Types
// =============================================================================

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  description: string | null;
  transaction_date: string;
  payment_id: string | null;
  user_id: string | null;
  created_at: string;

  // Joined data
  payment?: Payment;
  user?: User;
}

// =============================================================================
// Social Stats Types
// =============================================================================

export type Platform = 'twitch' | 'youtube' | 'instagram' | 'x';
export type PeriodType = 'weekly' | 'monthly';

export interface SocialStats {
  id: string;
  platform: Platform;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  metrics: Record<string, unknown>;
  is_manual: boolean;
  created_at: string;
}

// Simple social stat entry (v1)
export interface SocialStat {
  id: string;
  date: string;
  platform: Platform;
  followers: number;
  views: number;
  comments: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSocialStatInput {
  date: string;
  platform: Platform;
  followers: number;
  views: number;
  comments: number;
}

export interface SocialStatFilters {
  platform?: Platform;
  date_from?: string;
  date_to?: string;
}

// =============================================================================
// Monthly Social Metrics Types (v2)
// =============================================================================

export type MetricsPlatform = 'TWITCH' | 'YOUTUBE' | 'INSTAGRAM' | 'X';

// Base fields for all platforms
export interface SocialMonthlyMetricsBase {
  id: string;
  month: string; // YYYY-MM format
  platform: MetricsPlatform;
  followers_total: number;
  created_at: string;
  updated_at: string;
}

// Twitch-specific metrics
export interface TwitchMetrics {
  total_stream_time_minutes: number;
  avg_viewers: number;
  peak_viewers: number;
  unique_viewers: number;
  live_views: number;
  unique_chatters: number;
  subs_total: number;
}

// YouTube-specific metrics
export interface YouTubeMetrics {
  video_views: number;
  shorts_views: number;
  live_views: number;
  total_likes: number;
  total_comments: number;
  avg_live_viewers: number;
  peak_live_viewers: number;
  subscribers_total: number;
}

// Instagram-specific metrics
export interface InstagramMetrics {
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
}

// X (Twitter)-specific metrics
export interface XMetrics {
  impressions: number;
  engagement_rate: number;
  likes: number;
  replies: number;
  profile_visits: number;
}

// Combined type with all possible fields
export interface SocialMonthlyMetrics extends SocialMonthlyMetricsBase {
  // Twitch
  total_stream_time_minutes?: number;
  avg_viewers?: number;
  peak_viewers?: number;
  unique_viewers?: number;
  live_views?: number;
  unique_chatters?: number;
  subs_total?: number;
  // YouTube
  video_views?: number;
  shorts_views?: number;
  total_likes?: number;
  total_comments?: number;
  avg_live_viewers?: number;
  peak_live_viewers?: number;
  subscribers_total?: number;
  // Instagram
  views?: number;
  likes?: number;
  comments?: number;
  saves?: number;
  shares?: number;
  // X
  impressions?: number;
  engagement_rate?: number;
  replies?: number;
  profile_visits?: number;
}

// Input type for creating/updating metrics
export interface CreateSocialMonthlyMetricsInput {
  month: string;
  platform: MetricsPlatform;
  followers_total: number;
  // Platform-specific (all optional)
  total_stream_time_minutes?: number;
  avg_viewers?: number;
  peak_viewers?: number;
  unique_viewers?: number;
  live_views?: number;
  unique_chatters?: number;
  subs_total?: number;
  video_views?: number;
  shorts_views?: number;
  total_likes?: number;
  total_comments?: number;
  avg_live_viewers?: number;
  peak_live_viewers?: number;
  subscribers_total?: number;
  views?: number;
  likes?: number;
  comments?: number;
  saves?: number;
  shares?: number;
  impressions?: number;
  engagement_rate?: number;
  replies?: number;
  profile_visits?: number;
}

// Growth data for dashboard
export interface PlatformGrowth {
  platform: MetricsPlatform;
  followers_current: number;
  followers_previous: number;
  followers_growth: number;
  followers_growth_percent: number;
  engagement_current: number;
  engagement_previous: number;
  engagement_growth: number;
  views_current: number;
  views_previous: number;
  views_growth: number;
  isFirstRecord: boolean;
}

// =============================================================================
// Reports Types
// =============================================================================

export interface PlatformReportData {
  platform: MetricsPlatform;
  followers: number;
  views: number;
  engagement: number;
  growth: number;
  growthPercent: number;
  status: 'growing' | 'stable' | 'declining';
  isFirstRecord: boolean;
}

export interface WorkItemsSummary {
  total: number;
  approved: number;
  paid: number;
  draft: number;
}

export interface FinanceSummary {
  income: number;
  expense: number;
  netBalance: number;
}

export interface SocialSummary {
  totalLiveViews: number;
  totalFollowersGrowth: number;
  totalEngagement: number;
  previousLiveViews: number;
  previousEngagement: number;
}

export interface ReportInsights {
  fastestGrowingPlatform: MetricsPlatform | null;
  decliningPlatform: MetricsPlatform | null;
  liveViewsTrend: 'up' | 'down' | 'stable';
  workItemsTrend: 'up' | 'down' | 'stable';
  expenseTrend: 'up' | 'down' | 'stable';
  summaryText: string;
  suggestions: string[];
}

export interface MonthlyReport {
  month: string;
  monthLabel: string;
  socialSummary: SocialSummary;
  platformData: PlatformReportData[];
  workItemsSummary: WorkItemsSummary;
  financeSummary: FinanceSummary;
  insights: ReportInsights;
}

// =============================================================================
// Advance Types
// =============================================================================

export interface Advance {
  id: string;
  user_id: string;
  amount: number;
  advance_date: string;
  notes: string | null;
  is_settled: boolean;
  created_at: string;

  // Joined data
  user?: User;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// =============================================================================
// Form Input Types
// =============================================================================

export interface CreateWorkItemInput {
  work_type: WorkType;
  work_date: string;
  notes?: string;
  match_name?: string;
  duration_minutes?: number;
  content_name?: string;
  content_length?: ContentLength;
}

export interface UpdateWorkItemInput {
  cost?: number;
  status?: WorkStatus;
  notes?: string;
}

export interface CreatePaymentInput {
  user_id: string;
  work_item_ids: string[];
  notes?: string;
}

export interface CreateTransactionInput {
  type: TransactionType;
  category: string;
  amount: number;
  description?: string;
  transaction_date: string;
  user_id?: string | null;
}

// =============================================================================
// Filter Types
// =============================================================================

export interface WorkItemFilters {
  user_id?: string;
  work_type?: WorkType;
  status?: WorkStatus;
  date_from?: string;
  date_to?: string;
}

export interface PaymentFilters {
  user_id?: string;
  status?: PaymentStatus;
  date_from?: string;
  date_to?: string;
}

export interface TransactionFilters {
  type?: TransactionType;
  category?: string;
  date_from?: string;
  date_to?: string;
}
