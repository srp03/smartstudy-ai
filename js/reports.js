/**
 * Medical Reports Module
 * Handles upload, storage, and retrieval of medical reports
 */

// Upload medical report to Firebase Storage
async function uploadMedicalReport(file, reportName, reportType, reportDate) {
  try {
    const user = getCurrentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      return { success: false, error: 'Invalid file type. Only PDF and images allowed.' };
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: 'File size exceeds 10MB limit.' };
    }

    // Create storage reference
    const storageRef = firebaseStorage.ref();
    const fileRef = storageRef.child(`medical-reports/${user.uid}/${Date.now()}_${file.name}`);

    // Upload file
    const snapshot = await fileRef.put(file);
    const downloadURL = await snapshot.ref.getDownloadURL();

    // Save metadata to Firestore
    await firebaseDb.collection('medicalReports').add({
      userId: user.uid,
      fileName: reportName,
      fileType: reportType,
      reportDate: reportDate,
      storagePath: snapshot.ref.fullPath,
      downloadURL: downloadURL,
      uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, downloadURL: downloadURL };
  } catch (error) {
    console.error('Upload report error:', error);
    return { success: false, error: error.message };
  }
}

// Get all medical reports for current user
async function getMedicalReports() {
  try {
    const user = getCurrentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const snapshot = await firebaseDb.collection('medicalReports')
      .where('userId', '==', user.uid)
      .orderBy('uploadedAt', 'desc')
      .get();

    const reports = [];
    snapshot.forEach(doc => {
      reports.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return { success: true, reports: reports };
  } catch (error) {
    console.error('Get reports error:', error);
    return { success: false, error: error.message };
  }
}

// Delete medical report
async function deleteMedicalReport(reportId, storagePath) {
  try {
    const user = getCurrentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Delete from Firestore
    await firebaseDb.collection('medicalReports').doc(reportId).delete();

    // Delete from Storage
    const storageRef = firebaseStorage.ref(storagePath);
    await storageRef.delete();

    return { success: true };
  } catch (error) {
    console.error('Delete report error:', error);
    return { success: false, error: error.message };
  }
}

// Display medical reports
function displayMedicalReports(reports) {
  const container = document.getElementById('reports-list');
  if (!container) return;

  if (reports.length === 0) {
    container.innerHTML = '<p class="text-gray-600 text-center py-8">No medical reports uploaded yet.</p>';
    return;
  }

  container.innerHTML = reports.map(report => {
    const date = report.reportDate || 'N/A';
    const uploadDate = report.uploadedAt?.toDate ? report.uploadedAt.toDate().toLocaleDateString() : 'N/A';
    
    return `
      <div class="bg-white rounded-lg shadow-md p-6 mb-4">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-xl font-semibold mb-2">${report.fileName}</h3>
            <p class="text-gray-600 mb-1"><strong>Type:</strong> ${report.fileType}</p>
            <p class="text-gray-600 mb-1"><strong>Report Date:</strong> ${date}</p>
            <p class="text-gray-600 mb-4"><strong>Uploaded:</strong> ${uploadDate}</p>
          </div>
          <div class="flex gap-2">
            <a href="${report.downloadURL}" target="_blank" 
               class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
              View
            </a>
            <a href="${report.downloadURL}" download 
               class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition">
              Download
            </a>
            <button onclick="deleteReport('${report.id}', '${report.storagePath}')" 
                    class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition">
              Delete
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Load reports page
async function loadReportsPage() {
  try {
    const result = await getMedicalReports();
    if (result.success) {
      displayMedicalReports(result.reports);
    }
  } catch (error) {
    console.error('Load reports page error:', error);
  }
}

// Delete report handler
async function deleteReport(reportId, storagePath) {
  if (!confirm('Are you sure you want to delete this report?')) {
    return;
  }

  const result = await deleteMedicalReport(reportId, storagePath);
  if (result.success) {
    alert('Report deleted successfully');
    loadReportsPage();
  } else {
    alert('Error deleting report: ' + result.error);
  }
}
