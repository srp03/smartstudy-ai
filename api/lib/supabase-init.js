/**
 * Supabase client initialization for Vercel serverless functions
 * 
 * Environment variables required:
 * - SUPABASE_URL (https://your-project.supabase.co)
 * - SUPABASE_SERVICE_ROLE_KEY (server-side only, never expose to frontend)
 */

import { createClient } from '@supabase/supabase-js';

let supabase = null;

export function getSupabaseClient() {
  if (supabase) return supabase;

  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        'Missing Supabase credentials. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
      );
    }

    supabase = createClient(url, key);
    console.log('✅ Supabase client initialized with environment variables');
    return supabase;
  } catch (error) {
    console.error('❌ Supabase initialization error:', error && error.message ? error.message : String(error));
    throw new Error('Supabase client initialization failed: ' + (error && error.message || 'Unknown error'));
  }
}
