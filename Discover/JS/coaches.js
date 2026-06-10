/* =============================================
   SCOUTLINK — COACHES BROWSE JS
   ============================================= */

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

window.addEventListener('DOMContentLoaded', () => {
  // Add current user's profile to player list if they're a player
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
});

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

function logout() {
  localStorage.removeItem('scoutlink_loggedIn');
  window.location.href = 'login.html';
}

function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
