/*
 * doctor-dashboard.js
 * Functions for the doctor dashboard functionality
 */

/**
 * loadDoctorDashboard()
 * - Loads doctor's appointments and profile information
 */
async function loadDoctorDashboard() {
  try {
    const { auth, db } = _getFirebaseInstances();
    const user = auth.currentUser;
    if (!user) return;

    // Load doctor profile
    const profile = await getUserProfile(user.uid);
    if (profile.success) {
      document.getElementById('doctor-name').textContent = `Dr. ${profile.data.username || 'Doctor'}`;
    }

    // Load today's appointments
    await loadTodaysAppointments();

  } catch (error) {
    console.error('Error loading doctor dashboard:', error);
  }
}

/**
 * loadTodaysAppointments()
 * - Loads appointments for today
 */
async function loadTodaysAppointments() {
  try {
    const { auth, db } = _getFirebaseInstances();
    const user = auth.currentUser;
    if (!user) return;

    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Query appointments for this doctor only (no composite index needed)
    // Then filter and sort client-side
    const appointmentsRef = db.collection('appointments')
      .where('doctorId', '==', user.uid);

    const snapshot = await appointmentsRef.get();

    const container = document.getElementById('appointments-list');

    if (snapshot.empty) {
      container.innerHTML = '<p class="text-gray-600 text-center py-8">No appointments found.</p>';
      return;
    }

    // Filter for today's appointments and sort by time client-side
    const appointments = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.date === todayString) {
        appointments.push({ id: doc.id, ...data });
      }
    });

    // Sort by time
    appointments.sort((a, b) => {
      const timeA = a.time || '';
      const timeB = b.time || '';
      return timeA.localeCompare(timeB);
    });

    if (appointments.length === 0) {
      container.innerHTML = '<p class="text-gray-600 text-center py-8">No appointments scheduled for today.</p>';
      return;
    }

    container.innerHTML = appointments.map(appointment => {
      const time = appointment.time || 'TBD';
      const status = appointment.status || 'pending';
      const statusColor = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'accepted': 'bg-green-100 text-green-800',
        'rejected': 'bg-red-100 text-red-800'
      }[status] || 'bg-gray-100 text-gray-800';

      return `
        <div class="bg-gray-50 rounded-lg p-4 mb-4 border-l-4 border-blue-500">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-800">${time}</h3>
              <p class="text-gray-600">Patient: ${appointment.patientName || 'Unknown'}</p>
              <p class="text-sm text-gray-500">Reason: ${appointment.reason || 'General consultation'}</p>
              <span class="inline-block px-2 py-1 text-xs rounded-full ${statusColor} mt-2">
                ${status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
            <div class="flex gap-2 ml-4">
              ${status === 'pending' ? `
                <button onclick="updateAppointmentStatus('${appointment.id}', 'accepted')"
                        class="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm">
                  Accept
                </button>
                <button onclick="updateAppointmentStatus('${appointment.id}', 'rejected')"
                        class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm">
                  Reject
                </button>
              ` : ''}
              <button onclick="viewPatientDetails('${appointment.patientId}', '${appointment.id}')"
                      class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm">
                View Patient
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading appointments:', error);
    const container = document.getElementById('appointments-list');

    if (error.code === 'failed-precondition' || error.message?.includes('index')) {
      container.innerHTML =
        '<p class="text-orange-600 text-center py-8">⚠️ Loading appointments... If this persists, please refresh the page.</p>';
    } else if (error.code === 7 || error.code === 'permission-denied' || error.message?.includes('API has not been used')) {
      container.innerHTML =
        '<p class="text-red-600 text-center py-8">⚠️ Firestore API is not enabled. Please enable it in the Google Cloud Console.</p>';
    } else {
      container.innerHTML =
        '<p class="text-red-600 text-center py-8">Error loading appointments. Please check console for details.</p>';
    }
  }
}

/**
 * updateAppointmentStatus(appointmentId, status)
 * - Updates the status of an appointment
 */
async function updateAppointmentStatus(appointmentId, status) {
  try {
    const { db } = _getFirebaseInstances();

    await db.collection('appointments').doc(appointmentId).update({
      status: status,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Reload appointments
    await loadTodaysAppointments();

    alert(`Appointment ${status} successfully!`);

  } catch (error) {
    console.error('Error updating appointment status:', error);
    alert('Error updating appointment status.');
  }
}

/**
 * viewPatientDetails(patientId, appointmentId)
 * - Shows patient details modal with consent check
 */
async function viewPatientDetails(patientId, appointmentId) {
  try {
    const { db } = _getFirebaseInstances();

    // Check if consent is granted for this appointment
    const appointmentDoc = await db.collection('appointments').doc(appointmentId).get();
    if (!appointmentDoc.exists) {
      alert('Appointment not found.');
      return;
    }

    const appointment = appointmentDoc.data();
    if (!appointment.consentGranted) {
      alert('Patient has not granted consent for this appointment. You cannot view their data.');
      return;
    }

    // Check if appointment is still active (not expired)
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
    const now = new Date();
    if (appointmentDateTime < now && appointment.status === 'accepted') {
      alert('This appointment has expired. Consent is no longer active.');
      return;
    }

    // Load patient profile
    const patientProfile = await getUserProfile(patientId);
    if (!patientProfile.success) {
      alert('Patient profile not found.');
      return;
    }

    const patient = patientProfile.data;

    // Load patient reports using the new API
    const reportsResult = await getPatientReportsForDoctor(patientId);
    const reports = reportsResult.success ? reportsResult.data : [];

    // Load patient health data
    const bpSnapshot = await db.collection('users').doc(patientId).collection('health-readings')
      .where('type', '==', 'bp').get();
    const sugarSnapshot = await db.collection('users').doc(patientId).collection('health-readings')
      .where('type', '==', 'sugar').get();

    const bpData = [];
    bpSnapshot.forEach(doc => bpData.push(doc.data()));

    const sugarData = [];
    sugarSnapshot.forEach(doc => sugarData.push(doc.data()));

    // Build patient details HTML
    const patientDetailsHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Patient Profile -->
        <div class="bg-blue-50 p-6 rounded-lg">
          <h4 class="text-xl font-semibold mb-4 text-blue-800">Patient Profile</h4>
          <div class="space-y-2">
            <p><strong>Name:</strong> ${patient.username || 'N/A'}</p>
            <p><strong>Age:</strong> ${patient.age || 'N/A'}</p>
            <p><strong>Gender:</strong> ${patient.gender || 'N/A'}</p>
            <p><strong>Email:</strong> ${patient.email || 'N/A'}</p>
          </div>
        </div>

        <!-- Medical Reports -->
        <div class="bg-green-50 p-6 rounded-lg">
          <h4 class="text-xl font-semibold mb-4 text-green-800">Medical Reports</h4>
          ${reports.length > 0 ? `
            <div class="space-y-2 max-h-60 overflow-y-auto">
              ${reports.map(report => `
                <div class="bg-white p-3 rounded border">
                  <p class="font-medium">${report.originalName || report.fileName}</p>
                  <p class="text-sm text-gray-600">${report.mimeType} - ${report.uploadedAt?.toDate()?.toLocaleDateString() || 'N/A'}</p>
                  <div class="flex gap-2 mt-2">
                    <button onclick="viewReport('${report.id}')" class="text-blue-600 hover:underline text-sm">View Report</button>
                    <button onclick="analyzeReport('${report.id}')" class="text-purple-600 hover:underline text-sm">AI Analysis</button>
                  </div>
                  ${report.aiAnalysis ? `<div class="mt-2 p-2 bg-purple-50 rounded text-sm"><strong>AI Analysis:</strong> ${report.aiAnalysis}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : '<p class="text-gray-600">No reports available</p>'}
        </div>

        <!-- Health Charts -->
        <div class="bg-purple-50 p-6 rounded-lg">
          <h4 class="text-xl font-semibold mb-4 text-purple-800">Blood Pressure History</h4>
          ${bpData.length > 0 ? `
            <div class="space-y-2 max-h-60 overflow-y-auto">
              ${bpData.slice(-5).reverse().map(bp => `
                <div class="bg-white p-2 rounded text-sm">
                  ${bp.systolic}/${bp.diastolic} mmHg - ${bp.timestamp?.toDate()?.toLocaleDateString() || 'N/A'}
                </div>
              `).join('')}
            </div>
          ` : '<p class="text-gray-600">No blood pressure data</p>'}
        </div>

        <div class="bg-yellow-50 p-6 rounded-lg">
          <h4 class="text-xl font-semibold mb-4 text-yellow-800">Blood Sugar History</h4>
          ${sugarData.length > 0 ? `
            <div class="space-y-2 max-h-60 overflow-y-auto">
              ${sugarData.slice(-5).reverse().map(sugar => `
                <div class="bg-white p-2 rounded text-sm">
                  ${sugar.value} mg/dL (${sugar.sugarType || 'N/A'}) - ${sugar.timestamp?.toDate()?.toLocaleDateString() || 'N/A'}
                </div>
              `).join('')}
            </div>
          ` : '<p class="text-gray-600">No blood sugar data</p>'}
        </div>
      </div>

      <!-- Doctor Notes -->
      <div class="mt-6 bg-gray-50 p-6 rounded-lg">
        <h4 class="text-xl font-semibold mb-4 text-gray-800">Doctor Notes</h4>
        <textarea id="doctor-notes" rows="4" class="w-full p-3 border rounded-lg"
                  placeholder="Add your notes about this patient...">${appointment.doctorNotes || ''}</textarea>
        <button onclick="saveDoctorNotes('${appointmentId}')"
                class="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Save Notes
        </button>
      </div>
    `;

    document.getElementById('patient-details').innerHTML = patientDetailsHTML;
    document.getElementById('patient-modal').classList.remove('hidden');

  } catch (error) {
    console.error('Error viewing patient details:', error);
    alert('Error loading patient details.');
  }
}

/**
 * saveDoctorNotes(appointmentId)
 * - Saves doctor's notes for an appointment
 */
async function saveDoctorNotes(appointmentId) {
  try {
    const { db } = _getFirebaseInstances();
    const notes = document.getElementById('doctor-notes').value;

    await db.collection('appointments').doc(appointmentId).update({
      doctorNotes: notes,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert('Notes saved successfully!');

  } catch (error) {
    console.error('Error saving notes:', error);
    alert('Error saving notes.');
  }
}

/**
 * closePatientModal()
 * - Closes the patient details modal
 */
function closePatientModal() {
  document.getElementById('patient-modal').classList.add('hidden');
}

/**
 * viewReport(reportId)
 * - Gets signed URL and opens report in new tab
 */
async function viewReport(reportId) {
  try {
    const result = await getReportSignedUrl(reportId);
    if (result.success) {
      window.open(result.data.signedUrl, '_blank');
    } else {
      alert('Error accessing report: ' + result.error);
    }
  } catch (error) {
    console.error('Error viewing report:', error);
    alert('Error viewing report.');
  }
}

/**
 * analyzeReport(reportId)
 * - Performs AI analysis on the medical report
 */
async function analyzeReport(reportId) {
  try {
    if (!confirm('This will perform AI analysis on the medical report. Continue?')) {
      return;
    }

    // Show loading state
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'Analyzing...';
    button.disabled = true;

    const result = await analyzeMedicalReportAI(reportId);
    if (result.success) {
      alert('AI analysis completed! Refresh the page to see the results.');
      // Reload patient details to show new analysis
      closePatientModal();
    } else {
      alert('Error analyzing report: ' + result.error);
    }

    // Reset button
    button.textContent = originalText;
    button.disabled = false;

  } catch (error) {
    console.error('Error analyzing report:', error);
    alert('Error analyzing report.');
  }
}

// Expose functions globally
window.loadDoctorDashboard = loadDoctorDashboard;
window.loadTodaysAppointments = loadTodaysAppointments;
window.updateAppointmentStatus = updateAppointmentStatus;
window.viewPatientDetails = viewPatientDetails;
window.saveDoctorNotes = saveDoctorNotes;
window.closePatientModal = closePatientModal;
window.viewReport = viewReport;
window.analyzeReport = analyzeReport;