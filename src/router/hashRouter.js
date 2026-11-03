import { getState } from '../state/store.js';

const DEFAULT_ROUTES = {
  student: '#/student/dashboard',
  coordinator: '#/coordinator/dashboard',
  supervisor: '#/supervisor/dashboard',
  admin: '#/admin/dashboard'
};

const PUBLIC_ROUTES = new Set(['#/', '#/login']);

let routeChangeHandler = null;

export function getDefaultRouteForRole(role) {
  return DEFAULT_ROUTES[role] || '#/login';
}

export function getCurrentRoute() {
  const hash = window.location.hash;
  if (!hash || hash === '#') return '#/';
  return hash.startsWith('#/') ? hash.split('?')[0] : `#/${hash.replace(/^#/, '')}`;
}

export function navigateTo(route, replace = false) {
  const target = route.startsWith('#/') ? route : `#/${route.replace(/^#/, '')}`;
  if (replace) window.history.replaceState({ route: target }, '', target);
  else if (window.location.hash !== target) window.history.pushState({ route: target }, '', target);
  evaluate();
}

function evaluate() {
  if (!routeChangeHandler) return;
  const { currentUser } = getState();
  const current = getCurrentRoute();

  if (!currentUser) {
    if (!PUBLIC_ROUTES.has(current)) {
      window.history.replaceState({ route: '#/login' }, '', '#/login');
      routeChangeHandler('#/login');
      return;
    }
    routeChangeHandler(current);
    return;
  }

  const rolePrefix = `#/${currentUser.role}/`;
  if (PUBLIC_ROUTES.has(current) || !current.startsWith(rolePrefix)) {
    const fallback = getDefaultRouteForRole(currentUser.role);
    window.history.replaceState({ route: fallback }, '', fallback);
    routeChangeHandler(fallback);
    return;
  }
  routeChangeHandler(current);
}

export function initHashRouter(onRouteChange) {
  routeChangeHandler = onRouteChange;
  window.addEventListener('hashchange', evaluate);
  window.addEventListener('popstate', evaluate);
  evaluate();
}
