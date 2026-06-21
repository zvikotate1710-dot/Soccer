/* =============================================
   SCOUTLINK — PLAYER DASHBOARD JS
   ============================================= */

// Firebase loads asynchronously. Because every function below is a
// hoisted `function` declaration, sidebar navigation, the upload tabs,
// etc. work immediately — only the actual Firebase calls inside each
// function wait on `firebase` being populated.
let firebase = null;
let firebaseLoadError = null;

function requireFirebase() {
  if (firebaseLoadError) {
    showToast('Could not connect to the server. Check your connection and refresh.');
    return null;
  }
  if (!firebase) {
    showToast('Still connecting — please wait a moment and try again.');
    return null;
  }
  return firebase;
}

(async () => {
  try {
    firebase = await import('./firebase-config.js');
    const { auth, db, onAuthStateChanged, doc, getDoc, collection, getDocs, orderBy, query } = firebase;

    // --- Auth Guard: REAL Firebase session check ---
    // onAuthStateChanged fires once Firebase confirms the session (or its absence).
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        window.location.href = 'login.html';
        return;
      }

      // Pull the authoritative profile from Firestore (source of truth)
      try {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (snap.exists()) {
          const profile = snap.data();
          localStorage.setItem('scoutlink_user', JSON.stringify({ ...profile, uid: firebaseUser.uid }));
        }
      } catch (err) {
        console.error('Failed to load profile from Firestore:', err);
      }

      // Pull this player's videos from their Firestore subcollection
      // (users/{uid}/videos), which is now the source of truth for videos.
      try {
        const videosRef = collection(db, 'users', firebaseUser.uid, 'videos');
        const videosQuery = query(videosRef, orderBy('uploadedAt', 'desc'));
        const videosSnap = await getDocs(videosQuery);

        playerData.videos = videosSnap.docs.map(d => {
          const data = d.data();
          // Firestore stores uploadedAt as a Timestamp object; convert it to
          // the same display string format used everywhere else in the UI.
          const date = data.uploadedAt && typeof data.uploadedAt.toDate === 'function'
            ? data.uploadedAt.toDate().toLocaleDateString('en-ZW')
            : 'Recently';
          return { id: d.id, ...data, date };
        });
        localStorage.setItem('scoutlink_videos', JSON.stringify(playerData.videos));
      } catch (err) {
        console.error('Failed to load videos from Firestore:', err);
        // Fall back to whatever was cached locally so the page isn't empty
        const cached = localStorage.getItem('scoutlink_videos');
        if (cached) playerData.videos = JSON.parse(cached);
      }

      // Now that we have a confirmed, fresh profile, render the dashboard
      loadPlayerData();
      renderProfile();
      renderVideos();
      updateStats();
    });

  } catch (err) {
    firebaseLoadError = err;
    console.error('Firebase failed to load in player-dashboard.js:', err);
    showToast('Could not connect to the server. Some features may not work — please refresh.');
  }
})();


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

// NOTE: loadPlayerData(), renderProfile(), renderVideos(), and updateStats()
// are now triggered from the onAuthStateChanged guard above, once Firebase
// confirms a real, valid session — not on a blind DOMContentLoaded.

// --- Sidebar active link ---
function setActive(el) {
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  el.classList.add('active');
  // Close sidebar on mobile after click
  document.getElementById('sidebar').classList.remove('open');
}

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

  // NOTE: videos are no longer loaded here — they're fetched directly from
  // Firestore (users/{uid}/videos) in the auth guard above, before this
  // function runs, so playerData.videos is already populated and fresh.
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

// --- Save Profile — writes to Firestore (source of truth) + local cache ---
async function saveProfile() {
  playerData.name     = document.getElementById('editName').value.trim() || playerData.name;
  playerData.age      = document.getElementById('editAge').value || playerData.age;
  playerData.position = document.getElementById('editPosition').value || playerData.position;
  playerData.province = document.getElementById('editProvince').value || playerData.province;
  playerData.club     = document.getElementById('editClub').value.trim();
  playerData.bio      = document.getElementById('editBio').value.trim();

  const updates = {
    name: playerData.name,
    age: playerData.age,
    position: playerData.position,
    province: playerData.province,
    currentTeam: playerData.club,
    bio: playerData.bio,
  };

  // Update local cache immediately for snappy UI
  const stored = JSON.parse(localStorage.getItem('scoutlink_user') || '{}');
  Object.assign(stored, updates);
  localStorage.setItem('scoutlink_user', JSON.stringify(stored));

  renderProfile();
  toggleEditProfile();

  // Persist to Firestore (the real database) in the background
  const fb = requireFirebase();
  if (!fb) return; // already showed a toast explaining why

  const { auth, db, doc, updateDoc } = fb;
  const firebaseUser = auth.currentUser;
  if (firebaseUser) {
    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid), updates);
      showToast('Profile updated!');
    } catch (err) {
      console.error('Failed to save profile to Firestore:', err);
      showToast('Saved locally, but failed to sync. Check your connection.');
    }
  } else {
    showToast('Profile updated!');
  }
}

