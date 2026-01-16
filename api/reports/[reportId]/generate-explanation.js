/**
 * Generate explanation endpoint (HACKATHON VERSION - DISABLED)
 * POST /api/reports/:reportId/generate-explanation
 * 
 * In hackathon build, Gemini calls are disabled
 * Returns a friendly "premium version" message
 */

import { getFirebaseDb, getFirebaseAuth } from '../../lib/firebase-admin-init.js';
import { applyCorsHeaders, sendJson, sendError } from '../../lib/cors-handler.js';

export const config = {
  api: { maxDuration: 30 }
};

export default async function handler(req, res) {
  applyCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 405);
  }

  try {
    const { reportId } = req.query;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authorization token required', 401);
    }

    const token = authHeader.split('Bearer ')[1];
    const auth = getFirebaseAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Verify report exists and user owns it
    const db = getFirebaseDb();
    const reportDoc = await db.collection('medicalReports').doc(reportId).get();
    if (!reportDoc.exists) {
      return sendError(res, 'Medical report not found', 404);
    }

    const reportData = reportDoc.data();
    if (reportData.patientId !== userId) {
      return sendError(res, 'Access denied. You can only request explanations for your own reports.', 403);
    }

    // HACKATHON MODE: Gemini calls disabled
    console.log(`ℹ️ Explanation request disabled in demo mode: user=${userId} report=${reportId}`);

    sendJson(res, {
      success: false,
      message: 'Report explanation is available in premium version.'
    });

  } catch (error) {
    console.error('❌ Explanation error:', error.message);
    sendError(res, error.message || 'Failed to process explanation request', 500);
  }
}
