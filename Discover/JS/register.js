/* =============================================
   SCOUTLINK — REGISTER JS (Firebase Auth + Firestore)
   ============================================= */

// Firebase is loaded asynchronously below so that role selection and step
// navigation (selectRole, goToStep) work immediately, even if the Firebase
// import is slow or fails. Only the final submit step actually needs it.
let firebase = null;
let firebaseLoadError = null;

(async () => {
  try {
    firebase = await import('./firebase-config.js');
  } catch (err) {
    firebaseLoadError = err;
    console.error('Firebase failed to load in register.js:', err);
  }
})();

let selectedRole = null;

// --- Pre-select role from URL param ---
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const role = params.get('role');
  if (role === 'player' || role === 'coach') {
    selectRole(role);
  }

  // Password strength listener
  const pwInput = document.getElementById('password');
  if (pwInput) {
    pwInput.addEventListener('input', () => checkPasswordStrength(pwInput.value));
  }

  // Confirm password listener
  const confirmInput = document.getElementById('confirmPassword');
  if (confirmInput) {
    confirmInput.addEventListener('input', () => {
      const err = document.getElementById('passwordError');
      const pw = document.getElementById('password').value;
      if (confirmInput.value && confirmInput.value !== pw) {
        err.classList.remove('hidden');
      } else {
        err.classList.add('hidden');
      }
    });
  }
});

// --- Role Selection ---
function selectRole(role) {
  selectedRole = role;

  document.querySelectorAll('.role-card').forEach(card => card.classList.remove('selected'));
  const targetCard = document.getElementById(role === 'player' ? 'rolePlayer' : 'roleCoach');
  if (targetCard) {
    targetCard.classList.add('selected');
    targetCard.querySelector('.role-select-indicator').textContent = '✓ Selected';
  }

  const btn = document.getElementById('nextToStep2');
  if (btn) btn.removeAttribute('disabled');

  const title = document.getElementById('step2Title');
  if (title) title.textContent = role === 'player' ? 'Player Details' : 'Coach Details';
}

