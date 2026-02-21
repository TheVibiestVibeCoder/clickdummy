/* ============================================================
   DASHBOARD PAGE - Risk dashboard with NRI explainer interactions
   ============================================================ */

import { NRI, CLUSTERS, EARLY_WARNINGS } from '../data.js';
import { animatePageEnter, animateCountUp, animateBarFill, staggerIn } from '../motion.js';
import { initConstellation } from '../visualization/constellation.js';
import { openSubSheet } from '../components/side-sheet.js';

const NRI_INFO = {
  overall: {
    title: 'Narrative Risk Index (NRI)',
    means: 'Composite governance metric translating discourse dynamics into measurable institutional exposure.',
    measures: 'Likelihood that fragmented discourse transitions into coordinated institutional pressure.'
  },
  velocity: {
    title: 'Narrative Convergence Velocity',
    means: 'Rate at which independent actor clusters align around a shared narrative frame.',
    measures: 'How quickly message alignment can turn diffuse chatter into coordinated pressure.'
  },
  proximity: {
    title: 'Institutional Proximity',
    means: 'Weighted presence of regulatory, financial, political, or high-reach actors in the narrative cluster.',
    measures: 'How close the narrative is to institutions that can trigger real-world consequences.'
  },
  sentiment: {
    title: 'Sentiment Acceleration',
    means: 'Speed and direction of tonal shifts toward delegitimization or destabilization.',
    measures: 'Whether tone is intensifying and how rapidly that acceleration is building.'
  },
  expansion: {
    title: 'Network Expansion',
    means: 'Cross-sector and cross-platform propagation intensity.',
    measures: 'How widely and quickly the narrative is spreading across channels and actor types.'
  }
};

