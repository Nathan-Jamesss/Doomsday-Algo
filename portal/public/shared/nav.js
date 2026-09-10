// portal/public/shared/nav.js
const PAGES = [
  { id: 'landing', label: 'Home', href: 'index.html' },
  { id: 'explore', label: 'Explore', href: 'explore.html' },
  { id: 'predict', label: 'Predict', href: 'predict.html' },
  { id: 'draft', label: 'Draft', href: 'draft.html' },
  { id: 'report', label: 'Report', href: 'report.html' },
  { id: 'leaderboard', label: 'Leaderboard', href: 'admin.html' },
];

function renderNav(activePage) {
  const nav = document.createElement('nav');
  nav.className = 'top-nav';
  PAGES.forEach(p => {
    const a = document.createElement('a');
    a.href = p.href;
    a.textContent = p.label;
    if (p.id === activePage) a.classList.add('active');
    nav.appendChild(a);
  });
  document.body.insertBefore(nav, document.body.children[1] || null);
}
