/**
 * Native <dialog> confirmation with optional mandatory reason.
 * Safe action (Cancel) receives autofocus on destructive confirmations.
 */
import { icon } from './Icons.js';
import { esc } from '../../utils/html.js';

export function openConfirmModal({
  title = 'Are you sure?',
  message = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  requireReason = false,
  reasonLabel = 'Reason',
  reasonPlaceholder = 'Add a short note…',
  defaultReason = ''
} = {}) {
  return new Promise(resolve => {
    document.getElementById('global-confirm-dialog')?.remove();

    const dialog = document.createElement('dialog');
    dialog.id = 'global-confirm-dialog';
    dialog.className = 'dialog-sm';
    dialog.setAttribute('aria-labelledby', 'confirm-dialog-title');

    const btnClass = { danger: 'btn-danger', gold: 'btn-primary', success: 'btn-success' }[variant] || 'btn-primary';

    dialog.innerHTML = `
      <form method="dialog" id="confirm-dialog-form">
        <div class="modal-header modal-header-light">
          <h3 id="confirm-dialog-title">${esc(title)}</h3>
          <button type="button" class="icon-btn dialog-cancel" aria-label="Close">${icon('x')}</button>
        </div>
        <div class="modal-body">
          ${message ? `<p class="modal-text">${esc(message)}</p>` : ''}
          ${
            requireReason
              ? `<div class="form-group">
                  <label class="form-label" for="confirm-reason-input">${esc(reasonLabel)}</label>
                  <textarea id="confirm-reason-input" class="form-textarea" required minlength="5"
                    aria-describedby="confirm-reason-error" placeholder="${esc(reasonPlaceholder)}">${esc(defaultReason)}</textarea>
                  <span id="confirm-reason-error" class="field-error-msg">At least 5 characters.</span>
                </div>`
              : ''
          }
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary dialog-cancel" ${variant === 'danger' ? 'autofocus' : ''}>${esc(cancelText)}</button>
          <button type="submit" class="btn ${btnClass}" ${variant !== 'danger' && !requireReason ? 'autofocus' : ''}>${esc(confirmText)}</button>
        </div>
      </form>
    `;
    document.body.appendChild(dialog);

    const reasonInput = dialog.querySelector('#confirm-reason-input');

    dialog.querySelector('#confirm-dialog-form').addEventListener('submit', e => {
      if (reasonInput && reasonInput.value.trim().length < 5) {
        e.preventDefault();
        reasonInput.setAttribute('aria-invalid', 'true');
        reasonInput.focus();
        return;
      }
      dialog.returnValue = 'confirm';
    });

    dialog.querySelectorAll('.dialog-cancel').forEach(btn =>
      btn.addEventListener('click', () => dialog.close('cancel'))
    );

    dialog.addEventListener('close', () => {
      const confirmed = dialog.returnValue === 'confirm';
      const reason = reasonInput ? reasonInput.value.trim() : '';
      dialog.returnValue = '';
      dialog.remove();
      resolve({ confirmed, reason: confirmed ? reason : '' });
    });

    dialog.showModal();
    reasonInput?.focus();
  });
}
