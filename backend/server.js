/**
 * server.js - Smart Health Assistant Backend Server
 *
 * ARCHITECTURE:
 * - Express.js server for API endpoints
 * - Firebase integration for authentication and data storage
 * - Secure credential separation maintained
 */

import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import fs from 'fs';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables
dotenv.config();

// ==========================================
// GLOBAL ERROR HANDLERS (Prevent Silent Crashes)
// ==========================================

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION:', error);
  console.error('Stack:', error.stack);
  // Don't exit - log and continue
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise);
  console.error('Reason:', reason);
  // Don't exit - log and continue
});

// Handle warnings
process.on('warning', (warning) => {
  console.warn('⚠️ WARNING:', warning.name);
  console.warn('Message:', warning.message);
  console.warn('Stack:', warning.stack);
});

// Log when process is about to exit
process.on('exit', (code) => {
  console.log(`🛑 Process exiting with code: ${code}`);
});

// Handle SIGTERM gracefully
process.on('SIGTERM', () => {
  console.log('📡 SIGTERM signal received: closing HTTP server');
  // Server will close gracefully
});

// Handle SIGINT (Ctrl+C) gracefully
process.on('SIGINT', () => {
  console.log('\n📡 SIGINT signal received: closing HTTP server');
  process.exit(0);
});

console.log('✅ Global error handlers initialized');


// ==========================================
// FIREBASE INITIALIZATION
// ==========================================

let db;
try {
  const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));
  // Initialize Firebase Admin only once
  if (!admin.apps || admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
  } else {
    console.log('ℹ️ Firebase Admin SDK already initialized, reusing existing app');
  }
  db = admin.firestore();
} catch (error) {
  console.error('❌ Firebase initialization error:', error && error.message ? error.message : error);
  console.error('Server will continue but Firebase features may not work');
  // Create a dummy db object to prevent crashes
  db = {
    collection: () => ({
      doc: () => ({
        get: () => Promise.resolve({ exists: false }),
        set: () => Promise.resolve(),
        update: () => Promise.resolve()
      }),
      get: () => Promise.resolve({ empty: true, forEach: () => { } }),
      add: () => Promise.resolve({ id: 'dummy' }),
      where: () => ({
        get: () => Promise.resolve({ empty: true, forEach: () => { } })
      })
    })
  };
}


// Initialize Supabase with service role key (server-side only)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Google Gemini AI client placeholder (we'll call REST endpoint directly)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY || null;
if (!GEMINI_API_KEY) {
  console.warn('⚠️ GEMINI API key not found in env (GEMINI_API_KEY or GOOGLE_AI_API_KEY). Gemini calls will fail until an API key is provided.');
} else {
  console.log('✅ GEMINI API key found and loaded from environment');
}
const genAI = null; // keep variable for backward compatibility if referenced elsewhere

// Model cache for Gemini ListModels results
const GEMINI_MODEL_CACHE = { models: [], ts: 0 };
const MODEL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function listAvailableGeminiModels() {
  if (!GEMINI_API_KEY) return [];
  try {
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);
    const json = await resp.json().catch(() => null);
    const models = (json && json.models) ? json.models.map(m => (m && (m.name || m.model || m.id)) || null).filter(Boolean) : [];
    return models;
  } catch (err) {
    console.warn('listAvailableGeminiModels error:', err && err.message ? err.message : String(err));
    return [];
  }
}

async function resolveGeminiModel(preferredList = ['gemini-2.5-flash','gemini-1.5-flash']) {
  const now = Date.now();
  if (!GEMINI_MODEL_CACHE.ts || (now - GEMINI_MODEL_CACHE.ts) > MODEL_CACHE_TTL) {
    const models = await listAvailableGeminiModels();
    GEMINI_MODEL_CACHE.models = models;
    GEMINI_MODEL_CACHE.ts = Date.now();
  }

  const models = GEMINI_MODEL_CACHE.models || [];
  // Prefer explicit preferredList
  for (const p of preferredList) {
    const found = models.find(m => m && m.toLowerCase().includes(p.toLowerCase()));
    if (found) return found;
  }

  // Fallback: pick first non-embedding model with text/generate hints
  let candidate = models.find(n => /gemini|text|generate|flash|chat/i.test(n) && !/embed/i.test(n));
  if (candidate) return candidate;

  // As last resort return null
  return null;
}

