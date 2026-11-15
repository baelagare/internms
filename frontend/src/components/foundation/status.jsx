import { resolveStatus, STATUS_MAP } from './status.js';

export { resolveStatus, STATUS_MAP };

export function StatusBadge({ children, status, tone }) {
  const resolved = resolveStatus(status ?? children, tone);
  return <span className={`ds-badge ds-tone--${tone || resolved.tone}`}>{resolved.label}</span>;
}

