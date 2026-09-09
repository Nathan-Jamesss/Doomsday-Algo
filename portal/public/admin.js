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

db.collection('leaderboard').onSnapshot(snap => {
  const teams = [];
  snap.forEach(doc => {
    const d = doc.data();
    const predictPct = Math.min(100, (d.predictRaw || 0) / 15); // ~15-20 questions, 100pts max each
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
