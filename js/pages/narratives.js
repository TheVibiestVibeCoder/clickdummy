/* ============================================================
   NARRATIVES EXPLORER - List + usable filters + detail side sheet
   ============================================================ */

import { CLUSTERS, getSentimentColor, getSentimentLabel, sparkPoints } from '../data.js';
import { animatePageEnter, staggerIn } from '../motion.js';
import { openSubSheet } from '../components/side-sheet.js';
import { navigate } from '../router.js';

const FILTER_DEFAULTS = {
  cluster: CLUSTERS.map(c => String(c.id)),
  sentiment: ['neg', 'pos', 'mixed'],
  volatility: ['high', 'med', 'low'],
  trend: ['up', 'down', 'flat'],
  timeRange: '7d'
};

const VOLATILITY_WEIGHT = {
  high: 3,
  med: 2,
  low: 1
};

const TREND_WEIGHT = {
  up: 1.2,
  down: 1,
  flat: 0.8
};

function createFilterState() {
  return {
    cluster: new Set(FILTER_DEFAULTS.cluster),
    sentiment: new Set(FILTER_DEFAULTS.sentiment),
    volatility: new Set(FILTER_DEFAULTS.volatility),
    trend: new Set(FILTER_DEFAULTS.trend),
    timeRange: FILTER_DEFAULTS.timeRange
  };
}

function getFilterSet(state, filterGroup) {
  if (filterGroup === 'cluster') return state.cluster;
  if (filterGroup === 'sentiment') return state.sentiment;
  if (filterGroup === 'volatility') return state.volatility;
  if (filterGroup === 'trend') return state.trend;
  return null;
}

function scoreForTimeRange(sub, timeRange) {
  const volWeight = VOLATILITY_WEIGHT[sub.vol] || 1;
  const trendWeight = TREND_WEIGHT[sub.trend] || 1;
  const sentimentMagnitude = Math.abs(sub.score);

  if (timeRange === '24h') {
    return volWeight * 10 + trendWeight * 6 + sentimentMagnitude * 12;
  }

  if (timeRange === '30d') {
    const stability = (4 - volWeight) * 5;
    return stability + sentimentMagnitude * 8;
  }

  return sentimentMagnitude * 14 + volWeight * 6 + trendWeight * 2;
}

function sortNarratives(entries, timeRange) {
  const sorted = [...entries];

  if (timeRange === '30d') {
    sorted.sort((a, b) => {
      const scoreDelta = scoreForTimeRange(b.sub, timeRange) - scoreForTimeRange(a.sub, timeRange);
      if (Math.abs(scoreDelta) > 0.01) return scoreDelta;
      return a.sub.label.localeCompare(b.sub.label);
    });
    return sorted;
  }

  sorted.sort((a, b) => scoreForTimeRange(b.sub, timeRange) - scoreForTimeRange(a.sub, timeRange));
  return sorted;
}

function createNarrativeCard(sub, cluster) {
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
            <div style="display:flex; align-items:center; gap:var(--sp-8); padding:var(--sp-4) 0; font-size:var(--text-sm); color:var(--text-secondary); cursor:pointer;" class="micro-item" data-micro-id="${m.id}">
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

  card.querySelector('.chevron-icon')?.addEventListener('click', e => {
    e.stopPropagation();
    card.classList.toggle('is-expanded');
  });

  card.querySelector('.narrative-card__title')?.addEventListener('click', e => {
    e.stopPropagation();
    openSubSheet(sub, cluster);
  });

  card.querySelector('[data-action="evidence"]')?.addEventListener('click', e => {
    e.stopPropagation();
    openSubSheet(sub, cluster);
  });

  card.querySelectorAll('.micro-item').forEach(item => {
    item.addEventListener('click', e => {
      e.stopPropagation();
      openSubSheet(sub, cluster);
    });
  });

  return card;
}

