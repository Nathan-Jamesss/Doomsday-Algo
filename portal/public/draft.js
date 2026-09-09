// portal/public/draft.js
renderBanner();
renderNav('draft');
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const teamId = localStorage.getItem('doomsday_team_id') || prompt('Team ID:');
if (teamId) localStorage.setItem('doomsday_team_id', teamId);

// Each team gets exactly 1 exclusive pick, not 3 -- the roster only has 60
// characters total, which can't cover 40-60 teams x 3 picks (120-180
// exclusive slots needed) no matter how the pool is curated. Pool is
// fetched from data/draft_pool.json (generated at build time from Phase 5's
// actual characterOutcomes, so every listed character is guaranteed to
// have a real Phase 5 outcome -- the old hardcoded 24-name list had 6
// entries with no outcome at all, a guaranteed silent 0 for whoever picked
// them).
let characterPool = [];
let latestTakenMap = {};

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function teamAlreadyHasPick(takenMap) {
  return Object.values(takenMap).some(pickedTeamId => pickedTeamId === teamId);
}

function renderBoard(takenMap) {
  latestTakenMap = takenMap;
  const board = document.getElementById('board');
  board.innerHTML = '';
  const alreadyPicked = teamAlreadyHasPick(takenMap);
  characterPool.forEach(name => {
    const id = slugify(name);
    const card = document.createElement('div');
    card.className = 'panel';
    const taken = takenMap[id];
    card.innerHTML = `<strong>${name}</strong><br>${taken ? `<span class="accent-red">Picked by ${taken}</span>` : ''}`;
    if (!taken && !alreadyPicked) {
      const btn = document.createElement('button');
      btn.textContent = 'Draft';
      btn.addEventListener('click', () => {
        // characterName (the real name, e.g. "Shuri") travels alongside the
        // slugified doc ID because the reveal step looks up draft outcomes
        // in the answer key by real name, not by slug.
        db.collection('draft_picks').doc(id).set({ teamId, characterId: id, characterName: name, pickedAt: Date.now() })
          .catch(() => alert('Someone just took this character, or you already have a pick.'));
      });
      card.appendChild(btn);
    } else if (!taken && alreadyPicked) {
      card.innerHTML += '<br><span style="opacity:0.6;">(you already drafted a character)</span>';
    }
    board.appendChild(card);
  });
}

fetch('data/draft_pool.json')
  .then(r => r.json())
  .then(pool => {
    characterPool = pool;
    renderBoard(latestTakenMap);
  })
  .catch(() => alert('Could not load the draft pool. Check your connection and reload.'));

db.collection('draft_picks').onSnapshot(snap => {
  const takenMap = {};
  snap.forEach(doc => { takenMap[doc.id] = doc.data().teamId; });
  renderBoard(takenMap);
});

let secondsLeft = 15;
setInterval(() => {
  secondsLeft = secondsLeft > 0 ? secondsLeft - 1 : 15;
  document.getElementById('timer').textContent = `${secondsLeft}s`;
}, 1000);
