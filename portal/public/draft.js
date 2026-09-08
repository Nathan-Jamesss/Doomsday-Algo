// portal/public/draft.js
renderBanner();
renderNav('draft');
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const teamId = localStorage.getItem('doomsday_team_id') || prompt('Team ID:');
localStorage.setItem('doomsday_team_id', teamId);

const CHARACTER_POOL = [
  'Tony Stark', 'Steve Rogers', 'Natasha Romanoff', 'Thor Odinson', 'Shuri',
  'Peter Parker', 'Stephen Strange', 'Carol Danvers', 'Peter Quill', 'Gamora',
  'Loki', 'Wanda Maximoff', 'Sam Wilson', 'Bucky Barnes', 'Kate Bishop',
  'Charles Xavier', 'Jean Grey', 'Logan', 'Victor von Doom', 'Hela',
  'Nick Fury', 'Okoye', 'Valkyrie', 'Wong',
]; // must match the 24-character pool committed to the answer key at build time

function renderBoard(takenMap) {
  const board = document.getElementById('board');
  board.innerHTML = '';
  CHARACTER_POOL.forEach(name => {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const card = document.createElement('div');
    card.className = 'panel';
    const taken = takenMap[id];
    card.innerHTML = `<strong>${name}</strong><br>${taken ? `<span class="accent-red">Picked by ${taken}</span>` : ''}`;
    if (!taken) {
      const btn = document.createElement('button');
      btn.textContent = 'Draft';
      btn.addEventListener('click', () => {
        // characterName (the real name, e.g. "Shuri") travels alongside the
        // slugified doc ID because Task 9's revealPhase5 looks up draft
        // outcomes in the answer key by real name, not by slug.
        db.collection('draft_picks').doc(id).set({ teamId, characterId: id, characterName: name, pickedAt: Date.now() })
          .catch(() => alert('Someone just took this character.'));
      });
      card.appendChild(btn);
    }
    board.appendChild(card);
  });
}

db.collection('draft_picks').onSnapshot(snap => {
  const takenMap = {};
  snap.forEach(doc => { takenMap[doc.id] = doc.data().teamId; });
  renderBoard(takenMap);
});

let secondsLeft = 15;
setInterval(() => {
  secondsLeft = secondsLeft > 0 ? secondsLeft - 1 : 15;
  document.getElementById('timer').textContent = `${secondsLeft}s`;
}, 1000);
