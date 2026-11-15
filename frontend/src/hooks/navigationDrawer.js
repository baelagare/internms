export const DRAWER_QUERY = '(max-width: 1023px)';

// DOM binding is separate from React so lifecycle behavior can be tested without accounts.
export function bindNavigationDrawer({ open, sidebar, background = [], onClose, document: doc = globalThis.document, media = globalThis.window?.matchMedia(DRAWER_QUERY) }) {
  if (!sidebar || !doc || !media) return () => {};
  const previous = doc.activeElement;
  const overflow = doc.body.style.overflow;
  const nodes = [sidebar, ...background];
  const original = nodes.map(node => ({ node, inert: node.inert, hidden: node.getAttribute('aria-hidden') }));
  const controls = () => [...sidebar.querySelectorAll('button,a[href],[tabindex]')]
    .filter(node => node.getClientRects().length && !node.disabled && node.tabIndex >= 0);
  let modal = false;
  const sync = () => {
    modal = open && media.matches;
    sidebar.inert = media.matches && !open;
    if (sidebar.inert) sidebar.setAttribute('aria-hidden', 'true');
    else sidebar.removeAttribute('aria-hidden');
    background.forEach(node => { node.inert = modal || original.find(item => item.node === node).inert; });
    doc.body.style.overflow = modal ? 'hidden' : overflow;
    if (modal) {
      sidebar.setAttribute('role', 'dialog');
      sidebar.setAttribute('aria-modal', 'true');
      (controls()[0] || sidebar).focus();
    } else {
      sidebar.removeAttribute('role');
      sidebar.removeAttribute('aria-modal');
    }
    if (open && !media.matches) onClose();
  };
  const onKey = event => {
    if (!modal) return;
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
    if (event.key !== 'Tab') return;
    const items = controls(), first = items[0], last = items.at(-1);
    if (!items.length) { event.preventDefault(); sidebar.focus(); return; }
    if (!sidebar.contains(doc.activeElement)) { event.preventDefault(); first.focus(); }
    else if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  sync();
  media.addEventListener('change', sync);
  doc.addEventListener('keydown', onKey);
  return () => {
    media.removeEventListener('change', sync);
    doc.removeEventListener('keydown', onKey);
    original.forEach(({ node, inert, hidden }) => {
      node.inert = inert;
      if (hidden == null) node.removeAttribute('aria-hidden'); else node.setAttribute('aria-hidden', hidden);
    });
    doc.body.style.overflow = overflow;
    sidebar.removeAttribute('role');
    sidebar.removeAttribute('aria-modal');
    if (open && media.matches && previous?.isConnected) previous.focus();
  };
}
