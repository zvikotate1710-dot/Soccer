/* =============================================
   SCOUTLINK — COACHES BROWSE JS
   ============================================= */

// Firebase loads asynchronously below. Every function in this file is a
// hoisted `function` declaration, so sidebar nav, filters, and the modal
// all work immediately — only the actual Firebase calls inside each
// function wait on `firebase` being populated.
let firebase = null;
let firebaseLoadError = null;

function requireFirebase() {
  if (firebaseLoadError) {
    showCoachToast('Could not connect to the server. Check your connection and refresh.');
    return null;
  }
  if (!firebase) {
    showCoachToast('Still connecting — please wait a moment and try again.');
    return null;
  }
  return firebase;
}

(async () => {
  try {
    firebase = await import('./firebase-config.js');
    const { auth, db, onAuthStateChanged, doc, getDoc } = firebase;

    // --- Auth Guard: REAL Firebase session check ---
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        window.location.href = 'login.html';
        return;
      }

      // Pull the authoritative coach profile from Firestore
      try {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (snap.exists()) {
          const profile = snap.data();
          localStorage.setItem('scoutlink_user', JSON.stringify({ ...profile, uid: firebaseUser.uid }));
        }
      } catch (err) {
        console.error('Failed to load coach profile from Firestore:', err);
      }

      // Now render the dashboard with a confirmed, fresh profile
      initCoachDashboard();

      // Start listening for real, live conversations (Phase 5 — Realtime Database)
      initMessaging(firebaseUser.uid);
    });

  } catch (err) {
    firebaseLoadError = err;
    console.error('Firebase failed to load in coaches.js:', err);
    showCoachToast('Could not connect to the server. Some features may not work — please refresh.');
  }
})();


// Mock player database (Zimbabwe-specific)
const mockPlayers = [
  { id: 1, name: 'Tatenda Moyo', position: 'Striker', province: 'Harare', age: 19, club: 'Dynamos FC Youth', bio: 'Fast, direct striker with a clinical finish. Scored 14 goals in the 2024 regional league. Strong in the air and good on both feet.', videos: [{ title: 'Goal Compilation 2024', url: 'https://youtube.com' }, { title: 'Full Match vs Caps Utd', url: 'https://youtube.com' }], views: 23, assessments: 2 },
  { id: 2, name: 'Blessing Ncube', position: 'Midfielder', province: 'Bulawayo', age: 21, club: 'Highlanders Academy', bio: 'Box-to-box midfielder with excellent vision and passing range. Comfortable under pressure and a natural leader.', videos: [{ title: 'Midfield Highlights', url: 'https://youtube.com' }], views: 15, assessments: 1 },
  { id: 3, name: 'Simbarashe Dube', position: 'Goalkeeper', province: 'Harare', age: 17, club: 'St Georges College', bio: 'Young goalkeeper with outstanding reflexes and confident shot-stopping. Has represented Harare Province U17.', videos: [{ title: 'Save Compilation', url: 'https://youtube.com' }, { title: 'Penalty Shootout Saves', url: 'https://youtube.com' }], views: 11, assessments: 0 },
  { id: 4, name: 'Kudakwashe Mutasa', position: 'Winger', province: 'Manicaland', age: 20, club: 'Mutare City Rovers', bio: 'Explosive winger with pace and trickery. Can play on either flank. Known for beating defenders 1v1 and providing assists.', videos: [{ title: 'Dribbling Highlights', url: 'https://youtube.com' }], views: 18, assessments: 1 },
  { id: 5, name: 'Farai Chigumba', position: 'Defender', province: 'Mashonaland East', age: 22, club: 'Marondera Athletic', bio: 'Composed centre-back with strong aerial ability. Reads the game well and is effective in 1v1 defending.', videos: [{ title: 'Defensive Masterclass', url: 'https://youtube.com' }], views: 9, assessments: 0 },
  { id: 6, name: 'Nyasha Banda', position: 'Striker', province: 'Bulawayo', age: 18, club: 'Free Agent', bio: 'Technically gifted young striker with excellent movement. Plays for the Bulawayo Province U19 team.', videos: [{ title: 'U19 Tournament Highlights', url: 'https://youtube.com' }, { title: 'Training Goals', url: 'https://youtube.com' }], views: 20, assessments: 3 },
  { id: 7, name: 'Tinashe Makoni', position: 'Midfielder', province: 'Harare', age: 24, club: 'CAPS United Reserves', bio: 'Experienced midfielder currently on the fringes of first-team football. Technically refined with a high work rate.', videos: [{ title: 'Season Highlights 2024', url: 'https://youtube.com' }], views: 30, assessments: 4 },
  { id: 8, name: 'Munashe Zvobgo', position: 'Defender', province: 'Masvingo', age: 16, club: 'Masvingo United Youth', bio: 'Left-footed central defender, very strong for his age. Captained his school team to the regional championship.', videos: [{ title: 'School Championship Final', url: 'https://youtube.com' }], views: 6, assessments: 0 },
];

