/* ============================================================
   REPORTS & AUDIT — Evidence Packs, exports, timeline
   ============================================================ */

import { CLUSTERS, EVIDENCE_EVENTS } from '../data.js';
import { animatePageEnter, staggerIn, showToast } from '../motion.js';
import { createExportButton } from '../components/export-button.js';

export function renderReports(container) {
  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--sp-24);">
      <div>
        <h2 style="font-size:var(--text-xl);">Reports & Audit Trail</h2>
        <p style="font-size:var(--text-sm); color:var(--text-secondary); margin-top:var(--sp-4);">Evidence packs, compliance exports, and audit timeline</p>
      </div>
      <div style="display:flex; gap:var(--sp-8);" id="report-actions"></div>
    </div>

    <div class="reports-grid">
      <!-- Evidence Packs -->
      <div>
        <div class="panel" data-animate style="margin-bottom:var(--sp-16);">
          <div class="panel__header">
            <span class="panel__title">Evidence Packs</span>
            <span class="panel__badge">${CLUSTERS.length} clusters</span>
          </div>
          <div id="evidence-packs" style="position:relative; z-index:2;"></div>
        </div>

        <div class="panel" data-animate>
          <div class="panel__header">
            <span class="panel__title">Intelligence Reports</span>
          </div>
          <div id="intel-reports" style="position:relative; z-index:2;"></div>
        </div>
      </div>

      <!-- Audit Timeline -->
      <div>
        <div class="panel" data-animate style="margin-bottom:var(--sp-16);">
          <div class="panel__header">
            <span class="panel__title">Audit Timeline</span>
            <span class="panel__badge">Live</span>
          </div>
          <div class="evidence-trail" id="audit-timeline" style="position:relative; z-index:2;"></div>
        </div>

        <div class="panel" data-animate>
          <div class="panel__header">
            <span class="panel__title">Risk Alerts</span>
            <span class="risk-badge risk-badge--red">3 Active</span>
          </div>
          <div id="risk-alerts" style="position:relative; z-index:2;"></div>
        </div>
      </div>
    </div>
  `;

  // Export buttons
  const actions = document.getElementById('report-actions');
  createExportButton(actions);

  const csvBtn = document.createElement('button');
  csvBtn.className = 'btn btn--ghost';
  csvBtn.innerHTML = 'Export CSV';
  csvBtn.addEventListener('click', () => {
    showToast('&#10003; &nbsp; CSV exported (42 rows)');
  });
  actions.appendChild(csvBtn);

  // Evidence Packs
  const packs = document.getElementById('evidence-packs');
  CLUSTERS.forEach(c => {
    const totalSources = c.subTopics.reduce((sum, s) => sum + s.sources.length, 0);
    const pack = document.createElement('div');
    pack.className = 'report-card';
    pack.style.cursor = 'pointer';
    pack.innerHTML = `
      <div class="report-card__header">
        <span class="report-card__cluster" style="color:${c.color};">${c.label}</span>
        <span class="risk-badge risk-badge--${c.riskLevel}">${c.riskLevel.toUpperCase()}</span>
      </div>
      <div class="report-card__body" style="margin-bottom:var(--sp-12);">${c.reportText.substring(0, 120)}...</div>
      <div style="display:flex; gap:var(--sp-16); font-size:var(--text-xs); color:var(--text-secondary);">
        <span>${c.subTopics.length} sub-narratives</span>
        <span>${totalSources} sources</span>
        <span>${c.subTopics.reduce((sum, s) => sum + s.micro.length, 0)} micro-narratives</span>
      </div>
    `;
    pack.addEventListener('click', () => {
      showToast(`&#128196; &nbsp; Evidence Pack "${c.label}" opened`);
    });
    packs.appendChild(pack);
  });

  // Intelligence Reports
  const reports = document.getElementById('intel-reports');
  const reportItems = [
    { title: 'Weekly Risk Summary', date: '20.02.2026', status: 'Ready' },
    { title: 'Monthly Board Brief', date: '01.02.2026', status: 'Ready' },
    { title: 'Incident Report: Zahlungsstreik', date: '18.02.2026', status: 'Draft' },
    { title: 'Quarterly Trend Analysis', date: '15.01.2026', status: 'Ready' }
  ];
  reportItems.forEach(r => {
    const item = document.createElement('div');
    item.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:var(--sp-12) 0; border-bottom:1px solid var(--border-subtle); cursor:pointer; font-size:var(--text-sm);';
    item.innerHTML = `
      <div>
        <div style="font-weight:500; color:var(--text-primary);">${r.title}</div>
        <div style="font-size:var(--text-xs); color:var(--text-secondary); margin-top:var(--sp-2);">${r.date}</div>
      </div>
      <span class="risk-badge ${r.status === 'Ready' ? 'risk-badge--neutral' : 'risk-badge--amber'}">${r.status}</span>
    `;
    item.addEventListener('click', () => showToast(`&#128196; &nbsp; "${r.title}" downloaded`));
    reports.appendChild(item);
  });

  // Audit Timeline
  const timeline = document.getElementById('audit-timeline');
  EVIDENCE_EVENTS.forEach(ev => {
    const item = document.createElement('div');
    item.className = `evidence-item ${ev.risk ? 'evidence-item--risk' : ev.amber ? 'evidence-item--amber' : ''}`;
    item.innerHTML = `
      <div class="evidence-item__time">${ev.time} &middot; ${ev.date}</div>
      <div class="evidence-item__text">${ev.text}</div>
    `;
    timeline.appendChild(item);
  });

  // Risk Alerts
  const alerts = document.getElementById('risk-alerts');
  CLUSTERS.forEach(c => {
    const card = document.createElement('div');
    card.className = 'report-card report-card--risk';
    card.innerHTML = `
      <div class="report-card__header">
        <span class="report-card__cluster" style="color:${c.color};">${c.label}</span>
        <span class="risk-badge risk-badge--${c.riskLevel}">${c.riskLevel.toUpperCase()}</span>
      </div>
      <div class="report-card__body">${c.riskText}</div>
    `;
    alerts.appendChild(card);
  });

  animatePageEnter(container);
  setTimeout(() => {
    staggerIn(packs, '.report-card', 60);
    staggerIn(timeline, '.evidence-item', 40);
  }, 300);
}
