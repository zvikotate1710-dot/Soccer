/* =============================================
   SCOUTLINK — PLAYER DASHBOARD JS
   ============================================= */

let playerData = {
  name: 'Player Name',
  position: '—',
  province: '—',
  age: '—',
  club: '',
  bio: '',
  videos: [],
  views: 7,
  assessments: 1,
  messages: 2,
};

window.addEventListener('DOMContentLoaded', () => {
  loadPlayerData();
  renderProfile();
  renderVideos();
  updateStats();
});


// --- Sidebar active link ---
function setActive(el) {
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  el.classList.add('active');
  // Close sidebar on mobile after click
  document.getElementById('sidebar').classList.remove('open');
}

// --- Load from localStorage ---
function loadPlayerData() {
  const stored = localStorage.getItem('scoutlink_user');
  if (stored) {
    const user = JSON.parse(stored);
    if (user.role === 'player') {
      playerData.name = user.name || playerData.name;
      playerData.position = user.position || playerData.position;
      playerData.province = user.province || playerData.province;
      playerData.age = user.age || playerData.age;
      playerData.club = user.currentTeam || '';
    }
  }

  // Load videos from storage
  const storedVideos = localStorage.getItem('scoutlink_videos');
  if (storedVideos) {
    playerData.videos = JSON.parse(storedVideos);
  }
}

// --- Render Profile ---
function renderProfile() {
  const initials = playerData.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  
  setEl('profileAvatar', initials);
  setEl('topbarAvatar', initials);
  setEl('profileName', playerData.name);
  setEl('profileMeta', `${playerData.position} · ${playerData.province}`);
  setEl('profilePosition', playerData.position);
  setEl('profileProvince', playerData.province);
  setEl('profileAge', playerData.age ? `Age ${playerData.age}` : '—');
  setEl('topbarGreeting', `Welcome back, ${playerData.name.split(' ')[0]}!`);

  // Pre-fill edit form
  setVal('editName', playerData.name);
  setVal('editAge', playerData.age);
  setVal('editPosition', playerData.position);
  setVal('editProvince', playerData.province);
  setVal('editClub', playerData.club);
  setVal('editBio', playerData.bio);
}

// --- Update Stats ---
function updateStats() {
  setEl('statViews', playerData.views);
  setEl('statVideos', playerData.videos.length);
  setEl('statAssessments', playerData.assessments);
  setEl('statMessages', playerData.messages);
}

// --- Toggle Edit Form ---
function toggleEditProfile() {
  const form = document.getElementById('editProfileForm');
  form.classList.toggle('hidden');
}

// --- Save Profile ---
function saveProfile() {
  playerData.name = document.getElementById('editName').value.trim() || playerData.name;
  playerData.age = document.getElementById('editAge').value || playerData.age;
  playerData.position = document.getElementById('editPosition').value || playerData.position;
  playerData.province = document.getElementById('editProvince').value || playerData.province;
  playerData.club = document.getElementById('editClub').value.trim();
  playerData.bio = document.getElementById('editBio').value.trim();

  // Persist
  const stored = JSON.parse(localStorage.getItem('scoutlink_user') || '{}');
  Object.assign(stored, {
    name: playerData.name,
    age: playerData.age,
    position: playerData.position,
    province: playerData.province,
    currentTeam: playerData.club,
    bio: playerData.bio,
  });
  localStorage.setItem('scoutlink_user', JSON.stringify(stored));

  renderProfile();
  toggleEditProfile();
  showToast('Profile updated!');
}

// --- Toggle Upload Form ---
function toggleUploadForm() {
  const form = document.getElementById('uploadForm');
  form.classList.toggle('hidden');
  if (!form.classList.contains('hidden')) {
    document.getElementById('videoTitle').focus();
  }
}

// --- Add Video ---
function addVideo() {
  const title = document.getElementById('videoTitle').value.trim();
  const url = document.getElementById('videoUrl').value.trim();
  const desc = document.getElementById('videoDesc').value.trim();

  if (!title) { alert('Please enter a video title.'); return; }
  if (!url || !url.startsWith('http')) { alert('Please enter a valid video URL.'); return; }

  const video = { id: Date.now(), title, url, desc, date: new Date().toLocaleDateString('en-ZW') };
  playerData.videos.unshift(video);
  localStorage.setItem('scoutlink_videos', JSON.stringify(playerData.videos));

  // Clear form
  document.getElementById('videoTitle').value = '';
  document.getElementById('videoUrl').value = '';
  document.getElementById('videoDesc').value = '';
  toggleUploadForm();

  renderVideos();
  updateStats();
  showToast('Video added!');
}

// --- Render Videos ---
function renderVideos() {
  const grid = document.getElementById('videoGrid');
  const empty = document.getElementById('videosEmpty');
  if (!grid) return;

  if (playerData.videos.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');
  grid.innerHTML = playerData.videos.map(v => `
    <div class="video-item">
      <div class="video-thumb-small" onclick="openVideo('${encodeURIComponent(v.url)}')">
        <div class="play-btn">▶</div>
      </div>
      <div class="video-item-info">
        <strong>${v.title}</strong>
        <p>${v.desc || 'No description'}</p>
        <p style="margin-top:4px;font-size:11px;color:var(--muted);">Added ${v.date}</p>
      </div>
      <div class="video-item-actions">
        <a href="${v.url}" target="_blank" class="btn btn-outline btn-xs">Open ↗</a>
        <button class="btn btn-ghost btn-xs" onclick="deleteVideo(${v.id})">Delete</button>
      </div>
    </div>
  `).join('');
}

function openVideo(encodedUrl) {
  window.open(decodeURIComponent(encodedUrl), '_blank');
}

function deleteVideo(id) {
  if (!confirm('Remove this video?')) return;
  playerData.videos = playerData.videos.filter(v => v.id !== id);
  localStorage.setItem('scoutlink_videos', JSON.stringify(playerData.videos));
  renderVideos();
  updateStats();
  showToast('Video removed.');
}

// --- Sidebar Toggle ---
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// --- Logout ---
function logout() {
  localStorage.removeItem('scoutlink_loggedIn');
  window.location.href = 'login.html';
}

// --- Helpers ---
function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; background: var(--green);
    color: white; padding: 12px 20px; border-radius: 8px; font-size: 14px;
    font-weight: 600; z-index: 9999; animation: fadeIn 0.3s ease;
    box-shadow: 0 4px 16px rgba(0,166,81,0.3);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}