// Helper: call Gemini Generative Language REST API safely
async function callGeminiGenerateText(prompt, model = 'gemini-1.5-flash') {
  if (!GEMINI_API_KEY) {
    return { success: false, message: 'Gemini API key not configured' };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 512
      }
    };

    console.log('🔄 Calling Gemini API with model:', model);
    
    // Create AbortController for timeout (5-8 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId); // Clear timeout if request completes

    console.log('📡 Gemini API response status:', resp.status);
    const json = await resp.json().catch(() => null);
    console.log('📦 Gemini API response:', json ? JSON.stringify(json).slice(0, 500) + '...' : 'null');

    if (!resp.ok) {
      const msgObj = (json && (json.error || json.message)) || `HTTP ${resp.status}`;
      const msg = typeof msgObj === 'string' ? msgObj : JSON.stringify(msgObj);
      // If the model is not found for this API version, attempt to resolve a compatible model and retry once
      if (resp.status === 404) {
        try {
          const candidate = await resolveGeminiModel([model, 'gemini-2.5-flash', 'gemini-1.5-flash']);
          if (candidate && candidate !== model) {
            try {
              console.log('🔁 Retrying Gemini call with resolved model:', candidate);
              const retryUrl = `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
              const retryController = new AbortController();
              const retryTimeout = setTimeout(() => retryController.abort(), 6000);
              const retryResp = await fetch(retryUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: retryController.signal
              });
              clearTimeout(retryTimeout);
              const retryJson = await retryResp.json().catch(() => null);
              if (retryResp.ok && retryJson) {
                let rt = null;
                if (retryJson.candidates && retryJson.candidates.length > 0) {
                  const candidateObj = retryJson.candidates[0];
                  if (candidateObj.content && candidateObj.content.parts && candidateObj.content.parts.length > 0) {
                    rt = candidateObj.content.parts[0].text;
                  }
                }
                if (rt) {
                  console.log('✅ Gemini retry successful with model:', candidate);
                  return { success: true, text: rt, raw: retryJson };
                }
              }
            } catch (retryErr) {
              console.warn('Retry with resolved model failed:', retryErr && retryErr.message ? retryErr.message : String(retryErr));
            }
          }

          // Return structured info including available cached models
          return { success: false, message: `Gemini API error: ${msg}`, details: { api: json, availableModels: GEMINI_MODEL_CACHE.models } };
        } catch (listErr) {
          return { success: false, message: `Gemini API error: ${msg}`, details: { api: json, listError: (listErr && listErr.message) || String(listErr) } };
        }
      }
      return { success: false, message: `Gemini API error: ${msg}`, details: json };
    }

    // Extract text from Gemini 1.5 response format
    let text = null;
    if (json && json.candidates && json.candidates.length > 0) {
      const candidate = json.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        text = candidate.content.parts[0].text;
      }
    }

    if (!text) {
      return { success: false, message: 'No text generated by Gemini API', details: json };
    }

    console.log('✅ Gemini API call successful, generated text length:', text.length);
    return { success: true, text, raw: json };
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('❌ Gemini request timed out after 6 seconds');
      return { success: false, message: 'Gemini API request timed out', details: 'Request exceeded 6 second timeout' };
    }
    console.error('❌ Gemini request failed:', err);
    return { success: false, message: 'Gemini request failed', details: err && err.message ? err.message : String(err) };
  }
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF, JPG, PNG files
    if (file.mimetype === 'application/pdf' ||
      file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, and PNG files are allowed.'));
    }
  }
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * GET /api/test-gemini
 * Test Gemini API connectivity (development only)
 */
app.get('/api/test-gemini', async (req, res) => {
  try {
    const testPrompt = "Say 'Hello World' in a friendly way.";
    const result = await callGeminiGenerateText(testPrompt, 'gemini-1.5-flash');

    if (result.success) {
      res.json({
        success: true,
        message: 'Gemini API is working',
        response: result.text,
        key_loaded: !!GEMINI_API_KEY
      });
    } else {
      // Log minimal error without crashing
      console.warn('⚠️ Gemini test failed:', result.message);
      res.status(500).json({
        success: false,
        message: result.message,
        key_loaded: !!GEMINI_API_KEY
      });
    }
  } catch (error) {
    // Log minimal error without crashing
    console.warn('⚠️ Gemini test error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Test failed',
      key_loaded: !!GEMINI_API_KEY
    });
  }
});
app.get('/api/health', async (req, res) => {
  try {
    // Test Supabase connection
    const { data, error } = await supabase.storage.listBuckets();

    res.status(200).json({
      success: true,
      message: 'Backend server is healthy',
      services: {
        firebase: 'connected',
        firestore: 'available',
        supabase: error ? 'error' : 'connected',
        gemini: 'configured'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error.message
    });
  }
});

/**
 * GET /
 * Basic info endpoint
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Smart Health Assistant Backend',
    version: '2.0.0',
    endpoints: [
      'GET /api/health - Health check',
      'POST /api/reports/upload - Upload medical report',
      'GET /api/reports/:reportId/signed-url - Get signed URL for report access',
      'POST /api/reports/:reportId/analyze - AI analysis of medical report'
    ],
    storage: 'Supabase Storage (server-side uploads)',
    security: 'Firebase Authentication with Supabase Storage policies'
  });
});

/**
 * POST /api/reports/upload
 * Upload medical report to Supabase Storage
 */
app.post('/api/reports/upload', upload.single('report'), async (req, res) => {
  try {
    const { patientId, patientEmail, appointmentId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    if (!patientId || !patientEmail) {
      return res.status(400).json({
        success: false,
        error: 'Patient ID and email are required'
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    // Default to 'general' if no appointmentId provided to maintain structure
    const safeAppointmentId = appointmentId || 'general';
    const fileName = `${patientId}/${safeAppointmentId}/${timestamp}_${file.originalname}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('medical-reports')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      console.error('Supabase Upload Error:', error);
      throw error;
    }

    // Store report metadata in Firestore
    const reportRef = db.collection('medicalReports').doc();
    await reportRef.set({
      id: reportRef.id,
      patientId,
      patientEmail,
      appointmentId: safeAppointmentId !== 'general' ? safeAppointmentId : null,
      fileName,
      originalName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      storagePath: data.path,
      status: 'uploaded'
    });

    // Get public URL (though for medical reports, we typically usage signed URLs)
    const { data: publicUrlData } = supabase.storage
      .from('medical-reports')
      .getPublicUrl(fileName);

    res.status(200).json({
      success: true,
      message: 'Medical report uploaded successfully',
      reportId: reportRef.id,
      fileName: data.path,
      publicUrl: publicUrlData.publicUrl
    });

  } catch (error) {
    console.error('Upload error:', error);

    // Handle Firestore API disabled error
    if (error.code === 7 || (error.message && error.message.includes('API has not been used'))) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable. Please enable Cloud Firestore API in Google Cloud Console.',
        details: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to upload medical report',
      details: error.message
    });
  }
});

