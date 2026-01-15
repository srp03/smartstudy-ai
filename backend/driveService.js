/**
 * driveService.js - Google Drive API Backend Service
 *
 * SECURITY NOTICE:
 * - This file runs ONLY on the backend (Node.js server)
 * - Service account credentials are NEVER exposed to frontend
 * - Google Drive API credentials are completely separate from Firebase
 *
 * PURPOSE:
 * - Authenticate with Google Drive using service account
 * - Upload medical report files to designated Drive folder
 * - Generate public download links for uploaded files
 * - Handle Drive API errors and permissions
 */

import { google } from 'googleapis';
import fs from 'fs';

// ==========================================
// CONFIGURATION (Backend Only - Never in Frontend)
// ==========================================

// Google Drive folder ID (pre-configured in Google Cloud Console)
const DRIVE_FOLDER_ID = "1hwjnawvbkomdWPZf_59cWlTk1qQ_8miG";

// Load service account credentials from secure file
// This file is gitignored and never exposed to frontend
let SERVICE_ACCOUNT;
try {
  SERVICE_ACCOUNT = JSON.parse(
    fs.readFileSync('./service-account.json', 'utf8')
  );
} catch (error) {
  console.error('❌ Failed to load service account credentials:', error.message);
  console.error('   Make sure service-account.json exists in backend/ directory');
  throw new Error('Google Drive service account not configured');
}

// ==========================================
// GOOGLE DRIVE AUTHENTICATION
// ==========================================

// Initialize Google Auth with service account
const auth = new google.auth.GoogleAuth({
  credentials: SERVICE_ACCOUNT,
  scopes: ['https://www.googleapis.com/auth/drive']
});

// Initialize Google Drive API client
const drive = google.drive({ version: 'v3', auth });

// ==========================================
// DRIVE SERVICE FUNCTIONS
// ==========================================

/**
 * Upload a file to Google Drive
 * @param {Buffer} fileBuffer - File data as buffer
 * @param {string} fileName - Original filename
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<Object>} Upload result with file ID and download URL
 */
export async function uploadFileToDrive(fileBuffer, fileName, mimeType) {
  try {
    console.log(`📤 Uploading ${fileName} to Google Drive...`);

    // Create file in Google Drive
    const createResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [DRIVE_FOLDER_ID],
      },
      media: {
        mimeType: mimeType,
        body: fileBuffer
      }
    });

    const fileId = createResponse.data.id;
    console.log(`✅ File uploaded successfully. File ID: ${fileId}`);

    // Make file publicly accessible
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    // Generate public download URL
    const downloadURL = `https://drive.google.com/uc?id=${fileId}&export=download`;
    const viewURL = `https://drive.google.com/file/d/${fileId}/view`;

    console.log(`🔗 Public download URL: ${downloadURL}`);

    return {
      success: true,
      fileId: fileId,
      downloadURL: downloadURL,
      viewURL: viewURL,
      fileName: fileName
    };

  } catch (error) {
    console.error('❌ Google Drive upload failed:', error.message);

    // Handle specific error types
    if (error.code === 403) {
      throw new Error('Google Drive access denied. Check service account permissions.');
    } else if (error.code === 401) {
      throw new Error('Google Drive authentication failed. Check service account credentials.');
    } else if (error.code === 404) {
      throw new Error('Google Drive folder not found. Check DRIVE_FOLDER_ID.');
    } else {
      throw new Error(`Google Drive upload failed: ${error.message}`);
    }
  }
}

/**
 * Test Google Drive connection and permissions
 * @returns {Promise<Object>} Connection test result
 */
export async function testDriveConnection() {
  try {
    console.log('🔍 Testing Google Drive connection...');

    // Try to list files in the folder (checks permissions)
    const response = await drive.files.list({
      q: `'${DRIVE_FOLDER_ID}' in parents`,
      pageSize: 1,
      fields: 'files(id, name)'
    });

    console.log('✅ Google Drive connection successful');
    console.log(`📁 Folder contains ${response.data.files.length} files (sample)`);

    return {
      success: true,
      message: 'Google Drive connection successful',
      folderId: DRIVE_FOLDER_ID
    };

  } catch (error) {
    console.error('❌ Google Drive connection test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// ==========================================
// SECURITY NOTES
// ==========================================
/*
SECURITY ARCHITECTURE:
- Service account credentials stay on backend only
- Frontend never sees Drive API keys or service account details
- Firebase handles frontend auth, Drive API handles backend file storage
- All Drive operations are server-side only
- File URLs are safe to share with frontend (public access)
*/