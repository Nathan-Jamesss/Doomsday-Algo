// portal/public/admin.js
renderBanner();
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Normalize Predict against the true number of Round 2 questions, not a
// hardcoded guess — the generator targets 18 (floor of 15), and a fixed
// divisor systematically inflated predictPct in the normal case. 18 is a
// fallback only for the brief window before this fetch resolves.
let questionCount = 18;
// Draft max is 65 (1 exclusive pick per team, not 3 -- the original
// 3-pick design needed 120-180 exclusive character slots at 40-60 teams,
// but the roster only has 60 characters total; no pool curation fixes
// that arithmetic, so the round dropped to 1 pick per team instead).
const DRAFT_MAX_PER_TEAM = 65;
let latestLeaderboardSnapshot = null;

function renderLeaderboard() {
  if (!latestLeaderboardSnapshot) return;
  const teams = [];
  latestLeaderboardSnapshot.forEach(doc => {
    const d = doc.data();
    const predictPct = Math.min(100, (d.predictRaw || 0) / questionCount);
    const draftPct = Math.min(100, ((d.draftRaw || 0) / DRAFT_MAX_PER_TEAM) * 100);
    const reportPct = d.reportRaw || 0;
    const combined = combineLeaderboard(predictPct, draftPct, reportPct);
    teams.push({ id: doc.id, ...combined, predictRaw: d.predictRaw || 0, submittedAt: d.lastSubmittedAt || 0 });
  });
  const ranked = rankTeams(teams);
  document.getElementById('board').innerHTML =
    '<tr><th>Rank</th><th>Team</th><th>Total</th><th>Predict</th><th>Draft</th><th>Report</th></tr>' +
    ranked.map((t, i) => `<tr><td>${i + 1}</td><td>${t.id}</td><td>${t.total}</td><td>${t.predictPct.toFixed(0)}%</td><td>${t.draftPct.toFixed(0)}%</td><td>${t.reportPct.toFixed(0)}%</td></tr>`).join('');
}

db.collection('questions').get().then(snap => {
  questionCount = snap.size || questionCount;
  renderLeaderboard();
});

db.collection('leaderboard').onSnapshot(snap => {
  latestLeaderboardSnapshot = snap;
  renderLeaderboard();
});

db.collection('reveal_state').doc('status').onSnapshot(doc => {
  const el = document.getElementById('reveal-status');
  if (doc.exists && doc.data().revealed) {
    el.textContent = 'Phase 5 has been revealed. Draft scores are final.';
  } else {
    el.textContent = 'Phase 5 not yet revealed.';
  }
});
