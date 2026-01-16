/**
 * Report upload endpoint
 * POST /api/reports/upload
 * 
 * Handles file uploads to Supabase Storage and metadata to Firestore
 */

import multer from 'multer';
import { getFirebaseDb, getFieldValue } from '../lib/firebase-admin-init.js';
import { getSupabaseClient } from '../lib/supabase-init.js';
import { applyCorsHeaders, sendJson, sendError } from '../lib/cors-handler.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, and PNG allowed.'));
    }
  }
});

// Wrap multer for serverless compatibility
const uploadMiddleware = upload.single('report');

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        reject(result);
      } else {
        resolve(result);
      }
    });
  });
}

export const config = {
  api: {
    bodyParser: false,
    maxDuration: 120
  }
};

export default async function handler(req, res) {
  applyCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    sendError(res, 'Method not allowed', 405);
    return;
  }

  try {
    // Parse multipart form data
    await runMiddleware(req, res, uploadMiddleware);

    const { patientId, patientEmail, appointmentId } = req.body;
    const file = req.file;

    if (!file) {
      return sendError(res, 'No file uploaded', 400);
    }

    if (!patientId || !patientEmail) {
      return sendError(res, 'Patient ID and email required', 400);
    }

    // Upload to Supabase Storage
    const timestamp = Date.now();
    const safeAppointmentId = appointmentId || 'general';
    const fileName = `${patientId}/${safeAppointmentId}/${timestamp}_${file.originalname}`;

    const supabase = getSupabaseClient();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('medical-reports')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Supabase upload error:', uploadError);
      return sendError(res, 'File upload failed', 500);
    }

    // Store metadata in Firestore
    const db = getFirebaseDb();
    const reportRef = db.collection('medicalReports').doc();
    const FieldValue = getFieldValue();

    await reportRef.set({
      id: reportRef.id,
      patientId,
      patientEmail,
      appointmentId: safeAppointmentId !== 'general' ? safeAppointmentId : null,
      fileName,
      originalName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedAt: FieldValue.serverTimestamp(),
      storagePath: uploadData.path,
      status: 'uploaded'
    });

    const { data: publicUrlData } = supabase.storage
      .from('medical-reports')
      .getPublicUrl(fileName);

    sendJson(res, {
      success: true,
      message: 'Medical report uploaded successfully',
      reportId: reportRef.id,
      fileName: uploadData.path,
      publicUrl: publicUrlData.publicUrl
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    sendError(res, error.message || 'Failed to upload medical report', 500);
  }
}
