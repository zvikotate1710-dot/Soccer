/* =============================================
   SCOUTLINK — MAIN JS (Landing Page)
   ============================================= */

// --- Hamburger Menu (no Firebase dependency — runs immediately) ---
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('open'));
  });
}

// --- Navbar scroll shadow (no Firebase dependency) ---
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    navbar.style.boxShadow = window.scrollY > 20
      ? '0 4px 24px rgba(0,0,0,0.4)'
      : 'none';
  }
});

// --- Scroll-triggered fade-in (no Firebase dependency) ---
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.step, .split-text, .split-visual, .demo-card, .filter-demo')
  .forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
  });

const style = document.createElement('style');
style.textContent = `
  .fade-in { opacity: 0; transform: translateY(24px); transition: opacity 0.55s ease, transform 0.55s ease; }
  .fade-in.visible { opacity: 1; transform: translateY(0); }
`;
document.head.appendChild(style);

// --- Default logoutFromNav immediately, so the button never silently does nothing ---
// This gets replaced by the real Firebase version once firebase-config.js loads successfully.
window.logoutFromNav = function() {
  localStorage.removeItem('scoutlink_loggedIn');
  localStorage.removeItem('scoutlink_user');
  window.location.reload();
};

// --- Firebase-dependent navbar logic, isolated so a failed/slow import can't break anything above ---
(async () => {
  try {
    const { auth, signOut, onAuthStateChanged } = await import('./firebase-config.js');

    onAuthStateChanged(auth, (firebaseUser) => {
      const navRegister = document.getElementById('navRegister');
      const navLogin     = document.getElementById('navLogin');
      const navDashboard = document.getElementById('navDashboard');
      const navLogout     = document.getElementById('navLogout');
      const dashLink     = document.getElementById('navDashboardLink');

      // Guard: if any nav element is missing on this page, bail quietly instead of throwing
      if (!navRegister || !navLogin || !navDashboard || !navLogout || !dashLink) return;

      if (firebaseUser) {
        const stored = localStorage.getItem('scoutlink_user');
        const user   = stored ? JSON.parse(stored) : null;

        navRegister.classList.add('hidden');
        navLogin.classList.add('hidden');
        navDashboard.classList.remove('hidden');
        navLogout.classList.remove('hidden');

        if (user && user.role === 'coach') {
          dashLink.href        = 'coaches.html';
          dashLink.textContent = 'Coach Dashboard';
        } else {
          dashLink.href        = 'player-dashboard.html';
          dashLink.textContent = 'My Dashboard';
        }
      } else {
        localStorage.removeItem('scoutlink_loggedIn');
        localStorage.removeItem('scoutlink_user');

        navRegister.classList.remove('hidden');
        navLogin.classList.remove('hidden');
        navDashboard.classList.add('hidden');
        navLogout.classList.add('hidden');
      }
    });

    // Real Firebase sign-out, now that the import succeeded
    window.logoutFromNav = async function() {
      try {
        await signOut(auth);
      } catch (error) {
        console.error('Sign out error:', error);
      }
      localStorage.removeItem('scoutlink_loggedIn');
      localStorage.removeItem('scoutlink_user');
      window.location.reload();
    };

  } catch (err) {
    // Firebase failed to load (network issue, blocked domain, etc).
    // The page still works — navbar just won't auto-detect login state,
    // and logoutFromNav() falls back to the localStorage-only version above.
    console.error('Firebase failed to load — navbar running in fallback mode:', err);
  }
})();