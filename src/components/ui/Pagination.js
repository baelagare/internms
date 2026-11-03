export function renderPaginationBar({ totalItems = 0, currentPage = 1, pageSize = 10, label = 'records' } = {}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(totalItems, currentPage * pageSize);

  return `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0.25rem; font-size: 0.8rem; color: var(--text-secondary);">
      <span>Showing <strong>${start}–${end}</strong> of <strong>${totalItems}</strong> ${label}</span>
      <span>Page <strong>${currentPage}</strong> of <strong>${totalPages}</strong></span>
    </div>
  `;
}
