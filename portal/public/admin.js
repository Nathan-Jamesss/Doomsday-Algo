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
    rows.map(r => `<tr><td>${r.rank}</td><td>${r.id}</td><td>${r.total}</td></tr>`).join('');
}, () => {
  document.getElementById('board').innerHTML = '<tr><td>Could not load leaderboard.</td></tr>';
});

db.collection('reveal_state').doc('status').onSnapshot(doc => {
  const el = document.getElementById('reveal-status');
  if (doc.exists && doc.data().revealed) {
    el.textContent = 'Phase 5 has been revealed. Draft scores are final.';
  } else {
    el.textContent = 'Phase 5 not yet revealed.';
  }
});
