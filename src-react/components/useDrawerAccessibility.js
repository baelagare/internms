import { useEffect } from 'react';

export function useDrawerAccessibility(open, sidebarRef, contentRef, onClose) {
  useEffect(() => {
    const sidebar = sidebarRef.current, content = contentRef.current;
    const mobile = window.matchMedia('(max-width: 767px)');
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    const controls = () => [...sidebar.querySelectorAll('button,a[href]')].filter(node => node.getClientRects().length && !node.disabled);
    const sync = () => {
      const modal = open && mobile.matches;
      sidebar.inert = mobile.matches && !open;
      content.inert = modal;
      document.body.style.overflow = modal ? 'hidden' : overflow;
      if (modal) { sidebar.setAttribute('role', 'dialog'); sidebar.setAttribute('aria-modal', 'true'); controls()[0]?.focus(); }
      else { sidebar.removeAttribute('role'); sidebar.removeAttribute('aria-modal'); }
      if (open && !mobile.matches) onClose();
    };
    sync();
    const onKey = event => {
      if (!open || !mobile.matches) return;
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const items = controls(), first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    mobile.addEventListener('change', sync);
    document.addEventListener('keydown', onKey);
    return () => {
      mobile.removeEventListener('change', sync); document.removeEventListener('keydown', onKey);
      sidebar.inert = false; content.inert = false; document.body.style.overflow = overflow;
      sidebar.removeAttribute('role'); sidebar.removeAttribute('aria-modal');
      if (open && previous?.isConnected) previous.focus();
    };
  }, [open, sidebarRef, contentRef]);
}