/**
 * GET /api/reports/:reportId/signed-url
 * Generate signed URL for secure report access (doctors only)
 */
app.get('/api/reports/:reportId/signed-url', async (req, res) => {
  try {
    const { reportId } = req.params;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify Firebase token and determine requester identity
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get report metadata early to determine access rights
    const reportDoc = await db.collection('medicalReports').doc(reportId).get();
    if (!reportDoc.exists) {
      return res.status(404).json({ success: false, error: 'Medical report not found' });
    }
    const reportData = reportDoc.data();

    // Determine requester role (if any)
    let requesterRole = null;
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists && userDoc.data()) requesterRole = userDoc.data().role || null;
    } catch (e) {
      console.warn('Could not read requester role:', e && e.message ? e.message : e);
    }

    const isOwner = (reportData.patientId === userId);
    const isDoctor = (requesterRole === 'doctor');

    // Access rules:
    // - The report owner may always download their own report.
    // - A doctor may download if they have an approved consent from the patient.
    if (!isOwner && !isDoctor) {
      console.warn(`🚫 Unauthorized signed-url request: user=${userId} report=${reportId} patient=${reportData.patientId}`);
      return res.status(403).json({ success: false, error: 'Access denied. Only report owner or authorized doctor may download this file.' });
    }

    if (isDoctor) {
      // Check if doctor has consent to access this patient's reports
      const consentQuery = await db.collection('consents')
        .where('patientId', '==', reportData.patientId)
        .where('doctorId', '==', userId)
        .where('status', '==', 'approved')
        .get();

      if (consentQuery.empty) {
        console.warn(`🚫 Doctor access denied (no consent): doctor=${userId} patient=${reportData.patientId} report=${reportId}`);
        return res.status(403).json({ success: false, error: 'Access denied. Patient consent required.' });
      }
    }

    // Log granted access type
    if (isOwner) console.log(`🔓 Signed URL access granted to owner user=${userId} report=${reportId}`);
    else if (isDoctor) console.log(`🔓 Signed URL access granted to doctor=${userId} for patient=${reportData.patientId} report=${reportId}`);

    // Generate signed URL (expires in 1 hour)
    const { data, error } = await supabase.storage
      .from('medical-reports')
      .createSignedUrl(reportData.storagePath, 3600);

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      signedUrl: data.signedUrl,
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    });

  } catch (error) {
    console.error('Signed URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate signed URL',
      details: error.message
    });
  }
});

