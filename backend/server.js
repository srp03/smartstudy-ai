/**
 * server.js - Smart Health Assistant Backend Server
 *
 * ARCHITECTURE:
 * - Express.js server for API endpoints
 * - Google Drive integration for file uploads
 * - Firebase service for frontend (separate project)
 * - Secure credential separation maintained
 */

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { uploadFileToDrive, testDriveConnection } from './driveService.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for memory storage (no temp files)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common medical document formats
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, images, and documents allowed.'), false);
    }
  }
});

// ==========================================
// API ENDPOINTS
// ==========================================

/**
 * POST /api/upload-report
 * Upload medical report to Google Drive
 * Returns public download link
 */
app.post('/api/upload-report', upload.single('file'), async (req, res) => {
  try {
    console.log('📥 Received file upload request');

    // Validate file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    const { originalname, buffer, mimetype, size } = req.file;

    console.log(`📄 Processing: ${originalname} (${(size / 1024).toFixed(1)} KB)`);

    // Upload to Google Drive
    const result = await uploadFileToDrive(buffer, originalname, mimetype);

    console.log('✅ Upload completed successfully');

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Medical report uploaded successfully',
      data: {
        fileId: result.fileId,
        fileName: result.fileName,
        downloadURL: result.downloadURL,
        viewURL: result.viewURL
      }
    });

  } catch (error) {
    console.error('❌ Upload failed:', error.message);

    // Return appropriate error response
    const statusCode = error.message.includes('permission') ? 403 :
                      error.message.includes('auth') ? 401 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', async (req, res) => {
  try {
    // Test Google Drive connection
    const driveTest = await testDriveConnection();

    res.status(200).json({
      success: true,
      message: 'Backend server is healthy',
      services: {
        googleDrive: driveTest.success ? 'connected' : 'error',
        driveFolder: driveTest.folderId || null
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
    version: '1.0.0',
    endpoints: [
      'POST /api/upload-report - Upload medical reports',
      'GET /api/health - Health check'
    ],
    security: 'Google Drive API credentials secured on backend only'
  });
});

// ==========================================
// ERROR HANDLING
// ==========================================

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
  }

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
// SERVER STARTUP
// ==========================================

app.listen(PORT, () => {
  console.log(`🚀 Smart Health Assistant Backend Server`);
  console.log(`📡 Running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(` Security: Service account credentials secured`);
});