let filteredPlayers = [...mockPlayers];
let selectedPlayer = null;
let selectedRating = 0;

function initCoachDashboard() {
  // Add current user's profile to player list if they're a player
  // (kept from original demo — lets a player account preview their own card)
  const stored = localStorage.getItem('scoutlink_user');
  if (stored) {
    const user = JSON.parse(stored);
    if (user.role === 'player' && user.name) {
      const videos = JSON.parse(localStorage.getItem('scoutlink_videos') || '[]');
      mockPlayers.unshift({
        id: 0,
        name: user.name,
        position: user.position || 'Unknown',
        province: user.province || 'Unknown',
        age: user.age || '—',
        club: user.currentTeam || 'Free Agent',
        bio: user.bio || 'No bio yet.',
        videos: videos.map(v => ({ title: v.title, url: v.url })),
        views: 3,
        assessments: 0,
      });
    }
  }

  filteredPlayers = [...mockPlayers];
  renderPlayers();
  initStarRating();

  // Load coach-specific dashboard data (profile card, settings, assessments)
  loadCoachProfile();
  renderCoachAssessments();
  // NOTE: messaging is initialised separately via initMessaging(uid), called
  // from the auth-confirmed callback once we have a real Firebase UID.
}

// --- Render Players ---
function renderPlayers() {
  const grid = document.getElementById('playerGrid');
  const noResults = document.getElementById('noResults');
  const count = document.getElementById('resultCount');

  if (!grid) return;

  if (filteredPlayers.length === 0) {
    grid.innerHTML = '';
    noResults.classList.remove('hidden');
    count.textContent = 'No players found';
    return;
  }

  noResults.classList.add('hidden');
  count.textContent = `Showing ${filteredPlayers.length} player${filteredPlayers.length !== 1 ? 's' : ''}`;

  grid.innerHTML = filteredPlayers.map(p => {
    const initials = p.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const ageLabel = p.age ? `Age ${p.age}` : '';
    return `
      <div class="player-card" onclick="openPlayerModal(${p.id})">
        <div class="player-card-top">
          <div class="player-card-avatar">${initials}</div>
          <div class="player-card-info">
            <strong>${p.name}</strong>
            <span>${p.position} · ${p.province}</span>
          </div>
        </div>
        <div class="player-card-badges">
          <span class="badge badge-green">${p.position}</span>
          <span class="badge badge-blue">${p.province}</span>
          ${ageLabel ? `<span class="badge badge-yellow">${ageLabel}</span>` : ''}
        </div>
        <div class="player-card-footer">
          <span class="player-card-stat"><strong>${p.videos.length}</strong> Video${p.videos.length !== 1 ? 's' : ''}</span>
          <span class="player-card-stat"><strong>${p.assessments}</strong> Assessment${p.assessments !== 1 ? 's' : ''}</span>
          <span class="player-card-stat"><strong>${p.views}</strong> Views</span>
        </div>
      </div>
    `;
  }).join('');
}

// --- Filters ---
function applyFilters() {
  const position = document.getElementById('filterPosition').value;
  const province = document.getElementById('filterProvince').value;
  const ageRange = document.getElementById('filterAge').value;
  const search = document.getElementById('filterSearch').value.toLowerCase().trim();

  filteredPlayers = mockPlayers.filter(p => {
    if (position && p.position !== position) return false;
    if (province && p.province !== province) return false;
    if (search && !p.name.toLowerCase().includes(search) && !p.club.toLowerCase().includes(search)) return false;

    if (ageRange && p.age) {
      const age = parseInt(p.age);
      if (ageRange === 'u17' && age >= 17) return false;
      if (ageRange === 'u21' && (age < 17 || age > 21)) return false;
      if (ageRange === 'u26' && (age < 22 || age > 26)) return false;
      if (ageRange === 'senior' && age < 27) return false;
    }

    return true;
  });

  renderPlayers();
}