export function renderDashboard(container) {
  const trendData = Array.isArray(NRI.trend4w) && NRI.trend4w.length >= 4
    ? NRI.trend4w
    : [
      { label: 'Jan 31', score: 61 },
      { label: 'Feb 07', score: 63 },
      { label: 'Feb 14', score: 66 },
      { label: 'Feb 21', score: 67 }
    ];
  const trendStats = buildTrendStats(trendData);

  container.innerHTML = `
    <div class="dashboard-grid">
      <div class="dash-nri panel" data-animate id="nri-panel">
        <div class="nri-hero">
          <div>
            <div class="panel__header nri-hero__header">
              <span class="panel__title">Narrative Risk Index (NRI)</span>
              <div class="nri-hero__header-actions">
                <button class="nri-trend-btn" id="nri-trend-btn" type="button">4W Development</button>
                <button class="nri-info-btn" data-info-key="overall" aria-label="NRI info" type="button">i</button>
                <span class="panel__badge">24h rolling</span>
              </div>
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
                <div class="nri-subscore__label-wrap">
                  <div class="nri-subscore__label">${s.label}</div>
                  <button class="nri-info-btn nri-info-btn--tiny" data-info-key="${s.key}" aria-label="${s.label} info" type="button">i</button>
                </div>
                <div class="nri-subscore__value" style="color:${s.color};" data-target="${s.value}">0</div>
                <div class="nri-subscore__bar">
                  <div class="nri-subscore__bar-fill" style="background:${s.color}; width:0%;" data-width="${s.value}"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div id="nri-info-popover" class="nri-info-popover" hidden></div>
      </div>

      <div class="dash-center panel" data-animate style="padding:0; overflow:hidden;" id="constellation-container"></div>

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

      <div class="dash-warning panel" data-animate style="overflow:hidden; display:flex; flex-direction:column;">
        <div class="panel__header">
          <span class="panel__title">Early Warning Inbox</span>
          <span class="panel__badge">Top 5</span>
        </div>
        <div class="warning-list" id="warning-list" style="position:relative; z-index:2; overflow-y:auto; flex:1;"></div>
      </div>
    </div>

    <div class="nri-trend-overlay" id="nri-trend-overlay" aria-hidden="true">
      <div class="nri-trend-modal" role="dialog" aria-modal="true" aria-labelledby="nri-trend-title">
        <div class="nri-trend-modal__header">
          <div>
            <div class="panel__title" style="margin-bottom:4px;">NRI Development</div>
            <div class="nri-trend-modal__title" id="nri-trend-title">Last 4 Weeks</div>
          </div>
          <button class="nri-trend-modal__close" id="nri-trend-close" type="button" aria-label="Close NRI development">&times;</button>
        </div>

        <div class="nri-trend-modal__body">
          ${buildTrendChartMarkup(trendData)}
          <div class="nri-trend-stats">
            <div class="nri-trend-stat">
              <span class="nri-trend-stat__label">Net Change</span>
              <span class="nri-trend-stat__value">${formatSigned(trendStats.net)}</span>
            </div>
            <div class="nri-trend-stat">
              <span class="nri-trend-stat__label">Weekly Avg</span>
              <span class="nri-trend-stat__value">${trendStats.avg.toFixed(1)}</span>
            </div>
            <div class="nri-trend-stat">
              <span class="nri-trend-stat__label">Range</span>
              <span class="nri-trend-stat__value">${trendStats.range.toFixed(1)}</span>
            </div>
          </div>
          <div class="nri-trend-note">
            NRI quantifies when discourse transitions toward coordinated institutional pressure, not just mention volume.
          </div>
        </div>
      </div>
    </div>
  `;

  animatePageEnter(container);

  const cleanup = [];
  const bind = (target, event, handler, options) => {
    target.addEventListener(event, handler, options);
    cleanup.push(() => target.removeEventListener(event, handler, options));
  };

  const nriEl = container.querySelector('#nri-score');
  animateCountUp(nriEl, NRI.score, 1400);

  const deltaEl = container.querySelector('#nri-delta');
  setTimeout(() => {
    deltaEl.textContent = formatSigned(NRI.delta);
  }, 800);

  container.querySelectorAll('.nri-subscore__value').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    animateCountUp(el, target, 1200);
  });
  container.querySelectorAll('.nri-subscore__bar-fill').forEach((el, i) => {
    animateBarFill(el, parseInt(el.dataset.width, 10), i * 160);
  });

  animateCountUp(container.querySelector('#source-count'), 42800, 1800, '', '');
  setTimeout(() => {
    const sourceCount = container.querySelector('#source-count');
    if (sourceCount) sourceCount.textContent = '42.8k';
  }, 2000);

  renderWarnings(container);

  const constellationCleanup = initConstellation(container.querySelector('#constellation-container'));

  const trendOverlay = container.querySelector('#nri-trend-overlay');
  const trendBtn = container.querySelector('#nri-trend-btn');
  const trendClose = container.querySelector('#nri-trend-close');

  const openTrend = () => {
    trendOverlay.classList.add('is-open');
    trendOverlay.setAttribute('aria-hidden', 'false');
  };

  const closeTrend = () => {
    trendOverlay.classList.remove('is-open');
    trendOverlay.setAttribute('aria-hidden', 'true');
  };

  bind(trendBtn, 'click', openTrend);
  bind(trendClose, 'click', closeTrend);
  bind(trendOverlay, 'click', (e) => {
    if (e.target === trendOverlay) closeTrend();
  });

  const nriPanel = container.querySelector('#nri-panel');
  const infoPopover = container.querySelector('#nri-info-popover');
  let infoState = null;

  function closeInfo() {
    if (!infoState) return;
    if (infoState.button) infoState.button.classList.remove('is-active');
    infoState = null;
    infoPopover.classList.remove('is-open');
    infoPopover.hidden = true;
  }

  function openInfo(button, key) {
    const info = NRI_INFO[key] || NRI_INFO.overall;
    const sameButton = infoState && infoState.button === button;
    if (sameButton) {
      closeInfo();
      return;
    }

    if (infoState?.button) infoState.button.classList.remove('is-active');
    button.classList.add('is-active');

    infoPopover.innerHTML = `
      <div class="nri-info-popover__title">${info.title}</div>
      <div class="nri-info-popover__line"><span>Means</span>${info.means}</div>
      <div class="nri-info-popover__line"><span>Measures</span>${info.measures}</div>
    `;

    const panelRect = nriPanel.getBoundingClientRect();
    const btnRect = button.getBoundingClientRect();
    const popW = Math.min(340, Math.max(220, panelRect.width - 24));
    const popH = 172;

    let left = btnRect.left - panelRect.left + (btnRect.width * 0.5) - (popW * 0.5);
    left = clamp(left, 12, Math.max(12, panelRect.width - popW - 12));

    let top = btnRect.bottom - panelRect.top + 10;
    if (top + popH > panelRect.height - 8) {
      top = btnRect.top - panelRect.top - popH - 10;
    }
    top = Math.max(12, top);

    infoPopover.style.left = `${left}px`;
    infoPopover.style.top = `${top}px`;
    infoPopover.hidden = false;
    infoPopover.classList.add('is-open');
    infoState = { button, key };
  }

  container.querySelectorAll('.nri-info-btn').forEach(btn => {
    bind(btn, 'click', (e) => {
      e.stopPropagation();
      openInfo(btn, btn.dataset.infoKey);
    });
  });

  bind(document, 'click', (e) => {
    if (!infoState) return;
    const target = e.target;
    if (target instanceof Element && (target.closest('.nri-info-btn') || target.closest('.nri-info-popover'))) return;
    closeInfo();
  });

  bind(window, 'resize', closeInfo);
  bind(document, 'keydown', (e) => {
    if (e.key === 'Escape') {
      closeTrend();
      closeInfo();
    }
  });

  setTimeout(() => {
    staggerIn(container, '.warning-item', 50);
  }, 300);

  return () => {
    closeTrend();
    closeInfo();
    cleanup.forEach(off => off());
    if (constellationCleanup) constellationCleanup();
  };
}

