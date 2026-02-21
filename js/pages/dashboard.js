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
    means: 'Zusammengesetzte Governance-Metrik, die Diskursdynamiken in messbare institutionelle Exposition uebersetzt.',
    measures: 'Wahrscheinlichkeit, dass fragmentierter Diskurs in koordinierten institutionellen Druck uebergeht.'
  },
  velocity: {
    title: 'Narrative Convergence Velocity',
    means: 'Geschwindigkeit, mit der sich unabhaengige Akteurscluster auf einen gemeinsamen Narrativrahmen ausrichten.',
    measures: 'Wie schnell aus diffuser Diskussion abgestimmter Druck entstehen kann.'
  },
  proximity: {
    title: 'Institutional Proximity',
    means: 'Gewichtete Praesenz regulatorischer, finanzieller, politischer oder reichweitenstarker Akteure im Narrativcluster.',
    measures: 'Wie nah das Narrativ an Institutionen ist, die reale Auswirkungen ausloesen koennen.'
  },
  sentiment: {
    title: 'Sentiment Acceleration',
    means: 'Geschwindigkeit und Richtung tonalitaeter Verschiebungen hin zu Delegitimierung oder Destabilisierung.',
    measures: 'Ob sich die Tonalitaet verschaerft und wie schnell diese Beschleunigung zunimmt.'
  },
  expansion: {
    title: 'Network Expansion',
    means: 'Ausbreitungsintensitaet ueber Sektoren und Plattformen hinweg.',
    measures: 'Wie breit und wie schnell sich das Narrativ ueber Kanaele und Akteurstypen verbreitet.'
  }
};