function clearFilters() {
  document.getElementById('filterPosition').value = '';
  document.getElementById('filterProvince').value = '';
  document.getElementById('filterAge').value = '';
  document.getElementById('filterSearch').value = '';
  filteredPlayers = [...mockPlayers];
  renderPlayers();
}

// --- Modal ---
function openPlayerModal(playerId) {
  selectedPlayer = mockPlayers.find(p => p.id === playerId);
  if (!selectedPlayer) return;

  const initials = selectedPlayer.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  setEl('modalAvatar', initials);
  setEl('modalName', selectedPlayer.name);
  setEl('modalMeta', `${selectedPlayer.position} · ${selectedPlayer.province} · Age ${selectedPlayer.age}`);

  document.getElementById('modalBadges').innerHTML = `
    <span class="badge badge-green">${selectedPlayer.position}</span>
    <span class="badge badge-blue">${selectedPlayer.province}</span>
    <span class="badge badge-yellow">${selectedPlayer.club}</span>
  `;

  setEl('modalBio', selectedPlayer.bio || 'No bio provided.');

  const videosEl = document.getElementById('modalVideos');
  if (selectedPlayer.videos.length === 0) {
    videosEl.innerHTML = '<p style="color:var(--muted);font-size:14px;">No videos uploaded yet.</p>';
  } else {
    videosEl.innerHTML = selectedPlayer.videos.map(v => `
      <a href="${v.url}" target="_blank" class="modal-video-link">
        <span>🎬</span> ${v.title} <span style="margin-left:auto;color:var(--green);">↗</span>
      </a>
    `).join('');
  }

  // Reset assessment form
  document.getElementById('assessmentText').value = '';
  document.getElementById('assessSuccess').classList.add('hidden');
  setSelectedRating(0);

  document.getElementById('modalOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Increment view count
  selectedPlayer.views++;
  renderPlayers();
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  document.body.style.overflow = '';
  selectedPlayer = null;
}

// --- Star Rating ---
function initStarRating() {
  const stars = document.querySelectorAll('.star');
  stars.forEach(star => {
    star.addEventListener('mouseover', () => highlightStars(parseInt(star.dataset.val)));
    star.addEventListener('mouseout', () => highlightStars(selectedRating));
    star.addEventListener('click', () => setSelectedRating(parseInt(star.dataset.val)));
  });
}

function highlightStars(val) {
  document.querySelectorAll('.star').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.val) <= val);
  });
}

function setSelectedRating(val) {
  selectedRating = val;
  highlightStars(val);
}

// --- Submit Assessment ---
function submitAssessment() {
  const text = document.getElementById('assessmentText').value.trim();
  if (!text) { alert('Please write an assessment before submitting.'); return; }
  if (selectedRating === 0) { alert('Please select a star rating.'); return; }

  // In production: save to Firebase. For now, update local state.
  if (selectedPlayer) {
    selectedPlayer.assessments++;
    renderPlayers();
  }

  document.getElementById('assessSuccess').classList.remove('hidden');
  document.getElementById('assessmentText').value = '';
  setSelectedRating(0);

  setTimeout(() => {
    document.getElementById('assessSuccess').classList.add('hidden');
  }, 4000);
}