function renderWarnings(container) {
  const list = container.querySelector('#warning-list');
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

function buildTrendChartMarkup(data) {
  const w = 620;
  const h = 206;
  const padL = 44;
  const padR = 22;
  const padT = 24;
  const padB = 34;
  const minScore = Math.min(...data.map(d => d.score));
  const maxScore = Math.max(...data.map(d => d.score));
  const range = Math.max(1, maxScore - minScore);
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const points = data.map((item, idx) => {
    const x = padL + ((innerW / Math.max(1, data.length - 1)) * idx);
    const t = (item.score - minScore) / range;
    const y = padT + (1 - t) * innerH;
    return { ...item, x, y };
  });

  const line = points.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const area = [
    `${padL},${h - padB}`,
    ...points.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`),
    `${padL + innerW},${h - padB}`
  ].join(' ');

  return `
    <div class="nri-trend-chart">
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-label="NRI 4 week development chart">
        <defs>
          <linearGradient id="nri-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(255,153,102,0.32)"></stop>
            <stop offset="100%" stop-color="rgba(255,153,102,0.03)"></stop>
          </linearGradient>
        </defs>
        <line x1="${padL}" y1="${h - padB}" x2="${w - padR}" y2="${h - padB}" stroke="rgba(255,255,255,0.14)" stroke-width="1"></line>
        <polygon points="${area}" fill="url(#nri-area-grad)"></polygon>
        <polyline points="${line}" fill="none" stroke="#ffb28c" stroke-width="2.4" stroke-linecap="round"></polyline>
        ${points.map(p => `
          <g>
            <circle cx="${p.x}" cy="${p.y}" r="4.8" fill="#ff9966"></circle>
            <circle cx="${p.x}" cy="${p.y}" r="11.4" fill="rgba(255,153,102,0.18)"></circle>
            <text x="${p.x}" y="${p.y - 12}" text-anchor="middle" fill="#f4f7fb" font-size="11" font-family="var(--font-mono)">${p.score}</text>
            <text x="${p.x}" y="${h - 10}" text-anchor="middle" fill="#a9b3c3" font-size="10" font-family="var(--font-mono)">${p.label}</text>
          </g>
        `).join('')}
      </svg>
    </div>
  `;
}

function buildTrendStats(data) {
  const scores = data.map(d => d.score);
  const first = scores[0] || 0;
  const last = scores[scores.length - 1] || 0;
  const avg = scores.reduce((sum, s) => sum + s, 0) / Math.max(1, scores.length);
  return {
    net: last - first,
    avg,
    range: Math.max(...scores) - Math.min(...scores)
  };
}

function findSubById(subId) {
  for (const c of CLUSTERS) {
    for (const s of c.subTopics) {
      if (s.id === subId) return { sub: s, cluster: c };
    }
  }
  return null;
}

function formatSigned(value) {
  const n = Number(value) || 0;
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
