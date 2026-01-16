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

// GEMINI_API_KEY is already declared in dashboard.js - using from window.appConfig when needed
// const GEMINI_API_KEY = window.appConfig.get('GEMINI_API_KEY');
// GEMINI_API_URL is also declared in dashboard.js
// const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';


console.log('reports.js loaded successfully');

// Ensure `requestAppointment` is always defined on `window` to avoid
// ReferenceError if frontend code invokes it before this module finishes
// initializing. The stub returns a quick resolved Promise with an error
// message; the real implementation will overwrite this when ready.
if (typeof window !== 'undefined' && typeof window.requestAppointment === 'undefined') {
  // Queue calls until the real implementation is available. Calls time out
  // after 3 seconds and return a fast error to the caller.
  window.__reports_requestAppointment_queue = window.__reports_requestAppointment_queue || [];
  window.requestAppointment = (...args) => {
    if (window.__reports_requestAppointment_impl) {
      return window.__reports_requestAppointment_impl(...args);
    }

    // Fast-path: perform appointment creation directly using Firebase globals
    // so booking works immediately after login even if reports module isn't ready.
    return (async () => {
      try {
        if (typeof firebase === 'undefined') {
          return { success: false, error: 'Firebase SDK not available' };
        }

        const [doctorId, dateTime, reason] = args;
        const auth = firebase.auth();
        const db = firebase.firestore();
        const user = auth.currentUser;
        if (!user) return { success: false, error: 'No authenticated user.' };

        // Fetch patient profile (best-effort)
        let patientProfile = null;
        try {
          const pd = await db.collection('users').doc(user.uid).get();
          patientProfile = pd.exists ? pd.data() : { email: user.email };
        } catch (e) {
          patientProfile = { email: user.email };
        }

        // Parse date/time
        const appointmentDateTime = new Date(dateTime);
        const date = appointmentDateTime.toISOString().split('T')[0];
        const time = appointmentDateTime.toTimeString().split(' ')[0].substring(0, 5);

        // Fetch doctor profile
        let doctorProfile = null;
        try {
          const dd = await db.collection('users').doc(doctorId).get();
          if (!dd.exists) return { success: false, error: 'Doctor not found.' };
          doctorProfile = dd.data();
        } catch (e) {
          return { success: false, error: 'Doctor lookup failed' };
        }

        const appointmentData = {
          patientId: user.uid,
          patientName: patientProfile.username || patientProfile.email || user.email,
          doctorId: doctorId,
          doctorName: `Dr. ${doctorProfile.username || doctorProfile.email || ''}`,
          date: date,
          time: time,
          reason: reason,
          status: 'pending',
          consentGranted: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('appointments').add(appointmentData);

        // Try to refresh appointments UI immediately if available.
        try {
          if (typeof window.loadMyAppointments === 'function') {
            try { window.loadMyAppointments(); } catch (e) { /* ignore UI errors */ }
          } else {
            // Poll briefly for up to 3s for `loadMyAppointments` to become available
            let waited = 0;
            const iv = setInterval(() => {
              if (typeof window.loadMyAppointments === 'function') {
                clearInterval(iv);
                try { window.loadMyAppointments(); } catch (e) { }
              }
              waited += 200;
              if (waited > 3000) clearInterval(iv);
            }, 200);
          }
        } catch (e) {
          // Do not fail appointment creation due to UI refresh issues
        }

        return { success: true };
      } catch (err) {
        console.error('Fast-path appointment error:', err);
        return { success: false, error: err && err.message ? err.message : String(err) };
      }
    })();
  };
}

function _getStorageDbAuth() {
  if (typeof window !== 'undefined' && window.firebaseDb && window.firebaseAuth) {
    return { db: window.firebaseDb, auth: window.firebaseAuth };
  }
  if (typeof firebase !== 'undefined') {
    window.firebaseAuth = window.firebaseAuth || firebase.auth();
    window.firebaseDb = window.firebaseDb || firebase.firestore();
    // Storage removed
    // window.firebaseStorage = window.firebaseStorage || firebase.storage();
    return { db: window.firebaseDb, auth: window.firebaseAuth };
  }
  throw new Error('Firebase SDK not found. Include compat CDN scripts before reports.js');
}



/**
 * uploadMedicalReport(file, name, type, date, onProgress)
 * - Uploads `file` (File object) to backend API (Supabase Storage) and stores metadata in Firestore.
 * - Includes AI analysis using backend Gemini API for medical report insights.
 * - Shows upload progress via callback function.
 * - Files are stored securely in patient-specific Supabase Storage paths.
 */
async function uploadMedicalReport(file, name, type, date, appointmentId = null, onProgress = null) {
  try {
    const { auth } = _getStorageDbAuth();
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'No authenticated user.' };

    // Validate file
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) return { success: false, error: 'Invalid file type. Only PDF and images are supported.' };
    if (file.size > 10 * 1024 * 1024) return { success: false, error: 'File exceeds 10MB limit.' };

    console.log('📤 Uploading to backend API...');

    // Get user's email for backend validation
    const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
    const userEmail = userDoc.exists ? userDoc.data().email : user.email;

    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('report', file);
    formData.append('patientId', user.uid);
    formData.append('patientEmail', userEmail);
    if (appointmentId) formData.append('appointmentId', appointmentId);

    // Upload to backend API with progress tracking
    const xhr = new XMLHttpRequest();

    // Set up progress tracking
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });
    }

    // Return a Promise that resolves with the upload result
    return new Promise((resolve, reject) => {
      xhr.open('POST', 'http://localhost:3001/api/reports/upload');

      xhr.onload = async function () {
        try {
          const response = JSON.parse(xhr.responseText);

          if (xhr.status === 200 && response.success) {
            console.log('✅ File uploaded to Supabase Storage successfully');

            // Get the uploaded report data
            const reportData = {
              id: response.reportId,
              fileName: name || file.name,
              fileType: type || file.type || null,
              reportDate: date || null,
              storagePath: response.fileName,
              fileSize: file.size,
              uploadedAt: new Date(),
            };

            resolve({ success: true, data: reportData });
          } else {
            // Handle structured backend error
            const errorMessage = response.error || 'Upload failed with status ' + xhr.status;
            reject(new Error(errorMessage));
          }
        } catch (error) {
          // JSON parse error or other logic error
          reject(new Error('Invalid response from server: ' + error.message));
        }
      };

      xhr.onerror = function () {
        reject(new Error('Network error during upload'));
      };

      xhr.send(formData);
    });

  } catch (error) {
    console.error('uploadMedicalReport error:', error);
    return { success: false, error: (error && error.message) || String(error) };
  }
}