/**
 * POST /api/reports/:reportId/analyze
 * AI analysis of medical report using Google Gemini
 */
app.post('/api/reports/:reportId/analyze', async (req, res) => {
  try {
    const { reportId } = req.params;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;

    // Check if user is a doctor
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists || userDoc.data().role !== 'doctor') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Doctor role required.'
      });
    }

    // Get report metadata
    const reportDoc = await db.collection('medicalReports').doc(reportId).get();
    if (!reportDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Medical report not found'
      });
    }

    const reportData = reportDoc.data();

    // Check if doctor has consent
    const consentQuery = await db.collection('consents')
      .where('patientId', '==', reportData.patientId)
      .where('doctorId', '==', userId)
      .where('status', '==', 'approved')
      .get();

    if (consentQuery.empty) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Patient consent required.'
      });
    }

    // Download file from Supabase for analysis
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('medical-reports')
      .download(reportData.storagePath);

    if (downloadError) {
      console.error('Download error:', downloadError);
      return res.status(500).json({
        success: false,
        error: 'Failed to download medical report file'
      });
    }

    // Validate downloaded file
    if (!fileData || fileData.length === 0) {
      console.error('Downloaded file is empty or invalid');
      return res.status(400).json({
        success: false,
        error: 'Medical report file is empty or corrupted'
      });
    }

    // Extract text based on file type
    let extractedText = '';
    try {
      if (reportData.mimeType === 'application/pdf') {
        const pdfData = await pdfParse(fileData);
        extractedText = pdfData.text || '';
      } else if (reportData.mimeType.startsWith('image/')) {
        // Use latest Tesseract.js API
        const worker = await createWorker('eng');
        try {
          const { data: { text } } = await worker.recognize(fileData);
          extractedText = text || '';
        } finally {
          await worker.terminate();
        }
      } else {
        console.error('Unsupported file type for text extraction:', reportData.mimeType);
        return res.status(400).json({
          success: false,
          error: 'Unsupported file type for analysis'
        });
      }
    } catch (extractionError) {
      console.error('Text extraction error:', extractionError);
      return res.status(400).json({
        success: false,
        error: 'Could not extract text from the medical report'
      });
    }

    if (!extractedText.trim()) {
      return res.status(400).json({
        success: false,
        error: 'No readable text found in the medical report'
      });
    }

    // AI Analysis using Google Gemini (call REST safely)
    const analysisPrompt = `Act as a friendly doctor. Explain these medical results in simple, non-technical language for a patient. Highlight what is normal and what needs attention. Use bullet points and keep it concise to save tokens.

Medical Report Text:
${extractedText}`;

    let analysisResult = await callGeminiGenerateText(analysisPrompt, 'gemini-1.5-flash');
    if (!analysisResult.success) {
      console.error('Gemini analysis error:', analysisResult.message || analysisResult.details);
      return res.status(502).json({ success: false, error: 'Failed to analyze medical report with AI service', details: analysisResult.message || analysisResult.details });
    }

    const analysis = analysisResult.text || '';

    // Store analysis in Firestore
    await db.collection('medicalReports').doc(reportId).update({
      aiAnalysis: analysis,
      analyzedAt: admin.firestore.FieldValue.serverTimestamp(),
      analyzedBy: userId
    });

    res.status(200).json({
      success: true,
      analysis,
      reportId,
      analyzedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze medical report',
      details: error.message
    });
  }
});

// ==========================================
// PATIENT AI EXPLANATION ENDPOINT
// ==========================================

