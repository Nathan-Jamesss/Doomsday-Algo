// portal/public/admin.js
renderBanner();
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// `leaderboard` (raw per-round scores) is fully private by design -- see
// firestore.rules. This page reads ONLY `leaderboard_public`, which the
// local-server scripts write with rank + blended total, nothing else.
// (An earlier version of this file read `leaderboard` directly and
// rendered per-round percentage columns -- caught in review: it was
// broken by the same commit that locked the collection down, AND even if
// the read had worked, showing per-round percentages here is exactly the
// answer-extraction oracle C6 exists to close.)
db.collection('leaderboard_public').orderBy('rank').onSnapshot(snap => {
  const rows = [];
  snap.forEach(doc => rows.push({ id: doc.id, ...doc.data() }));
  document.getElementById('board').innerHTML =
    '<tr><th>Rank</th><th>Team</th><th>Total</th></tr>' +
    rows.map(r => `<tr data-rank="${r.rank}"><td>${r.rank}</td><td>${escapeHtml(r.id)}</td><td>${r.total}</td></tr>`).join('');
  if (rows.length === 0) {
    document.getElementById('board').innerHTML =
      '<tr><th>Rank</th><th>Team</th><th>Total</th></tr><tr><td colspan="3" style="text-align:center;">NO STANDINGS YET — ARCHIVE QUIET</td></tr>';
  }
}, () => {
  document.getElementById('board').innerHTML = '<tr><td colspan="3">ARCHIVE UNREACHABLE — CHECK CONNECTION AND RELOAD</td></tr>';
});

// Team IDs are self-chosen (no auth), so escape before rendering into the
// projector's DOM the same way judge.js already does for report text.
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str == null ? '' : str);
  return div.innerHTML;
}

db.collection('reveal_state').doc('status').onSnapshot(doc => {
  const el = document.getElementById('reveal-status');
  if (doc.exists && doc.data().revealed) {
    el.textContent = 'PHASE 5 REVEALED — DRAFT FINAL';
    el.className = 'stamp stamp--done';
  } else {
    el.textContent = 'PHASE 5 NOT YET REVEALED';
    el.className = 'stamp stamp--sealed';
  }
});
