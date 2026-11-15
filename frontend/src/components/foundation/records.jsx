import { useEffect, useId, useRef, useState } from 'react';
import { Button, Card, EmptyState, IconButton } from './primitives.jsx';
import { Icon } from '../Icons.jsx';

export function Tabs({ tabs = [], active, onChange, ariaLabel = 'Sections' }) {
  const refs = useRef([]);
  const selectedIndex = Math.max(0, tabs.findIndex(t => (t.id ?? t.key) === active));
  function onKeyDown(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let next = selectedIndex;
    if (event.key === 'ArrowRight') next = (selectedIndex + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (selectedIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    const target = tabs[next];
    if (target) {
      onChange(target.id ?? target.key);
      refs.current[next]?.focus();
    }
  }
  return <div role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown} className="ds-tablist">
    {tabs.map((tab, i) => {
      const id = tab.id ?? tab.key;
      const isSelected = id === active;
      return <button key={id} ref={el => { refs.current[i] = el; }} role="tab" type="button" aria-selected={isSelected} tabIndex={isSelected ? 0 : -1} onClick={() => onChange(id)} className={`ds-tab ${isSelected ? 'ds-tab--active' : ''}`}>
        <span>{tab.label}</span>{tab.count != null && <span className="ds-tab-count">{tab.count}</span>}
      </button>;
    })}
  </div>;
}

export function SearchField({ label = 'Search records', value = '', onChange, onClear, placeholder = 'Search…' }) {
  const id = useId();
  return <div className="space-y-1.5"><label htmlFor={id} className="text-sm font-semibold text-ink">{label}</label>
    <div className="relative flex items-center">
      <Icon name="search" className="pointer-events-none absolute left-3 text-muted" />
      <input id={id} type="search" value={value} onChange={onChange} placeholder={placeholder} className="ds-control pl-10 pr-10" />
      {value && <IconButton label="Clear search" icon="close" variant="quiet" onClick={onClear} className="absolute right-1" />}
    </div>
  </div>;
}

export function Pagination({ current = 1, pages = 1, total, onChange }) {
  if (pages <= 1) return null;
  return <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 pt-4">
    <Button variant="secondary" size="sm" disabled={current <= 1} onClick={() => onChange(current - 1)}>Previous page</Button>
    <p aria-live="polite" className="text-sm text-muted">Page {current} of {pages}{total != null && ` · ${total} records`}</p>
    <Button variant="secondary" size="sm" disabled={current >= pages} onClick={() => onChange(current + 1)}>Next page</Button>
  </nav>;
}

export function DataTable({ title, columns = [], rows = [], search = true, searchLabel, emptyTitle = 'No records found', emptyDescription, emptyIcon = 'inbox' }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const filtered = rows.filter(row => !query || JSON.stringify(row).toLowerCase().includes(query.toLowerCase()));
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return <Card className="p-6 space-y-4">
    {title && <h2 className="text-xl font-semibold text-ink">{title}</h2>}
    {search && rows.length > 5 && <SearchField label={searchLabel || `Search ${title ? title.toLowerCase() : 'records'}`} value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} onClear={() => { setQuery(''); setPage(1); }} />}
    <div tabIndex={0} role="region" aria-label={title || 'Data table'} className="overflow-x-auto focus-visible:outline-accent">
      {visible.length ? <table className="ds-table">
        <thead><tr>{columns.map(col => <th key={col.key} scope="col">{col.label}</th>)}</tr></thead>
        <tbody>{visible.map((row, idx) => <tr key={row.id ?? idx}>{columns.map(col => <td key={col.key}>{col.render ? col.render(row) : row[col.key] ?? '—'}</td>)}</tr>)}</tbody>
      </table> : <EmptyState title={emptyTitle} description={emptyDescription || (query ? 'Try different search terms.' : 'Records will appear here when added.')} icon={query ? 'search' : emptyIcon} />}
    </div>
    <Pagination current={currentPage} pages={pages} total={filtered.length} onChange={setPage} />
  </Card>;
}

export function Modal({ title, children, onClose, id: explicitId }) {
  const dialogRef = useRef(null);
  const genId = useId();
  const id = explicitId || genId;
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previous = document.activeElement;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      previous?.focus?.();
    };
  }, []);
  return <dialog ref={dialogRef} aria-labelledby={`${id}-title`} onCancel={e => { e.preventDefault(); onClose?.(); }} className="ds-modal">
    <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
      <h2 id={`${id}-title`} className="text-xl font-semibold text-ink">{title}</h2>
      <IconButton label="Close dialog" icon="close" variant="quiet" onClick={onClose} />
    </div>
    <div className="max-h-[75vh] overflow-y-auto p-6 space-y-4">{children}</div>
  </dialog>;
}
