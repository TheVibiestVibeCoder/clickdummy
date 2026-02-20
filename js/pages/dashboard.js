/* ============================================================
   DASHBOARD PAGE — Risk Dashboard with premium polish
   ============================================================ */

import { NRI, CLUSTERS, EARLY_WARNINGS, getSentimentColor, getClusterAvgScore, sparkPoints } from '../data.js';
import { animatePageEnter, animateCountUp, animateBarFill, staggerIn } from '../motion.js';
import { initConstellation, destroyConstellation } from '../visualization/constellation.js';
import { openSubSheet, openClusterSheet } from '../components/side-sheet.js';
import { createExportButton } from '../components/export-button.js';
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

      <!-- Left Column -->
      <div class="dash-left">
        <div class="panel" data-animate>
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

        <div class="panel" data-animate style="flex:1; overflow:hidden; display:flex; flex-direction:column;">
          <div class="panel__header">
            <span class="panel__title">Gesamt-Sentiment</span>
          </div>
          <div id="sentiment-panel" style="overflow-y:auto; flex:1; position:relative; z-index:2;"></div>
        </div>
      </div>

      <!-- Center: Constellation Map -->
      <div class="dash-center panel" data-animate style="padding:0; overflow:hidden;" id="constellation-container">
      </div>

      <!-- Right Column -->
      <div class="dash-right">
        <div class="panel" data-animate style="flex:1; overflow:hidden; display:flex; flex-direction:column;">
          <div class="panel__header">
            <span class="panel__title">Early Warning Inbox</span>
            <span class="panel__badge">Top 5</span>
          </div>
          <div class="warning-list" id="warning-list" style="position:relative; z-index:2;"></div>
        </div>

        <div class="panel" data-animate style="margin-top:var(--sp-16); overflow:hidden; display:flex; flex-direction:column;">
          <div class="panel__header">
            <span class="panel__title">Top Narratives</span>
            <span class="panel__badge" style="cursor:pointer; color:var(--accent);" data-href="/narratives">View all &rarr;</span>
          </div>
          <div id="narrative-list" style="overflow-y:auto; flex:1; position:relative; z-index:2;"></div>
        </div>
      </div>

      <!-- Bottom -->
      <div class="dash-bottom">
        <div class="panel" data-animate style="overflow:hidden; display:flex; flex-direction:column;">
          <div class="panel__header">
            <span class="panel__title">Intelligence Reporting</span>
            <div id="export-btn-container"></div>
          </div>
          <div id="report-feed" style="overflow-y:auto; flex:1; position:relative; z-index:2;"></div>
        </div>
        <div class="panel" data-animate style="overflow:hidden; display:flex; flex-direction:column;">
          <div class="panel__header">
            <span class="panel__title">Risk Forecast</span>
            <span class="risk-badge risk-badge--red">Active</span>
          </div>
          <div id="risk-feed" style="overflow-y:auto; flex:1; position:relative; z-index:2;"></div>
        </div>
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

  // Sentiment panel
  renderSentimentPanel();

  // Early warnings
  renderWarnings();

  // Narrative list
  renderNarrativeList();

  // Reporting feeds
  renderReportFeed();
  renderRiskFeed();

  // Export button
  createExportButton(document.getElementById('export-btn-container'));

  // Constellation map
  const constellationCleanup = initConstellation(document.getElementById('constellation-container'));

  // Stagger animations
  setTimeout(() => {
    staggerIn(container, '.warning-item', 50);
    staggerIn(container, '.narrative-card', 60);
    staggerIn(container, '.report-card', 40);
  }, 300);

  // Cleanup function
  return () => {
    if (constellationCleanup) constellationCleanup();
  };
}

