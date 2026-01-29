/**
 * Supabase Client Exports
 * Centralized exports for all Supabase client utilities
 */

export { createClient as createBrowserClient } from './client';
export { createClient as createServerClient, getUser, getSession } from './server';
export { createAdminClient } from './admin';
export { updateSession } from './middleware';
