/* =============================================
   SCOUTLINK — LOGIN JS
   ============================================= */

window.addEventListener('DOMContentLoaded', () => {
  // If already logged in, show dashboard prompt immediately
  if (localStorage.getItem('scoutlink_loggedIn') === 'true') {
    showDashboardPrompt();
  }

  // Enter key on password field triggers login
  const pwField = document.getElementById('loginPassword');
  if (pwField) {
    pwField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
  }

  const emailField = document.getElementById('loginEmail');
  if (emailField) {
    emailField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
  }
});

// --- Toggle password visibility ---
function togglePassword() {
  const input = document.getElementById('loginPassword');
  const btn = document.querySelector('.toggle-pw');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁';
  }
}

// --- Handle Login ---
function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');

  // Basic validation
  if (!email || !password) {
    errorEl.textContent = 'Please enter your email and password.';
    errorEl.classList.remove('hidden');
    return;
  }

  // Check against stored user (localStorage mock — replace with Firebase)
  const stored = localStorage.getItem('scoutlink_user');

  if (stored) {
    const user = JSON.parse(stored);
    if (user.email.toLowerCase() === email.toLowerCase()) {
      // Mock: any password works for demo — Firebase will enforce real auth
      errorEl.classList.add('hidden');
      localStorage.setItem('scoutlink_loggedIn', 'true');

      // Show loading state on button
      const btn = document.querySelector('#loginCard .btn-primary');
      if (btn) {
        btn.textContent = 'Logging in...';
        btn.disabled = true;
      }

      setTimeout(() => {
        showDashboardPrompt();
      }, 800);
      return;
    }
  }

  // No match
  errorEl.textContent = 'Incorrect email or password. Try again.';
  errorEl.classList.remove('hidden');
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginPassword').focus();
}

// --- Show Dashboard Prompt ---
function showDashboardPrompt() {
  const loginCard = document.getElementById('loginCard');
  const dashCard = document.getElementById('dashboardPrompt');

  if (loginCard) loginCard.classList.add('hidden');
  if (dashCard) {
    dashCard.classList.remove('hidden');

    // Personalise with stored name if available
    const stored = localStorage.getItem('scoutlink_user');
    if (stored) {
      const user = JSON.parse(stored);
      const title = dashCard.querySelector('.auth-title');
      if (title && user.name) {
        const firstName = user.name.split(' ')[0];
        title.textContent = `Welcome back, ${firstName}!`;
      }

      // Highlight the correct dashboard based on their role
      const btns = dashCard.querySelectorAll('.dashboard-btn');
      if (btns.length >= 2) {
        if (user.role === 'player') {
          btns[0].style.borderColor = 'var(--green)';
          btns[0].style.background = 'var(--green-glow)';
        } else if (user.role === 'coach') {
          btns[1].style.borderColor = 'var(--green)';
          btns[1].style.background = 'var(--green-glow)';
        }
      }
    }
  }
}
