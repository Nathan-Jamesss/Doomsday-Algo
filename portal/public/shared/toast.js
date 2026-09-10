// portal/public/shared/toast.js
function toast(message, kind, ms) {
  kind = kind || 'info';
  ms = ms || 4500;
  var stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    stack.setAttribute('role', 'status');
    stack.setAttribute('aria-live', 'polite');
    document.body.appendChild(stack);
  }
  var el = document.createElement('div');
  el.className = 'toast toast--' + kind;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(function () { el.remove(); }, ms);
}