/* =============================================
   MESSAGES
   ============================================= */
const conversations = [
  {
    id: 0,
    name: 'Coach Dlamini',
    sub: 'CAPS United Academy · Harare',
    initials: 'CD',
    messages: [
      { from: 'them', text: "Hello! I've been watching your highlight videos and I'm very impressed with your technique.", time: '10:30 AM' },
      { from: 'them', text: "I'd like to invite you to our trials next weekend at the CAPS United training ground. Are you available?", time: '10:42 AM' },
    ]
  },
  {
    id: 1,
    name: 'Coach Ndlovu',
    sub: 'Highlanders FC · Bulawayo',
    initials: 'MN',
    messages: [
      { from: 'them', text: 'Great footwork on your latest video. Can we chat about your development?', time: 'Yesterday' },
    ]
  },
  {
    id: 2,
    name: 'Coach Tawanda',
    sub: 'Dynamos FC Academy · Harare',
    initials: 'TM',
    messages: [
      { from: 'me', text: 'Hello Coach, I saw you viewed my profile. I would love to hear your thoughts.', time: 'Mon' },
      { from: 'them', text: 'Thanks for reaching out. We\'ll be in touch soon.', time: 'Mon' },
    ]
  }
];
 
let activeConvo = 0;
 
function openConvo(id) {
  activeConvo = id;
  const convo = conversations[id];
 
  // Update active state on convo list
  document.querySelectorAll('.convo-item').forEach((el, i) => {
    el.classList.toggle('active', i === id);
    // Clear unread badge
    const badge = el.querySelector('.convo-unread');
    if (i === id && badge) badge.remove();
  });
 
  // Update chat header
  document.getElementById('chatName').textContent = convo.name;
  document.getElementById('chatSub').textContent  = convo.sub;
  document.querySelector('.chat-header .convo-avatar').textContent = convo.initials;
 
  // Render messages
  renderMessages(convo.messages);
 
  // Update unread count
  const remaining = document.querySelectorAll('.convo-unread').length;
  const badge = document.getElementById('unreadCount');
  if (badge) badge.textContent = remaining > 0 ? `${remaining} Unread` : 'All Read';
}
 
function renderMessages(msgs) {
  const container = document.getElementById('chatMessages');
  container.innerHTML = msgs.map(m => `
    <div>
      <div class="msg ${m.from === 'me' ? 'msg-me' : 'msg-them'}">${m.text}</div>
      <p class="msg-time">${m.time}</p>
    </div>
  `).join('');
  container.scrollTop = container.scrollHeight;
}
 
function sendMessage() {
  const input = document.getElementById('chatInput');
  const text  = input.value.trim();
  if (!text) return;
 
  const now = new Date().toLocaleTimeString('en-ZW', { hour: '2-digit', minute: '2-digit' });
  conversations[activeConvo].messages.push({ from: 'me', text, time: now });
  renderMessages(conversations[activeConvo].messages);
  input.value = '';
 
  // Simulate a reply after 1.5s
  setTimeout(() => {
    const replies = [
      "Thanks for your message! I'll get back to you shortly.",
      "Noted. We'll be in touch soon.",
      "Great to hear from you. Keep working hard!",
      "I'll review your latest videos and respond soon."
    ];
    const reply = replies[Math.floor(Math.random() * replies.length)];
    const replyTime = new Date().toLocaleTimeString('en-ZW', { hour: '2-digit', minute: '2-digit' });
    conversations[activeConvo].messages.push({ from: 'them', text: reply, time: replyTime });
    renderMessages(conversations[activeConvo].messages);
  }, 1500);
}
 
// Load first convo on page load
window.addEventListener('load', () => {
  openConvo(0);
});
 
/* =============================================
   SETTINGS
   ============================================= */
function saveAccountSettings() {
  const email    = document.getElementById('settingsEmail').value.trim();
  const password = document.getElementById('settingsPassword').value;
 
  if (email) {
    const stored = JSON.parse(localStorage.getItem('scoutlink_user') || '{}');
    stored.email = email;
    localStorage.setItem('scoutlink_user', JSON.stringify(stored));
  }
 
  showToast(password ? 'Email and password updated!' : 'Email updated!');
  document.getElementById('settingsPassword').value = '';
}
 
function confirmDeleteAccount() {
  const confirmed = confirm('Are you sure you want to delete your account? This cannot be undone.');
  if (confirmed) {
    localStorage.clear();
    window.location.href = 'index.html';
  }
}
 
// Pre-fill settings email from stored user
window.addEventListener('DOMContentLoaded', () => {
  const stored = localStorage.getItem('scoutlink_user');
  if (stored) {
    const user = JSON.parse(stored);
    const emailField = document.getElementById('settingsEmail');
    if (emailField && user.email) emailField.value = user.email;
  }
});
 
