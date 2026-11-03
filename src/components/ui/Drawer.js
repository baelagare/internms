/**
 * Slide-over drawer built on native <dialog> (light-dismiss with fallback).
 */
import { icon } from './Icons.js';
import { esc } from '../../utils/html.js';

export function openDrawer({ title = 'Details', subtitle = '', contentHtml = '', footerHtml = '', onMount = null } = {}) {
  document.getElementById('global-slide-drawer')?.remove();

  const dialog = document.createElement('dialog');
  dialog.id = 'global-slide-drawer';
  dialog.className = 'drawer-dialog';
  dialog.setAttribute('closedby', 'any');
  dialog.setAttribute('aria-labelledby', 'drawer-dialog-title');
  dialog.innerHTML = `
    <div class="modal-header modal-header-light">
      <div>
        <h3 id="drawer-dialog-title">${esc(title)}</h3>
        ${subtitle ? `<p class="modal-subtitle">${esc(subtitle)}</p>` : ''}
      </div>
      <button type="button" class="icon-btn drawer-close-btn" aria-label="Close" autofocus>${icon('x')}</button>
    </div>
    <div class="modal-body">${contentHtml}</div>
    ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
  `;
  document.body.appendChild(dialog);

  const closeDrawer = () => {
    dialog.returnValue = '';
    dialog.close();
  };
  dialog.querySelectorAll('.drawer-close-btn').forEach(b => b.addEventListener('click', closeDrawer));

  if (!('closedBy' in HTMLDialogElement.prototype)) {
    const outside = e => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressedOutside = false;
    dialog.addEventListener('pointerdown', e => { pressedOutside = outside(e); });
    dialog.addEventListener('pointerup', e => { if (pressedOutside && outside(e)) closeDrawer(); });
  }

  dialog.addEventListener('close', () => dialog.remove());
  dialog.showModal();
  onMount?.(dialog, closeDrawer);
  return { dialog, closeDrawer };
}