// --- Sidebar & Logout ---
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// --- Logout — REAL FIREBASE SIGN OUT (falls back to local-only if Firebase is unavailable) ---
async function logout() {
  if (firebase) {
    try {
      await firebase.signOut(firebase.auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }
  localStorage.removeItem('scoutlink_loggedIn');
  localStorage.removeItem('scoutlink_user');
  window.location.href = 'login.html';
}

function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* =============================================
   SIDEBAR ACTIVE STATE
   ============================================= */
function setActive(el) {
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('sidebar').classList.remove('open');
}

/* =============================================
   COACH DASHBOARD — load profile info
   ============================================= */
function loadCoachProfile() {
  const stored = localStorage.getItem('scoutlink_user');
  if (stored) {
    const user = JSON.parse(stored);

    // Top bar avatar & greeting
    const initials = (user.name || 'CD').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
    const avatar = document.querySelector('.topbar-avatar');
    if (avatar) avatar.textContent = initials;

    // Dashboard profile card
    const coachAvatar = document.getElementById('coachAvatar');
    if (coachAvatar) coachAvatar.textContent = initials;
    const coachName = document.getElementById('coachName');
    if (coachName) coachName.textContent = user.name || 'Coach';
    const coachMeta = document.getElementById('coachMeta');
    if (coachMeta) coachMeta.textContent = `${user.coachTitle || 'Coach'} · ${user.coachClub || '—'}`;
    const badgeTitle = document.getElementById('coachBadgeTitle');
    if (badgeTitle) badgeTitle.textContent = user.coachTitle || 'Coach';
    const badgeProv = document.getElementById('coachBadgeProvince');
    if (badgeProv) badgeProv.textContent = user.province || '—';

    // Pre-fill settings
    const sName = document.getElementById('coachSettingsName');
    if (sName) sName.value = user.name || '';
    const sEmail = document.getElementById('coachSettingsEmail');
    if (sEmail) sEmail.value = user.email || '';
    const sTitle = document.getElementById('coachSettingsTitle');
    if (sTitle) sTitle.value = user.coachTitle || '';
    const sClub = document.getElementById('coachSettingsClub');
    if (sClub) sClub.value = user.coachClub || '';
    const sProv = document.getElementById('coachSettingsProvince');
    if (sProv) sProv.value = user.province || '';
  }
}

/* =============================================
   MY ASSESSMENTS — track submitted ones
   ============================================= */
let coachAssessments = JSON.parse(localStorage.getItem('scoutlink_coach_assessments') || '[]');

// Override submitAssessment to also save to coach list
const _origSubmit = window.submitAssessment;
window.submitAssessment = function() {
  const text   = document.getElementById('assessmentText').value.trim();
  const rating = selectedRating;
  if (!text || rating === 0 || !selectedPlayer) return;

  // Save to coach's assessment history
  coachAssessments.unshift({
    playerName: selectedPlayer.name,
    playerPos:  selectedPlayer.position,
    province:   selectedPlayer.province,
    text,
    rating,
    date: new Date().toLocaleDateString('en-ZW')
  });
  localStorage.setItem('scoutlink_coach_assessments', JSON.stringify(coachAssessments));

  // Update stat counter
  const statEl = document.getElementById('coachStatAssessments');
  if (statEl) statEl.textContent = coachAssessments.length;

  // Re-render list
  renderCoachAssessments();

  // Call original behaviour
  if (_origSubmit) _origSubmit();
};

function renderCoachAssessments() {
  const list  = document.getElementById('coachAssessmentsList');
  const empty = document.getElementById('coachAssessmentsEmpty');
  if (!list) return;

  if (coachAssessments.length === 0) {
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);

  list.innerHTML = coachAssessments.map(a => `
    <div class="assessment-card">
      <div class="assessment-header">
        <div class="assessment-coach-avatar">${a.playerName.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
        <div>
          <strong>${a.playerName}</strong>
          <span>${a.playerPos} · ${a.province}</span>
        </div>
        <span style="color:var(--yellow);font-size:14px;">${stars(a.rating)}</span>
      </div>
      <p class="assessment-body">"${a.text}"</p>
      <p class="assessment-date">${a.date}</p>
    </div>
  `).join('');
}

/* =============================================
   MESSAGES — COACH SIDE — REAL, LIVE, CROSS-DEVICE
   (Firebase Realtime Database — Phase 5)
   ============================================= */

let myUid = null;
let conversationsCache = {};
let activeConvoId = null;
let activeConvoListener = null;
let convoListListener = null;

// --- Initialise messaging once login is confirmed ---
function initMessaging(uid) {
  myUid = uid;

  const fb = requireFirebase();
  if (!fb) return;

  const { rtdb, dbRef, onValue } = fb;

  const listRef = dbRef(rtdb, `userConversations/${uid}`);

  if (convoListListener) convoListListener();
  convoListListener = onValue(listRef, (snapshot) => {
    conversationsCache = snapshot.val() || {};
    renderCoachConvoList();
  }, (err) => {
    console.error('Failed to listen to conversation list:', err);
  });
}

// --- Render the conversation list in the sidebar of the Messages panel ---
function renderCoachConvoList() {
  const list = document.getElementById('coachConvoList');
  if (!list) return;

  const entries = Object.entries(conversationsCache)
    .sort((a, b) => (b[1].lastMessageTime || 0) - (a[1].lastMessageTime || 0));

  if (entries.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <p>💬</p>
        <p>No conversations yet. Message a player from their profile to start one.</p>
      </div>
    `;
    document.getElementById('coachChatWindow').classList.add('hidden');
    const badge = document.getElementById('coachUnreadCount');
    if (badge) badge.textContent = 'No messages';
    return;
  }

  document.getElementById('coachChatWindow').classList.remove('hidden');

  list.innerHTML = entries.map(([convoId, convo]) => {
    const initials = (convo.otherUserName || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const isActive = convoId === activeConvoId;
    const preview = convo.lastMessageText || 'Start the conversation';
    const timeLabel = convo.lastMessageTime ? formatConvoTime(convo.lastMessageTime) : '';
    return `
      <div class="convo-item ${isActive ? 'active' : ''}" onclick="openCoachConvo('${convoId}')">
        <div class="convo-avatar" style="background:var(--green-glow);border-color:var(--green);color:var(--green);">${initials}</div>
        <div class="convo-info">
          <strong>${convo.otherUserName || 'Unknown'}</strong>
          <span>${convo.otherUserSub || ''}</span>
          <p class="convo-preview">${preview}</p>
        </div>
        <div class="convo-meta">
          <span class="convo-time">${timeLabel}</span>
          ${convo.unread ? '<span class="convo-unread">●</span>' : ''}
        </div>
      </div>
    `;
  }).join('');

  const unreadCount = entries.filter(([, c]) => c.unread).length;
  const badge = document.getElementById('coachUnreadCount');
  if (badge) badge.textContent = unreadCount > 0 ? `${unreadCount} Unread` : 'All Read';

  if (!activeConvoId && entries.length > 0) {
    openCoachConvo(entries[0][0]);
  }
}

function formatConvoTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString('en-ZW', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('en-ZW', { day: 'numeric', month: 'short' });
}

// --- Open a conversation thread and listen for new messages LIVE ---
function openCoachConvo(convoId) {
  const fb = requireFirebase();
  if (!fb) return;

  const { rtdb, dbRef, onValue, update } = fb;

  activeConvoId = convoId;
  renderCoachConvoList();

  const convo = conversationsCache[convoId];
  if (!convo) return;

  document.getElementById('coachChatName').textContent = convo.otherUserName || 'Unknown';
  document.getElementById('coachChatSub').textContent  = convo.otherUserSub || '';
  const initials = (convo.otherUserName || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('coachChatAvatar').textContent = initials;

  if (convo.unread) {
    update(dbRef(rtdb, `userConversations/${myUid}/${convoId}`), { unread: false }).catch(err => {
      console.error('Failed to mark conversation as read:', err);
    });
  }

  if (activeConvoListener) activeConvoListener();

  const messagesRef = dbRef(rtdb, `conversations/${convoId}/messages`);
  activeConvoListener = onValue(messagesRef, (snapshot) => {
    const messages = snapshot.val() || {};
    const sorted = Object.values(messages).sort((a, b) => a.timestamp - b.timestamp);
    renderCoachMessages(sorted);
  }, (err) => {
    console.error('Failed to listen to messages:', err);
  });
}

function renderCoachMessages(msgs) {
  const container = document.getElementById('coachChatMessages');
  if (!container) return;

  if (msgs.length === 0) {
    container.innerHTML = `<p style="color:var(--muted);font-size:13px;text-align:center;padding:24px;">No messages yet. Say hello!</p>`;
    return;
  }

  container.innerHTML = msgs.map(m => {
    const mine = m.senderId === myUid;
    const time = new Date(m.timestamp).toLocaleTimeString('en-ZW', { hour: '2-digit', minute: '2-digit' });
    return `
      <div>
        <div class="msg ${mine ? 'msg-me' : 'msg-them'}">${escapeHtml(m.text)}</div>
        <p class="msg-time">${time}</p>
      </div>
    `;
  }).join('');
  container.scrollTop = container.scrollHeight;
}

// --- Send a message in the currently open conversation ---
async function sendCoachMessage() {
  const input = document.getElementById('coachChatInput');
  const text  = input.value.trim();
  if (!text || !activeConvoId) return;

  const fb = requireFirebase();
  if (!fb) return;

  const { rtdb, dbRef, push, set, update } = fb;
  const convo = conversationsCache[activeConvoId];
  if (!convo) return;

  input.value = '';
  const timestamp = Date.now();

  try {
    const messagesRef = dbRef(rtdb, `conversations/${activeConvoId}/messages`);
    const newMsgRef = push(messagesRef);
    await set(newMsgRef, {
      senderId: myUid,
      text,
      timestamp,
    });

    await update(dbRef(rtdb, `userConversations/${myUid}/${activeConvoId}`), {
      lastMessageText: text,
      lastMessageTime: timestamp,
      unread: false,
    });

    await update(dbRef(rtdb, `userConversations/${convo.otherUserId}/${activeConvoId}`), {
      lastMessageText: text,
      lastMessageTime: timestamp,
      unread: true,
    });

  } catch (err) {
    console.error('Failed to send message:', err);
    showCoachToast('Failed to send message. Please try again.');
    input.value = text;
  }
}

// --- Basic HTML escaping so message text can't inject markup ---
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Start (or open) a conversation with a player from their profile modal ---
// --- Called by the "Message This Player" button in the open modal ---
function messageThisPlayer() {
  if (!selectedPlayer) return;

  // Demo/mock players (ids 0-8 from the hardcoded array) have no real Firebase
  // UID and cannot receive real messages. The one exception is id 0 when it's
  // been replaced with the logged-in coach's own player-account preview —
  // but that still isn't a separate, messagable account from this session.
  messagePlayer(selectedPlayer.uid || null, selectedPlayer.name, `${selectedPlayer.position} · ${selectedPlayer.province}`);
}

async function messagePlayer(playerUid, playerName, playerSub) {
  const fb = requireFirebase();
  if (!fb) return;

  if (!myUid) {
    showCoachToast('Still connecting — please wait a moment and try again.');
    return;
  }
  if (!playerUid) {
    showCoachToast('This is demo data and cannot be messaged — only real registered players can be messaged.');
    return;
  }

  const { rtdb, dbRef, get, update } = fb;

  // Deterministic conversation ID so the same two users always land in the same thread
  const convoId = [myUid, playerUid].sort().join('_');

  try {
    const existingSnap = await get(dbRef(rtdb, `conversations/${convoId}`));

    if (!existingSnap.exists()) {
      // Brand new conversation — set up both users' index entries
      const myProfile = JSON.parse(localStorage.getItem('scoutlink_user') || '{}');
      const myName = myProfile.name || 'Coach';
      const mySub  = `${myProfile.coachTitle || 'Coach'} · ${myProfile.coachClub || ''}`.trim();

      await update(dbRef(rtdb, `conversations/${convoId}/participants`), {
        [myUid]: true,
        [playerUid]: true,
      });

      await update(dbRef(rtdb, `userConversations/${myUid}/${convoId}`), {
        otherUserId: playerUid,
        otherUserName: playerName,
        otherUserSub: playerSub,
        lastMessageText: '',
        lastMessageTime: Date.now(),
        unread: false,
      });

      await update(dbRef(rtdb, `userConversations/${playerUid}/${convoId}`), {
        otherUserId: myUid,
        otherUserName: myName,
        otherUserSub: mySub,
        lastMessageText: '',
        lastMessageTime: Date.now(),
        unread: false,
      });
    }

    // Switch to the Messages tab and open this conversation
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    const messagesLink = document.querySelector('a[href="#messages"]');
    if (messagesLink) messagesLink.classList.add('active');
    document.getElementById('messages')?.scrollIntoView({ behavior: 'smooth' });

    closeModal();

    // Give the conversation list listener a moment to pick up the new thread
    setTimeout(() => openCoachConvo(convoId), 300);

  } catch (err) {
    console.error('Failed to start conversation:', err);
    showCoachToast('Could not start the conversation. Please try again.');
  }
}

/* =============================================
   SETTINGS
   ============================================= */
async function saveCoachSettings() {
  const fb = requireFirebase();
  if (!fb) return;

  const { auth, db, doc, updateDoc, updateEmail, EmailAuthProvider, reauthenticateWithCredential } = fb;

  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    showCoachToast('You must be logged in to change settings.');
    return;
  }

  const stored = JSON.parse(localStorage.getItem('scoutlink_user') || '{}');
  const name   = document.getElementById('coachSettingsName').value.trim();
  const email  = document.getElementById('coachSettingsEmail').value.trim();
  const title  = document.getElementById('coachSettingsTitle').value.trim();
  const club   = document.getElementById('coachSettingsClub').value.trim();
  const prov   = document.getElementById('coachSettingsProvince').value;

  const updates = {};
  if (name)  updates.name       = name;
  if (title) updates.coachTitle = title;
  if (club)  updates.coachClub  = club;
  if (prov)  updates.province   = prov;

  try {
    // Email change requires Firebase Auth re-authentication
    if (email && email !== firebaseUser.email) {
      const currentPassword = prompt('For security, please re-enter your current password to confirm this email change:');
      if (!currentPassword) { showCoachToast('Change cancelled.'); return; }

      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updateEmail(firebaseUser, email);
      updates.email = email;
    }

    // Write profile fields to Firestore (source of truth)
    if (Object.keys(updates).length > 0) {
      await updateDoc(doc(db, 'users', firebaseUser.uid), updates);
    }

    // Update local cache + UI
    Object.assign(stored, updates);
    localStorage.setItem('scoutlink_user', JSON.stringify(stored));

    if (name) {
      const initials = name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
      const av = document.getElementById('coachAvatar');
      if (av) av.textContent = initials;
      const cn = document.getElementById('coachName');
      if (cn) cn.textContent = name;
    }
    if (title || club) {
      const cm = document.getElementById('coachMeta');
      if (cm) cm.textContent = `${title || stored.coachTitle || '—'} · ${club || stored.coachClub || '—'}`;
    }

    showCoachToast('Settings saved!');

  } catch (err) {
    console.error('Coach settings update error:', err);
    let msg = 'Failed to update settings. Please try again.';
    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      msg = 'Incorrect current password. Please try again.';
    } else if (err.code === 'auth/email-already-in-use') {
      msg = 'That email is already used by another account.';
    } else if (err.code === 'auth/requires-recent-login') {
      msg = 'Please log out and log back in, then try again.';
    }
    showCoachToast(msg);
  }
}

async function confirmDeleteAccount() {
  const confirmed = confirm('Delete your account? This cannot be undone.');
  if (!confirmed) return;

  const fb = requireFirebase();
  if (!fb) return;

  const { auth, db, doc, deleteDoc, deleteUser, EmailAuthProvider, reauthenticateWithCredential } = fb;
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    localStorage.clear();
    window.location.href = 'index.html';
    return;
  }

  const currentPassword = prompt('For security, please re-enter your password to confirm account deletion:');
  if (!currentPassword) return;

  try {
    const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
    await reauthenticateWithCredential(firebaseUser, credential);

    await deleteDoc(doc(db, 'users', firebaseUser.uid));
    await deleteUser(firebaseUser);

    localStorage.clear();
    window.location.href = 'index.html';

  } catch (err) {
    console.error('Account deletion error:', err);
    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      alert('Incorrect password. Account was not deleted.');
    } else {
      alert('Something went wrong deleting your account. Please try again.');
    }
  }
}

function showCoachToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;background:var(--green);
    color:#fff;padding:12px 20px;border-radius:8px;font-size:14px;
    font-weight:600;z-index:9999;box-shadow:0 4px 16px rgba(0,166,81,0.3);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

// --- Expose functions called via inline onclick/onchange/oninput in the HTML ---
// (Required because module scripts don't leak functions to the global scope automatically)
window.clearFilters         = clearFilters;
window.closeModal            = closeModal;
window.confirmDeleteAccount = confirmDeleteAccount;
window.logout                = logout;
window.openCoachConvo        = openCoachConvo;
window.saveCoachSettings    = saveCoachSettings;
window.sendCoachMessage      = sendCoachMessage;
window.setActive             = setActive;
window.toggleSidebar         = toggleSidebar;
window.applyFilters          = applyFilters;
window.openPlayerModal       = openPlayerModal;
window.messageThisPlayer     = messageThisPlayer;