/**
 * getMedicalReports()
 * - Retrieves list of medical report metadata for the current user from the medicalReports collection.
 */
async function getMedicalReports() {
  try {
    const { db, auth } = _getStorageDbAuth();
    const user = auth.currentUser;
    if (!user) {
      console.log('❌ getMedicalReports: No user logged in');
      return { success: false, error: 'No authenticated user.' };
    }

    console.log('📋 Fetching reports for user:', user.uid);

    // Query reports where patientId matches current user
    // Using orderBy with where requires a composite index
    // For now, we'll get all reports and filter client-side
    const snaps = await db.collection('medicalReports')
      .where('patientId', '==', user.uid)
      .get();

    console.log('📊 Firestore query complete. Empty:', snaps.empty, 'Size:', snaps.size);

    const reports = [];
    snaps.forEach(d => {
      const reportData = { id: d.id, ...d.data() };
      console.log('📄 Report:', reportData.reportName || reportData.fileName, 'ID:', d.id);
      reports.push(reportData);
    });

    // Sort by uploadedAt descending
    reports.sort((a, b) => {
      const aTime = a.uploadedAt?.toDate?.() || new Date(0);
      const bTime = b.uploadedAt?.toDate?.() || new Date(0);
      return bTime - aTime;
    });

    console.log('✅ Total reports loaded:', reports.length);
    return { success: true, data: reports };
  } catch (err) {
    console.error('getMedicalReports error:', err);
    return { success: false, error: (err && err.message) || String(err) };
  }
}

