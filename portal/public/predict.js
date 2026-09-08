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
