/* ============================================================
   ROUTER — Hash-based SPA Router (works from any path/file://)
   ============================================================ */

const routes = new Map();
let currentCleanup = null;
let currentPath = null;

export function registerRoute(path, handler) {
  routes.set(path, handler);
}

export function navigate(path, opts = {}) {
  if (path === currentPath && !opts.force) return;

  const container = document.getElementById('page');
  if (!container) return;

  // Cleanup previous page
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  // Update hash (unless it's a hashchange navigation)
  if (!opts.hashchange) {
    location.hash = '#' + path;
  }

  currentPath = path;

  // Find matching route
  let handler = null;
  let params = {};

  for (const [pattern, h] of routes) {
    const match = matchRoute(pattern, path);
    if (match) {
      handler = h;
      params = match;
      break;
    }
  }

  if (!handler) {
    handler = routes.get('/') || (() => {});
  }

  // Page exit animation
  container.classList.remove('page-enter-active');
  container.classList.add('page-enter');

  // Render new page
  const result = handler(container, params);
  if (typeof result === 'function') {
    currentCleanup = result;
  }

  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('data-href');
    if (href === path || (path.startsWith(href) && href !== '/')) {
      link.classList.add('is-active');
    } else if (href === '/' && path === '/') {
      link.classList.add('is-active');
    } else {
      link.classList.remove('is-active');
    }
  });

  // Page enter animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      container.classList.add('page-enter-active');
      container.classList.remove('page-enter');
    });
  });

  // Scroll to top
  container.scrollTop = 0;
}

function matchRoute(pattern, path) {
  if (pattern === path) return {};

  const patternParts = pattern.split('/');
  const pathParts = path.split('/');

  if (patternParts.length !== pathParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

function getPathFromHash() {
  const hash = location.hash;
  if (!hash || hash === '#' || hash === '#/') return '/';
  return hash.slice(1); // Remove the '#'
}

export function initRouter() {
  // Handle hash changes (back/forward + manual hash edits)
  window.addEventListener('hashchange', () => {
    navigate(getPathFromHash(), { hashchange: true });
  });

  // Handle link clicks with data-href
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-href]');
    if (link) {
      e.preventDefault();
      navigate(link.getAttribute('data-href'));
    }
  });

  // Initial route
  navigate(getPathFromHash(), { force: true });
}
