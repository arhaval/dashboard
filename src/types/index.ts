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
  payment_items?: { payment_id: string; payment: { id: string; status: PaymentStatus } | null }[];
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
// Social Notes & Goals Types
// =============================================================================

export interface SocialMonthlyNote {
  id: string;
  month: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface SocialGoal {
  id: string;
  month: string;
  platform: MetricsPlatform;
  metric_key: string;
  target_value: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSocialGoalInput {
  month: string;
  platform: MetricsPlatform;
  metric_key: string;
  target_value: number;
}

export interface GoalProgress {
  platform: MetricsPlatform;
  metric_key: string;
  metric_label: string;
  target: number;
  actual: number;
  percentage: number;
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
  detailMetrics: { label: string; value: number; format?: 'hours' | 'percent' }[];
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
  /** Exclusive upper bound (lt instead of lte) - use for month ranges */
  date_before?: string;
}

// =============================================================================
// CS2 Match Types
// =============================================================================

export type CS2MatchStatus = 'PENDING' | 'LIVE' | 'FINISHED' | 'CANCELLED';

export interface CS2Team {
  id: string;
  name: string;
  tag: string;
  logo_url: string | null;
  created_at: string;
  players?: CS2Player[];
}

export interface CS2Player {
  id: string;
  team_id: string;
  name: string;
  steam_id: string;
  is_active: boolean;
  created_at: string;
  team?: CS2Team;
}

export interface CS2Match {
  id: string;
  team1_id: string;
  team2_id: string;
  status: CS2MatchStatus;
  winner_team_id: string | null;
  match_date: string;
  team1_maps_won: number;
  team2_maps_won: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  team1?: CS2Team;
  team2?: CS2Team;
  maps?: CS2MatchMap[];
}

export type DatHostMapStatus =
  | 'CREATED'
  | 'WAITING_PLAYERS'
  | 'LIVE'
  | 'FINISHED'
  | 'CANCELLED'
  | 'FAILED';

export type DatHostServerStatus = 'IDLE' | 'IN_MATCH' | 'OFFLINE';

export interface CS2MatchMap {
  id: string;
  match_id: string;
  map_number: number;
  map: string;
  team1_score: number;
  team2_score: number;
  rounds_played: number;
  winner_team_id: string | null;
  created_at: string;
  // DatHost integration
  dathost_match_id?: string | null;
  dathost_status?: DatHostMapStatus | null;
  ended_at?: string | null;
  // Joined
  players?: CS2MatchPlayer[];
}

export interface CS2MatchPlayer {
  id: string;
  map_id: string;
  player_id: string | null;
  team_id: string;
  steam_id: string;
  player_name: string;
  kills: number;
  deaths: number;
  assists: number;
  mvps: number;
  score: number;
  headshots: number;
  kills_pistol: number;
  kills_sniper: number;
  damage_dealt: number;
  entry_attempts: number;
  entry_successes: number;
  clutch_attempts: number;
  clutch_wins: number;
  adr: number;
  // Joined
  team?: CS2Team;
  player?: CS2Player;
}

export interface CreateCS2TeamInput {
  name: string;
  tag: string;
  logo_url?: string;
}

export interface CreateCS2PlayerInput {
  team_id: string;
  name: string;
  steam_id: string;
}

export interface CreateCS2MatchInput {
  team1_id: string;
  team2_id: string;
  match_date?: string;
  notes?: string;
}

export interface CreateCS2MatchMapInput {
  match_id: string;
  map: string;
  map_number: number;
  team1_score: number;
  team2_score: number;
  // DatHost integration (optional)
  dathost_match_id?: string;
  dathost_status?: DatHostMapStatus;
}

// ---- DatHost Types ----

export interface DatHostServer {
  id: string;
  dathost_server_id: string;
  name: string;
  is_active: boolean;
  server_status: DatHostServerStatus;
  last_used_at: string | null;
  created_at: string;
  current_match_id: string | null;
  current_map_id: string | null;
  current_match?: CS2Match | null;
  current_map?: CS2MatchMap | null;
}

/** DatHost API match response */
export interface DatHostMatchResponse {
  id: string;
  finished: boolean;
  cancel_reason: string | null;
  rounds_played: number;
  team1: { name: string; stats: { score: number } };
  team2: { name: string; stats: { score: number } };
  team1_stats?: { score: number };
  team2_stats?: { score: number };
  players: DatHostPlayerResponse[];
  settings: {
    map: string;
    team1_name: string | null;
    team2_name: string | null;
  };
}

export interface DatHostPlayerResponse {
  steam_id_64: string;
  team: 'team1' | 'team2';
  nickname_override: string | null;
  connected: boolean;
  kicked: boolean;
  stats: {
    kills: number;
    assists: number;
    deaths: number;
    mvps: number;
    score: number;
    '2ks': number;
    '3ks': number;
    '4ks': number;
    '5ks': number;
    kills_with_headshot: number;
    kills_with_pistol: number;
    kills_with_sniper: number;
    damage_dealt: number;
    utility_damage: number;
    flashes_thrown: number;
    flashes_successful: number;
    flashes_enemies_blinded: number;
    utility_thrown: number;
    entry_attempts: number;
    entry_successes: number;
    '1vX_attempts': number;
    '1vX_wins': number;
  };
}

/** Live score data returned by polling */
export interface DatHostLiveScore {
  dathost_match_id: string;
  map: string;
  team1_score: number;
  team2_score: number;
  rounds_played: number;
  finished: boolean;
  cancelled: boolean;
  players: {
    steam_id: string;
    team: string;
    kills: number;
    deaths: number;
    assists: number;
  }[];
}

export interface DatHostEventLog {
  id: string;
  dathost_match_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  processed: boolean;
  error_message: string | null;
  created_at: string;
}

export interface CS2MatchFilters {
  status?: CS2MatchStatus;
  team_id?: string;
}

/** Aggregated player stats across all maps (leaderboard) */
export interface CS2TeamStanding {
  team_id: string;
  team_name: string;
  team_tag: string;
  matches_played: number;
  matches_won: number;
  maps_played: number;
  maps_won: number;
  rounds_won: number;
  points: number; // 1 point per map won
}

export interface CS2PlayerLeaderboardEntry {
  steam_id: string;
  player_name: string;
  team_id: string;
  team_tag: string;
  team_name: string;
  maps_played: number;
  total_kills: number;
  total_deaths: number;
  total_assists: number;
  total_headshots: number;
  total_mvps: number;
  total_entry_attempts: number;
  total_entry_successes: number;
  total_clutch_attempts: number;
  total_clutch_wins: number;
  avg_adr: number;
  avg_kd: number;
  avg_kda: number;
  hs_percent: number;
}


// =============================================================================
// Content Plans
// İçerik planlama ve takvim
// =============================================================================

export type ContentPlanStatus = 'PLANNED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type ContentPlanPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type ContentPlanType = 'VOICE' | 'EDIT' | 'STREAM';
export type ContentPlatform = 'YOUTUBE' | 'INSTAGRAM' | 'X';
export type ContentSubtype = 'VIDEO' | 'SHORTS' | 'REELS' | 'POST';

export interface ContentPlan {
  id: string;
  title: string;
  content_type: ContentPlanType;
  planned_date: string;
  assigned_to: string | null;
  created_by: string | null;
  status: ContentPlanStatus;
  priority: ContentPlanPriority;
  notes: string | null;
  work_item_id: string | null;
  platform: ContentPlatform | null;
  content_subtype: ContentSubtype | null;
  created_at: string;
  updated_at: string;
  // Joined
  assignee?: { id: string; full_name: string; avatar_url: string | null } | null;
}

export interface CreateContentPlanInput {
  title: string;
  content_type: ContentPlanType;
  planned_date: string;
  assigned_to?: string | null;
  priority?: ContentPlanPriority;
  notes?: string | null;
  platform?: ContentPlatform | null;
  content_subtype?: ContentSubtype | null;
}

export interface ContentGoal {
  id: string;
  platform: ContentPlatform;
  sub_type: ContentSubtype;
  weekly_target: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeeklyGoalProgress {
  platform: ContentPlatform;
  sub_type: ContentSubtype;
  weekly_target: number;
  done_this_week: number;
  pct: number; // 0-100
  on_track: boolean;
}
