import { useEffect } from 'react';

import { bindNavigationDrawer } from './navigationDrawer.js';

export function useDrawerAccessibility(open, sidebarRef, contentRef, onClose, bottomNavRef) {
  useEffect(() => bindNavigationDrawer({
    open, sidebar: sidebarRef.current,
    background: [contentRef.current, bottomNavRef?.current].filter(Boolean), onClose
  }), [open, sidebarRef, contentRef, onClose, bottomNavRef]);
}

