// portal/public/predict.js
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let teamId = localStorage.getItem('doomsday_team_id');

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

function loadQuestions() {
  db.collection('questions').get().then(snap => {
    const container = document.getElementById('questions');
    snap.forEach(doc => {
      const q = doc.data();
      const div = document.createElement('div');
      div.className = 'panel';
      div.style.marginBottom = '1rem';

      // 3 of 18 Round 2 questions are multichoice (Task 4) — Task 8's
      // multiChoiceScore reads probabilities[correctOption] by the real
      // option string, so this must render one input per option, not the
      // yesno slider (which would always score multichoice questions as 0).
      if (q.type === 'multichoice') {
        const evenSplit = Math.round(100 / q.options.length);
        div.innerHTML = `
          <p>${q.text}</p>
          ${q.options.map(o => `<label>${o}: <input type="number" min="0" max="100" value="${evenSplit}" class="opt-input" data-option="${o}" style="width:4rem;"></label>%`).join(' ')}
          <span id="sum-${doc.id}"></span>
          <button id="submit-${doc.id}">Submit</button>
        `;
        container.appendChild(div);
        const inputs = div.querySelectorAll('.opt-input');
        const sumSpan = div.querySelector(`#sum-${doc.id}`);
        const updateSum = () => {
          const total = Array.from(inputs).reduce((s, i) => s + Number(i.value || 0), 0);
          sumSpan.textContent = `Total: ${total}%`;
        };
        inputs.forEach(i => i.addEventListener('input', updateSum));
        updateSum();
        div.querySelector(`#submit-${doc.id}`).addEventListener('click', () => {
          const probabilities = {};
          inputs.forEach(i => { probabilities[i.dataset.option] = Number(i.value || 0); });
          db.collection('submissions').doc(`${teamId}_${doc.id}`).set({
            teamId, questionId: doc.id, probabilities, submittedAt: Date.now(),
          });
        });
        return;
      }

      div.innerHTML = `
        <p>${q.text}</p>
        <input type="range" min="0" max="100" value="50" id="range-${doc.id}">
        <span id="val-${doc.id}">50</span>%
        <button id="submit-${doc.id}">Submit</button>
      `;
      container.appendChild(div);
      const range = div.querySelector(`#range-${doc.id}`);
      const val = div.querySelector(`#val-${doc.id}`);
      range.addEventListener('input', () => { val.textContent = range.value; });
      div.querySelector(`#submit-${doc.id}`).addEventListener('click', () => {
        db.collection('submissions').doc(`${teamId}_${doc.id}`).set({
          teamId, questionId: doc.id,
          probabilities: { yes: Number(range.value) },
          submittedAt: Date.now(),
        });
      });
    });
  });
}

function subscribeLeaderboard() {
  db.collection('leaderboard').onSnapshot(snap => {
    const rows = [];
    snap.forEach(doc => rows.push({ id: doc.id, ...doc.data() }));
    rows.sort((a, b) => (b.predictRaw || 0) - (a.predictRaw || 0));
    const table = document.getElementById('leaderboard-table');
    table.innerHTML = '<tr><th>Team</th><th>Predict score</th></tr>' +
      rows.map(r => `<tr><td>${r.id}</td><td>${(r.predictRaw || 0).toFixed(1)}</td></tr>`).join('');
  });
}

initTeamPrompt();
subscribeLeaderboard();
