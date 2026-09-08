// portal/public/shared/banner.js
function renderBanner() {
  const el = document.createElement('div');
  el.className = 'banner-earth4471';
  el.textContent = 'EARTH-4471 ARCHIVE — This is not Earth-616. Anything you remember about the real MCU is wrong here.';
  document.body.prepend(el);
}
