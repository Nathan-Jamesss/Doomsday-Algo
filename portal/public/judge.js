// portal/public/judge.js
renderBanner();
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Point values and labels below are transcribed exactly from
// Doomsday_Algorithm_Judging_Checklist.docx (Round 4 Report Judging
// Checklist). Each category caps at 25; 25*4 = 100 total.
const CATEGORIES = [
  { key: 'dataSoph', label: 'Data Sophistication', max: 25, checks: [
    { label: 'Combined more than one data table (not just one CSV in isolation)', pts: 10 },
    { label: 'Used a real statistic — rate, trend, or correlation — not just a raw number', pts: 10 },
    { label: 'The tool/method shown actually matches the claim being made', pts: 5 },
  ]},
  { key: 'logicEvidence', label: 'Logic & Evidence', max: 25, checks: [
    { label: 'Prediction #1 cites a specific chart/number', pts: 5 },
    { label: 'Prediction #2 cites a specific chart/number', pts: 5 },
    { label: 'Prediction #3 cites a specific chart/number', pts: 5 },
    { label: "Correctly identified and handled a planted trap (Simpson's paradox / survivorship bias / leaky column)", pts: 10 },
  ]},
  { key: 'visualization', label: 'Visualization', max: 25, checks: [
    { label: 'At least one chart is included', pts: 10 },
    { label: 'Chart is readable — axes labeled, clear what it shows', pts: 10 },
    { label: 'Chart actually supports the claim placed beside it (not decorative)', pts: 5 },
  ]},
  { key: 'communication', label: 'Communication', max: 25, checks: [
    { label: 'Fits the half-page limit, no rambling', pts: 5 },
    { label: 'A stranger could follow the reasoning in under a minute', pts: 10 },
    { label: 'States confidence level AND reasoning together, not just a claim', pts: 10 },
  ]},
];

let judgeId, queue = [], currentIndex = 0;

document.getElementById('judge-id-save').addEventListener('click', async () => {
  judgeId = document.getElementById('judge-id-input').value.trim();
  if (!judgeId) return;
  document.getElementById('judge-id-prompt').style.display = 'none';
  document.getElementById('report-view').style.display = 'block';
  const snap = await db.collection('reports').get();
  queue = [];
  snap.forEach(doc => queue.push({ id: doc.id, ...doc.data() }));
  renderCurrent();
});

function renderCurrent() {
  const view = document.getElementById('report-view');
  if (currentIndex >= queue.length) {
    view.innerHTML = '<p>Queue complete.</p>';
    return;
  }
  // Blind queue: only the display-order position ("Report #N") is shown.
  // The real team ID (report.teamId) is never rendered to the judge — it is
  // only carried through to the judge_scores write below so the aggregation
  // trigger (Task 9) knows which leaderboard row to update.
  const report = queue[currentIndex];
  view.innerHTML = `<h2>Report #${currentIndex + 1} of ${queue.length}</h2>` +
    report.entries.map(e => `<p><strong>${e.questionId}</strong>: ${e.chartJustification} — trap: ${e.trapNote}</p>`).join('') +
    CATEGORIES.map(cat => `
      <div class="panel" style="margin:0.5rem 0;">
        <strong>${cat.label} (/${cat.max})</strong><br>
        ${cat.checks.map((c, i) => `
          <label><input type="checkbox" data-cat="${cat.key}" data-pts="${c.pts}"> ${c.label} (+${c.pts})</label><br>
        `).join('')}
      </div>
    `).join('') +
    `<button id="submit-judge">Submit and next</button>`;

  document.getElementById('submit-judge').addEventListener('click', () => {
    const totals = {};
    CATEGORIES.forEach(cat => totals[cat.key] = 0);
    view.querySelectorAll('input[type=checkbox]:checked').forEach(box => {
      totals[box.dataset.cat] += Number(box.dataset.pts);
    });
    const total = Object.values(totals).reduce((a, b) => a + b, 0);
    // Firestore rules (Task 7) forbid any client write to `leaderboard` —
    // this collection only accepts create, and the onJudgeScoreCreate
    // trigger (Task 9) reads every judge_scores doc for this reportId and
    // writes the averaged reportRaw into leaderboard server-side.
    db.collection('judge_scores').doc(`${judgeId}_${report.id}`).set({
      judgeId, reportId: report.id, teamId: report.teamId, totals, total, judgedAt: Date.now(),
    });
    currentIndex++;
    renderCurrent();
  });
}
