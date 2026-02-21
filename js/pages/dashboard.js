/* ============================================================
   DASHBOARD PAGE — Risk Dashboard with premium polish
   ============================================================ */

import { NRI, CLUSTERS, EARLY_WARNINGS } from '../data.js';
import { animatePageEnter, animateCountUp, animateBarFill, staggerIn } from '../motion.js';
import { initConstellation, destroyConstellation } from '../visualization/constellation.js';
import { openSubSheet } from '../components/side-sheet.js';
import { navigate } from '../router.js';

export function renderDashboard(container) {
  container.innerHTML = `
    <div class="dashboard-grid">
      <!-- NRI Hero -->
      <div class="dash-nri panel" data-animate>
        <div class="nri-hero">
          <div>
            <div class="panel__header" style="border:none; margin:0; padding:0;">
              <span class="panel__title">Narrative Risk Index (NRI)</span>
              <span class="panel__badge">24h rolling</span>
            </div>
            <div class="nri-hero__score-block" style="margin-top:var(--sp-12);">
              <div class="nri-hero__score" id="nri-score">0</div>
              <div class="nri-hero__delta nri-hero__delta--up" id="nri-delta">+0.0</div>
            </div>
            <div class="nri-hero__drivers" id="nri-drivers">${NRI.drivers}</div>
          </div>
          <div class="nri-hero__subscores" id="nri-subscores">
            ${NRI.subscores.map(s => `
              <div class="nri-subscore">
                <div class="nri-subscore__label">${s.label}</div>
                <div class="nri-subscore__value" style="color:${s.color};" data-target="${s.value}">0</div>
                <div class="nri-subscore__bar">
                  <div class="nri-subscore__bar-fill" style="background:${s.color}; width:0%;" data-width="${s.value}"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Constellation Map (full width) -->
      <div class="dash-center panel" data-animate style="padding:0; overflow:hidden;" id="constellation-container">
      </div>

      <!-- Bottom Left: Quellen-Status -->
      <div class="dash-quellen panel" data-animate style="display:flex; flex-direction:column;">
        <div class="panel__header">
          <span class="panel__title">Quellen-Status</span>
          <span class="panel__badge">Live</span>
        </div>
        <div style="display:flex; align-items:baseline; gap:var(--sp-8); position:relative; z-index:2;">
          <div class="text-metric" id="source-count">0</div>
          <div style="font-size:var(--text-xs); color:var(--text-secondary);">Posts/24h</div>
        </div>
        <div style="margin-top:auto; height:50px; display:flex; align-items:flex-end; gap:3px; padding-top:var(--sp-12); position:relative; z-index:2;">
          ${[40, 70, 50, 92, 60, 80, 45].map((h, i) => `
            <div style="flex:1; height:${h}%; background:${i === 3 ? 'var(--accent)' : 'var(--ink-600)'}; border-radius:2px 2px 0 0; opacity:${i === 3 ? '1' : '0.4'}; transition: height 0.8s var(--ease-standard) ${i * 80}ms;"></div>
          `).join('')}
        </div>
      </div>

      <!-- Bottom Right: Early Warning Inbox -->
      <div class="dash-warning panel" data-animate style="overflow:hidden; display:flex; flex-direction:column;">
        <div class="panel__header">
          <span class="panel__title">Early Warning Inbox</span>
          <span class="panel__badge">Top 5</span>
        </div>
        <div class="warning-list" id="warning-list" style="position:relative; z-index:2; overflow-y:auto; flex:1;"></div>
      </div>
    </div>
  `;

  // Animate page enter
  animatePageEnter(container);

  // Count up NRI score
  const nriEl = document.getElementById('nri-score');
  animateCountUp(nriEl, NRI.score, 1400);

  // Delta
  const deltaEl = document.getElementById('nri-delta');
  setTimeout(() => { deltaEl.textContent = '+' + NRI.delta; }, 800);

  // Subscores
  document.querySelectorAll('.nri-subscore__value').forEach(el => {
    const target = parseInt(el.dataset.target);
    animateCountUp(el, target, 1200);
  });
  document.querySelectorAll('.nri-subscore__bar-fill').forEach((el, i) => {
    animateBarFill(el, parseInt(el.dataset.width), i * 200);
  });

  // Source count
  animateCountUp(document.getElementById('source-count'), 42800, 1800, '', '');
  setTimeout(() => {
    document.getElementById('source-count').textContent = '42.8k';
  }, 2000);

  // Early warnings
  renderWarnings();

  // Constellation map
  const constellationCleanup = initConstellation(document.getElementById('constellation-container'));

  // Stagger animations
  setTimeout(() => {
    staggerIn(container, '.warning-item', 50);
  }, 300);

  // Cleanup function
  return () => {
    if (constellationCleanup) constellationCleanup();
  };
}

function renderWarnings() {
  const list = document.getElementById('warning-list');
  EARLY_WARNINGS.forEach(w => {
    const item = document.createElement('div');
    item.className = 'warning-item';
    item.innerHTML = `
      <span class="risk-badge ${w.risk === 'red' ? 'risk-badge--red' : w.risk === 'amber' ? 'risk-badge--amber' : 'risk-badge--neutral'}">${w.risk === 'red' ? 'HIGH' : w.risk === 'amber' ? 'MED' : 'LOW'}</span>
      <div class="warning-item__content">
        <div class="warning-item__title">${w.title}</div>
        <div class="warning-item__delta">${w.delta}</div>
      </div>
      <div class="warning-item__cta">Evidence</div>
    `;
    item.addEventListener('click', () => {
      const sub = findSubById(w.subId);
      if (sub) openSubSheet(sub.sub, sub.cluster);
    });
    list.appendChild(item);
  });
}

function findSubById(subId) {
  for (const c of CLUSTERS) {
    for (const s of c.subTopics) {
      if (s.id === subId) return { sub: s, cluster: c };
    }
  }
  return null;
}
