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

// judge.js is the one page where team-authored FREEFORM text
// (chartJustification/trapNote) reaches a privileged viewer via
// unescaped innerHTML — a team could inject markup that runs in the
// judge's browser session, which (per final review) is worse here than
// on predict.js/draft.js because that session can create judge_scores
// documents. Escaping the two team-controlled fields closes that.
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str == null ? '' : str);
  return div.innerHTML;
}

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
    view.innerHTML = '<div class="placeholder">QUEUE COMPLETE — NO REPORTS PENDING</div><p style="text-align:center;margin-top:var(--s-4);"><span class="fx">Nice.</span></p>';
    return;
  }
  // Blind queue: only the display-order position ("Report #N") is shown.
  // The real team ID (report.teamId) is never rendered to the judge — it is
  // only carried through to the judge_scores write below so the aggregation
  // trigger (Task 9) knows which leaderboard row to update.
  const report = queue[currentIndex];
  view.innerHTML = `
    <section class="win win--accent">
      <header class="win__bar">
        <span class="win__dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="win__title">EARTH-4471 // REPORT ${currentIndex + 1} OF ${queue.length}</span>
      </header>
      <div class="win__body">
        ${report.entries.map(e => `<p class="mono" style="border:var(--border-thin);padding:var(--s-3);background:var(--paper);"><strong>${escapeHtml(e.questionId)}</strong>: ${escapeHtml(e.chartJustification)} — trap: ${escapeHtml(e.trapNote)}</p>`).join('')}
      </div>
    </section>
    ${CATEGORIES.map(cat => `
      <div class="panel">
        <h3 style="margin-bottom:var(--s-3);">${cat.label} <span class="mono" style="color:var(--marvel-blue);">/${cat.max}</span></h3>
        ${cat.checks.map(c => `
          <label style="display:flex;align-items:center;gap:var(--s-3);text-transform:none;font-weight:400;cursor:pointer;padding:var(--s-1) 0;">
            <input type="checkbox" data-cat="${cat.key}" data-pts="${c.pts}">
            <span style="flex:1;">${c.label}</span>
            <span class="mono" style="color:var(--marvel-blue);">+${c.pts}</span>
          </label>
        `).join('')}
      </div>
    `).join('')}
    <div class="win win--warn" style="position:sticky;bottom:0;margin-bottom:0;">
      <div class="win__body" style="display:flex;align-items:center;justify-content:space-between;gap:var(--s-4);padding:var(--s-3) var(--s-4);">
        <span class="mono" style="font-size:var(--t-2xl);">TOTAL: <span id="running-total">0</span> / 100</span>
        <button id="submit-judge">Submit and next →</button>
      </div>
    </div>
  `;

  function updateRunningTotal() {
    let sum = 0;
    view.querySelectorAll('input[type=checkbox]:checked').forEach(box => { sum += Number(box.dataset.pts); });
    document.getElementById('running-total').textContent = sum;
  }
  view.querySelectorAll('input[type=checkbox]').forEach(box => box.addEventListener('change', updateRunningTotal));

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
    }).then(() => {
      currentIndex++;
      renderCurrent();
    }).catch(() => toast('Score submission failed (maybe already scored this report under this judge ID?). Not advancing — try again.', 'error'));
  });
}
