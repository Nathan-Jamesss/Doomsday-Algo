// portal/public/admin.js
renderBanner();
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const functions = firebase.functions();

document.getElementById('reveal-btn').addEventListener('click', async () => {
  const revealPhase5 = functions.httpsCallable('revealPhase5');
  const result = await revealPhase5();
  alert(`Scored ${result.data.teamsScored} teams.`);
});

// Normalize Predict against the true number of Round 2 questions, not a
// hardcoded guess — Task 4's generator targets 18 (floor of 15), and a
// fixed divisor of 15 systematically inflated predictPct in the normal
// 18-question case. 18 is a fallback only for the brief window before
// this fetch resolves; the real leaderboard render always uses the
// fetched count once available.
let questionCount = 18;
db.collection('questions').get().then(snap => { questionCount = snap.size || questionCount; });

db.collection('leaderboard').onSnapshot(snap => {
  const teams = [];
  snap.forEach(doc => {
    const d = doc.data();
    const predictPct = Math.min(100, (d.predictRaw || 0) / questionCount);
    const draftPct = ((d.draftRaw || 0) / 195) * 100;
    const reportPct = d.reportRaw || 0;
    const combined = combineLeaderboard(predictPct, draftPct, reportPct);
    teams.push({ id: doc.id, ...combined, predictRaw: d.predictRaw || 0, submittedAt: d.lastSubmittedAt || 0 });
  });
  const ranked = rankTeams(teams);
  document.getElementById('board').innerHTML =
    '<tr><th>Rank</th><th>Team</th><th>Total</th><th>Predict</th><th>Draft</th><th>Report</th></tr>' +
    ranked.map((t, i) => `<tr><td>${i + 1}</td><td>${t.id}</td><td>${t.total}</td><td>${t.predictPct.toFixed(0)}%</td><td>${t.draftPct.toFixed(0)}%</td><td>${t.reportPct.toFixed(0)}%</td></tr>`).join('');
});
