// portal/public/predict.js
// Shared renderer for both question rounds. explore.html sets
// window.DOOMSDAY_ROUND = 'explore' before loading this file; predict.html
// leaves it unset. Filtering happens client-side rather than with a
// Firestore where() clause so no composite index or rule change is needed
// for 34 documents.
//
// Renders one question full-screen at a time (quiz-style), not a scrollable
// list. Answered/skip state is tracked ONLY in memory for this page load --
// re-reading `submissions` to restore state on refresh would cost ~1 read
// per question per team, which is the kind of thing the zero-extra-reads
// budget exists to prevent. A refresh restarts at question 1; earlier
// answers are already safely stored server-side and are not lost or
// re-scored, just not reflected in the local progress bar anymore.
const ROUND = window.DOOMSDAY_ROUND || 'predict';
const NEXT_ROUND_HREF = ROUND === 'explore' ? 'predict.html' : 'draft.html';
const NEXT_ROUND_LABEL = ROUND === 'explore' ? 'Round 02 — Predict' : 'Round 03 — Draft';

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let teamId = localStorage.getItem('doomsday_team_id');
let questions = [];
let current = 0;
let answeredIds = new Set();

function initTeamPrompt() {
  if (teamId) {
    document.getElementById('team-id-prompt').style.display = 'none';
    document.getElementById('questions').style.display = 'block';
    loadQuestions();
    return;
  }
  document.getElementById('team-id-save').addEventListener('click', () => {
    const val = document.getElementById('team-id-input').value.trim();
    if (!val) return;
    localStorage.setItem('doomsday_team_id', val);
    teamId = val;
    document.getElementById('team-id-prompt').style.display = 'none';
    document.getElementById('questions').style.display = 'block';
    loadQuestions();
  });
}

