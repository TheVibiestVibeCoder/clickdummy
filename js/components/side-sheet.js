/* ============================================================
   SIDE SHEET — Slides in from right, content stays in context
   ============================================================ */

import { CLUSTERS, getSentimentColor, getSentimentLabel, sparkPoints } from '../data.js';

let overlay, sheet, sheetTitle, sheetBody, sheetTag;
let hostRoot = null;

function getSheetHost() {
  return document.fullscreenElement || document.body;
}

function ensureSheetHost() {
  const nextHost = getSheetHost();
  if (!overlay || !sheet || !nextHost) return;
  if (hostRoot === nextHost) return;

  nextHost.appendChild(overlay);
  nextHost.appendChild(sheet);
  hostRoot = nextHost;
}

export function initSideSheet() {
  // Create DOM once
  overlay = document.createElement('div');
  overlay.className = 'side-sheet-overlay';
  overlay.addEventListener('click', closeSideSheet);

  sheet = document.createElement('div');
  sheet.className = 'side-sheet';
  sheet.innerHTML = `
    <div class="side-sheet__header">
      <div class="side-sheet__title" id="ss-title">Title</div>
      <button class="side-sheet__close" id="ss-close">&times;</button>
    </div>
    <div class="side-sheet__body" id="ss-body"></div>
    <div class="side-sheet__footer">
      <span>Narrative Intelligence System</span>
      <span id="ss-tag" style="color:var(--accent);">DETAIL</span>
    </div>
  `;

  ensureSheetHost();

  sheetTitle = sheet.querySelector('#ss-title');
  sheetBody = sheet.querySelector('#ss-body');
  sheetTag = sheet.querySelector('#ss-tag');
  sheet.querySelector('#ss-close').addEventListener('click', closeSideSheet);

  // ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSideSheet();
  });
  document.addEventListener('fullscreenchange', ensureSheetHost);
}

export function openSideSheet(data) {
  ensureSheetHost();

  sheetTitle.textContent = data.title;
  sheetTag.textContent = data.type.toUpperCase();

  const color = getSentimentColor(data.score);
  const label = getSentimentLabel(data.score);

  let sourcesHTML = '';
  if (data.sources && data.sources.length) {
    sourcesHTML = data.sources.map(src => `
      <div class="media-row">
        <div class="media-logo ${src.cls}">${src.label}</div>
        <div class="media-name">${src.name}</div>
        <div class="media-bar-track">
          <div class="media-bar-fill" style="background:${data.clusterColor || 'var(--accent)'}; --bar-w:${src.share}%"></div>
        </div>
        <div class="media-pct">${src.share}%</div>
      </div>
    `).join('');
  }

  sheetBody.innerHTML = `
    <div class="modal__section">
      <div class="modal__label">Zusammenfassung</div>
      <div class="modal__text">${data.text}</div>
    </div>

    <div class="modal__section">
      <div class="modal__label">Sentiment & Trend</div>
      <div style="display:flex; align-items:center; justify-content:space-between; background:var(--surface-muted); border:1px solid var(--border-subtle); padding:var(--sp-16); border-radius:var(--radius-md);">
        <div>
          <div style="font-size:var(--text-xs); color:var(--text-secondary); margin-bottom:var(--sp-4);">Sentiment Score</div>
          <div style="font-size:var(--text-lg); font-weight:700; color:${color};">${label} (${data.score})</div>
        </div>
        <svg class="sparkline" style="width:100px;height:30px;" viewBox="0 0 48 20">
          <polyline points="${sparkPoints(data.score > 0.3 ? 'up' : data.score < -0.3 ? 'down' : 'flat')}" stroke="${color}" fill="none" stroke-width="1.5"/>
        </svg>
      </div>
    </div>

    ${sourcesHTML ? `
    <div class="modal__section">
      <div class="modal__label">Actor Mix (Share of Voice)</div>
      <div style="margin-top:var(--sp-12);">${sourcesHTML}</div>
    </div>
    ` : ''}
  `;

  overlay.classList.add('is-open');
  sheet.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

export function closeSideSheet() {
  overlay.classList.remove('is-open');
  sheet.classList.remove('is-open');
  document.body.style.overflow = '';
}

// Convenience: open from cluster/sub/micro data
export function openClusterSheet(cluster) {
  const avgScore = cluster.subTopics.reduce((s, t) => s + t.score, 0) / cluster.subTopics.length;
  openSideSheet({
    title: cluster.label,
    text: cluster.reportText,
    type: 'Cluster Brief',
    score: parseFloat(avgScore.toFixed(2)),
    sources: cluster.subTopics[0].sources,
    clusterColor: cluster.color
  });
}

export function openSubSheet(sub, cluster) {
  openSideSheet({
    title: sub.label,
    text: sub.explanation,
    type: 'Sub-Cluster Brief',
    score: sub.score,
    sources: sub.sources,
    clusterColor: cluster.color
  });
}

export function openMicroSheet(micro, sub, cluster) {
  openSideSheet({
    title: micro.label,
    text: micro.desc,
    type: 'Micro-Narrative',
    score: sub.score,
    sources: sub.sources,
    clusterColor: cluster.color
  });
}
