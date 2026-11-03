/**
 * Non-blocking toast notifications (popover="manual") with optional Undo.
 */
import { icon } from './Icons.js';
import { esc } from '../../utils/html.js';

const TYPE_ICON = { success: 'checkCircle', warning: 'alert', error: 'alertCircle', info: 'info' };

function ensureContainer() {
  let el = document.getElementById('toast-stack');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-stack';
    el.className = 'toast-stack';
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  return el;
}

export function showToast({ title = 'Done', message = '', type = 'info', durationMs = 4500, onUndo = null } = {}) {
  const container = ensureContainer();
  const toastEl = document.createElement('div');
  toastEl.className = `toast-item toast-${type}`;
  toastEl.setAttribute('popover', 'manual');
  toastEl.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toastEl.innerHTML = `
    <span class="toast-icon">${icon(TYPE_ICON[type] || 'info', { size: 18 })}</span>
    <div class="toast-body">
      <div class="toast-title">${esc(title)}</div>
      ${message ? `<div class="toast-message">${esc(message)}</div>` : ''}
    </div>
    <div class="toast-actions">
      ${onUndo ? `<button type="button" class="btn btn-xs btn-secondary toast-undo-btn">${icon('undo', { size: 14 })}Undo</button>` : ''}
      <button type="button" class="icon-btn toast-close-btn" aria-label="Dismiss notification">${icon('x', { size: 16 })}</button>
    </div>
  `;
  container.appendChild(toastEl);

  try {
    if (typeof toastEl.showPopover === 'function') toastEl.showPopover();
    else toastEl.classList.add(':popover-open');
  } catch (_) {
    toastEl.classList.add(':popover-open');
  }

  let closed = false;
  const dismiss = () => {
    if (closed) return;
    closed = true;
    try { toastEl.hidePopover?.(); } catch (_) { /* noop */ }
    toastEl.remove();
  };
  const timer = setTimeout(dismiss, onUndo ? Math.max(durationMs, 5000) : durationMs);

  toastEl.querySelector('.toast-close-btn')?.addEventListener('click', () => { clearTimeout(timer); dismiss(); });
  toastEl.querySelector('.toast-undo-btn')?.addEventListener('click', async () => {
    clearTimeout(timer);
    dismiss();
    await onUndo();
  });
  return { dismiss };
}
