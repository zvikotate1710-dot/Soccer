/* =============================================
   SCOUTLINK — MAIN JS (Landing Page)
   ============================================= */

import { auth, signOut, onAuthStateChanged } from './firebase-config.js';

// --- Hamburger Menu ---
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('open'));
  });
}

// --- Navbar: swap Login/Register for Dashboard/Logout based on REAL Firebase session ---
onAuthStateChanged(auth, (firebaseUser) => {
  const navRegister  = document.getElementById('navRegister');
  const navLogin      = document.getElementById('navLogin');
  const navDashboard  = document.getElementById('navDashboard');
  const navLogout      = document.getElementById('navLogout');
  const dashLink      = document.getElementById('navDashboardLink');

  if (firebaseUser) {
    // User has a real, valid Firebase session
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
    // No active Firebase session — clear stale cache and show Register/Login
    localStorage.removeItem('scoutlink_loggedIn');
    localStorage.removeItem('scoutlink_user');

    navRegister.classList.remove('hidden');
    navLogin.classList.remove('hidden');
    navDashboard.classList.add('hidden');
    navLogout.classList.add('hidden');
  }
});

// --- Log Out from navbar — REAL FIREBASE SIGN OUT ---
async function logoutFromNav() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
  }
  localStorage.removeItem('scoutlink_loggedIn');
  localStorage.removeItem('scoutlink_user');
  window.location.reload();
}
window.logoutFromNav = logoutFromNav;

// --- Navbar scroll shadow ---
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    navbar.style.boxShadow = window.scrollY > 20
      ? '0 4px 24px rgba(0,0,0,0.4)'
      : 'none';
  }
});

// --- Scroll-triggered fade-in ---
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