/*
 * reports.js (compat)
 * Upload and list medical reports using Firebase Storage and Firestore.
 * Now includes Google Gemini API for AI-powered medical report analysis.
 * Assumes compat Firebase SDK is loaded and `window.firebaseStorage`/`window.firebaseDb`/`window.firebaseAuth` exist.
 *
 * Functions return { success: boolean, data?, error? }.
 */

// Load centralized configuration
if (typeof window.appConfig === 'undefined') {
  console.error('App config not found. Make sure config.js is loaded before reports.js');
}

const GEMINI_API_KEY = window.appConfig.get('GEMINI_API_KEY');
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

function _getStorageDbAuth() {
  if (typeof window !== 'undefined' && window.firebaseStorage && window.firebaseDb && window.firebaseAuth) {
    return { storage: window.firebaseStorage, db: window.firebaseDb, auth: window.firebaseAuth };
  }
  if (typeof firebase !== 'undefined') {
    window.firebaseAuth = window.firebaseAuth || firebase.auth();
    window.firebaseDb = window.firebaseDb || firebase.firestore();
    window.firebaseStorage = window.firebaseStorage || firebase.storage();
    return { storage: window.firebaseStorage, db: window.firebaseDb, auth: window.firebaseAuth };
  }
  throw new Error('Firebase SDK not found. Include compat CDN scripts before reports.js');
}

/**
 * uploadMedicalReport(file, name, type, date)
 * - Uploads `file` (File object) to Google Drive via backend API and stores metadata in Firestore.
 * - Includes AI analysis using Gemini API for medical report insights.
 * - Maintains security: Drive credentials never exposed to frontend.
 */