// --- Upload Tab State ---
let currentUploadTab = 'file'; // 'file' or 'link'
let selectedVideoFile = null;

// --- Switch between File Upload and Link tabs ---
function switchUploadTab(tab) {
  currentUploadTab = tab;

  // Update tab button styles
  document.getElementById('tabFile').classList.toggle('active', tab === 'file');
  document.getElementById('tabLink').classList.toggle('active', tab === 'link');

  // Show/hide the correct input group
  document.getElementById('fileUploadGroup').classList.toggle('hidden', tab !== 'file');
  document.getElementById('linkUploadGroup').classList.toggle('hidden', tab !== 'link');
}

// --- Handle file selected from device ---
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate it's a video
  if (!file.type.startsWith('video/')) {
    alert('Please select a valid video file (MP4, MOV, AVI).');
    return;
  }

  // Validate size — 100MB max.
  // Firebase's free tier gives 5GB total Storage — at 500MB/video that's
  // only ~10 videos for the entire platform. 100MB keeps room for hundreds
  // of highlight clips while still fitting a typical 2-3 minute reel.
  const maxSize = 100 * 1024 * 1024;
  if (file.size > maxSize) {
    alert('File is too large. Maximum size is 100MB.');
    return;
  }

  selectedVideoFile = file;

  // Show the selected file pill
  document.getElementById('fileDropZone').classList.add('hidden');
  document.getElementById('fileSelected').classList.remove('hidden');
  document.getElementById('fileSelectedName').textContent = file.name;
}

// --- Clear selected file ---
function clearFile() {
  selectedVideoFile = null;
  document.getElementById('videoFile').value = '';
  document.getElementById('fileDropZone').classList.remove('hidden');
  document.getElementById('fileSelected').classList.add('hidden');
}

// --- Drag and drop support ---
window.addEventListener('DOMContentLoaded', () => {
  // Re-run after DOM loads so the drop zone exists
  setTimeout(() => {
    const dropZone = document.getElementById('fileDropZone');
    if (!dropZone) return;

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) {
        // Simulate file input selection
        const dt = new DataTransfer();
        dt.items.add(file);
        document.getElementById('videoFile').files = dt.files;
        handleFileSelect({ target: { files: [file] } });
      }
    });
  }, 100);
});

// --- Toggle Upload Form ---
function toggleUploadForm() {
  const form = document.getElementById('uploadForm');
  form.classList.toggle('hidden');
  if (!form.classList.contains('hidden')) {
    // Reset to file tab when opening
    switchUploadTab('file');
    document.getElementById('videoTitle').focus();
  }
}

// --- Add Video (handles both file and link) ---
function addVideo() {
  const title = document.getElementById('videoTitle').value.trim();
  const desc  = document.getElementById('videoDesc').value.trim();

  if (!title) { alert('Please enter a video title.'); return; }

  if (currentUploadTab === 'file') {
    // --- File upload path — REAL Firebase Storage upload ---
    if (!selectedVideoFile) { alert('Please select a video file from your device.'); return; }
    uploadVideoFile(title, desc, selectedVideoFile);

  } else {
    // --- Link path — metadata only, no file upload needed ---
    const url = document.getElementById('videoUrl').value.trim();
    if (!url || !url.startsWith('http')) { alert('Please enter a valid YouTube or Vimeo link.'); return; }

    saveVideo({ title, url, desc, type: 'link' });
  }
}