function questionSortKey(id) {
  const n = parseInt(String(id).replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(n) ? 0 : n;
}

function loadQuestions() {
  const container = document.getElementById('questions');
  container.innerHTML = '<div class="placeholder">RETRIEVING ARCHIVE…</div>';
  db.collection('questions').get().then(snap => {
    questions = [];
    snap.forEach(doc => {
      const q = doc.data();
      if ((q.round || 'predict') !== ROUND) return;
      questions.push({ id: doc.id, ...q });
    });
    questions.sort((a, b) => questionSortKey(a.id) - questionSortKey(b.id));
    current = 0;
    renderScreen();
  }).catch(() => {
    container.innerHTML = '<div class="placeholder">ARCHIVE UNREACHABLE — CHECK CONNECTION AND RELOAD</div>';
  });
}

function renderProgress() {
  const pct = Math.round((answeredIds.size / questions.length) * 100);
  return `
    <div class="q-progress">
      <span class="q-progress__label mono">QUESTION ${current + 1} OF ${questions.length} · ${answeredIds.size} ANSWERED</span>
      <div class="q-progress__track"><div class="q-progress__fill" style="width:${pct}%"></div></div>
    </div>
  `;
}

function goTo(index) {
  if (index < 0) return;
  current = index;
  renderScreen();
}

function renderComplete() {
  const container = document.getElementById('questions');
  container.innerHTML = `
    <section class="win win--accent">
      <header class="win__bar">
        <span class="win__dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="win__title">EARTH-4471 // ROUND COMPLETE</span>
      </header>
      <div class="win__body">
        <h2 style="margin-top:0;">${answeredIds.size} of ${questions.length} answered</h2>
        <p>You can go back and answer any you skipped, or move on — nothing here is locked until the round ends.</p>
        <div style="display:flex;gap:var(--s-3);flex-wrap:wrap;">
          <button id="review-btn" class="btn--secondary">← Review questions</button>
          <button id="next-round-btn" class="btn--lg">${NEXT_ROUND_LABEL} →</button>
        </div>
      </div>
    </section>
  `;
  document.getElementById('review-btn').addEventListener('click', () => goTo(0));
  document.getElementById('next-round-btn').addEventListener('click', () => { location.href = NEXT_ROUND_HREF; });
}

function renderScreen() {
  if (current >= questions.length) { renderComplete(); return; }
  const container = document.getElementById('questions');
  const q = questions[current];
  const isLast = current === questions.length - 1;
  const alreadyAnswered = answeredIds.has(q.id);

  container.innerHTML = renderProgress() + '<div id="q-slot"></div>';
  const slot = document.getElementById('q-slot');
  const div = document.createElement('div');
  div.className = 'q q--screen' + (alreadyAnswered ? ' q--answered' : '');

  function afterAnswered() {
    answeredIds.add(q.id);
    setTimeout(() => goTo(current + 1), 350);
  }

  // multiChoiceScore reads probabilities[correctOption] by the real
  // option string, so this must render one input per option, not the
  // yesno slider (which would always score multichoice questions as 0).
  if (q.type === 'multichoice') {
    const evenSplit = Math.round(100 / q.options.length);
    div.innerHTML = `
      <span class="q__id">${q.id}</span>
      <p class="q__text">${q.text}</p>
      <div class="q__options">
        ${q.options.map(o => `<div class="q__option"><label style="margin:0;">${o}</label><span><input type="number" min="0" max="100" value="${evenSplit}" class="opt-input" data-option="${o}">%</span></div>`).join('')}
      </div>
      <div class="q__control">
        <span id="sum-${q.id}" class="q__sum"></span>
        <button id="submit-${q.id}">${alreadyAnswered ? 'Submitted ✓' : 'Submit & Next'}</button>
        ${!isLast ? '<button id="skip-btn" class="btn--ghost">Skip →</button>' : ''}
        ${current > 0 ? '<button id="prev-btn" class="btn--ghost">← Back</button>' : ''}
      </div>
    `;
    slot.appendChild(div);
    const inputs = div.querySelectorAll('.opt-input');
    const sumSpan = div.querySelector(`#sum-${q.id}`);
    const updateSum = () => {
      const total = Array.from(inputs).reduce((s, i) => s + Number(i.value || 0), 0);
      sumSpan.textContent = `Total: ${total}%`;
      sumSpan.classList.toggle('q__sum--bad', total !== 100);
    };
    inputs.forEach(i => i.addEventListener('input', updateSum));
    updateSum();
    const submitBtn = div.querySelector(`#submit-${q.id}`);
    if (alreadyAnswered) submitBtn.classList.add('btn--done');
    submitBtn.addEventListener('click', () => {
      if (alreadyAnswered) { goTo(current + 1); return; }
      const probabilities = {};
      inputs.forEach(i => { probabilities[i.dataset.option] = Number(i.value || 0); });
      submitBtn.disabled = true;
      db.collection('submissions').doc(`${teamId}_${q.id}`).set({
        teamId, questionId: q.id, probabilities, submittedAt: Date.now(),
      })
        .then(() => {
          submitBtn.textContent = 'Submitted ✓';
          submitBtn.classList.add('btn--done');
          div.classList.add('q--answered');
          afterAnswered();
        })
        .catch(() => {
          submitBtn.disabled = false;
          toast('Submission failed — check your connection and try again. (You can only submit each question once.)', 'error');
        });
    });
  } else {
    div.innerHTML = `
      <span class="q__id">${q.id}</span>
      <p class="q__text">${q.text}</p>
      <div class="q__control">
        <input type="range" min="0" max="100" value="50" id="range-${q.id}">
        <span class="q__value"><span id="val-${q.id}">50</span>%</span>
      </div>
      <div class="q__control" style="margin-top:var(--s-3);">
        <button id="submit-${q.id}">${alreadyAnswered ? 'Submitted ✓' : 'Submit & Next'}</button>
        ${!isLast ? '<button id="skip-btn" class="btn--ghost">Skip →</button>' : ''}
        ${current > 0 ? '<button id="prev-btn" class="btn--ghost">← Back</button>' : ''}
      </div>
    `;
    slot.appendChild(div);
    const range = div.querySelector(`#range-${q.id}`);
    const val = div.querySelector(`#val-${q.id}`);
    range.addEventListener('input', () => { val.textContent = range.value; });
    const submitBtn = div.querySelector(`#submit-${q.id}`);
    if (alreadyAnswered) submitBtn.classList.add('btn--done');
    submitBtn.addEventListener('click', () => {
      if (alreadyAnswered) { goTo(current + 1); return; }
      submitBtn.disabled = true;
      db.collection('submissions').doc(`${teamId}_${q.id}`).set({
        teamId, questionId: q.id,
        probabilities: { yes: Number(range.value) },
        submittedAt: Date.now(),
      })
        .then(() => {
          submitBtn.textContent = 'Submitted ✓';
          submitBtn.classList.add('btn--done');
          div.classList.add('q--answered');
          afterAnswered();
        })
        .catch(() => {
          submitBtn.disabled = false;
          toast('Submission failed — check your connection and try again. (You can only submit each question once.)', 'error');
        });
    });
  }

  const skipBtn = div.querySelector('#skip-btn');
  if (skipBtn) skipBtn.addEventListener('click', () => goTo(current + 1));
  const prevBtn = div.querySelector('#prev-btn');
  if (prevBtn) prevBtn.addEventListener('click', () => goTo(current - 1));
}

initTeamPrompt();
