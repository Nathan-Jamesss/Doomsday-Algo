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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str == null ? '' : str);
  return div.innerHTML;
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
    const taken = takenMap[id];
    card.className = taken ? 'char char--taken' : 'char';
    const isMine = taken === teamId;
    card.innerHTML = `<span class="char__name">${escapeHtml(name)}</span>` +
      (taken ? `<span class="char__stamp stamp ${isMine ? 'stamp--done' : 'stamp--taken'}">${isMine ? 'YOURS' : 'TAKEN'}</span><span class="char__meta">Picked by ${escapeHtml(taken)}</span>` : '');
    if (!taken && !alreadyPicked) {
      const btn = document.createElement('button');
      btn.textContent = 'Draft';
      btn.addEventListener('click', () => {
        // characterName (the real name, e.g. "Shuri") travels alongside the
        // slugified doc ID because the reveal step looks up draft outcomes
        // in the answer key by real name, not by slug.
        //
        // Written as an atomic batch with draft_team_locks/{teamId}, not a
        // single .set() -- Firestore's exists()-based rule only stopped a
        // second team from taking this SAME character; nothing stopped one
        // team from taking multiple characters via two tabs (caught in
        // final review). The batch either fully succeeds or fully fails.
        const batch = db.batch();
        batch.set(db.collection('draft_picks').doc(id), { teamId, characterId: id, characterName: name, pickedAt: Date.now() });
        batch.set(db.collection('draft_team_locks').doc(teamId), { teamId, characterId: id, pickedAt: Date.now() });
        batch.commit().catch(() => toast('Someone just took this character, or you already have a pick.', 'error'));
      });
      card.appendChild(btn);
    } else if (!taken && alreadyPicked) {
      card.innerHTML += '<span class="char__meta">(you already drafted a character)</span>';
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
  .catch(() => toast('Could not load the draft pool. Check your connection and reload.', 'error'));

db.collection('draft_picks').onSnapshot(snap => {
  const takenMap = {};
  snap.forEach(doc => { takenMap[doc.id] = doc.data().teamId; });
  renderBoard(takenMap);
});

// No countdown timer: this is a drop-in event with no shared clock, so a
// per-team "turn timer" would be fiction (there are no turns). Scarcity
// alone -- a character vanishing the instant anyone else picks it -- is
// what creates the pressure to draft sooner rather than later.
