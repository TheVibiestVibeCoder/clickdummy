/* ============================================================
   COMMAND PALETTE — Cmd+K jump to narrative / actor / report
   ============================================================ */

import { CLUSTERS, ALL_SUBTOPICS, ACTORS } from '../data.js';
import { navigate } from '../router.js';

let overlay, input, results;
let items = [];
let selectedIndex = 0;

export function initCommandPalette() {
  overlay = document.createElement('div');
  overlay.className = 'command-palette-overlay';
  overlay.innerHTML = `
    <div class="command-palette">
      <div class="command-palette__input-wrap">
        <span class="command-palette__icon">&#x2315;</span>
        <input class="command-palette__input" id="cmd-input" type="text" placeholder="Jump to narrative, actor, report..." autocomplete="off" />
      </div>
      <div class="command-palette__results" id="cmd-results"></div>
      <div class="command-palette__hint">
        <span><kbd>&uarr;&darr;</kbd> Navigate</span>
        <span><kbd>Enter</kbd> Open</span>
        <span><kbd>Esc</kbd> Close</span>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCommandPalette();
  });

  input = overlay.querySelector('#cmd-input');
  results = overlay.querySelector('#cmd-results');

  input.addEventListener('input', onInput);
  input.addEventListener('keydown', onKeyDown);

  // Build searchable items
  buildItems();

  // Cmd+K / Ctrl+K to open
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      toggleCommandPalette();
    }
  });
}

function buildItems() {
  items = [];

  // Clusters
  CLUSTERS.forEach(c => {
    items.push({ label: c.label, type: 'Cluster', action: () => navigate(`/narratives/${c.id}`) });
    c.subTopics.forEach(s => {
      items.push({ label: s.label, type: 'Narrative', action: () => navigate(`/narratives/${c.id}`) });
      s.micro.forEach(m => {
        items.push({ label: m.label, type: 'Micro', action: () => navigate(`/narratives/${c.id}`) });
      });
    });
  });

  // Actors
  ACTORS.forEach(a => {
    items.push({ label: a.name, type: 'Actor', action: () => navigate('/actors') });
  });

  // Pages
  items.push({ label: 'Risk Dashboard', type: 'Page', action: () => navigate('/') });
  items.push({ label: 'Narratives Explorer', type: 'Page', action: () => navigate('/narratives') });
  items.push({ label: 'Actors & Networks', type: 'Page', action: () => navigate('/actors') });
  items.push({ label: 'Reports & Audit', type: 'Page', action: () => navigate('/reports') });
  items.push({ label: 'Settings', type: 'Page', action: () => navigate('/settings') });
  items.push({ label: 'Generate Board Report', type: 'Action', action: () => { navigate('/reports'); } });
}

function onInput() {
  const query = input.value.toLowerCase().trim();
  const filtered = query
    ? items.filter(it => it.label.toLowerCase().includes(query))
    : items.slice(0, 8);

  selectedIndex = 0;
  renderResults(filtered);
}

function renderResults(list) {
  const shown = list.slice(0, 10);
  results.innerHTML = shown.map((it, i) => `
    <div class="command-palette__item ${i === selectedIndex ? 'is-selected' : ''}" data-index="${i}">
      <span style="flex:1;">${it.label}</span>
      <span class="command-palette__item-type">${it.type}</span>
    </div>
  `).join('');

  results.querySelectorAll('.command-palette__item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.index);
      shown[idx]?.action();
      closeCommandPalette();
    });
    el.addEventListener('mouseenter', () => {
      selectedIndex = parseInt(el.dataset.index);
      results.querySelectorAll('.command-palette__item').forEach((e, i) => {
        e.classList.toggle('is-selected', i === selectedIndex);
      });
    });
  });

  // Store for keyboard nav
  results._items = shown;
}

function onKeyDown(e) {
  const shown = results._items || [];
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex = Math.min(selectedIndex + 1, shown.length - 1);
    updateSelection();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex = Math.max(selectedIndex - 1, 0);
    updateSelection();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    shown[selectedIndex]?.action();
    closeCommandPalette();
  } else if (e.key === 'Escape') {
    closeCommandPalette();
  }
}

function updateSelection() {
  results.querySelectorAll('.command-palette__item').forEach((el, i) => {
    el.classList.toggle('is-selected', i === selectedIndex);
  });
}

function toggleCommandPalette() {
  if (overlay.classList.contains('is-open')) {
    closeCommandPalette();
  } else {
    openCommandPalette();
  }
}

function openCommandPalette() {
  overlay.classList.add('is-open');
  input.value = '';
  selectedIndex = 0;
  onInput();
  setTimeout(() => input.focus(), 50);
}

function closeCommandPalette() {
  overlay.classList.remove('is-open');
  input.value = '';
}