async function uploadMedicalReport(file, name, type, date) {
  try {
    const { db, auth } = _getStorageDbAuth();
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'No authenticated user.' };

    // Validate file
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) return { success: false, error: 'Invalid file type. Only PDF and images are supported.' };
    if (file.size > 10 * 1024 * 1024) return { success: false, error: 'File exceeds 10MB limit.' };

    console.log('📤 Uploading to Google Drive backend...');

    // Create FormData for backend upload
    const formData = new FormData();
    formData.append('file', file);

    // Upload to backend Google Drive API
    const backendResponse = await fetch('http://localhost:3000/api/upload-report', {
      method: 'POST',
      body: formData
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    const uploadResult = await backendResponse.json();

    if (!uploadResult.success) {
      throw new Error(uploadResult.error || 'Upload failed');
    }

    console.log('✅ File uploaded to Google Drive successfully');

    // Perform AI analysis using Gemini API
    let aiAnalysis = null;
    try {
      aiAnalysis = await analyzeMedicalReport(file, name, type);
    } catch (aiError) {
      console.warn('AI analysis failed, proceeding without it:', aiError);
      aiAnalysis = {
        summary: 'AI analysis temporarily unavailable. Please consult with your healthcare provider for interpretation.',
        explanation: 'Unable to analyze the report at this time. This may be due to file format or temporary service issues.',
        disclaimer: 'This is not a medical diagnosis. Please consult qualified healthcare professionals.'
      };
    }

    // Store metadata in Firestore (Drive URLs are safe to store)
    const meta = {
      fileName: name || file.name,
      fileType: type || file.type || null,
      reportDate: date || null,
      driveFileId: uploadResult.data.fileId,
      downloadURL: uploadResult.data.downloadURL,
      viewURL: uploadResult.data.viewURL,
      aiAnalysis,
      uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    // Save metadata to Firestore
    await db.collection('users').doc(user.uid).collection('reports').add(meta);

    console.log('✅ Metadata saved to Firestore successfully');

    return { success: true, data: meta };

  } catch (err) {
    console.error('uploadMedicalReport error:', err);
    return { success: false, error: (err && err.message) || String(err) };
  }

/**
 * analyzeMedicalReport(file, name, type)
 * - Uses Gemini API to analyze medical reports and provide insights
 * - Returns structured analysis with summary and detailed explanation
 */
async function analyzeMedicalReport(file, name, type) {
  try {
    // For now, we'll create a text-based analysis since Gemini API works with text
    // In a production environment, you might want to use OCR for images or PDF parsing
    const fileType = file.type;
    const fileName = name || file.name;

    let analysisPrompt = '';

    if (fileType === 'application/pdf') {
      analysisPrompt = `Analyze this medical report PDF named "${fileName}". Since I cannot directly read PDF content, provide general guidance for interpreting medical reports and suggest what healthcare professionals typically look for in such documents.`;
    } else if (fileType.startsWith('image/')) {
      analysisPrompt = `Analyze this medical report image named "${fileName}". Since I cannot directly read image content, provide guidance on what to look for in medical report images and general health insights.`;
    }

    analysisPrompt += `

Please provide a structured analysis in the following format:

**Medical Report Summary:**
[Provide a short, easy-to-understand summary of what this type of medical report typically contains]

**Detailed Explanation:**
[Explain common values/parameters found in such reports, such as:]
- Blood sugar levels and what they mean
- Blood pressure readings and ranges
- Cholesterol levels (HDL, LDL, Total)
- Other common medical markers
- What normal vs abnormal ranges typically indicate
- Possible health risks associated with abnormal values

**Health Suggestions:**
[Provide general wellness tips and when to consult a doctor]

**Disclaimer:**
This is not a medical diagnosis. Please consult qualified healthcare professionals for interpretation of your specific medical reports.`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: analysisPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.3, // Lower temperature for medical analysis
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) throw new Error('Gemini API request failed');

    const data = await response.json();
    const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Analysis unavailable';

    // Parse the response to extract sections
    const summaryMatch = analysisText.match(/\*\*Medical Report Summary:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
    const explanationMatch = analysisText.match(/\*\*Detailed Explanation:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
    const suggestionsMatch = analysisText.match(/\*\*Health Suggestions:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
    const disclaimerMatch = analysisText.match(/\*\*Disclaimer:\*\*\s*([\s\S]*?)(?=\*\*|$)/);

    return {
      summary: summaryMatch ? summaryMatch[1].trim() : 'Medical report analysis completed. Please review with your healthcare provider.',
      explanation: explanationMatch ? explanationMatch[1].trim() : 'This report contains medical data that should be interpreted by qualified healthcare professionals.',
      suggestions: suggestionsMatch ? suggestionsMatch[1].trim() : 'Maintain regular health check-ups and follow your doctor\'s recommendations.',
      disclaimer: disclaimerMatch ? disclaimerMatch[1].trim() : 'This AI analysis is for informational purposes only and does not constitute medical advice. Always consult healthcare professionals for medical decisions.'
    };

  } catch (err) {
    console.error('analyzeMedicalReport error:', err);
    // Return fallback analysis
    return {
      summary: 'Medical report uploaded successfully. AI analysis is temporarily unavailable.',
      explanation: 'Unable to analyze the report content at this time. Please consult with your healthcare provider for interpretation.',
      suggestions: 'Regular health monitoring and consultation with medical professionals is recommended.',
      disclaimer: 'This is not a medical diagnosis. Please consult qualified healthcare professionals for interpretation of your medical reports.'
    };
  }
}

/**
 * getMedicalReports()
 * - Retrieves list of medical report metadata for the current user.
 */
async function getMedicalReports() {
  try {
    const { db, auth } = _getStorageDbAuth();
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'No authenticated user.' };

    const snaps = await db.collection('users').doc(user.uid).collection('reports').orderBy('uploadedAt', 'desc').get();
    const reports = [];
    snaps.forEach(d => reports.push({ id: d.id, ...d.data() }));

    return { success: true, data: reports };
  } catch (err) {
    console.error('getMedicalReports error:', err);
    return { success: false, error: (err && err.message) || String(err) };
  }
}

// Display reports in the UI
function displayMedicalReports(reports) {
  const container = document.getElementById('reports-list');
  if (!container) return;

  if (!reports || reports.length === 0) {
    container.innerHTML = '<p class="text-gray-600 text-center py-8">No medical reports uploaded yet.</p>';
    return;
  }

  container.innerHTML = reports.map(report => {
    const date = report.reportDate || 'N/A';
    const uploadDate = report.uploadedAt && report.uploadedAt.toDate ? report.uploadedAt.toDate().toLocaleDateString() : 'N/A';

    // AI Analysis sections
    const aiAnalysis = report.aiAnalysis || {};
    const analysisHTML = aiAnalysis.summary ? `
      <div class="mt-6 border-t pt-6">
        <h4 class="text-lg font-semibold text-blue-600 mb-4">🤖 AI Medical Analysis</h4>

        <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
          <h5 class="font-semibold text-blue-800 mb-2">📋 Medical Report Summary</h5>
          <p class="text-blue-700 text-sm leading-relaxed">${aiAnalysis.summary}</p>
        </div>

        <div class="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
          <h5 class="font-semibold text-green-800 mb-2">🔍 Detailed Explanation</h5>
          <div class="text-green-700 text-sm leading-relaxed whitespace-pre-line">${aiAnalysis.explanation}</div>
        </div>

        ${aiAnalysis.suggestions ? `
        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <h5 class="font-semibold text-yellow-800 mb-2">💡 Health Suggestions</h5>
          <p class="text-yellow-700 text-sm leading-relaxed">${aiAnalysis.suggestions}</p>
        </div>
        ` : ''}

        <div class="bg-red-50 border-l-4 border-red-400 p-4">
          <h5 class="font-semibold text-red-800 mb-2">⚠️ Important Disclaimer</h5>
          <p class="text-red-700 text-sm leading-relaxed">${aiAnalysis.disclaimer || 'This is not a medical diagnosis. Please consult qualified healthcare professionals.'}</p>
        </div>
      </div>
    ` : '';

    return `
      <div class="bg-white rounded-lg shadow-md p-6 mb-6 fade-in">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-xl font-semibold mb-2">${report.fileName}</h3>
            <p class="text-gray-600 mb-1"><strong>Type:</strong> ${report.fileType}</p>
            <p class="text-gray-600 mb-1"><strong>Report Date:</strong> ${date}</p>
            <p class="text-gray-600 mb-4"><strong>Uploaded:</strong> ${uploadDate}</p>
          </div>
          <div class="flex gap-2 ml-4">
            <a href="${report.downloadURL}" target="_blank"
               class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm">
              View
            </a>
            <a href="${report.downloadURL}" download
               class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition text-sm">
              Download
            </a>
            <button onclick="deleteReport('${report.id}', '${report.storagePath}')"
                    class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition text-sm">
              Delete
            </button>
          </div>
        </div>
        ${analysisHTML}
      </div>
    `;
  }).join('');
}

// Load reports page
async function loadReportsPage() {
  const result = await getMedicalReports();
  if (result.success) displayMedicalReports(result.data);
}

// Delete report implementation: deletes from Storage and Firestore
async function deleteMedicalReport(reportDocId, storagePath) {
  try {
    const { storage, db, auth } = _getStorageDbAuth();
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'No authenticated user.' };

    // Delete storage file
    if (storagePath) {
      try {
        await storage.ref().child(storagePath).delete();
      } catch (err) {
        console.warn('Failed to delete storage object:', err);
      }
    }

    // Delete firestore doc
    await db.collection('users').doc(user.uid).collection('reports').doc(reportDocId).delete();
    return { success: true };
  } catch (err) {
    console.error('deleteMedicalReport error:', err);
    return { success: false, error: (err && err.message) || String(err) };
  }
}

// Delete report handler
async function deleteReport(reportId, storagePath) {
  if (!confirm('Are you sure you want to delete this report?')) return;

  const result = await deleteMedicalReport(reportId, storagePath);
  if (result.success) {
    alert('Report deleted successfully');
    loadReportsPage();
  } else {
    alert('Error deleting report: ' + result.error);
  }
}

// Expose functions globally
+window.uploadMedicalReport = uploadMedicalReport;
+window.getMedicalReports = getMedicalReports;
+window.loadReportsPage = loadReportsPage;
+window.deleteReport = deleteReport;
+window.displayMedicalReports = displayMedicalReports;