export function renderDashboard(container) {
  const trendData = Array.isArray(NRI.trend4w) && NRI.trend4w.length >= 4
    ? NRI.trend4w
    : [
      { label: '31. Jan', score: 61 },
      { label: '07. Feb', score: 63 },
      { label: '14. Feb', score: 66 },
      { label: '21. Feb', score: 67 }
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
                <button class="nri-trend-btn" id="nri-trend-btn" type="button">4W Entwicklung</button>
                <button class="nri-info-btn" data-info-key="overall" aria-label="NRI Info" type="button">i</button>
                <span class="panel__badge">24h rollierend</span>
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

      </div>

      <div class="dash-center panel" data-animate style="padding:0; overflow:hidden;" id="constellation-container"></div>

      <div class="dash-quellen panel" data-animate style="display:flex; flex-direction:column;">
        <div class="panel__header">
          <span class="panel__title">Quellen-Status</span>
          <span class="panel__badge">Echtzeit</span>
        </div>
        <div style="display:flex; align-items:baseline; gap:var(--sp-8); position:relative; z-index:2;">
          <div class="text-metric" id="source-count">0</div>
          <div style="font-size:var(--text-xs); color:var(--text-secondary);">Beitraege/24h</div>
        </div>
        <div style="margin-top:var(--sp-12); flex:1; min-height:120px; display:flex; align-items:flex-end; gap:3px; position:relative; z-index:2;">
          ${[40, 70, 50, 92, 60, 80, 45].map((h, i) => `
            <div style="flex:1; height:${h}%; background:${i === 3 ? 'var(--accent)' : 'var(--ink-600)'}; border-radius:2px 2px 0 0; opacity:${i === 3 ? '1' : '0.4'}; transition: height 0.8s var(--ease-standard) ${i * 80}ms;"></div>
          `).join('')}
        </div>
      </div>

      <div class="dash-warning panel" data-animate style="overflow:hidden; display:flex; flex-direction:column;">
        <div class="panel__header">
          <span class="panel__title">Fruehwarn-Inbox</span>
          <span class="panel__badge">Top 5</span>
        </div>
        <div class="warning-list" id="warning-list" style="position:relative; z-index:2; overflow-y:auto; flex:1;"></div>
      </div>
    </div>

    <div class="nri-trend-overlay" id="nri-trend-overlay" aria-hidden="true">
      <div class="nri-trend-modal" role="dialog" aria-modal="true" aria-labelledby="nri-trend-title">
        <div class="nri-trend-modal__header">
          <div>
            <div class="panel__title" style="margin-bottom:4px;">NRI-Entwicklung</div>
            <div class="nri-trend-modal__title" id="nri-trend-title">Letzte 4 Wochen</div>
          </div>
          <button class="nri-trend-modal__close" id="nri-trend-close" type="button" aria-label="NRI-Entwicklung schliessen">&times;</button>
        </div>

        <div class="nri-trend-modal__body">
          ${buildTrendChartMarkup(trendData)}
          <div class="nri-trend-stats">
            <div class="nri-trend-stat">
              <span class="nri-trend-stat__label">Nettoveraenderung</span>
              <span class="nri-trend-stat__value">${formatSigned(trendStats.net)}</span>
            </div>
            <div class="nri-trend-stat">
              <span class="nri-trend-stat__label">Wochenmittel</span>
              <span class="nri-trend-stat__value">${trendStats.avg.toFixed(1)}</span>
            </div>
            <div class="nri-trend-stat">
              <span class="nri-trend-stat__label">Spannweite</span>
              <span class="nri-trend-stat__value">${trendStats.range.toFixed(1)}</span>
            </div>
          </div>
          <div class="nri-trend-note">
            NRI quantifiziert, wann sich Diskurs in koordinierten institutionellen Druck verschiebt - nicht nur Erwaehnungsvolumen.
          </div>
        </div>
      </div>
    </div>

    <div class="nri-info-overlay" id="nri-info-overlay" aria-hidden="true">
      <div class="nri-info-modal" role="dialog" aria-modal="true" aria-labelledby="nri-info-title">
        <div class="nri-info-modal__header">
          <div class="panel__title">NRI-Metrikerklaerung</div>
          <button class="nri-info-modal__close" id="nri-info-close" type="button" aria-label="Metrikerklaerung schliessen">&times;</button>
        </div>
        <div class="nri-info-modal__body">
          <div class="nri-info-modal__title" id="nri-info-title"></div>
          <div class="nri-info-modal__line">
            <span>Bedeutet</span>
            <p id="nri-info-means"></p>
          </div>
          <div class="nri-info-modal__line">
            <span>Misst</span>
            <p id="nri-info-measures"></p>
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
  const infoOverlay = container.querySelector('#nri-info-overlay');
  const infoClose = container.querySelector('#nri-info-close');
  const infoTitleEl = container.querySelector('#nri-info-title');
  const infoMeansEl = container.querySelector('#nri-info-means');
  const infoMeasuresEl = container.querySelector('#nri-info-measures');
  let infoState = null;

  const openTrend = () => {
    closeInfo();
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

  function closeInfo() {
    if (!infoState) return;
    if (infoState.button) infoState.button.classList.remove('is-active');
    infoState = null;
    infoOverlay.classList.remove('is-open');
    infoOverlay.setAttribute('aria-hidden', 'true');
  }

  function openInfo(button, key) {
    closeTrend();
    const info = NRI_INFO[key] || NRI_INFO.overall;
    const sameButton = infoState && infoState.button === button;
    if (sameButton) {
      closeInfo();
      return;
    }

    if (infoState?.button) infoState.button.classList.remove('is-active');
    button.classList.add('is-active');

    infoTitleEl.textContent = info.title;
    infoMeansEl.textContent = info.means;
    infoMeasuresEl.textContent = info.measures;

    infoOverlay.classList.add('is-open');
    infoOverlay.setAttribute('aria-hidden', 'false');
    infoState = { button, key };
  }

  container.querySelectorAll('.nri-info-btn').forEach(btn => {
    bind(btn, 'click', (e) => {
      e.stopPropagation();
      openInfo(btn, btn.dataset.infoKey);
    });
  });

  bind(infoClose, 'click', closeInfo);
  bind(infoOverlay, 'click', (e) => {
    if (e.target === infoOverlay) closeInfo();
  });

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
      <span class="risk-badge ${w.risk === 'red' ? 'risk-badge--red' : w.risk === 'amber' ? 'risk-badge--amber' : 'risk-badge--neutral'}">${w.risk === 'red' ? 'HOCH' : w.risk === 'amber' ? 'MITTEL' : 'NIEDRIG'}</span>
      <div class="warning-item__content">
        <div class="warning-item__title">${w.title}</div>
        <div class="warning-item__delta">${w.delta}</div>
      </div>
      <div class="warning-item__cta">Evidenz</div>
    `;

    item.addEventListener('click', () => {
      const sub = findSubById(w.subId);
      if (sub) openSubSheet(sub.sub, sub.cluster);
    });

    list.appendChild(item);
  });
}

function buildTrendChartMarkup(data) {
  const w = 760;
  const h = 300;
  const padL = 52;
  const padR = 28;
  const padT = 28;
  const padB = 56;
  const minScore = Math.min(...data.map(d => d.score));
  const maxScore = Math.max(...data.map(d => d.score));
  const range = Math.max(1, maxScore - minScore);
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const guideCount = 4;

  const points = data.map((item, idx) => {
    const x = padL + ((innerW / Math.max(1, data.length - 1)) * idx);
    const t = (item.score - minScore) / range;
    const y = padT + (1 - t) * innerH;
    return { ...item, x, y };
  });

  const guides = Array.from({ length: guideCount }, (_, i) => {
    const ratio = i / (guideCount - 1);
    const value = maxScore - ratio * range;
    const y = padT + ratio * innerH;
    return { y, value };
  });

  const line = points.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const area = [
    `${padL},${padT + innerH}`,
    ...points.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`),
    `${padL + innerW},${padT + innerH}`
  ].join(' ');

  return `
    <div class="nri-trend-chart">
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-label="NRI Verlauf der letzten 4 Wochen">
        <defs>
          <linearGradient id="nri-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(255,153,102,0.32)"></stop>
            <stop offset="100%" stop-color="rgba(255,153,102,0.03)"></stop>
          </linearGradient>
        </defs>
        ${guides.map(g => `
          <g>
            <line x1="${padL}" y1="${g.y}" x2="${w - padR}" y2="${g.y}" stroke="rgba(255,255,255,0.08)" stroke-width="1"></line>
            <text x="${padL - 8}" y="${g.y + 3}" text-anchor="end" fill="rgba(169,179,195,0.76)" font-size="10" font-family="var(--font-mono)">${g.value.toFixed(0)}</text>
          </g>
        `).join('')}
        <polygon class="nri-trend-area" points="${area}" fill="url(#nri-area-grad)"></polygon>
        <polyline class="nri-trend-line" points="${line}" fill="none" stroke="#ffb28c" stroke-width="2.6" stroke-linecap="round"></polyline>
        ${points.map((p, idx) => `
          <g class="nri-trend-point" style="--pt-i:${idx};">
            <circle class="nri-trend-point__halo" cx="${p.x}" cy="${p.y}" r="13" fill="rgba(255,153,102,0.18)"></circle>
            <circle class="nri-trend-point__dot" cx="${p.x}" cy="${p.y}" r="4.9" fill="#ff9966"></circle>
            <text class="nri-trend-point__score" x="${p.x}" y="${p.y - 15}" text-anchor="middle" fill="#f4f7fb" font-size="11" font-family="var(--font-mono)">${p.score}</text>
            <text class="nri-trend-point__label" x="${p.x}" y="${h - 18}" text-anchor="middle" fill="#a9b3c3" font-size="10" font-family="var(--font-mono)">${p.label}</text>
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
