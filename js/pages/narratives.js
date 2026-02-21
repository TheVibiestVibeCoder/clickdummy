/* ============================================================
   NARRATIVES EXPLORER — List + filters + detail side sheet
   ============================================================ */

import { CLUSTERS, getSentimentColor, getSentimentLabel, sparkPoints } from '../data.js';
import { animatePageEnter, staggerIn } from '../motion.js';
import { openSubSheet } from '../components/side-sheet.js';
import { navigate } from '../router.js';

export function renderNarratives(container) {
  container.innerHTML = `
    <div class="narratives-grid">
      <!-- Filters Sidebar -->
      <div class="narr-filters panel" data-animate>
        <div class="panel__header">
          <span class="panel__title">Filters</span>
          <button class="btn btn--ghost btn--sm" id="reset-filters">Reset</button>
        </div>

        <div class="filter-group">
          <div class="filter-group__title">Cluster</div>
          ${CLUSTERS.map(c => `
            <span class="filter-chip is-active" data-cluster="${c.id}" style="--chip-color:${c.color};">
              <span style="width:8px;height:8px;border-radius:50%;background:${c.color};display:inline-block;"></span>
              ${c.label}
            </span>
          `).join('')}
        </div>

        <div class="filter-group">
          <div class="filter-group__title">Sentiment</div>
          <span class="filter-chip is-active">Negativ</span>
          <span class="filter-chip is-active">Positiv</span>
          <span class="filter-chip is-active">Gemischt</span>
        </div>

        <div class="filter-group">
          <div class="filter-group__title">Volatility</div>
          <span class="filter-chip is-active">High</span>
          <span class="filter-chip is-active">Medium</span>
          <span class="filter-chip is-active">Low</span>
        </div>

        <div class="filter-group">
          <div class="filter-group__title">Trend</div>
          <span class="filter-chip is-active">&#8599; Rising</span>
          <span class="filter-chip is-active">&#8600; Falling</span>
          <span class="filter-chip is-active">&#8594; Flat</span>
        </div>

        <div class="filter-group">
          <div class="filter-group__title">Time Range</div>
          <div class="time-scrubber" style="flex-direction:column; align-items:stretch; width:100%;">
            <div class="pill-group" style="width:100%;">
              <button class="pill" style="flex:1;">24h</button>
              <button class="pill is-active" style="flex:1;">7d</button>
              <button class="pill" style="flex:1;">30d</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Narrative List -->
      <div class="narr-list" data-animate>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--sp-16);">
          <h2 style="font-size:var(--text-lg);">All Narratives</h2>
          <span style="font-size:var(--text-sm); color:var(--text-secondary);" id="narr-count"></span>
        </div>
        <div id="narr-items"></div>
      </div>
    </div>
  `;

  // Render narrative items
  const itemsContainer = document.getElementById('narr-items');
  let totalCount = 0;

  CLUSTERS.forEach(cluster => {
    // Cluster header
    const header = document.createElement('div');
    header.style.cssText = `font-weight:600; font-size:var(--text-sm); color:${cluster.color}; padding:var(--sp-8) 0; margin-top:var(--sp-16); border-bottom:1px solid var(--border-subtle); display:flex; justify-content:space-between; cursor:pointer;`;
    header.innerHTML = `<span>${cluster.label}</span><span style="font-size:var(--text-xs); color:var(--text-secondary);">${cluster.subTopics.length} narratives</span>`;
    header.addEventListener('click', () => navigate(`/narratives/${cluster.id}`));
    itemsContainer.appendChild(header);

    cluster.subTopics.forEach(sub => {
      totalCount++;
      const color = getSentimentColor(sub.score);
      const arrow = sub.sentiment === 'pos' ? '&#8599;' : sub.sentiment === 'neg' ? '&#8600;' : '&#8594;';
      const volBadge = sub.vol === 'high' ? 'risk-badge--red' : sub.vol === 'med' ? 'risk-badge--amber' : 'risk-badge--neutral';

      const card = document.createElement('div');
      card.className = 'narrative-card';
      card.innerHTML = `
        <div class="narrative-card__header">
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:var(--sp-8);">
              <div class="narrative-card__title">${sub.label}</div>
              <span style="color:${color}; font-size:var(--text-base);">${arrow}</span>
              <span class="risk-badge ${volBadge}" style="margin-left:auto;">${sub.vol.toUpperCase()}</span>
            </div>
            <div class="narrative-card__meta">
              <span style="color:${color}; font-weight:500;">${getSentimentLabel(sub.score)} (${sub.score})</span>
              <svg class="sparkline" viewBox="0 0 48 20"><polyline points="${sparkPoints(sub.trend)}" stroke="${color}" fill="none" stroke-width="1.5"/></svg>
              <span class="cluster-tag" style="color:${cluster.color}; border-color:${cluster.color}44; background:${cluster.color}0d; font-size:var(--text-xs);">${cluster.label}</span>
            </div>
          </div>
          <div class="chevron-icon"></div>
        </div>
        <div class="narrative-card__details">
          <div class="narrative-card__details-inner">
            <div style="font-size:var(--text-sm); color:var(--text-muted); line-height:var(--leading-relaxed); background:var(--surface-muted); border:1px solid var(--border-subtle); padding:var(--sp-12); border-radius:var(--radius-sm); border-left:2px solid var(--accent);">
              ${sub.explanation}
            </div>
            <div style="margin-top:var(--sp-16);">
              <div class="text-label" style="margin-bottom:var(--sp-8);">Micro-Narratives</div>
              ${sub.micro.map(m => `
                <div style="display:flex; align-items:center; gap:var(--sp-8); padding:var(--sp-4) 0; font-size:var(--text-sm); color:var(--text-secondary); cursor:pointer;" class="micro-item">
                  <span style="width:4px;height:4px;border-radius:50%;background:var(--accent);flex-shrink:0;"></span>
                  ${m.label}
                </div>
              `).join('')}
            </div>
            <div style="margin-top:var(--sp-12);">
              <button class="btn btn--ghost btn--sm" data-action="evidence">View Evidence Pack</button>
            </div>
          </div>
        </div>
      `;

      // Toggle expand
      card.querySelector('.chevron-icon').addEventListener('click', (e) => {
        e.stopPropagation();
        card.classList.toggle('is-expanded');
      });

      // Click title -> side sheet
      card.querySelector('.narrative-card__title').addEventListener('click', (e) => {
        e.stopPropagation();
        openSubSheet(sub, cluster);
      });

      // Evidence button
      card.querySelector('[data-action="evidence"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openSubSheet(sub, cluster);
      });

      itemsContainer.appendChild(card);
    });
  });

  document.getElementById('narr-count').textContent = `${totalCount} narratives`;

  // Filter chip toggle
  container.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('is-active'));
  });

  // Time pills
  container.querySelectorAll('.time-scrubber .pill').forEach(pill => {
    pill.addEventListener('click', () => {
      container.querySelectorAll('.time-scrubber .pill').forEach(p => p.classList.remove('is-active'));
      pill.classList.add('is-active');
    });
  });

  // Reset
  document.getElementById('reset-filters')?.addEventListener('click', () => {
    container.querySelectorAll('.filter-chip').forEach(c => c.classList.add('is-active'));
  });

  animatePageEnter(container);
  setTimeout(() => staggerIn(itemsContainer, '.narrative-card', 40), 200);
}
