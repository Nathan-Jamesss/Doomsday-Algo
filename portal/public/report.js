// portal/public/report.js
renderBanner();
renderNav('report');
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
// A team landing here first (skipping Predict) previously got teamId ===
// null, an empty query, and doc(null) throwing on submit -- the other
// pages (predict.js, draft.js) already prompt as a fallback; this one
// didn't (caught in final review).
const teamId = localStorage.getItem('doomsday_team_id') || prompt('Team ID:');
if (teamId) localStorage.setItem('doomsday_team_id', teamId);

// Task 12 submissions come in two shapes: yesno questions submit
// { probabilities: { yes: N } }, while multichoice questions submit
// { probabilities: { optionA: n1, optionB: n2, ... } } with NO `yes` key at
// all. Sorting by `Math.abs((probabilities.yes || 50) - 50)` would treat
// every multichoice submission as `undefined || 50` -> distance 0, i.e. the
// least confident possible reading, regardless of how bold the team's real
// pick was. `confidenceDistance` normalizes both shapes to "how far from an
// even/neutral split is this team's boldest claim in this submission" so
// the "3 boldest predictions" picker (spec §8) is comparing like with like.
function confidenceDistance(probabilities) {
  if (!probabilities) return 0;
  if ('yes' in probabilities) {
    return Math.abs(Number(probabilities.yes) - 50);
  }
  const values = Object.values(probabilities).map(Number);
  if (values.length === 0) return 0;
  const evenSplit = 100 / values.length;
  return Math.max(...values) - evenSplit;
}

// Human-readable summary of a submission's prediction, for both shapes.
function describePrediction(s) {
  const probabilities = s.probabilities || {};
  if ('yes' in probabilities) {
    return `${probabilities.yes}%`;
  }
  let bestOption = null;
  let bestValue = -Infinity;
  Object.entries(probabilities).forEach(([option, value]) => {
    if (Number(value) > bestValue) {
      bestValue = Number(value);
      bestOption = option;
    }
  });
  return bestOption ? `${bestOption} at ${bestValue}%` : 'no probabilities recorded';
}

async function loadTopThree() {
  const snap = await db.collection('submissions').where('teamId', '==', teamId).get();
  const subs = [];
  snap.forEach(doc => subs.push(doc.data()));
  subs.sort((a, b) => confidenceDistance(b.probabilities) - confidenceDistance(a.probabilities));
  const top3 = subs.slice(0, 3);

  const form = document.getElementById('report-form');
  const submitBtn = document.getElementById('submit-report');

  if (top3.length === 0) {
    form.innerHTML = '<div class="placeholder">NO PREDICTIONS FOUND — COMPLETE ROUND 1 OR 2 FIRST</div>';
    submitBtn.disabled = true;
    return;
  }

  top3.forEach((s, i) => {
    const div = document.createElement('div');
    div.className = 'win';
    div.innerHTML = `
      <header class="win__bar">
        <span class="win__dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="win__title">PREDICTION ${i + 1}</span>
      </header>
      <div class="win__body">
        <p style="margin-top:0;"><span class="mono">${s.questionId}</span> — you said <strong class="mono" style="color:var(--marvel-red);font-size:var(--t-xl);">${describePrediction(s)}</strong></p>
        <label>Chart/number that backs it</label>
        <textarea id="chart-${i}" rows="2"></textarea>
        <label style="margin-top:var(--s-3);">Trap noticed (if any) and how you handled it</label>
        <textarea id="trap-${i}" rows="2"></textarea>
      </div>
    `;
    form.appendChild(div);
  });

  submitBtn.addEventListener('click', () => {
    const entries = top3.map((s, i) => ({
      questionId: s.questionId,
      chartJustification: document.getElementById(`chart-${i}`).value,
      trapNote: document.getElementById(`trap-${i}`).value,
    }));
    db.collection('reports').doc(teamId).set({ teamId, entries, submittedAt: Date.now() })
      .then(() => {
        toast('Report submitted.', 'ok');
        form.innerHTML = '<div class="win win--accent"><header class="win__bar"><span class="win__dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="win__title">EARTH-4471 // REPORT LOGGED</span></header><div class="win__body"><p style="margin:0;">A judge will score it. You don\'t have to wait.</p></div></div>';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitted ✓';
        submitBtn.classList.add('btn--done');
      })
      .catch(() => toast('Submission failed — check your connection and try again.', 'error'));
  });
}

loadTopThree();
