/**
 * Printable document preview with official NEMSU letterhead.
 */
import { icon } from './Icons.js';
import { esc, LOGOS } from '../../utils/html.js';

export function renderLetterhead(subtitle = 'Office of On-the-Job Training · A.Y. 2026–2027') {
  return `
    <header class="letterhead">
      <img src="${LOGOS.seal}" alt="InternMS logo" width="64" height="64" />
      <div>
        <div class="letterhead-sup">Republic of the Philippines</div>
        <div class="letterhead-name">North Eastern Mindanao State University</div>
        <div class="letterhead-sub">Main Campus · Rosario, Tandag City, Surigao del Sur</div>
        <div class="letterhead-office">${esc(subtitle)}</div>
      </div>
      <img src="${LOGOS.mark}" alt="" width="44" height="64" class="letterhead-mark" />
    </header>
  `;
}

export function openDocumentPreviewModal({ title = 'Document', subtitle = '', documentBodyHtml = '', actionsHtml = '', onMount = null } = {}) {
  document.getElementById('global-pdf-preview-dialog')?.remove();

  const dialog = document.createElement('dialog');
  dialog.id = 'global-pdf-preview-dialog';
  dialog.className = 'dialog-lg';
  dialog.setAttribute('closedby', 'any');
  dialog.setAttribute('aria-labelledby', 'pdf-preview-title');
  dialog.innerHTML = `
    <div class="modal-header modal-header-light no-print">
      <div>
        <h3 id="pdf-preview-title">${esc(title)}</h3>
        ${subtitle ? `<p class="modal-subtitle">${esc(subtitle)}</p>` : ''}
      </div>
      <div class="row-actions">
        <button type="button" class="btn btn-sm btn-secondary" id="pdf-preview-print-btn">${icon('printer', { size: 16 })}Print</button>
        <button type="button" class="icon-btn" id="pdf-preview-close-btn" aria-label="Close" autofocus>${icon('x')}</button>
      </div>
    </div>
    <div class="modal-body modal-body-muted">
      <article class="print-sheet" id="printable-doc-sheet">
        ${renderLetterhead()}
        ${documentBodyHtml}
      </article>
    </div>
    ${actionsHtml ? `<div class="modal-footer no-print">${actionsHtml}</div>` : ''}
  `;
  document.body.appendChild(dialog);

  const close = () => dialog.close();
  dialog.querySelector('#pdf-preview-close-btn').addEventListener('click', close);
  dialog.querySelector('#pdf-preview-print-btn').addEventListener('click', () => {
    document.body.classList.add('printing-dialog');
    window.print();
    document.body.classList.remove('printing-dialog');
  });
  dialog.addEventListener('close', () => dialog.remove());
  dialog.showModal();
  onMount?.(dialog, close);
  return { dialog, close };
}
