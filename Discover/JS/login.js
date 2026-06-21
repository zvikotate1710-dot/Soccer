/* =============================================
   SCOUTLINK — LOGIN JS (Firebase Auth + Firestore)
   ============================================= */

// Firebase loads asynchronously so togglePassword() works immediately
// even if the import is slow or fails. Only handleLogin() needs it.
let firebase = null;
let firebaseLoadError = null;

(async () => {
  try {
    firebase = await import('./firebase-config.js');
  } catch (err) {
    firebaseLoadError = err;
    console.error('Firebase failed to load in login.js:', err);
  }
})();

window.addEventListener('DOMContentLoaded', () => {
  ['loginPassword', 'loginEmail'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
  });
});

// --- Toggle password visibility (no Firebase needed) ---
function togglePassword() {
  const input = document.getElementById('loginPassword');
  const btn   = document.querySelector('.toggle-pw');
  if (!input) return;
  if (input.type === 'password') {
    input.type      = 'text';
    btn.textContent = '🙈';
  } else {
    input.type      = 'password';
    btn.textContent = '👁';
  }
}

// --- Handle Login — REAL FIREBASE AUTH ---
async function handleLogin() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl  = document.getElementById('loginError');

  if (!email || !password) {
    errorEl.textContent = 'Please enter your email and password.';
    errorEl.classList.remove('hidden');
    return;
  }

  // Fail loudly if Firebase never loaded, instead of doing nothing
  if (firebaseLoadError) {
    errorEl.textContent = 'Could not connect to the server. Check your internet connection and try again.';
    errorEl.classList.remove('hidden');
    return;
  }
  if (!firebase) {
    errorEl.textContent = 'Still connecting — please wait a moment and try again.';
    errorEl.classList.remove('hidden');
    return;
  }

  const { auth, db, signInWithEmailAndPassword, doc, getDoc } = firebase;

  errorEl.classList.add('hidden');

  const btn = document.querySelector('#loginCard .btn-primary');
  const originalText = btn ? btn.textContent : '';
  if (btn) { btn.textContent = 'Logging in...'; btn.disabled = true; }

  try {
    // 1. Authenticate against Firebase
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    // 2. Fetch their full profile from Firestore
    const snap = await getDoc(doc(db, 'users', user.uid));

    if (!snap.exists()) {
      throw { code: 'profile/not-found' };
    }

    const profile = snap.data();

    // 3. Cache locally for fast dashboard loads
    localStorage.setItem('scoutlink_user', JSON.stringify({ ...profile, uid: user.uid }));
    localStorage.setItem('scoutlink_loggedIn', 'true');

    // 4. Redirect based on role
    redirectToDashboard(profile.role);

  } catch (error) {
    console.error('Firebase login error:', error);

    let message = 'Incorrect email or password. Try again.';
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
      message = 'Incorrect email or password. Try again.';
    } else if (error.code === 'auth/user-not-found') {
      message = 'No account found with that email. Try registering instead.';
    } else if (error.code === 'auth/too-many-requests') {
      message = 'Too many failed attempts. Please wait a moment and try again.';
    } else if (error.code === 'auth/network-request-failed') {
      message = 'Network error. Please check your internet connection.';
    } else if (error.code === 'profile/not-found') {
      message = 'Your account exists but no profile was found. Please contact support.';
    }

    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginPassword').focus();

    if (btn) { btn.textContent = originalText; btn.disabled = false; }
  }
}

// --- Redirect to correct dashboard based on role ---
function redirectToDashboard(role) {
  if (role === 'coach') {
    window.location.replace('coaches.html');
  } else {
    window.location.replace('player-dashboard.html');
  }
}

// --- Expose functions called via inline onclick="..." in the HTML ---
window.togglePassword = togglePassword;
window.handleLogin    = handleLogin;