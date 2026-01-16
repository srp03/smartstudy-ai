/**
 * Health check endpoint
 * GET /api/health
 */

import { applyCorsHeaders, sendJson, sendError } from './lib/cors-handler.js';

export default async function handler(req, res) {
  applyCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Verify environment variables are loaded
    const hasFirebase = process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL;
    const hasSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;

    sendJson(res, {
      success: true,
      message: 'Backend server is healthy',
      services: {
        firebase: hasFirebase ? 'configured' : 'missing',
        supabase: hasSupabase ? 'configured' : 'missing',
        node: process.version
      },
      timestamp: new Date().toISOString(),
      deployment: process.env.VERCEL_URL || 'local'
    });
  } catch (error) {
    console.error('Health check error:', error);
    sendError(res, 'Health check failed', 500);
  }
}