// --- Upload a video file to Firebase Storage, with a REAL progress listener ---
async function uploadVideoFile(title, desc, file) {
  const fb = requireFirebase();
  if (!fb) return;

  const { auth, storage, ref, uploadBytesResumable, getDownloadURL } = fb;
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    showToast('You must be logged in to upload a video.');
    return;
  }

  const progress  = document.getElementById('uploadProgress');
  const fill      = document.getElementById('progressFill');
  const label     = document.getElementById('progressLabel');
  const uploadBtn = document.querySelector('#uploadForm .btn-primary');

  progress.classList.remove('hidden');
  if (uploadBtn) { uploadBtn.disabled = true; uploadBtn.textContent = 'Uploading...'; }

  // Sanitise the filename and namespace it under this user's folder so
  // Storage security rules can restrict access per-user.
  const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `videos/${firebaseUser.uid}/${Date.now()}_${safeName}`;
  const storageRef   = ref(storage, storagePath);

  const uploadTask = uploadBytesResumable(storageRef, file);

  uploadTask.on('state_changed',
    (snapshot) => {
      // REAL upload progress, reported directly by Firebase — not simulated.
      const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
      fill.style.width  = pct + '%';
      label.textContent = `Uploading... ${pct}%`;
    },
    (error) => {
      // Upload failed — show why, instead of silently doing nothing.
      console.error('Video upload error:', error);
      let msg = 'Upload failed. Please try again.';
      if (error.code === 'storage/unauthorized') {
        msg = 'You are not authorised to upload. Please log out and back in.';
      } else if (error.code === 'storage/canceled') {
        msg = 'Upload was cancelled.';
      } else if (error.code === 'storage/quota-exceeded') {
        msg = 'Storage quota exceeded. Please contact support.';
      }
      showToast(msg);

      progress.classList.add('hidden');
      fill.style.width  = '0%';
      label.textContent = '';
      if (uploadBtn) { uploadBtn.disabled = false; uploadBtn.textContent = 'Upload Video'; }
    },
    async () => {
      // Upload finished successfully — get the permanent, shareable download URL
      try {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

        label.textContent = 'Upload complete!';
        fill.style.width  = '100%';

        await saveVideo({
          title,
          url: downloadUrl,
          desc,
          type: 'file',
          fileName: file.name,
          storagePath, // kept so deleteVideo() can remove the actual file later
        });

      } catch (err) {
        console.error('Failed to finalise upload:', err);
        showToast('Upload finished, but saving the video record failed. Please try again.');
      } finally {
        progress.classList.add('hidden');
        fill.style.width  = '0%';
        label.textContent = '';
        if (uploadBtn) { uploadBtn.disabled = false; uploadBtn.textContent = 'Upload Video'; }
      }
    }
  );
}

// --- Save video metadata to Firestore (source of truth) + update UI ---
async function saveVideo(videoData) {
  const fb = requireFirebase();
  if (!fb) return;

  const { auth, db, collection, addDoc, serverTimestamp } = fb;
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    showToast('You must be logged in to add a video.');
    return;
  }

  try {
    const videosRef = collection(db, 'users', firebaseUser.uid, 'videos');
    const docRef = await addDoc(videosRef, {
      ...videoData,
      uploadedAt: serverTimestamp(),
    });

    // Reflect immediately in the UI with a local timestamp
    // (serverTimestamp() resolves async server-side, so we show "now" for display).
    const newVideo = {
      id: docRef.id,
      ...videoData,
      date: new Date().toLocaleDateString('en-ZW'),
    };
    playerData.videos.unshift(newVideo);
    localStorage.setItem('scoutlink_videos', JSON.stringify(playerData.videos));

    // Clear form
    document.getElementById('videoTitle').value = '';
    document.getElementById('videoUrl').value   = '';
    document.getElementById('videoDesc').value  = '';
    clearFile();
    toggleUploadForm();

    renderVideos();
    updateStats();
    showToast('Video added!');

  } catch (err) {
    console.error('Failed to save video metadata to Firestore:', err);
    showToast('Video upload succeeded, but saving the record failed. Please refresh and check My Videos.');
  }
}