function renderSentimentPanel() {
  const panel = document.getElementById('sentiment-panel');
  let globalTotal = 0, count = 0;

  CLUSTERS.forEach(cluster => {
    let clusterTotal = 0;
    cluster.subTopics.forEach(s => { clusterTotal += s.score; globalTotal += s.score; count++; });
    const avg = clusterTotal / cluster.subTopics.length;

    const item = document.createElement('div');
    item.style.cssText = 'margin-bottom:var(--sp-16); cursor:pointer;';

    const color = getSentimentColor(avg);
    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:var(--text-sm); margin-bottom:var(--sp-4);">
        <div style="display:flex; align-items:center; gap:var(--sp-8);">
          <div class="chevron-icon"></div>
          <span style="color:${cluster.color}; font-weight:600;">${cluster.label}</span>
        </div>
        <span class="text-mono" style="font-size:var(--text-xs); color:${color};">${avg.toFixed(2)}</span>
      </div>
      ${createBar(avg)}
      <div class="sentiment-details" style="max-height:0; overflow:hidden; transition:max-height var(--duration-overlay) var(--ease-standard); margin-left:var(--sp-24); margin-top:var(--sp-4); border-left:1px solid var(--border-subtle); padding-left:var(--sp-12);">
        ${cluster.subTopics.map(s => `
          <div style="margin-bottom:var(--sp-8); font-size:var(--text-xs); color:var(--text-secondary);">
            <div style="display:flex; justify-content:space-between;"><span>${s.label}</span><span>${s.score > 0 ? '+' : ''}${s.score}</span></div>
            ${createBar(s.score)}
          </div>
        `).join('')}
      </div>
    `;

    let expanded = false;
    item.addEventListener('click', () => {
      expanded = !expanded;
      const details = item.querySelector('.sentiment-details');
      const chevron = item.querySelector('.chevron-icon');
      details.style.maxHeight = expanded ? '300px' : '0';
      chevron.style.transform = expanded ? 'rotate(-180deg)' : '';
    });

    panel.appendChild(item);
  });

  // Global summary
  const globalAvg = globalTotal / count;
  const gColor = getSentimentColor(globalAvg);
  const gLabel = globalAvg < -0.3 ? 'Deutlich Negativ' : globalAvg < 0 ? 'Leicht Negativ' : 'Neutral';
  const summary = document.createElement('div');
  summary.style.cssText = 'margin-bottom:var(--sp-16); padding-bottom:var(--sp-12); border-bottom:1px solid var(--border-subtle);';
  summary.innerHTML = `
    <div style="font-size:var(--text-base); font-weight:600; color:${gColor}; margin-bottom:var(--sp-4);">${gLabel}</div>
    <div style="font-size:var(--text-xs); color:var(--text-secondary);">Score: ${globalAvg.toFixed(2)}</div>
    ${createBar(globalAvg)}
  `;
  panel.insertBefore(summary, panel.firstChild);
}

function createBar(score) {
  const color = getSentimentColor(score);
  const w = Math.abs(score) * 50;
  const left = score < 0 ? (50 - w) + '%' : '50%';
  return `
    <div class="sentiment-bar" style="margin-top:var(--sp-4);">
      <div class="sentiment-bar__center"></div>
      <div class="sentiment-bar__fill" style="width:${w}%; left:${left}; background:${color};"></div>
    </div>
  `;
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

function renderNarrativeList() {
  const list = document.getElementById('narrative-list');
  CLUSTERS.forEach(cluster => {
    cluster.subTopics.forEach(sub => {
      const isPos = sub.sentiment === 'pos';
      const color = getSentimentColor(sub.score);
      const arrow = isPos ? '&#8599;' : sub.sentiment === 'neg' ? '&#8600;' : '&#8594;';
      const sentLabel = isPos ? 'Positiv' : sub.sentiment === 'neg' ? 'Negativ' : 'Gemischt';

      const card = document.createElement('div');
      card.className = 'narrative-card';
      card.innerHTML = `
        <div class="narrative-card__header">
          <div>
            <div class="narrative-card__title">${sub.label} <span style="color:${color}; margin-left:var(--sp-8);">${arrow}</span></div>
            <div class="narrative-card__meta">
              <span style="color:${color}; font-weight:500;">${sentLabel}</span>
              <svg class="sparkline" viewBox="0 0 48 20"><polyline points="${sparkPoints(isPos ? 'up' : 'down')}" stroke="${color}" fill="none" stroke-width="1.5"/></svg>
            </div>
          </div>
          <div class="cluster-tag" style="color:${cluster.color}; border-color:${cluster.color}44; background:${cluster.color}0d;">${cluster.label}</div>
        </div>
      `;
      card.addEventListener('click', () => openSubSheet(sub, cluster));
      list.appendChild(card);
    });
  });
}

function renderReportFeed() {
  const feed = document.getElementById('report-feed');
  CLUSTERS.forEach(c => {
    const card = document.createElement('div');
    card.className = 'report-card';
    card.innerHTML = `
      <div class="report-card__header">
        <span class="report-card__cluster" style="color:${c.color};">${c.label}</span>
      </div>
      <div class="report-card__body">${c.reportText}</div>
    `;
    feed.appendChild(card);
  });
}

function renderRiskFeed() {
  const feed = document.getElementById('risk-feed');
  CLUSTERS.forEach(c => {
    const card = document.createElement('div');
    card.className = 'report-card report-card--risk';
    card.innerHTML = `
      <div class="report-card__header">
        <span class="report-card__cluster" style="color:${c.color};">${c.label}</span>
        <span class="risk-badge risk-badge--red">ALERT</span>
      </div>
      <div class="report-card__body">${c.riskText}</div>
    `;
    feed.appendChild(card);
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
