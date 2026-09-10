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

  const links = document.createElement('div');
  links.className = 'top-nav__links';
  PAGES.forEach(p => {
    const a = document.createElement('a');
    a.href = p.href;
    a.textContent = p.label;
    if (p.id === activePage) a.classList.add('active');
    links.appendChild(a);
  });

  // Brand cluster: VIT-AP logo, DSC logo, V-TAPP logo. Each <img> fails
  // gracefully via onerror so a missing asset just skips that badge
  // instead of breaking the whole nav.
  const brand = document.createElement('div');
  brand.className = 'top-nav__brand';
  brand.innerHTML = `
    <img src="shared/vtapp-logo.png" alt="V-TAPP" class="top-nav__logo top-nav__logo--vtapp" onerror="this.remove()">
    <img src="shared/vitap-logo.png" alt="VIT-AP" class="top-nav__logo" onerror="this.remove()">
    <img src="shared/dsc-logo.png" alt="DSC" class="top-nav__logo top-nav__logo--square" onerror="this.remove()">
  `;

  nav.appendChild(links);
  nav.appendChild(brand);
  document.body.insertBefore(nav, document.body.children[1] || null);
}