// --- Step Navigation ---
function goToStep(step) {
  if (step === 2 && !validateStep1()) return;
  if (step === 3 && !validateStep2()) return;

  ['stepRole', 'stepInfo', 'stepPassword', 'stepSuccess'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  const targets = { 1: 'stepRole', 2: 'stepInfo', 3: 'stepPassword', 4: 'stepSuccess' };
  const targetEl = document.getElementById(targets[step]);
  if (targetEl) targetEl.classList.remove('hidden');

  if (step === 2) {
    const playerFields = document.getElementById('playerFields');
    const coachFields  = document.getElementById('coachFields');
    if (selectedRole === 'player') {
      playerFields.classList.remove('hidden');
      coachFields.classList.add('hidden');
    } else {
      coachFields.classList.remove('hidden');
      playerFields.classList.add('hidden');
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- Validation ---
function validateStep1() {
  if (!selectedRole) {
    alert('Please select whether you are a Player or a Coach.');
    return false;
  }
  return true;
}

function validateStep2() {
  const name     = document.getElementById('fullName').value.trim();
  const email    = document.getElementById('email').value.trim();
  const province = document.getElementById('province').value;

  if (!name) { showFieldError('fullName', 'Please enter your full name.'); return false; }
  if (!email || !isValidEmail(email)) { showFieldError('email', 'Please enter a valid email address.'); return false; }
  if (!province) { showFieldError('province', 'Please select your province.'); return false; }

  if (selectedRole === 'player') {
    const age      = document.getElementById('age').value;
    const position = document.getElementById('position').value;
    if (!age || age < 10 || age > 45) { showFieldError('age', 'Please enter a valid age.'); return false; }
    if (!position) { showFieldError('position', 'Please select your position.'); return false; }
  }

  if (selectedRole === 'coach') {
    const title = document.getElementById('coachTitle').value.trim();
    const club  = document.getElementById('coachClub').value.trim();
    if (!title) { showFieldError('coachTitle', 'Please enter your coaching title.'); return false; }
    if (!club)  { showFieldError('coachClub', 'Please enter your club or academy.'); return false; }
  }

  return true;
}

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.style.borderColor = '#FF5A5A';
  field.focus();
  field.addEventListener('input', () => { field.style.borderColor = ''; }, { once: true });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// --- Password Strength ---
function checkPasswordStrength(password) {
  const fill  = document.getElementById('strengthFill');
  const label = document.getElementById('strengthLabel');
  if (!fill || !label) return;

  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  const levels = [
    { pct: '0%',   color: 'transparent', text: '' },
    { pct: '25%',  color: '#FF5A5A',     text: 'Weak' },
    { pct: '50%',  color: '#FFA500',     text: 'Fair' },
    { pct: '75%',  color: '#F5C518',     text: 'Good' },
    { pct: '100%', color: '#00A651',     text: 'Strong' },
  ];

  const level = levels[strength];
  fill.style.width = level.pct;
  fill.style.background = level.color;
  label.textContent = level.text;
  label.style.color = level.color;
}

// --- Final Submission — REAL FIREBASE AUTH + FIRESTORE ---
async function submitRegistration() {
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirm  = document.getElementById('confirmPassword').value;
  const terms    = document.getElementById('terms').checked;

  if (!password || password.length < 8) {
    alert('Password must be at least 8 characters.');
    return;
  }
  if (password !== confirm) {
    document.getElementById('passwordError').classList.remove('hidden');
    return;
  }
  if (!terms) {
    alert('Please agree to the Terms of Use and Privacy Policy.');
    return;
  }

  // If Firebase never loaded successfully, fail loudly here instead of
  // letting the click silently do nothing.
  if (firebaseLoadError) {
    alert('Could not connect to the server. Please check your internet connection and try again.');
    return;
  }
  if (!firebase) {
    alert('Still connecting — please wait a moment and try again.');
    return;
  }

  const { auth, db, createUserWithEmailAndPassword, updateProfile, doc, setDoc, serverTimestamp } = firebase;

  // Build the profile data to store in Firestore
  const userData = {
    role: selectedRole,
    name: document.getElementById('fullName').value.trim(),
    email: email,
    phone: document.getElementById('phone').value.trim(),
    province: document.getElementById('province').value,
    registeredAt: serverTimestamp(),
  };

  if (selectedRole === 'player') {
    userData.age         = document.getElementById('age').value;
    userData.position    = document.getElementById('position').value;
    userData.currentTeam = document.getElementById('currentTeam').value.trim();
  } else {
    userData.coachTitle = document.getElementById('coachTitle').value.trim();
    userData.coachClub  = document.getElementById('coachClub').value.trim();
    userData.license    = document.getElementById('license').value;
  }

  // Disable the button + show loading state while Firebase processes
  const createBtn = document.querySelector('#stepPassword .btn-primary');
  const originalText = createBtn ? createBtn.textContent : '';
  if (createBtn) { createBtn.disabled = true; createBtn.textContent = 'Creating account...'; }

  try {
    // 1. Create the actual Firebase Auth user (real email + password account)
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    // 2. Set their display name on the Auth profile
    await updateProfile(user, { displayName: userData.name });

    // 3. Save the full profile to Firestore, keyed by their Auth UID
    await setDoc(doc(db, 'users', user.uid), userData);

    // 4. Keep a lightweight local cache so dashboards load instantly
    //    (Firestore remains the source of truth; this is just for snappy UI)
    localStorage.setItem('scoutlink_user', JSON.stringify({ ...userData, uid: user.uid, registeredAt: new Date().toISOString() }));
    localStorage.setItem('scoutlink_loggedIn', 'true');

    // Show success screen
    const msg = document.getElementById('successMessage');
    if (msg) {
      msg.textContent = selectedRole === 'player'
        ? 'Your player profile has been created. Start uploading your highlights!'
        : 'Your coach profile is ready. Start browsing players across Zimbabwe!';
    }

    goToStep(4);

    const dashBtn = document.getElementById('successDashBtn');
    if (dashBtn) {
      dashBtn.href = selectedRole === 'coach' ? 'coaches.html' : 'player-dashboard.html';
    }

  } catch (error) {
    console.error('Firebase registration error:', error);

    // Translate common Firebase error codes into friendly messages
    let message = 'Something went wrong creating your account. Please try again.';
    if (error.code === 'auth/email-already-in-use') {
      message = 'An account already exists with this email. Try logging in instead.';
    } else if (error.code === 'auth/invalid-email') {
      message = 'That email address looks invalid. Please double-check it.';
    } else if (error.code === 'auth/weak-password') {
      message = 'Your password is too weak. Use at least 8 characters.';
    } else if (error.code === 'auth/network-request-failed') {
      message = 'Network error. Please check your internet connection and try again.';
    }
    alert(message);

  } finally {
    if (createBtn) { createBtn.disabled = false; createBtn.textContent = originalText; }
  }
}

// --- Expose functions called via inline onclick="..." in the HTML ---
window.selectRole         = selectRole;
window.goToStep           = goToStep;
window.submitRegistration = submitRegistration;