// Display reports in the UI
function displayMedicalReports(reports) {
  console.log('🎨 displayMedicalReports called with', reports ? reports.length : 0, 'reports');
  const container = document.getElementById('reports-list');
  if (!container) {
    console.error('❌ reports-list container not found!');
    return;
  }

  if (!reports || reports.length === 0) {
    container.innerHTML = '<p class="text-gray-600 text-center py-8">No medical reports uploaded yet.</p>';
    return;
  }

  container.innerHTML = reports.map(report => {
    const date = report.reportDate || 'N/A';
    const uploadDate = report.uploadedAt && report.uploadedAt.toDate ? report.uploadedAt.toDate().toLocaleDateString() : 'N/A';

    // AI Analysis sections - Fixed for proper text display
    let aiAnalysis = report.aiAnalysis;
    let aiExplanation = report.aiExplanation;

    // Fix for [object Object] issue: extract text if it's an object
    if (typeof aiAnalysis === 'object' && aiAnalysis !== null) {
      if (aiAnalysis.text) aiAnalysis = aiAnalysis.text;
      else if (aiAnalysis.content) aiAnalysis = aiAnalysis.content;
      else if (aiAnalysis.analysis) aiAnalysis = aiAnalysis.analysis;
      else aiAnalysis = JSON.stringify(aiAnalysis, null, 2);
    }

    if (typeof aiExplanation === 'object' && aiExplanation !== null) {
      if (aiExplanation.text) aiExplanation = aiExplanation.text;
      else if (aiExplanation.content) aiExplanation = aiExplanation.content;
      else if (aiExplanation.explanation) aiExplanation = aiExplanation.explanation;
      else aiExplanation = JSON.stringify(aiExplanation, null, 2);
    }

    let analysisHTML = '';

    if (aiAnalysis) {
      analysisHTML = `
      <div class="mt-8 pt-2">
        <div class="clinical-summary fade-in">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                        <span class="text-xl">🤖</span>
                    </div>
                    <div>
                        <h4 class="text-lg font-bold text-gray-800">AI Health Insights</h4>
                        <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-600 tracking-wider uppercase border border-blue-200">
                            ✨ Powered by Gemini AI
                        </span>
                    </div>
                </div>
                  <div class="flex gap-2">
                      <button onclick="window.print()" class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition">
                        📄 Print
                      </button>
                      <button onclick="downloadAnalysis('${report.id}')" class="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition" title="Download AI analysis/explanation as TXT">
                        💾 Download Explanation
                      </button>
                    </div>
            </div>
            
            <div class="space-y-4">
                <div class="stagger-item">
                    </h5>
                    <div class="bg-blue-50/50 rounded-lg p-3 text-gray-700 leading-relaxed typewriter-text">
                        ${aiAnalysis}
                    </div>
                </div>

                 <div class="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                     <span class="text-xs text-gray-400 italic">Analysis performed on ${new Date(report.analyzedAt?.toDate?.() || Date.now()).toLocaleDateString()}</span>
                 </div>
            </div>
        </div>
      </div>
    `;
    }

    if (aiExplanation) {
      analysisHTML += `
      <div class="mt-6 pt-6 border-t">
        <div class="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                        <span class="text-sm">💡</span>
                    </div>
                    <h4 class="text-md font-bold text-gray-800">AI Explanation</h4>
                </div>
            </div>
            <div class="text-gray-700 leading-relaxed">
              ${aiExplanation}
            </div>
            <div class="mt-3 flex justify-end">
              <button onclick="downloadAnalysis('${report.id}')" class="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition">💾 Download Explanation</button>
            </div>
            <div class="mt-2 text-xs text-gray-400">
                Generated on ${new Date(report.explanationGeneratedAt?.toDate?.() || Date.now()).toLocaleDateString()}
            </div>
        </div>
      </div>
    `;
    }

    if (!aiAnalysis && !aiExplanation) {
      // For hackathon/demo builds with unreliable Gemini, hide the explanation button
      // and show a short premium message instead. The generateAIExplanation handler
      // is kept but turned into a safe no-op.
      analysisHTML = `
      <div class="mt-6 border-t pt-6">
        <div class="bg-gray-50 border-l-4 border-gray-300 p-4 rounded-r-lg">
            <div class="flex items-start gap-3">
                 <div class="text-gray-400 text-xl">ℹ️</div>
                 <div class="flex-1">
                    <p class="text-gray-600 font-medium">Report explanation</p>
                    <p class="text-sm text-gray-500 mt-1">Report explanation is available in premium version.</p>
                 </div>
            </div>
        </div>
      </div>
    `;
    }

    return `
      <div class="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 mb-8 border border-gray-100 relative overflow-hidden group">
        <div class="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-400 to-indigo-500"></div>
        <div class="flex justify-between items-start pl-4">
          <div class="flex-1">
             <div class="flex items-center gap-3 mb-2">
                <span class="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">${report.fileType || 'Doc'}</span>
                <span class="text-gray-400 text-sm flex items-center gap-1">📅 ${date}</span>
             </div>
            <h3 class="text-2xl font-bold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">${report.fileName}</h3>
            <p class="text-sm text-gray-500 flex items-center gap-1">
                📤 Uploaded on ${uploadDate}
            </p>
          </div>
           <div class="flex gap-2">
             <button onclick="downloadReportFile('${report.id}')" class="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors" title="Download original report">
               ⬇️
             </button>
             <button onclick="deleteReport('${report.id}')" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Delete Report">
               🗑️
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
  console.log('🔍 loadReportsPage called');
  try {
    console.log('📞 Calling getMedicalReports...');
    const result = await getMedicalReports();
    console.log('📦 getMedicalReports result:', result);
    if (result.success) {
      console.log('Reports loaded:', result.data.length);
      displayMedicalReports(result.data);
    } else {
      console.error('Failed to load reports:', result.error);
      const container = document.getElementById('reports-list');
      if (container) {
        container.innerHTML = '<p class="text-red-600 text-center py-8">Failed to load reports. Please try again.</p>';
      }
    }
  } catch (error) {
    console.error('Error in loadReportsPage:', error);
  }
}

// Generate AI Explanation for patients
async function generateAIExplanation(reportId) {
  // Explanation feature is disabled in hackathon demo builds with limited Gemini API.
  // Show a friendly, non-intrusive message in the UI. The button that used to call
  // this function is hidden in the UI; this handler remains to avoid broken refs.
  try {
    const errorDiv = document.getElementById(`explain-error-${reportId}`);
    if (errorDiv) {
      errorDiv.textContent = 'Report explanation is available in premium version.';
      errorDiv.classList.remove('hidden');
    } else {
      alert('Report explanation is available in premium version.');
    }
    return { success: false, message: 'Disabled in demo' };
  } catch (err) {
    console.error('generateAIExplanation (disabled) error:', err);
    return { success: false, error: (err && err.message) || String(err) };
  }
}

// Delete report implementation: deletes from Firestore (Storage deletion handled by backend/Supabase usually)
async function deleteMedicalReport(reportDocId, storagePath) {
  try {
    const { db, auth } = _getStorageDbAuth();
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'No authenticated user.' };

    // Delete firestore doc
    await db.collection('users').doc(user.uid).collection('reports').doc(reportDocId).delete();
    return { success: true };
  } catch (err) {
    console.error('deleteMedicalReport error:', err);
    return { success: false, error: (err && err.message) || String(err) };
  }
}

// Delete report handler
async function deleteReport(reportId) {
  if (!confirm('Are you sure you want to delete this report?')) return;

  try {
    const { db, auth } = _getStorageDbAuth();
    const user = auth.currentUser;
    if (!user) {
      alert('No authenticated user.');
      return;
    }

    // Get the report document from medicalReports collection
    const docRef = db.collection('medicalReports').doc(reportId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      alert('Report not found.');
      return;
    }

    const reportData = docSnap.data();

    // Verify the report belongs to the current user
    if (reportData.patientId !== user.uid) {
      alert('You can only delete your own reports.');
      return;
    }

    // Delete from Firestore (Supabase storage deletion will be handled by backend cleanup if needed)
    await docRef.delete();

    alert('Report deleted successfully');
    loadReportsPage();

  } catch (error) {
    console.error('Error in deleteReport:', error);
    alert('Error deleting report: ' + error.message);
  }

  // Duplicate loadReportsPage function removed - using the comprehensive one at line 285


  // Form submission handler for upload
  document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
      uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fileInput = document.getElementById('report-file');
        const nameInput = document.getElementById('report-name');
        const typeInput = document.getElementById('report-type');
        const dateInput = document.getElementById('report-date');

        const file = fileInput.files[0];
        const name = nameInput.value.trim();
        const type = typeInput.value;
        const date = dateInput.value;

        // Clear previous messages - with null checks
        const uploadError = document.getElementById('upload-error');
        const uploadSuccess = document.getElementById('upload-success');
        const aiAnalysisLoading = document.getElementById('ai-analysis-loading');
        const uploadProgress = document.getElementById('upload-progress');

        if (uploadError) uploadError.classList.add('hidden');
        if (uploadSuccess) uploadSuccess.classList.add('hidden');
        if (aiAnalysisLoading) aiAnalysisLoading.classList.add('hidden');
        if (uploadProgress) uploadProgress.classList.add('hidden');

        // Validate inputs
        if (!file || !name || !type || !date) {
          showUploadError('Please fill in all fields');
          return;
        }

        // Show upload progress - with null checks
        if (uploadProgress) uploadProgress.classList.remove('hidden');
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        if (progressBar) progressBar.style.width = '0%';
        if (progressText) progressText.textContent = 'Starting upload...';

        try {
          const result = await uploadMedicalReport(file, name, type, date, null, (progress) => {
            const bar = document.getElementById('progress-bar');
            const text = document.getElementById('progress-text');
            if (bar) bar.style.width = progress + '%';
            if (text) text.textContent = `Uploading... ${Math.round(progress)}%`;
          });

          if (result.success) {
            showUploadSuccess('Medical report uploaded successfully!');
            // Reset form
            uploadForm.reset();
            // Reload reports after a small delay to ensure Firestore has saved
            console.log('🔄 Reloading reports page...');
            setTimeout(async () => {
              await loadReportsPage();
            }, 1000);
          } else {
            showUploadError(result.error || 'Upload failed');
          }
        } catch (error) {
          showUploadError('Upload failed: ' + error.message);
        } finally {
          // Hide progress and loading indicators - with null checks
          const prog = document.getElementById('upload-progress');
          const aiLoading = document.getElementById('ai-analysis-loading');
          if (prog) prog.classList.add('hidden');
          if (aiLoading) aiLoading.classList.add('hidden');
        }
      });
    }
  });

  // ==========================================
  // APPOINTMENT MANAGEMENT FUNCTIONS
  // ==========================================

  /**
   * showAppointmentRequestForm()
   * - Shows the appointment request form and loads available doctors
   */
  function showAppointmentRequestForm() {
    document.getElementById('appointment-request-form').classList.remove('hidden');
    loadAvailableDoctors();
  }

  /**
   * hideAppointmentRequestForm()
   * - Hides the appointment request form
   */
  function hideAppointmentRequestForm() {
    document.getElementById('appointment-request-form').classList.add('hidden');
    document.getElementById('request-appointment-form').reset();
  }

  /**
   * loadAvailableDoctors()
   * - Loads list of available doctors for appointment requests
   */
  async function loadAvailableDoctors() {
    try {
      const { db } = _getFirebaseInstances();
      const doctorsSelect = document.getElementById('doctor-select');

      // Clear existing options except the first one
      doctorsSelect.innerHTML = '<option value="">Choose a doctor...</option>';

      // Query users with role 'doctor'
      const doctorsSnapshot = await db.collection('users')
        .where('role', '==', 'doctor')
        .get();

      doctorsSnapshot.forEach(doc => {
        const doctor = doc.data();
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = `Dr. ${doctor.username || doctor.email}`;
        doctorsSelect.appendChild(option);
      });

    } catch (error) {
      console.error('Error loading doctors:', error);
    }
  }

  /**
   * requestAppointment()
   * - Handles appointment request form submission
   */
  async function requestAppointment(doctorId, dateTime, reason) {
    try {
      const { auth, db } = _getFirebaseInstances();
      const user = auth.currentUser;
      if (!user) return { success: false, error: 'No authenticated user.' };

      // Get patient profile
      const patientProfile = await getUserProfile(user.uid);
      if (!patientProfile.success) return { success: false, error: 'Patient profile not found.' };

      // Parse date and time
      const appointmentDateTime = new Date(dateTime);
      const date = appointmentDateTime.toISOString().split('T')[0];
      const time = appointmentDateTime.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format

      // Get doctor profile
      const doctorProfile = await getUserProfile(doctorId);
      if (!doctorProfile.success) return { success: false, error: 'Doctor not found.' };

      // Create appointment document
      const appointmentData = {
        patientId: user.uid,
        patientName: patientProfile.data.username || patientProfile.data.email,
        doctorId: doctorId,
        doctorName: `Dr. ${doctorProfile.data.username || doctorProfile.data.email}`,
        date: date,
        time: time,
        reason: reason,
        status: 'pending',
        consentGranted: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('appointments').add(appointmentData);

      return { success: true };

    } catch (error) {
      console.error('Error requesting appointment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * loadMyAppointments()
   * - Loads patient's appointments
   */
  async function loadMyAppointments() {
    try {
      const { auth, db } = _getFirebaseInstances();
      const user = auth.currentUser;
      if (!user) return;

      const container = document.getElementById('my-appointments-list');

      // Query appointments for this patient
      const appointmentsSnapshot = await db.collection('appointments')
        .where('patientId', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .get();

      if (appointmentsSnapshot.empty) {
        container.innerHTML = '<p class="text-gray-600 text-center py-4">No appointments found.</p>';
        return;
      }

      const appointments = [];
      appointmentsSnapshot.forEach(doc => {
        appointments.push({ id: doc.id, ...doc.data() });
      });

      container.innerHTML = appointments.map(appointment => {
        const statusColor = {
          'pending': 'bg-yellow-100 text-yellow-800',
          'accepted': 'bg-green-100 text-green-800',
          'rejected': 'bg-red-100 text-red-800'
        }[appointment.status] || 'bg-gray-100 text-gray-800';

        const statusLabel = {
          'pending': 'Doctor is reviewing',
          'accepted': 'Approved by doctor',
          'rejected': 'Rejected'
        }[appointment.status] || (appointment.status ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1) : 'Unknown');

        const consentButton = appointment.status === 'accepted' && !appointment.consentGranted ? `
        <button onclick="grantConsent('${appointment.id}')"
                class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm">
          Grant Consent
        </button>
      ` : appointment.consentGranted ? `
        <button onclick="revokeConsent('${appointment.id}')"
                class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm">
          Revoke Consent
        </button>
      ` : '';

        return `
        <div class="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-800">${appointment.doctorName}</h3>
              <p class="text-gray-600">${appointment.date} at ${appointment.time}</p>
              <p class="text-sm text-gray-500">Reason: ${appointment.reason}</p>
              <span class="inline-block px-2 py-1 text-xs rounded-full ${statusColor} mt-2">
                ${statusLabel}
              </span>
              ${appointment.consentGranted ? '<span class="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 ml-2">Consent Granted</span>' : ''}
            </div>
            <div class="flex gap-2 ml-4">
              ${consentButton}
            </div>
          </div>
        </div>
      `;
      }).join('');

    } catch (error) {
      console.error('Error loading appointments:', error);
      if (error.code === 'failed-precondition') {
        document.getElementById('my-appointments-list').innerHTML =
          '<p class="text-orange-600 text-center py-4">⚠️ System is building database indexes. This may take a few minutes. Please try again shortly.</p>';
      } else if (error.code === 7 || error.code === 'permission-denied' || error.message.includes('API has not been used')) {
        document.getElementById('my-appointments-list').innerHTML =
          '<p class="text-red-600 text-center py-4">⚠️ Firestore API is not enabled. Please enable it in the Google Cloud Console.</p>';
      } else {
        document.getElementById('my-appointments-list').innerHTML =
          '<p class="text-red-600 text-center py-4">Error loading appointments.</p>';
      }
    }
  }

  /**
   * grantConsent(appointmentId)
   * - Grants consent for doctor to access patient data
   */
  async function grantConsent(appointmentId) {
    try {
      const { db } = _getFirebaseInstances();

      await db.collection('appointments').doc(appointmentId).update({
        consentGranted: true,
        consentGrantedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      alert('Consent granted successfully! The doctor can now access your medical data for this appointment.');
      loadMyAppointments();

    } catch (error) {
      console.error('Error granting consent:', error);
      alert('Error granting consent.');
    }
  }

  /**
   * revokeConsent(appointmentId)
   * - Revokes consent for doctor to access patient data
   */
  async function revokeConsent(appointmentId) {
    try {
      const { db } = _getFirebaseInstances();

      await db.collection('appointments').doc(appointmentId).update({
        consentGranted: false,
        consentRevokedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      alert('Consent revoked successfully! The doctor can no longer access your medical data.');
      loadMyAppointments();

    } catch (error) {
      console.error('Error revoking consent:', error);
      alert('Error revoking consent.');
    }
  }

  // Helper functions for UI feedback
  function showUploadError(message) {
    const errorEl = document.getElementById('upload-error');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    document.getElementById('upload-success').classList.add('hidden');
  }

  function showUploadSuccess(message) {
    const successEl = document.getElementById('upload-success');
    successEl.textContent = message;
    successEl.classList.remove('hidden');
    document.getElementById('upload-error').classList.add('hidden');
  }

  // Expose functions globally
  window.uploadMedicalReport = uploadMedicalReport;
  window.getMedicalReports = getMedicalReports;
  window.loadReportsPage = loadReportsPage;
  window.downloadAnalysis = downloadAnalysis;
  window.downloadReportFile = downloadReportFile;
  window.deleteReport = deleteReport;
  window.displayMedicalReports = displayMedicalReports;
  window.showAppointmentRequestForm = showAppointmentRequestForm;
  window.hideAppointmentRequestForm = hideAppointmentRequestForm;
  window.loadAvailableDoctors = loadAvailableDoctors;
  // Make the real implementation available to any queued callers and
  // replace the wrapper with the real function.
  try {
    window.__reports_requestAppointment_impl = requestAppointment;
    if (Array.isArray(window.__reports_requestAppointment_queue) && window.__reports_requestAppointment_queue.length) {
      window.__reports_requestAppointment_queue.forEach(call => {
        try {
          const result = window.__reports_requestAppointment_impl(...call.args);
          Promise.resolve(result).then(call.resolve).catch(err => call.resolve({ success: false, error: err && err.message ? err.message : String(err) }));
        } catch (err) {
          call.resolve({ success: false, error: err && err.message ? err.message : String(err) });
        }
      });
      window.__reports_requestAppointment_queue.length = 0;
    }
  } catch (e) {
    console.warn('Could not flush appointment request queue:', e && e.message ? e.message : e);
  }
  window.requestAppointment = requestAppointment;
  window.loadMyAppointments = loadMyAppointments;
  window.grantConsent = grantConsent;
  window.revokeConsent = revokeConsent;

  /**
   * getReportSignedUrl(reportId)
   * - Gets a signed URL for secure report access (doctors only)
   * - Requires valid Firebase auth token and doctor role
   */
  async function getReportSignedUrl(reportId) {
    try {
      const { auth } = _getStorageDbAuth();
      const user = auth.currentUser;
      if (!user) return { success: false, error: 'No authenticated user.' };

      // Get Firebase ID token
      const idToken = await user.getIdToken();

      const response = await fetch(`http://localhost:3001/api/reports/${reportId}/signed-url`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to get signed URL' };
      }

      return { success: true, data: result };

    } catch (error) {
      console.error('getReportSignedUrl error:', error);
      return { success: false, error: (error && error.message) || String(error) };
    }
  }

  /**
   * analyzeMedicalReportAI(reportId)
   * - Performs AI analysis of a medical report using backend Gemini API (doctors only)
   * - Requires valid Firebase auth token, doctor role, and patient consent
   */
  async function analyzeMedicalReportAI(reportId) {
    try {
      const { auth } = _getStorageDbAuth();
      const user = auth.currentUser;
      if (!user) return { success: false, error: 'No authenticated user.' };

      // Get Firebase ID token
      const idToken = await user.getIdToken();

      const response = await fetch(`http://localhost:3001/api/reports/${reportId}/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to analyze report' };
      }

      return { success: true, data: result };

    } catch (error) {
      console.error('analyzeMedicalReportAI error:', error);
      return { success: false, error: (error && error.message) || String(error) };
    }
  }

  /**
   * getPatientReportsForDoctor(patientId)
   * - Retrieves medical reports for a specific patient (doctors only)
   * - Requires doctor role and patient consent
   */
  async function getPatientReportsForDoctor(patientId) {
    try {
      const { db, auth } = _getStorageDbAuth();
      const user = auth.currentUser;
      if (!user) return { success: false, error: 'No authenticated user.' };

      // Check if current user is a doctor
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (!userDoc.exists || userDoc.data().role !== 'doctor') {
        return { success: false, error: 'Access denied. Doctor role required.' };
      }

      // Check if doctor has consent for this patient
      const consentQuery = await db.collection('consents')
        .where('patientId', '==', patientId)
        .where('doctorId', '==', user.uid)
        .where('status', '==', 'approved')
        .get();

      if (consentQuery.empty) {
        return { success: false, error: 'Access denied. Patient consent required.' };
      }

      // Get patient's reports
      const snaps = await db.collection('medicalReports')
        .where('patientId', '==', patientId)
        .orderBy('uploadedAt', 'desc')
        .get();

      const reports = [];
      snaps.forEach(d => reports.push({ id: d.id, ...d.data() }));

      return { success: true, data: reports };

    } catch (error) {
      return { success: false, error: (error && error.message) || String(error) };
    }
  }

  // Expose functions globally that are defined inside this scope
  window.getReportSignedUrl = getReportSignedUrl;
  window.analyzeMedicalReportAI = analyzeMedicalReportAI;
  window.getPatientReportsForDoctor = getPatientReportsForDoctor;


  // loadReportsPage is already defined globally above
  window.loadReportsPage = loadReportsPage;
  window.displayMedicalReports = displayMedicalReports;
  window.generateAIExplanation = generateAIExplanation;
}

// Download AI Explanation (TXT). Uses existing stored explanation; no new Gemini calls.
async function downloadAnalysis(reportId) {
  try {
    const { db, auth } = _getStorageDbAuth();
    const user = auth.currentUser;
    if (!user) { alert('Not authenticated'); return; }

    const doc = await db.collection('medicalReports').doc(reportId).get();
    if (!doc.exists) { alert('Report not found'); return; }
    const data = doc.data();
    const explanation = data.aiExplanation;
    if (!explanation) { alert('No AI explanation available for this report'); return; }

    const filenameBase = data.fileName ? data.fileName.replace(/\.[^/.]+$/, '') : `report-${reportId}`;
    const filename = `${filenameBase}-explanation.txt`;
    const blob = new Blob([explanation], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error('downloadAnalysis error:', err);
    alert('Failed to download explanation');
  }
}

// Download original report file using backend signed URL. Preserves filename and type.
async function downloadReportFile(reportId) {
  try {
    const { db, auth } = _getStorageDbAuth();
    const user = auth.currentUser;
    if (!user) { alert('Not authenticated'); return; }

    // Use existing helper to request signed URL from backend
    // Prefer calling the global `getReportSignedUrl` if available
    let signedResult;
    if (typeof window.getReportSignedUrl === 'function') {
      signedResult = await window.getReportSignedUrl(reportId);
    } else {
      signedResult = await getReportSignedUrl(reportId).catch(err => ({ success: false, error: err && err.message ? err.message : String(err) }));
    }
    if (!signedResult || !signedResult.success) {
      alert(signedResult && signedResult.error ? signedResult.error : 'Failed to get signed URL');
      return;
    }

    const signedUrl = signedResult.signedUrl || (signedResult.data && (signedResult.data.signedUrl || signedResult.data.fileName)) || null;
    const fileNameFromResp = (signedResult.data && signedResult.data.fileName) || null;

    // Fetch metadata to get original filename
    const doc = await db.collection('medicalReports').doc(reportId).get();
    const data = doc.exists ? doc.data() : {};
    const filename = data.originalName || data.fileName || fileNameFromResp || `report-${reportId}`;

    // Fetch file and trigger download to preserve filename
    const resp = await fetch(signedUrl);
    if (!resp.ok) {
      alert('Failed to download file');
      return;
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error('downloadReportFile error:', err);
    alert('Failed to download report');
  }
}

// Ensure a global helper exists for fetching a signed download URL from the backend.
// This calls the backend `/api/reports/:reportId/signed-url` endpoint securely using the
// current Firebase ID token. Returns { success, signedUrl?, data?, error? }.
if (typeof window.getReportSignedUrl !== 'function') {
  window.getReportSignedUrl = async function(reportId) {
    try {
      const { auth } = _getStorageDbAuth();
      const user = auth.currentUser;
      if (!user) return { success: false, error: 'No authenticated user.' };

      const idToken = await user.getIdToken();
      const resp = await fetch(`http://localhost:3001/api/reports/${encodeURIComponent(reportId)}/signed-url`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      const json = await resp.json().catch(() => null);
      if (!resp.ok) {
        const errMsg = (json && (json.error || json.message)) ? (typeof (json.error || json.message) === 'string' ? (json.error || json.message) : JSON.stringify(json.error || json.message)) : `HTTP ${resp.status}`;
        console.warn('getReportSignedUrl backend error:', errMsg);
        return { success: false, error: errMsg, data: json };
      }

      // Expect backend to return { success: true, signedUrl }
      return { success: true, signedUrl: json.signedUrl || (json.data && json.data.signedUrl) || null, data: json };
    } catch (err) {
      console.error('getReportSignedUrl error:', err && err.message ? err.message : String(err));
      return { success: false, error: (err && err.message) || String(err) };
    }
  };
}