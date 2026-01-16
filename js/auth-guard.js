// auth-guard.js - Centralized authentication and routing logic
// Prevents redirect loops and ensures proper auth flow

class AuthGuard {
  constructor() {
    if (window.authGuardInstance) {
      return window.authGuardInstance;
    }

    this.authResolved = false;
    this.currentUser = null;
    this.listeners = [];
    this.initialRoutingDone = false;
    this.init();

    window.authGuardInstance = this;
  }

  init() {
    // Single global auth state listener
    const { auth } = _getFirebaseInstances();

    // Unsubscribe if existing listener (though in this context we overwrite the window object usually)
    if (this.unsubscribe) this.unsubscribe();

    this.unsubscribe = auth.onAuthStateChanged((user) => {
      console.log('Auth State Changed:', user ? 'Logged In' : 'Logged Out');
      this.currentUser = user;
      this.authResolved = true;

      // Only handle routing on initial auth state (prevents auto-redirects on login/logout)
      if (!this.initialRoutingDone) {
        this.handleRouting();
        this.initialRoutingDone = true;
      }

      // Notify any subscribers (pages waiting for auth)
      this.notifyListeners();
    });
  }

  // Allow pages to wait for auth to be resolved before running logic
  requireAuth(callback) {
    if (this.authResolved) {
      if (this.currentUser) {
        callback(this.currentUser);
      } else {
        // If resolved but not logged in, and we are on a protected page,
        // handleRouting should have already triggered.
        // But we can verify just in case.
        this.handleRouting();
      }
    } else {
      this.listeners.push((user) => {
        if (user) callback(user);
      });
    }
  }

  notifyListeners() {
    if (!this.listeners.length) return;

    this.listeners.forEach(cb => {
      try {
        cb(this.currentUser);
      } catch (e) {
        console.error('Error in auth listener:', e);
      }
    });
    // We only need to run these once after auth resolves? 
    // Usually pages just want "when resolved, do X".
    this.listeners = [];
  }

  async handleRouting() {
    if (!this.authResolved) return;

    const currentPage = this.getCurrentPage();
    const isLoggedIn = !!this.currentUser;

    console.log(`Routing Check: Page=${currentPage}, LoggedIn=${isLoggedIn}`);

    // Public pages: login, register, index
    const publicPages = ['login', 'register', 'index'];

    // Protected pages: dashboard, reports, profile, exercise, doctor-dashboard
    const protectedPages = ['dashboard', 'reports', 'profile', 'exercise', 'doctor-dashboard'];

    if (publicPages.includes(currentPage)) {
      // No automatic redirects for public pages - users can stay on login/register even if logged in
      return;
    }

    if (protectedPages.includes(currentPage)) {
      if (!isLoggedIn) {
        console.log('User not logged in, redirecting to login');
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        window.location.replace('login.html');
        return;
      }

      // Special check for doctor dashboard
      if (currentPage === 'doctor-dashboard') {
        const role = await this.getCurrentUserRole();
        if (role !== 'doctor') {
          alert('Access denied. Doctor role required.');
          window.location.replace('index.html');
          return;
        }
      }
    }
  }

  getCurrentPage() {
    const path = window.location.pathname;
    // Handle both /reports.html and /reports
    let page = path.split('/').pop();
    if (page.includes('.html')) {
      page = page.replace('.html', '');
    }
    // If path is root '/', page might be empty string -> index
    if (!page) page = 'index';
    return page;
  }

  async getCurrentUserRole() {
    if (!this.currentUser) return 'patient';
    try {
      // Use window.getUserProfile from auth.js
      const profile = await window.getUserProfile(this.currentUser.uid);
      return profile.success ? profile.data.role || 'patient' : 'patient';
    } catch (err) {
      console.error('getCurrentUserRole error:', err);
      return 'patient';
    }
  }

  // Public method for login success
  async handleLoginSuccess() {
    // Navigate based on saved redirect or default to dashboard
    const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
    if (redirectUrl) {
      sessionStorage.removeItem('redirectAfterLogin');
      window.location.replace(redirectUrl);
      return;
    }

    // Default redirect to dashboard (not reports)
    window.location.replace('dashboard.html');
  }

  async isProfileComplete() {
    try {
      const profile = await window.getUserProfile();
      if (!profile.success) return false;

      const p = profile.data;
      return p.age && p.gender && p.height && p.weight;
    } catch (err) {
      console.error('isProfileComplete error:', err);
      return false;
    }
  }
}

// Create or reuse global instance
// We assign it to `window.authGuard` so pages can access it
if (!window.authGuard) {
  window.authGuard = new AuthGuard();
} else {
  // If it was already created (unlikely unless double included), ensure it's initialized
  // but the singleton pattern in constructor handles it.
}