export function renderNarratives(container) {
  container.innerHTML = `
    <div class="narratives-grid">
      <div class="narr-filters panel" data-animate>
        <div class="panel__header">
          <span class="panel__title">Filters</span>
          <button class="btn btn--ghost btn--sm" id="reset-filters">Reset</button>
        </div>

        <div class="filter-group">
          <div class="filter-group__title">Cluster</div>
          ${CLUSTERS.map(c => `
            <span class="filter-chip is-active" data-filter="cluster" data-value="${c.id}" style="--chip-color:${c.color};">
              <span style="width:8px;height:8px;border-radius:50%;background:${c.color};display:inline-block;"></span>
              ${c.label}
            </span>
          `).join('')}
        </div>

        <div class="filter-group">
          <div class="filter-group__title">Sentiment</div>
          <span class="filter-chip is-active" data-filter="sentiment" data-value="neg">Negativ</span>
          <span class="filter-chip is-active" data-filter="sentiment" data-value="pos">Positiv</span>
          <span class="filter-chip is-active" data-filter="sentiment" data-value="mixed">Gemischt</span>
        </div>

        <div class="filter-group">
          <div class="filter-group__title">Volatility</div>
          <span class="filter-chip is-active" data-filter="volatility" data-value="high">High</span>
          <span class="filter-chip is-active" data-filter="volatility" data-value="med">Medium</span>
          <span class="filter-chip is-active" data-filter="volatility" data-value="low">Low</span>
        </div>

        <div class="filter-group">
          <div class="filter-group__title">Trend</div>
          <span class="filter-chip is-active" data-filter="trend" data-value="up">&#8599; Rising</span>
          <span class="filter-chip is-active" data-filter="trend" data-value="down">&#8600; Falling</span>
          <span class="filter-chip is-active" data-filter="trend" data-value="flat">&#8594; Flat</span>
        </div>

        <div class="filter-group">
          <div class="filter-group__title">Time Range</div>
          <div class="time-scrubber" style="flex-direction:column; align-items:stretch; width:100%;">
            <div class="pill-group" style="width:100%;">
              <button class="pill" data-range="24h" style="flex:1;">24h</button>
              <button class="pill is-active" data-range="7d" style="flex:1;">7d</button>
              <button class="pill" data-range="30d" style="flex:1;">30d</button>
            </div>
          </div>
        </div>
      </div>

      <div class="narr-list" data-animate>
        <div class="narr-list-header">
          <h2 style="font-size:var(--text-lg);">All Narratives</h2>
          <span style="font-size:var(--text-sm); color:var(--text-secondary);" id="narr-count"></span>
        </div>
        <div id="narr-items"></div>
      </div>
    </div>
  `;

  const itemsContainer = container.querySelector('#narr-items');
  const countEl = container.querySelector('#narr-count');
  const allNarratives = CLUSTERS.flatMap(cluster => cluster.subTopics.map(sub => ({ cluster, sub })));
  let filterState = createFilterState();

  function updateFilterChipStyles() {
    container.querySelectorAll('.filter-chip[data-filter]').forEach(chip => {
      const filterGroup = chip.getAttribute('data-filter');
      const value = chip.getAttribute('data-value');
      const set = getFilterSet(filterState, filterGroup);
      chip.classList.toggle('is-active', Boolean(set && set.has(value)));
    });

    container.querySelectorAll('.time-scrubber .pill[data-range]').forEach(pill => {
      const isActive = pill.getAttribute('data-range') === filterState.timeRange;
      pill.classList.toggle('is-active', isActive);
    });
  }

  function getFilteredNarratives() {
    return allNarratives.filter(({ cluster, sub }) => {
      return (
        filterState.cluster.has(String(cluster.id)) &&
        filterState.sentiment.has(sub.sentiment) &&
        filterState.volatility.has(sub.vol) &&
        filterState.trend.has(sub.trend)
      );
    });
  }

  function renderNarrativesList() {
    itemsContainer.innerHTML = '';
    let visibleCount = 0;

    CLUSTERS.forEach(cluster => {
      const clusterEntries = sortNarratives(
        getFilteredNarratives().filter(entry => entry.cluster.id === cluster.id),
        filterState.timeRange
      );

      if (!clusterEntries.length) return;

      visibleCount += clusterEntries.length;

      const header = document.createElement('div');
      header.style.cssText = `font-weight:600; font-size:var(--text-sm); color:${cluster.color}; padding:var(--sp-8) 0; margin-top:var(--sp-16); border-bottom:1px solid var(--border-subtle); display:flex; justify-content:space-between; cursor:pointer;`;
      header.innerHTML = `<span>${cluster.label}</span><span style="font-size:var(--text-xs); color:var(--text-secondary);">${clusterEntries.length} narratives</span>`;
      header.addEventListener('click', () => navigate(`/narratives/${cluster.id}`));
      itemsContainer.appendChild(header);

      clusterEntries.forEach(({ sub }) => {
        itemsContainer.appendChild(createNarrativeCard(sub, cluster));
      });
    });

    countEl.textContent = `${visibleCount} narratives`;

    if (!visibleCount) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:var(--sp-24); border:1px solid var(--border-subtle); border-radius:var(--radius-md); color:var(--text-secondary); font-size:var(--text-sm); background:rgba(255,255,255,0.02);';
      empty.textContent = 'No narratives match the current filters. Try resetting or widening your filter selection.';
      itemsContainer.appendChild(empty);
    }
  }

  container.querySelectorAll('.filter-chip[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      const filterGroup = chip.getAttribute('data-filter');
      const value = chip.getAttribute('data-value');
      const set = getFilterSet(filterState, filterGroup);
      if (!set) return;

      if (set.has(value)) set.delete(value);
      else set.add(value);

      updateFilterChipStyles();
      renderNarrativesList();
    });
  });

  container.querySelectorAll('.time-scrubber .pill[data-range]').forEach(pill => {
    pill.addEventListener('click', () => {
      filterState.timeRange = pill.getAttribute('data-range') || FILTER_DEFAULTS.timeRange;
      updateFilterChipStyles();
      renderNarrativesList();
    });
  });

  container.querySelector('#reset-filters')?.addEventListener('click', () => {
    filterState = createFilterState();
    updateFilterChipStyles();
    renderNarrativesList();
  });

  updateFilterChipStyles();
  renderNarrativesList();

  animatePageEnter(container);
  setTimeout(() => staggerIn(itemsContainer, '.narrative-card', 40), 200);
}
