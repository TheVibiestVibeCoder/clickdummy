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

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