// --- Render Videos ---
function renderVideos() {
  const grid  = document.getElementById('videoGrid');
  const empty = document.getElementById('videosEmpty');
  if (!grid) return;

  if (playerData.videos.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');
  grid.innerHTML = playerData.videos.map(v => {
    const isFile   = v.type === 'file';
    const typeBadge = isFile
      ? `<span class="badge badge-yellow">📁 Device Upload</span>`
      : `<span class="badge badge-blue">🔗 Link</span>`;
    const openBtn = isFile
      ? `<a href="${v.url}" target="_blank" class="btn btn-outline btn-xs">Play ▶</a>`
      : `<a href="${v.url}" target="_blank" class="btn btn-outline btn-xs">Open ↗</a>`;

    return `
      <div class="video-item">
        <div class="video-thumb-small" onclick="window.open('${v.url}','_blank')">
          <div class="play-btn">▶</div>
        </div>
        <div class="video-item-info">
          <strong>${v.title}</strong>
          <p>${v.desc || 'No description'}</p>
          <div style="display:flex;gap:6px;margin-top:6px;align-items:center;">
            ${typeBadge}
            <span style="font-size:11px;color:var(--muted);">Added ${v.date}</span>
          </div>
        </div>
        <div class="video-item-actions">
          ${openBtn}
          <button class="btn btn-ghost btn-xs" onclick="deleteVideo('${v.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function openVideo(encodedUrl) {
  window.open(decodeURIComponent(encodedUrl), '_blank');
}

async function deleteVideo(id) {
  if (!confirm('Remove this video?')) return;

  const fb = requireFirebase();
  if (!fb) return;

  const { auth, db, storage, doc, deleteDoc, ref, deleteObject } = fb;
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    showToast('You must be logged in to delete a video.');
    return;
  }

  // Find the video locally first so we know its storagePath (if it's a device upload)
  const video = playerData.videos.find(v => v.id === id);

  try {
    // 1. Delete the Firestore record
    await deleteDoc(doc(db, 'users', firebaseUser.uid, 'videos', id));

    // 2. If it was a device upload, also delete the actual file from Storage.
    //    Link-type videos have no storagePath, so this is skipped for those.
    if (video && video.type === 'file' && video.storagePath) {
      try {
        await deleteObject(ref(storage, video.storagePath));
      } catch (storageErr) {
        // Not fatal — the metadata is already gone, so the video disappears
        // from the UI either way. Log it so an orphaned file can be cleaned
        // up manually if needed.
        console.error('Failed to delete file from Storage (metadata was removed):', storageErr);
      }
    }

    // 3. Update local state + UI
    playerData.videos = playerData.videos.filter(v => v.id !== id);
    localStorage.setItem('scoutlink_videos', JSON.stringify(playerData.videos));
    renderVideos();
    updateStats();
    showToast('Video removed.');

  } catch (err) {
    console.error('Failed to delete video:', err);
    showToast('Failed to remove video. Please try again.');
  }
}

// --- Sidebar Toggle ---
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
async function saveAccountSettings() {
  const fb = requireFirebase();
  if (!fb) return;

  const { auth, db, doc, updateDoc, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } = fb;

  const email    = document.getElementById('settingsEmail').value.trim();
  const password = document.getElementById('settingsPassword').value;
  const firebaseUser = auth.currentUser;

  if (!firebaseUser) {
    showToast('You must be logged in to change settings.');
    return;
  }

  try {
    // Changing email or password requires a recent login (Firebase security rule).
    // If either changed, ask the user to confirm their current password first.
    if ((email && email !== firebaseUser.email) || password) {
      const currentPassword = prompt('For security, please re-enter your current password to confirm this change:');
      if (!currentPassword) { showToast('Change cancelled.'); return; }

      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
    }

    if (email && email !== firebaseUser.email) {
      await updateEmail(firebaseUser, email);
      await updateDoc(doc(db, 'users', firebaseUser.uid), { email });

      const stored = JSON.parse(localStorage.getItem('scoutlink_user') || '{}');
      stored.email = email;
      localStorage.setItem('scoutlink_user', JSON.stringify(stored));
    }

    if (password) {
      if (password.length < 8) {
        showToast('New password must be at least 8 characters.');
        return;
      }
      await updatePassword(firebaseUser, password);
    }

    showToast(password ? 'Email and password updated!' : 'Email updated!');
    document.getElementById('settingsPassword').value = '';

  } catch (err) {
    console.error('Settings update error:', err);
    let msg = 'Failed to update settings. Please try again.';
    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      msg = 'Incorrect current password. Please try again.';
    } else if (err.code === 'auth/email-already-in-use') {
      msg = 'That email is already used by another account.';
    } else if (err.code === 'auth/requires-recent-login') {
      msg = 'Please log out and log back in, then try again.';
    }
    showToast(msg);
  }
}

async function confirmDeleteAccount() {
  const confirmed = confirm('Are you sure you want to delete your account? This cannot be undone.');
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

    // Delete their Firestore profile, then their Auth account
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

// Pre-fill settings email from stored user
window.addEventListener('DOMContentLoaded', () => {
  const stored = localStorage.getItem('scoutlink_user');
  if (stored) {
    const user = JSON.parse(stored);
    const emailField = document.getElementById('settingsEmail');
    if (emailField && user.email) emailField.value = user.email;
  }
});

// --- Expose functions called via inline onclick/onchange/onkeydown in the HTML ---
// (Required because module scripts don't leak functions to the global scope automatically)
window.addVideo             = addVideo;
window.clearFile             = clearFile;
window.confirmDeleteAccount = confirmDeleteAccount;
window.logout                = logout;
window.openConvo             = openConvo;
window.saveAccountSettings  = saveAccountSettings;
window.saveProfile           = saveProfile;
window.sendMessage           = sendMessage;
window.setActive             = setActive;
window.switchUploadTab       = switchUploadTab;
window.toggleEditProfile     = toggleEditProfile;
window.toggleSidebar         = toggleSidebar;
window.toggleUploadForm      = toggleUploadForm;
window.handleFileSelect      = handleFileSelect;
window.deleteVideo           = deleteVideo;
window.openVideo             = openVideo;
