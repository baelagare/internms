import { icon } from './Icons.js';
import { esc } from '../../utils/html.js';

export function renderEmptyState({ icon: iconName = 'layers', title = 'Nothing here yet', description = '', actionHtml = '' } = {}) {
  return `
    <div class="empty-state">
      <span class="empty-state-icon">${icon(iconName, { size: 22 })}</span>
      <h3>${esc(title)}</h3>
      ${description ? `<p>${esc(description)}</p>` : ''}
      ${actionHtml}
    </div>
  `;
}
