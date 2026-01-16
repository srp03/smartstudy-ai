/**
 * Signed URL endpoint for report download
 * GET /api/reports/:reportId/signed-url
 * 
 * Allows report owners and authorized doctors to download reports
 */

import { getFirebaseDb, getFirebaseAuth } from '../../lib/firebase-admin-init.js';
import { getSupabaseClient } from '../../lib/supabase-init.js';
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

  if (req.method !== 'GET') {
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

    // Get report metadata
    const db = getFirebaseDb();
    const reportDoc = await db.collection('medicalReports').doc(reportId).get();
    if (!reportDoc.exists) {
      return sendError(res, 'Medical report not found', 404);
    }

    const reportData = reportDoc.data();

    // Determine requester role
    let requesterRole = null;
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists && userDoc.data()) {
        requesterRole = userDoc.data().role || null;
      }
    } catch (e) {
      console.warn('Could not read requester role:', e.message);
    }

    const isOwner = reportData.patientId === userId;
    const isDoctor = requesterRole === 'doctor';

    // Access rules: owner can always download, doctor needs consent
    if (!isOwner && !isDoctor) {
      console.warn(`🚫 Unauthorized access attempt: user=${userId} report=${reportId}`);
      return sendError(res, 'Access denied. Only report owner or authorized doctor may download.', 403);
    }

    if (isDoctor) {
      // Check doctor-patient consent
      const consentQuery = await db.collection('consents')
        .where('patientId', '==', reportData.patientId)
        .where('doctorId', '==', userId)
        .where('status', '==', 'approved')
        .get();

      if (consentQuery.empty) {
        console.warn(`🚫 Doctor access denied (no consent): doctor=${userId} patient=${reportData.patientId}`);
        return sendError(res, 'Access denied. Patient consent required.', 403);
      }

      console.log(`🔓 Signed URL granted to doctor=${userId} for patient=${reportData.patientId}`);
    } else {
      console.log(`🔓 Signed URL granted to owner user=${userId}`);
    }

    // Generate signed URL (1 hour expiry)
    const supabase = getSupabaseClient();
    const { data: urlData, error: urlError } = await supabase.storage
      .from('medical-reports')
      .createSignedUrl(reportData.storagePath, 3600);

    if (urlError) {
      console.error('❌ Signed URL generation error:', urlError);
      return sendError(res, 'Failed to generate signed URL', 500);
    }

    sendJson(res, {
      success: true,
      signedUrl: urlData.signedUrl,
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    });

  } catch (error) {
    console.error('❌ Signed URL error:', error.message);
    sendError(res, error.message || 'Failed to generate signed URL', 500);
  }
}
