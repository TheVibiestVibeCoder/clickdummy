/* ============================================================
   APP — Main entry point, initializes router and components
   ============================================================ */

import { registerRoute, initRouter } from './router.js';
import { initSideSheet } from './components/side-sheet.js';
import { initCommandPalette } from './components/command-palette.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderNarratives } from './pages/narratives.js';
import { renderNarrativeDetail } from './pages/narrative-detail.js';
import { renderActors } from './pages/actors.js';
import { renderReports } from './pages/reports.js';
import { renderSettings } from './pages/settings.js';

function init() {
  // Initialize global components
  initSideSheet();
  initCommandPalette();
  initTopnavMobileMenu();

  // Wire up Cmd+K trigger button in navbar
  const cmdKTrigger = document.getElementById('cmd-k-trigger');
  if (cmdKTrigger) {
    cmdKTrigger.addEventListener('click', () => {
      // Simulate Ctrl+K to open command palette
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    });
  }

  // Register routes
  registerRoute('/', renderDashboard);
  registerRoute('/narratives', renderNarratives);
  registerRoute('/narratives/:id', renderNarrativeDetail);
  registerRoute('/actors', renderActors);
  registerRoute('/reports', renderReports);
  registerRoute('/settings', renderSettings);

  // Start router
  initRouter();
}

function initTopnavMobileMenu() {
  const topnav = document.querySelector('.topnav');
  const toggleBtn = document.getElementById('topnav-toggle');
  const navLinks = document.getElementById('topnav-links');
  if (!topnav || !toggleBtn || !navLinks) return;

  topnav.classList.add('topnav--mobile-ready');

  const closeMenu = () => {
    topnav.classList.remove('topnav--menu-open');
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.setAttribute('aria-label', 'Open navigation menu');
  };

  const openMenu = () => {
    topnav.classList.add('topnav--menu-open');
    toggleBtn.setAttribute('aria-expanded', 'true');
    toggleBtn.setAttribute('aria-label', 'Close navigation menu');
  };

  const toggleMenu = () => {
    if (topnav.classList.contains('topnav--menu-open')) {
      closeMenu();
      return;
    }
    openMenu();
  };

  const syncViewportState = () => {
    if (window.innerWidth > 900) closeMenu();
  };

  toggleBtn.addEventListener('click', toggleMenu);
  navLinks.addEventListener('click', (e) => {
    if (e.target.closest('.nav-link')) closeMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  window.addEventListener('resize', syncViewportState);
  window.addEventListener('hashchange', closeMenu);
  syncViewportState();
}

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
