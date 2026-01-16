/**
 * Supabase client initialization for Vercel serverless functions
 * 
 * Environment variables required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

let supabase = null;

export function getSupabaseClient() {
  if (supabase) return supabase;

  try {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    return supabase;
  } catch (error) {
    console.error('❌ Supabase initialization error:', error.message);
    throw new Error('Supabase client initialization failed');
  }
}
