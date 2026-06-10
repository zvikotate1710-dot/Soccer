/* =============================================
   SCOUTLINK — REGISTER JS
   ============================================= */

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

  // Update card UI
  document.querySelectorAll('.role-card').forEach(card => card.classList.remove('selected'));
  const targetCard = document.getElementById(role === 'player' ? 'rolePlayer' : 'roleCoach');
  if (targetCard) {
    targetCard.classList.add('selected');
    targetCard.querySelector('.role-select-indicator').textContent = '✓ Selected';
  }

  // Enable continue button
  const btn = document.getElementById('nextToStep2');
  if (btn) btn.removeAttribute('disabled');

  // Update step 2 title
  const title = document.getElementById('step2Title');
  if (title) title.textContent = role === 'player' ? 'Player Details' : 'Coach Details';
}

// --- Step Navigation ---
function goToStep(step) {
  // Validate current step before moving forward
  if (step === 2 && !validateStep1()) return;
  if (step === 3 && !validateStep2()) return;

  // Hide all steps
  ['stepRole', 'stepInfo', 'stepPassword', 'stepSuccess'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  // Show target step
  const targets = { 1: 'stepRole', 2: 'stepInfo', 3: 'stepPassword', 4: 'stepSuccess' };
  const targetEl = document.getElementById(targets[step]);
  if (targetEl) targetEl.classList.remove('hidden');

  // Show/hide role-specific fields in step 2
  if (step === 2) {
    const playerFields = document.getElementById('playerFields');
    const coachFields = document.getElementById('coachFields');
    if (selectedRole === 'player') {
      playerFields.classList.remove('hidden');
      coachFields.classList.add('hidden');
    } else {
      coachFields.classList.remove('hidden');
      playerFields.classList.add('hidden');
    }
  }

  // Scroll to top of form
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
  const name = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const province = document.getElementById('province').value;

  if (!name) { showFieldError('fullName', 'Please enter your full name.'); return false; }
  if (!email || !isValidEmail(email)) { showFieldError('email', 'Please enter a valid email address.'); return false; }
  if (!province) { showFieldError('province', 'Please select your province.'); return false; }

  if (selectedRole === 'player') {
    const age = document.getElementById('age').value;
    const position = document.getElementById('position').value;
    if (!age || age < 10 || age > 45) { showFieldError('age', 'Please enter a valid age.'); return false; }
    if (!position) { showFieldError('position', 'Please select your position.'); return false; }
  }

  if (selectedRole === 'coach') {
    const title = document.getElementById('coachTitle').value.trim();
    const club = document.getElementById('coachClub').value.trim();
    if (!title) { showFieldError('coachTitle', 'Please enter your coaching title.'); return false; }
    if (!club) { showFieldError('coachClub', 'Please enter your club or academy.'); return false; }
  }

  return true;
}

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.style.borderColor = '#FF5A5A';
  field.focus();

  // Remove error style on input
  field.addEventListener('input', () => {
    field.style.borderColor = '';
  }, { once: true });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// --- Password Strength ---
function checkPasswordStrength(password) {
  const fill = document.getElementById('strengthFill');
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

// --- Final Submission ---
function submitRegistration() {
  const password = document.getElementById('password').value;
  const confirm = document.getElementById('confirmPassword').value;
  const terms = document.getElementById('terms').checked;

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

  // Collect all form data
  const userData = {
    role: selectedRole,
    name: document.getElementById('fullName').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    province: document.getElementById('province').value,
    registeredAt: new Date().toISOString(),
  };

  if (selectedRole === 'player') {
    userData.age = document.getElementById('age').value;
    userData.position = document.getElementById('position').value;
    userData.currentTeam = document.getElementById('currentTeam').value.trim();
  } else {
    userData.coachTitle = document.getElementById('coachTitle').value.trim();
    userData.coachClub = document.getElementById('coachClub').value.trim();
    userData.license = document.getElementById('license').value;
  }

  // Save to localStorage (replace with Firebase later)
  localStorage.setItem('scoutlink_user', JSON.stringify(userData));
  localStorage.setItem('scoutlink_loggedIn', 'true');

  // Show success
  const msg = document.getElementById('successMessage');
  if (msg) {
    msg.textContent = selectedRole === 'player'
      ? 'Your player profile has been created. Start uploading your highlights!'
      : 'Your coach profile is ready. Start browsing players across Zimbabwe!';
  }

  goToStep(4);
}