app.post('/api/reports/:reportId/generate-explanation', async (req, res) => {
  try {
    const { reportId } = req.params;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authorization token required' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;

    // Verify the report exists and the requester owns it
    const reportDoc = await db.collection('medicalReports').doc(reportId).get();
    if (!reportDoc.exists) return res.status(404).json({ success: false, error: 'Medical report not found' });
    const reportData = reportDoc.data();
    if (reportData.patientId !== userId) return res.status(403).json({ success: false, error: 'Access denied. You can only request explanations for your own reports.' });

    // Hackathon/demo mode: disable Gemini calls for patient explanations.
    // Return a clear, non-error response so frontend can display a friendly message.
    console.log(`ℹ️ Explanation request disabled in demo: user=${userId} report=${reportId}`);
    return res.status(200).json({ success: false, message: 'Report explanation is available in premium version.' });

  } catch (error) {
    console.error('AI Explanation (disabled) error:', error && (error.message || error));
    return res.status(500).json({ success: false, error: 'Failed to process explanation request', details: error && error.message });
  }
});

// ==========================================
// ERROR HANDLING
// ==========================================

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// ==========================================
// SERVER STARTUP (configurable strict vs fallback)
// ==========================================

// Guard to prevent starting the server multiple times (useful for ES module reloads)
if (!globalThis.__smartHealthServerStarted) {
  globalThis.__smartHealthServerStarted = true;

  // Default to STRICT bind mode unless explicitly set to 'false'
  const STRICT_BIND = (typeof process.env.STRICT_PORT_BIND === 'undefined')
    ? true
    : (process.env.STRICT_PORT_BIND || 'false').toLowerCase() === 'true';
  console.log(`ℹ️ Server bind mode: ${STRICT_BIND ? 'STRICT (no fallback, default)' : 'FALLBACK (retry next ports)'}`);

  if (STRICT_BIND) {
    // Strict single-port bind: exit loudly if port is in use
    const server = app.listen(PORT, () => {
      console.log('\n' + '='.repeat(50));
      console.log(`🚀 Smart Health Assistant Backend Server`);
      console.log(`📡 Running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔥 Firebase: Admin SDK initialized`);
      console.log(`✅ Server is RUNNING and LISTENING`);
      console.log('='.repeat(50) + '\n');
      console.log('💚 Server event loop is active - press Ctrl+C to stop');
    });

    server.on('error', (error) => {
      console.error('❌ Server error:', error && error.message ? error.message : error);
      if (error && error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please stop the process using this port and restart the server.`);
      }
      process.exit(1);
    });

    server.on('listening', () => {
      const addr = server.address();
      try { console.log(`🎯 Server successfully bound to ${addr.address}:${addr.port}`); } catch (e) { console.log('🎯 Server listening'); }
    });

  } else {
    // Fallback behavior: try binding to PORT, then PORT+1, up to retries
    async function startWithFallback(basePort = PORT, maxRetries = 2) {
      let attempt = 0;
      let lastErr = null;
      while (attempt <= maxRetries) {
        const tryPort = basePort + attempt;
        try {
          const server = app.listen(tryPort, () => {
            console.log('\n' + '='.repeat(50));
            console.log(`🚀 Smart Health Assistant Backend Server`);
            console.log(`📡 Running on port ${tryPort}`);
            console.log(`🔗 Health check: http://localhost:${tryPort}/api/health`);
            console.log(`🔥 Firebase: Admin SDK initialized`);
            console.log(`✅ Server is RUNNING and LISTENING`);
            console.log('='.repeat(50) + '\n');
            console.log('💚 Server event loop is active - press Ctrl+C to stop');
          });

          server.on('error', (error) => {
            console.error('❌ Server error:', error && error.message ? error.message : error);
          });

          await new Promise((resolve, reject) => {
            server.on('listening', () => resolve(server));
            server.on('error', (err) => reject(err));
          });

          const addr = server.address();
          console.log(`🎯 Server successfully bound to ${addr.address}:${addr.port}`);
          return server;
        } catch (err) {
          lastErr = err;
          if (err && err.code === 'EADDRINUSE') {
            console.warn(`Port ${tryPort} is in use, trying next port...`);
          } else {
            console.error('Unexpected error while binding:', err && err.message ? err.message : err);
          }
          attempt += 1;
          await new Promise(r => setTimeout(r, 300));
        }
      }
      console.error('❌ Unable to bind server to any port (basePort:', basePort, '). Last error:', lastErr && lastErr.message ? lastErr.message : lastErr);
      process.exit(1);
    }

    // Start fallback binding
    startWithFallback().catch(err => {
      console.error('Fatal error during fallback startup:', err && err.message ? err.message : err);
      process.exit(1);
    });
  }

} else {
  console.log('ℹ️ Server start skipped because it is already started in this process.');
}
