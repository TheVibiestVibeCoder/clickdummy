/* ============================================================
   ACTORS & NETWORKS - Narrative-scoped actor constellation
   ============================================================ */

import { ACTORS, CLUSTERS } from '../data.js';
import { animatePageEnter, staggerIn } from '../motion.js';
import { openSideSheet } from '../components/side-sheet.js';

const BASE_ACTOR_CONNECTIONS = [
  { a: 'Arbeiterkammer Wien', b: 'Kronen Zeitung', weight: 0.92 },
  { a: 'Arbeiterkammer Wien', b: 'VKI', weight: 0.87 },
  { a: 'Kronen Zeitung', b: 'ORF Wien', weight: 0.72 },
  { a: 'Der Standard', b: 'ORF Wien', weight: 0.78 },
  { a: 'r/Wien Community', b: 'FB Bezirksgruppen', weight: 0.76 },
  { a: 'Telegram Channels', b: 'r/Wien Community', weight: 0.64 },
  { a: 'Telegram Channels', b: 'FB Bezirksgruppen', weight: 0.58 },
  { a: 'Der Standard', b: 'r/Wien Community', weight: 0.46 },
  { a: 'Kronen Zeitung', b: 'FB Bezirksgruppen', weight: 0.66 },
  { a: 'VKI', b: 'Der Standard', weight: 0.62 },
  { a: 'E-Control', b: 'Wiener Stadtwerke', weight: 0.84 },
  { a: 'E-Control', b: 'Klimaschutzministerium', weight: 0.72 },
  { a: 'Wiener Stadtwerke', b: 'ORF Wien', weight: 0.7 },
  { a: 'Wiener Stadtwerke', b: 'Bezirkszeitung Wien', weight: 0.68 },
  { a: 'Klimaschutzministerium', b: 'ORF Wien', weight: 0.69 },
  { a: 'Klimaschutzministerium', b: 'Der Standard', weight: 0.64 },
  { a: 'Futurezone', b: 'Der Standard', weight: 0.61 },
  { a: 'Futurezone', b: 'ORF Wien', weight: 0.57 },
  { a: 'Futurezone', b: 'LinkedIn Energy Voices', weight: 0.56 },
  { a: 'Mietervereinigung Wien', b: 'Arbeiterkammer Wien', weight: 0.77 },
  { a: 'Mietervereinigung Wien', b: 'VKI', weight: 0.68 },
  { a: 'Bezirkszeitung Wien', b: 'FB Bezirksgruppen', weight: 0.73 },
  { a: 'Bezirkszeitung Wien', b: 'Kronen Zeitung', weight: 0.66 },
  { a: 'LinkedIn Energy Voices', b: 'Wiener Stadtwerke', weight: 0.63 },
  { a: 'TikTok Wien News', b: 'YouTube Kommentar-Cluster', weight: 0.71 },
  { a: 'TikTok Wien News', b: 'FB Bezirksgruppen', weight: 0.58 },
  { a: 'YouTube Kommentar-Cluster', b: 'r/Wien Community', weight: 0.56 },
  { a: 'Finanzmarktaufsicht', b: 'E-Control', weight: 0.59 },
  { a: 'Finanzmarktaufsicht', b: 'Klimaschutzministerium', weight: 0.55 },
  { a: 'Telegram Channels', b: 'TikTok Wien News', weight: 0.41 },
  { a: 'Futurezone', b: 'YouTube Kommentar-Cluster', weight: 0.4 }
];

const ACTOR_SOURCE_HINTS = {
  'Arbeiterkammer Wien': [
    { pattern: /arbeiterkammer|\bak\b/, weight: 1.5 },
    { pattern: /konsument|watchdog|regulator/, weight: 0.7 }
  ],
  'Kronen Zeitung': [
    { pattern: /kronen|krone|heute|boulevard/, weight: 1.35 }
  ],
  'ORF Wien': [
    { pattern: /\borf\b|broadcast|wien heute|stadt wien/, weight: 1.28 }
  ],
  'Der Standard': [
    { pattern: /standard|presse|kurier|quality/, weight: 1.2 }
  ],
  'r/Wien Community': [
    { pattern: /reddit|r\/wien|forum/, weight: 1.45 }
  ],
  'FB Bezirksgruppen': [
    { pattern: /facebook|\bfb\b|nextdoor|bezirksgruppe|bezirk/, weight: 1.4 }
  ],
  VKI: [
    { pattern: /\bvki\b|verbraucher|consumer/, weight: 1.45 }
  ],
  'Telegram Channels': [
    { pattern: /telegram|\btg\b/, weight: 1.5 }
  ],
  'E-Control': [
    { pattern: /e-control|regulator|energy control/, weight: 1.4 }
  ],
  'Wiener Stadtwerke': [
    { pattern: /wien energie|stadt wien|wiener stadtwerke|utility/, weight: 1.35 }
  ],
  Klimaschutzministerium: [
    { pattern: /klima|ministerium|bmk|foerder|co2/, weight: 1.3 }
  ],
  Futurezone: [
    { pattern: /futurezone|tech blogs|tb|technik/, weight: 1.34 }
  ],
  'Mietervereinigung Wien': [
    { pattern: /mieter|miet|vereinigung|fernwaerme/, weight: 1.32 }
  ],
  'Bezirkszeitung Wien': [
    { pattern: /bezirkszeitung|bz|bezirke|bezirk/, weight: 1.3 }
  ],
  'LinkedIn Energy Voices': [
    { pattern: /linkedin|\bin\b|professional|netzwerk/, weight: 1.28 }
  ],
  'TikTok Wien News': [
    { pattern: /tiktok|tik|video|viral/, weight: 1.36 }
  ],
  'YouTube Kommentar-Cluster': [
    { pattern: /youtube|kommentar|video/, weight: 1.3 }
  ],
  Finanzmarktaufsicht: [
    { pattern: /fma|finanz|aufsicht/, weight: 1.26 }
  ]
};

const DATASET_ALL_KEY = '__all__';

export function renderActors(container) {
  const narrativeOptions = buildNarrativeOptions();
  const datasets = new Map();

  const overallDataset = buildOverallDataset();
  datasets.set(overallDataset.key, overallDataset);

  narrativeOptions.forEach(option => {
    const scoped = buildNarrativeDataset(option);
    datasets.set(scoped.key, scoped);
  });

  container.innerHTML = `
    <div class="actors-grid">
      <div class="panel" data-animate style="padding:0; overflow:hidden; position:relative;">
        <div style="position:absolute; top:var(--sp-16); left:var(--sp-16); z-index:5; display:flex; flex-direction:column; gap:4px; max-width:52%;">
          <span class="panel__title">Actor Constellation</span>
          <span id="actor-graph-meta" style="font-size:var(--text-xs); color:var(--text-secondary); font-family:var(--font-mono);">Overview: weighted influence map</span>
        </div>

        <div class="actor-map-controls">
          <label class="actor-map-controls__label" for="actor-narrative-select">Narrative Scope</label>
          <div class="actor-map-select-wrap">
            <select id="actor-narrative-select" class="actor-map-select">
              <option value="${DATASET_ALL_KEY}">Overall View</option>
              ${narrativeOptions.map(option => `<option value="${option.key}">${option.cluster.label} - ${option.sub.label}</option>`).join('')}
            </select>
            <span class="actor-map-select-caret" aria-hidden="true">&#9662;</span>
          </div>
        </div>

        <canvas id="actor-canvas" style="width:100%; height:100%; background:transparent;"></canvas>
        <button
          id="actor-cone-toggle"
          class="actor-cone-toggle"
          type="button"
          aria-label="Expand to 3D cone view"
          title="Expand to 3D cone view"
        >
          <span class="actor-cone-toggle__icon" aria-hidden="true">&#x26F6;</span>
          <span class="actor-cone-toggle__text">Expand 3D</span>
        </button>
      </div>

      <div style="display:flex; flex-direction:column; gap:var(--sp-16); overflow-y:auto; min-height:0; padding-right:var(--sp-4);">
        <div class="panel" data-animate style="display:flex; flex-direction:column; min-height:0;">
          <div class="panel__header">
            <span class="panel__title">Key Actors</span>
            <span class="panel__badge" id="actors-count-badge">${overallDataset.actors.length} tracked</span>
          </div>
          <div id="actors-list" style="display:flex; flex-direction:column; gap:var(--sp-8); position:relative; z-index:2; overflow-y:auto; min-height:0; max-height:clamp(260px, 52vh, 620px); padding-right:var(--sp-4);"></div>
        </div>

        <div class="panel" data-animate style="display:flex; flex-direction:column; min-height:0;">
          <div class="panel__header">
            <span class="panel__title">Actor Connections</span>
          </div>
          <div id="actors-connections" style="position:relative; z-index:2; font-size:var(--text-sm); color:var(--text-secondary); line-height:var(--leading-relaxed); overflow-y:auto; min-height:0; max-height:clamp(220px, 34vh, 420px); padding-right:var(--sp-4);"></div>
        </div>
      </div>
    </div>
  `;

  const canvas = container.querySelector('#actor-canvas');
  const metaEl = container.querySelector('#actor-graph-meta');
  const listEl = container.querySelector('#actors-list');
  const connectionsEl = container.querySelector('#actors-connections');
  const badgeEl = container.querySelector('#actors-count-badge');
  const narrativeSelectEl = container.querySelector('#actor-narrative-select');
  const coneToggleEl = container.querySelector('#actor-cone-toggle');

  let currentDataset = overallDataset;
  let coneModeEnabled = false;

  function defaultMetaText() {
    return coneModeEnabled
      ? `${currentDataset.meta} | 3D cone view`
      : currentDataset.meta;
  }

  function syncConeToggleButton() {
    if (!coneToggleEl) return;

    coneToggleEl.classList.toggle('is-active', coneModeEnabled);
    coneToggleEl.setAttribute(
      'aria-label',
      coneModeEnabled ? 'Return to 2D map view' : 'Expand to 3D cone view'
    );
    coneToggleEl.setAttribute(
      'title',
      coneModeEnabled ? 'Return to 2D map view' : 'Expand to 3D cone view'
    );

    const iconEl = coneToggleEl.querySelector('.actor-cone-toggle__icon');
    const textEl = coneToggleEl.querySelector('.actor-cone-toggle__text');
    if (iconEl) iconEl.innerHTML = coneModeEnabled ? '&#x2715;' : '&#x26F6;';
    if (textEl) textEl.textContent = coneModeEnabled ? 'Back to 2D' : 'Expand 3D';
  }

  const graph = initActorConstellation({
    canvas,
    onActorClick: (actor, index) => openActorSheet(currentDataset, actor, index),
    onHover: (index) => {
      if (index == null || !currentDataset.actors[index]) {
        metaEl.textContent = defaultMetaText();
        return;
      }

      const actor = currentDataset.actors[index];
      const degree = currentDataset.connections.filter(edge => edge.from === index || edge.to === index).length;
      metaEl.textContent = `${actor.name} | ${actor.reach} reach | ${degree} linked actors`;
    }
  });

  function applyDataset(key, animate = true) {
    const next = datasets.get(key) || overallDataset;
    currentDataset = next;

    badgeEl.textContent = `${next.actors.length} tracked`;
    metaEl.textContent = defaultMetaText();

    graph.setData(next, { animate });
    renderActorCards(listEl, next, graph, currentDataset);
    renderConnectionsTable(connectionsEl, next);
  }

  const onNarrativeChange = () => {
    applyDataset(narrativeSelectEl.value, true);
  };
  const onConeToggle = () => {
    coneModeEnabled = !coneModeEnabled;
    graph.setConeMode(coneModeEnabled, { animate: true });
    syncConeToggleButton();
    metaEl.textContent = defaultMetaText();
  };

  narrativeSelectEl.addEventListener('change', onNarrativeChange);
  coneToggleEl?.addEventListener('click', onConeToggle);

  applyDataset(DATASET_ALL_KEY, false);
  syncConeToggleButton();

  animatePageEnter(container);
  setTimeout(() => staggerIn(listEl, '.actor-card', 45), 260);

  return () => {
    narrativeSelectEl.removeEventListener('change', onNarrativeChange);
    coneToggleEl?.removeEventListener('click', onConeToggle);
    graph.destroy();
  };
}

function buildNarrativeOptions() {
  return CLUSTERS.flatMap(cluster =>
    cluster.subTopics.map(sub => ({
      key: sub.id,
      cluster,
      sub
    }))
  );
}

function buildOverallDataset() {
  const actors = ACTORS.map(actor => ({ ...actor }));
  const connections = resolveConnections(actors);
  return {
    key: DATASET_ALL_KEY,
    label: 'Overall View',
    meta: 'Overview: weighted influence map',
    actors,
    connections,
    context: null
  };
}

function buildNarrativeDataset(option) {
  const scores = computeNarrativeActorScores(option);
  const ranked = ACTORS
    .map(actor => ({ actor: { ...actor }, score: scores.get(actor.name) || 0 }))
    .sort((a, b) => b.score - a.score);

  const topScore = ranked[0]?.score || 1;
  const minActors = Math.min(10, ranked.length);
  const maxActors = Math.min(15, ranked.length);
  const chosen = ranked
    .filter((entry, idx) => entry.score >= topScore * 0.16 || idx < minActors)
    .slice(0, maxActors);

  const actors = chosen.length >= minActors
    ? chosen.map(entry => ({ ...entry.actor, relevance: entry.score }))
    : ranked.slice(0, minActors).map(entry => ({ ...entry.actor, relevance: entry.score }));

  const relevanceByName = new Map();
  const best = Math.max(...actors.map(actor => actor.relevance || 0.1), 0.1);
  actors.forEach(actor => {
    relevanceByName.set(actor.name, clamp((actor.relevance || 0.1) / best, 0.2, 1));
  });

  const connections = resolveConnections(actors, relevanceByName);

  return {
    key: option.key,
    label: option.sub.label,
    meta: `${option.cluster.label} | ${option.sub.label} | narrative-scoped actor constellation`,
    actors,
    connections,
    context: option
  };
}

function computeNarrativeActorScores(option) {
  const scores = new Map(ACTORS.map(actor => [actor.name, 0.2]));
  const sub = option.sub;

  sub.sources.forEach(source => {
    const sourceText = `${source.name} ${source.label}`.toLowerCase();

    ACTORS.forEach(actor => {
      const hints = ACTOR_SOURCE_HINTS[actor.name] || [];
      for (const hint of hints) {
        if (hint.pattern.test(sourceText)) {
          const prior = scores.get(actor.name) || 0;
          scores.set(actor.name, prior + source.share * hint.weight);
          break;
        }
      }
    });
  });

  if (sub.sentiment === 'neg') {
    boostScore(scores, 'Arbeiterkammer Wien', 7.5);
    boostScore(scores, 'VKI', 6.5);
    boostScore(scores, 'Kronen Zeitung', 4.2);
    boostScore(scores, 'Telegram Channels', 3.4);
  } else if (sub.sentiment === 'pos') {
    boostScore(scores, 'ORF Wien', 5.2);
    boostScore(scores, 'Der Standard', 4.8);
    boostScore(scores, 'FB Bezirksgruppen', 2.2);
  } else {
    boostScore(scores, 'r/Wien Community', 2.9);
    boostScore(scores, 'FB Bezirksgruppen', 2.4);
  }

  const clusterLabel = option.cluster.label.toLowerCase();
  if (clusterLabel.includes('preis')) {
    boostScore(scores, 'Arbeiterkammer Wien', 2.4);
    boostScore(scores, 'VKI', 2.1);
  }
  if (clusterLabel.includes('waerme') || clusterLabel.includes('infra')) {
    boostScore(scores, 'ORF Wien', 1.9);
    boostScore(scores, 'Kronen Zeitung', 1.6);
  }
  if (clusterLabel.includes('versorgung') || clusterLabel.includes('innovation')) {
    boostScore(scores, 'Der Standard', 1.7);
    boostScore(scores, 'r/Wien Community', 1.5);
  }

  return scores;
}

function boostScore(scores, actorName, delta) {
  scores.set(actorName, (scores.get(actorName) || 0) + delta);
}

function resolveConnections(actors, relevanceByName = null) {
  const nameToIndex = new Map(actors.map((actor, index) => [actor.name, index]));
  const resolved = [];

  BASE_ACTOR_CONNECTIONS.forEach(link => {
    const from = nameToIndex.get(link.a);
    const to = nameToIndex.get(link.b);
    if (from == null || to == null) return;

    let weight = link.weight;
    if (relevanceByName) {
      const relA = relevanceByName.get(link.a) || 0.4;
      const relB = relevanceByName.get(link.b) || 0.4;
      const influence = (relA + relB) * 0.5;
      weight = clamp(link.weight * (0.58 + influence * 0.92), 0.22, 0.99);
    }

    resolved.push({ from, to, weight });
  });

  if (!resolved.length && actors.length > 1) {
    for (let i = 0; i < actors.length - 1; i++) {
      const relA = relevanceByName?.get(actors[i].name) || 0.55;
      const relB = relevanceByName?.get(actors[i + 1].name) || 0.55;
      resolved.push({
        from: i,
        to: i + 1,
        weight: clamp(0.45 + (relA + relB) * 0.18, 0.24, 0.8)
      });
    }
  }

  return resolved;
}

function renderActorCards(listEl, dataset, graph, currentDatasetRef) {
  listEl.innerHTML = '';

  dataset.actors.forEach((actor, index) => {
    const card = document.createElement('div');
    card.className = 'actor-card';
    card.innerHTML = `
      <div class="actor-card__avatar" style="background:${actor.color}22; color:${actor.color};">${actor.initial}</div>
      <div class="actor-card__info">
        <div class="actor-card__name">${actor.name}</div>
        <div class="actor-card__role">${actor.role}</div>
      </div>
      <div class="actor-card__reach">${actor.reach}</div>
    `;

    const onEnter = () => graph.focus(index);
    const onLeave = () => graph.unfocus(index);
    const onClick = () => {
      graph.lock(index);
      openActorSheet(currentDatasetRef, actor, index);
    };

    card.addEventListener('mouseenter', onEnter);
    card.addEventListener('mouseleave', onLeave);
    card.addEventListener('click', onClick);

    listEl.appendChild(card);
  });
}

function renderConnectionsTable(container, dataset) {
  container.innerHTML = '';
  const sorted = [...dataset.connections].sort((a, b) => b.weight - a.weight).slice(0, 8);

  if (!sorted.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:var(--sp-4) 0; color:var(--text-secondary);';
    empty.textContent = 'No significant actor connections for this narrative scope.';
    container.appendChild(empty);
    return;
  }

  sorted.forEach(edge => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:var(--sp-8) 0; border-bottom:1px solid var(--border-subtle);';
    row.innerHTML = `
      <span>${dataset.actors[edge.from].name} &harr; ${dataset.actors[edge.to].name}</span>
      <span class="text-mono" style="font-size:var(--text-xs); color:${strengthColor(edge.weight)};">${strengthLabel(edge.weight)}</span>
    `;
    container.appendChild(row);
  });
}

function openActorSheet(dataset, actor, index) {
  const linked = dataset.connections
    .filter(edge => edge.from === index || edge.to === index)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(edge => {
      const otherIndex = edge.from === index ? edge.to : edge.from;
      return `${dataset.actors[otherIndex].name} (${strengthLabel(edge.weight)})`;
    });

  const context = dataset.context
    ? `${dataset.context.cluster.label} -> ${dataset.context.sub.label}`
    : 'Overall constellation';
  const related = linked.length ? linked.join(', ') : 'No direct connection data';

  openSideSheet({
    title: actor.name,
    text: `${actor.role} with a reach of ${actor.reach}. Current scope: ${context}. Strongest links: ${related}.`,
    type: 'Actor Detail',
    score: -0.2,
    sources: [],
    clusterColor: actor.color
  });
}

function initActorConstellation({ canvas, onActorClick, onHover }) {
  const ctx = canvas.getContext('2d');
  const state = {
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    w: 0,
    h: 0,
    centerX: 0,
    centerY: 0,
    active: null,
    previous: null,
    hoverIndex: null,
    focusIndex: null,
    lockedIndex: null,
    transitionStart: 0,
    transitionDuration: 820,
    viewBlendFrom: 0,
    viewBlendTo: 0,
    viewTransitionStart: 0,
    viewTransitionDuration: 2200,
    rafId: 0,
    lastTs: performance.now(),
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  };

  function toRuntimeDataset(baseData) {
    const actors = baseData.actors || [];
    const connections = baseData.connections || [];
    const nodeScale = computeNodeScale(actors.length);

    const reachValues = actors.map(actor => parseReach(actor.reach));
    const minReach = reachValues.length ? Math.min(...reachValues) : 0;
    const maxReach = reachValues.length ? Math.max(...reachValues) : 0;
    const relevanceValues = actors.map(actor => Number.isFinite(actor.relevance) ? actor.relevance : 0);
    const minRelevance = relevanceValues.length ? Math.min(...relevanceValues) : 0;
    const maxRelevance = relevanceValues.length ? Math.max(...relevanceValues) : 0;

    const normalizeReach = (index) => {
      if (!actors.length) return 0.5;
      if (maxReach === minReach) return 0.5;
      return (reachValues[index] - minReach) / (maxReach - minReach);
    };
    const normalizeRelevance = (index) => {
      if (!actors.length) return 0.5;
      if (maxRelevance === minRelevance) return 0.5;
      return (relevanceValues[index] - minRelevance) / (maxRelevance - minRelevance);
    };
    const normalizeInfluence = (index) => clamp(
      normalizeReach(index) * 0.74 + normalizeRelevance(index) * 0.26,
      0,
      1
    );

    const anchors = buildAnchors(actors, state.w, state.h, normalizeInfluence, nodeScale);
    const coneLayout = buildConeAnchors(actors, anchors, normalizeInfluence, nodeScale, state.w, state.h);
    const particles = buildParticles(actors, anchors, normalizeInfluence, nodeScale);

    return {
      base: baseData,
      actors,
      connections,
      normalizeReach,
      normalizeInfluence,
      nodeScale,
      anchors,
      coneAnchors: coneLayout.anchors,
      coneLevels: coneLayout.levels,
      coneConfig: coneLayout.config,
      particles,
      actorByName: new Map(actors.map((actor, index) => [actor.name, index]))
    };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    state.w = rect.width;
    state.h = rect.height;
    state.centerX = state.w * 0.5;
    state.centerY = state.h * 0.54;

    canvas.width = Math.max(1, Math.floor(rect.width * state.dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * state.dpr));
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    if (state.active) state.active = toRuntimeDataset(state.active.base);
    if (state.previous) state.previous = toRuntimeDataset(state.previous.base);
  }

  function getBlend(now = performance.now()) {
    if (!state.previous || state.reduced) return 1;
    const raw = clamp((now - state.transitionStart) / state.transitionDuration, 0, 1);
    return easeInOutCubic(raw);
  }

  function getViewBlend(now = performance.now()) {
    if (state.reduced) return state.viewBlendTo;
    if (state.viewBlendFrom === state.viewBlendTo) return state.viewBlendTo;

    const raw = clamp((now - state.viewTransitionStart) / state.viewTransitionDuration, 0, 1);
    const eased = easeInOutQuint(raw);
    const blend = lerp(state.viewBlendFrom, state.viewBlendTo, eased);
    if (raw >= 1) state.viewBlendFrom = state.viewBlendTo;
    return blend;
  }

  function getBlendedActiveAnchor(index, blend = getBlend(), viewBlend = getViewBlend()) {
    const target = state.active?.anchors[index];
    if (!target) return null;
    if (!state.previous || blend >= 1) return target;

    const actor = state.active.actors[index];
    const prevIndex = state.previous.actorByName.get(actor.name);
    if (prevIndex == null) {
      const sx = (hash01(index * 193 + actor.name.length * 79) - 0.5) * 52;
      const sy = (hash01(index * 457 + actor.name.length * 31) - 0.5) * 34;
      return {
        ...target,
        x: lerp(state.centerX + sx, target.x, blend),
        y: lerp(state.centerY + sy, target.y, blend)
      };
    }

    const source = state.previous.anchors[prevIndex];
    const base = {
      ...target,
      x: lerp(source.x, target.x, blend),
      y: lerp(source.y, target.y, blend),
      angle: lerp(source.angle, target.angle, blend),
      ringRadius: lerp(source.ringRadius, target.ringRadius, blend),
      nodeRadius: lerp(source.nodeRadius, target.nodeRadius, blend)
    };

    if (viewBlend > 0.56) {
      const morphArc = Math.sin(blend * Math.PI);
      const coneEnergy = easeInOutSine(clamp((viewBlend - 0.5) / 0.5, 0, 1));
      const extent = Math.max(1, Math.min(state.w, state.h));
      const travel = extent * 0.065 * morphArc * coneEnergy;
      const spin = blend * Math.PI * 1.8;
      const radial = target.angle + spin + (hash01((index + 1) * 227) - 0.5) * 0.9;

      base.x += Math.cos(radial) * travel;
      base.y -= travel * (0.5 + hash01((index + 1) * 631) * 0.65);
      base.nodeRadius *= 1 + morphArc * 0.08 * coneEnergy;
      base.ringRadius *= 1 + morphArc * 0.12 * coneEnergy;
    }

    return base;
  }

  function projectConePoint(point) {
    return projectConePointFromState(state, point);
  }

  function projectAnchorForView(runtime, flatAnchor, index, viewBlend = getViewBlend()) {
    if (!flatAnchor) return null;
    const coneAnchor = runtime?.coneAnchors?.[index];
    if (!coneAnchor || viewBlend <= 0.001) {
      return {
        ...flatAnchor,
        depth: flatAnchor.depth || 0,
        perspective: flatAnchor.perspective || 1
      };
    }

    const easedBlend = easeInOutSine(viewBlend);
    const projected = projectConePoint(coneAnchor);

    return {
      ...flatAnchor,
      x: lerp(flatAnchor.x, projected.x, easedBlend),
      y: lerp(flatAnchor.y, projected.y, easedBlend),
      angle: lerp(flatAnchor.angle, coneAnchor.angle, easedBlend),
      ringRadius: lerp(flatAnchor.ringRadius, coneAnchor.ringRadius, easedBlend),
      nodeRadius: lerp(flatAnchor.nodeRadius, coneAnchor.nodeRadius, easedBlend),
      depth: projected.depth * easedBlend,
      perspective: lerp(1, projected.perspective, easedBlend),
      coneLevel: coneAnchor.level
    };
  }

  function buildFrameAnchors(runtime, resolver, viewBlend) {
    if (!runtime) return null;
    const anchors = new Array(runtime.actors.length);
    for (let index = 0; index < runtime.actors.length; index++) {
      anchors[index] = projectAnchorForView(runtime, resolver(index), index, viewBlend);
    }
    return anchors;
  }

  function frame(ts) {
    const dt = Math.min(0.04, (ts - state.lastTs) / 1000);
    state.lastTs = ts;

    const blend = getBlend(ts);
    const viewBlend = getViewBlend(ts);

    drawBackground(ctx, state, viewBlend);

    if (state.active && viewBlend > 0.02) {
      drawConeGuides(ctx, state, state.active, viewBlend);
    }

    if (state.previous && blend < 1) {
      const previousAnchors = buildFrameAnchors(state.previous, idx => state.previous.anchors[idx], viewBlend);
      const previousAnchorProvider = idx => previousAnchors[idx];
      drawConnectionCurves(ctx, state, state.previous, previousAnchorProvider, (1 - blend) * 0.62, null, viewBlend);
      drawParticles(ctx, state, state.previous, dt, previousAnchorProvider, (1 - blend) * 0.72, null, viewBlend);
      drawAnchors(ctx, state, state.previous, previousAnchorProvider, (1 - blend) * 0.62, null, viewBlend);
    } else if (blend >= 1) {
      state.previous = null;
    }

    if (state.active) {
      const activeIndex = state.lockedIndex ?? state.focusIndex ?? state.hoverIndex;
      const activeAnchors = buildFrameAnchors(
        state.active,
        idx => getBlendedActiveAnchor(idx, blend, viewBlend),
        viewBlend
      );
      const anchorProvider = idx => activeAnchors[idx];

      drawConnectionCurves(ctx, state, state.active, anchorProvider, 0.42 + blend * 0.58, activeIndex, viewBlend);
      drawParticles(ctx, state, state.active, dt, anchorProvider, 0.45 + blend * 0.55, activeIndex, viewBlend);
      drawAnchors(ctx, state, state.active, anchorProvider, 0.5 + blend * 0.5, activeIndex, viewBlend);
    }

    state.rafId = requestAnimationFrame(frame);
  }

  function pointerPos(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function hitTest(pos) {
    if (!state.active) return null;

    const blend = getBlend();
    const viewBlend = getViewBlend();
    let closest = null;
    let bestDistSq = Infinity;

    state.active.actors.forEach((_, index) => {
      const flatAnchor = getBlendedActiveAnchor(index, blend);
      const anchor = projectAnchorForView(state.active, flatAnchor, index, viewBlend);
      if (!anchor) return;

      const dx = pos.x - anchor.x;
      const dy = pos.y - anchor.y;
      const radius = anchor.nodeRadius + 10 + viewBlend * 2;
      const distSq = dx * dx + dy * dy;

      if (distSq <= radius * radius && distSq < bestDistSq) {
        bestDistSq = distSq;
        closest = index;
      }
    });

    return closest;
  }

  function setHover(index) {
    if (state.hoverIndex === index) return;
    state.hoverIndex = index;
    canvas.style.cursor = index == null ? 'default' : 'pointer';
    onHover(index);
  }

  function onPointerMove(event) {
    const pos = pointerPos(event);
    setHover(hitTest(pos));
  }

  function onPointerLeave() {
    setHover(null);
  }

  function onPointerClick(event) {
    const pos = pointerPos(event);
    const hit = hitTest(pos);
    if (hit == null || !state.active || !state.active.actors[hit]) {
      state.lockedIndex = null;
      state.focusIndex = null;
      return;
    }

    state.lockedIndex = hit;
    onActorClick(state.active.actors[hit], hit);
  }

  canvas.addEventListener('mousemove', onPointerMove);
  canvas.addEventListener('mouseleave', onPointerLeave);
  canvas.addEventListener('click', onPointerClick);
  window.addEventListener('resize', resize);

  resize();
  state.rafId = requestAnimationFrame(frame);

  return {
    setData(baseData, options = {}) {
      const runtime = toRuntimeDataset(baseData);
      const shouldAnimate = options.animate !== false && !state.reduced;
      const viewBlend = getViewBlend();

      if (state.active && shouldAnimate) {
        state.previous = state.active;
        state.transitionStart = performance.now();
        state.transitionDuration = viewBlend > 0.56 ? 1820 : 820;
      } else {
        state.previous = null;
      }

      state.active = runtime;
      state.hoverIndex = null;
      state.focusIndex = null;
      state.lockedIndex = null;
      onHover(null);
    },
    setConeMode(enabled, options = {}) {
      const target = enabled ? 1 : 0;
      const shouldAnimate = options.animate !== false && !state.reduced;
      const current = getViewBlend();

      if (!shouldAnimate) {
        state.viewBlendFrom = target;
        state.viewBlendTo = target;
        state.viewTransitionStart = performance.now();
        return;
      }

      state.viewBlendFrom = current;
      state.viewBlendTo = target;
      state.viewTransitionStart = performance.now();
      state.viewTransitionDuration = target > current ? 2400 : 1850;
    },
    focus(index) {
      if (!state.active) return;
      if (index == null || index < 0 || index >= state.active.actors.length) return;
      if (state.lockedIndex != null && state.lockedIndex !== index) return;
      state.focusIndex = index;
    },
    unfocus(index) {
      if (!state.active) return;
      if (state.lockedIndex != null) return;
      if (state.focusIndex === index) state.focusIndex = null;
    },
    lock(index) {
      if (!state.active) return;
      if (index == null || index < 0 || index >= state.active.actors.length) return;
      state.lockedIndex = index;
      state.focusIndex = index;
    },
    destroy() {
      cancelAnimationFrame(state.rafId);
      canvas.removeEventListener('mousemove', onPointerMove);
      canvas.removeEventListener('mouseleave', onPointerLeave);
      canvas.removeEventListener('click', onPointerClick);
      window.removeEventListener('resize', resize);
    }
  };
}

function buildAnchors(actors, w, h, normalizeReach, nodeScale = 1) {
  const cx = w * 0.5;
  const cy = h * 0.54;
  const extent = Math.min(w, h);
  const ringRadii = [extent * 0.17, extent * 0.24, extent * 0.31, extent * 0.39];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const groupPhase = {
    institution: -0.72,
    media: 0.56,
    social: 1.88,
    alt: 3.18
  };
  const ranked = actors
    .map((actor, index) => ({ actor, index, group: actorGroup(actor.role) }))
    .sort((a, b) => parseReach(b.actor.reach) - parseReach(a.actor.reach));

  const anchors = new Array(actors.length);

  ranked.forEach((entry, order) => {
    const reachNorm = normalizeReach(entry.index);
    const ringSeed = hash01((entry.index + 1) * 73 + order * 17);
    const ringIndex = (order + Math.floor(ringSeed * ringRadii.length)) % ringRadii.length;
    const baseRing = ringRadii[ringIndex];

    const radialJitter = (hash01((entry.index + 1) * 911 + order * 137) - 0.5) * extent * 0.11;
    const angleJitter = (hash01((entry.index + 1) * 337 + order * 57) - 0.5) * 1.05;
    const angle = (order * goldenAngle) + (groupPhase[entry.group] || 0) + angleJitter;
    const radial = clamp(baseRing + radialJitter + reachNorm * extent * 0.05, extent * 0.14, extent * 0.47);
    const ySquash = 0.78 + hash01((entry.index + 1) * 271 + order * 7) * 0.2;

    anchors[entry.index] = {
      x: cx + Math.cos(angle) * radial,
      y: cy + Math.sin(angle) * radial * ySquash,
      angle,
      ringRadius: (22 + reachNorm * 50) * (0.86 + nodeScale * 0.22),
      nodeRadius: (4.2 + reachNorm * 9.2) * nodeScale,
      drift: (entry.index + 1) * 0.56 + ringIndex * 0.18
    };
  });

  return anchors;
}

function buildConeAnchors(actors, flatAnchors, normalizeInfluence, nodeScale = 1, w = 0, h = 0) {
  const extent = Math.max(1, Math.min(w, h));
  const levelCount = 4;
  const topRadius = extent * (0.4 + nodeScale * 0.045);
  const bottomRadius = extent * (0.1 + nodeScale * 0.012);
  const topY = -extent * 0.34;
  const bottomY = extent * 0.3;
  const levels = new Array(levelCount);

  for (let i = 0; i < levelCount; i++) {
    const t = levelCount <= 1 ? 1 : i / (levelCount - 1);
    levels[i] = {
      t,
      y3: lerp(bottomY, topY, t),
      radius: lerp(bottomRadius, topRadius, t)
    };
  }

  const coneAnchors = new Array(actors.length);

  actors.forEach((_, index) => {
    const flat = flatAnchors[index];
    if (!flat) return;

    const influence = clamp(normalizeInfluence(index), 0, 1);
    const verticalBias = clamp((h * 0.84 - flat.y) / Math.max(1, h * 0.72), 0, 1);
    const blendedLevel = clamp(influence * 0.72 + verticalBias * 0.28, 0, 1);
    const snapped = Math.round(blendedLevel * (levelCount - 1)) / Math.max(1, levelCount - 1);
    const level = clamp(lerp(blendedLevel, snapped, 0.68), 0, 1);

    const radius = lerp(bottomRadius, topRadius, level);
    const y3 = lerp(bottomY, topY, level);
    const jitter = (hash01((index + 1) * 487) - 0.5) * 0.2 * (1 - level) * 0.8;
    const angle = flat.angle + jitter;

    coneAnchors[index] = {
      angle,
      level,
      x3: Math.cos(angle) * radius,
      y3,
      z3: Math.sin(angle) * radius * (0.86 + (1 - level) * 0.22),
      ringRadius: flat.ringRadius * (0.56 + level * 0.34),
      nodeRadius: flat.nodeRadius * (0.82 + level * 0.28)
    };
  });

  return {
    anchors: coneAnchors,
    levels,
    config: {
      topRadius,
      bottomRadius,
      topY,
      bottomY
    }
  };
}

function buildParticles(actors, anchors, normalizeReach, nodeScale = 1) {
  const particles = [];

  anchors.forEach((anchor, actorIndex) => {
    if (!anchor || !actors[actorIndex]) return;

    const reachNorm = normalizeReach(actorIndex);
    const count = Math.round((190 + reachNorm * 230) * (0.8 + nodeScale * 0.34));

    for (let i = 0; i < count; i++) {
      const r1 = hash01(actorIndex * 1711 + i * 313);
      const r2 = hash01(actorIndex * 9187 + i * 733);
      const r3 = hash01(actorIndex * 1423 + i * 1201);
      const r4 = hash01(actorIndex * 8081 + i * 2081);

      const lane = Math.pow(r1, 1.8);
      const orbit = anchor.ringRadius * (0.25 + r2 * 0.95) * (1 - lane * 0.72);

      particles.push({
        actorIndex,
        lane,
        orbit,
        theta: r3 * Math.PI * 2,
        speed: 0.07 + r4 * 0.26 + lane * 0.08,
        warp: 0.3 + r2 * 1.2,
        size: 0.55 + r3 * 1.55,
        alpha: 0.07 + r4 * 0.24
      });
    }
  });

  return particles;
}

function drawBackground(ctx, state, modeBlend = 0) {
  const { w, h, centerX, centerY } = state;
  ctx.clearRect(0, 0, w, h);
  const blend = easeInOutSine(modeBlend);
  const baseFade = 1 - blend * 0.78;

  const g = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, Math.min(w, h) * 0.62);
  g.addColorStop(0, `rgba(255,153,102,${(0.13 * baseFade).toFixed(3)})`);
  g.addColorStop(0.45, `rgba(255,153,102,${(0.05 * baseFade).toFixed(3)})`);
  g.addColorStop(1, 'rgba(255,153,102,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  if (blend > 0.01) {
    const coolLayer = ctx.createLinearGradient(0, 0, 0, h);
    coolLayer.addColorStop(0, `rgba(157,181,210,${(0.1 * blend).toFixed(3)})`);
    coolLayer.addColorStop(0.58, `rgba(119,139,164,${(0.042 * blend).toFixed(3)})`);
    coolLayer.addColorStop(1, 'rgba(119,139,164,0)');
    ctx.fillStyle = coolLayer;
    ctx.fillRect(0, 0, w, h);

    const coneGlow = ctx.createRadialGradient(
      centerX,
      centerY - Math.min(w, h) * 0.16,
      14,
      centerX,
      centerY,
      Math.min(w, h) * 0.74
    );
    coneGlow.addColorStop(0, `rgba(208,224,246,${(0.078 * blend).toFixed(3)})`);
    coneGlow.addColorStop(0.5, `rgba(147,169,194,${(0.038 * blend).toFixed(3)})`);
    coneGlow.addColorStop(1, 'rgba(147,169,194,0)');
    ctx.fillStyle = coneGlow;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.strokeStyle = `rgba(255,255,255,${(0.06 * (1 - blend * 0.9)).toFixed(3)})`;
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    const radius = (Math.min(w, h) * 0.14) + i * (Math.min(w, h) * 0.075);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawConeGuides(ctx, state, dataset, modeBlend) {
  if (!dataset?.coneLevels?.length || modeBlend <= 0.01) return;

  const blend = easeInOutSine(modeBlend);
  const sampleCount = 56;
  const levels = dataset.coneLevels;

  levels.forEach((level, idx) => {
    const levelT = level.t ?? (levels.length <= 1 ? 1 : idx / (levels.length - 1));
    const alpha = (0.03 + levelT * 0.085) * blend;

    ctx.beginPath();
    for (let i = 0; i <= sampleCount; i++) {
      const angle = (i / sampleCount) * Math.PI * 2;
      const x3 = Math.cos(angle) * level.radius;
      const y3 = level.y3;
      const z3 = Math.sin(angle) * level.radius * 0.92;
      const projected = projectConePointFromState(state, { x3, y3, z3 });
      if (i === 0) ctx.moveTo(projected.x, projected.y);
      else ctx.lineTo(projected.x, projected.y);
    }
    ctx.strokeStyle = `rgba(191,208,230,${alpha.toFixed(3)})`;
    ctx.lineWidth = 0.8 + levelT * 0.6;
    ctx.stroke();
  });

  const config = dataset.coneConfig;
  if (!config) return;

  const sideAngles = [Math.PI * 0.06, Math.PI * 0.94];
  sideAngles.forEach(angle => {
    const top = projectConePointFromState(state, {
      x3: Math.cos(angle) * config.topRadius,
      y3: config.topY,
      z3: Math.sin(angle) * config.topRadius * 0.92
    });
    const bottom = projectConePointFromState(state, {
      x3: Math.cos(angle) * config.bottomRadius,
      y3: config.bottomY,
      z3: Math.sin(angle) * config.bottomRadius * 0.92
    });

    ctx.beginPath();
    ctx.moveTo(bottom.x, bottom.y);
    ctx.lineTo(top.x, top.y);
    ctx.strokeStyle = `rgba(191,208,230,${(0.09 * blend).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  });
}

function drawConnectionCurves(ctx, state, dataset, anchorProvider, alphaMult, activeIndex, modeBlend = 0) {
  if (!dataset || !dataset.connections.length || alphaMult <= 0.01) return;

  const preparedEdges = dataset.connections
    .map(edge => {
      const from = anchorProvider(edge.from);
      const to = anchorProvider(edge.to);
      if (!from || !to) return null;
      return {
        edge,
        from,
        to,
        depth: ((from.depth || 0) + (to.depth || 0)) * 0.5
      };
    })
    .filter(Boolean);

  if (modeBlend > 0.08) {
    preparedEdges.sort((a, b) => a.depth - b.depth);
  }

  preparedEdges.forEach(item => {
    const { edge, from, to, depth } = item;
    const midX = (from.x + to.x) * 0.5;
    const midY = (from.y + to.y) * 0.5;
    const toCenterX = state.centerX - midX;
    const toCenterY = state.centerY - midY;

    const modePull = easeInOutSine(modeBlend);
    const ctrlX = midX + toCenterX * lerp(0.24, 0.12, modePull);
    const lift = (14 + depth * 26) * modePull;
    const ctrlY = midY + toCenterY * lerp(0.24, 0.08, modePull) - lift;

    const emphasized = activeIndex == null || edge.from === activeIndex || edge.to === activeIndex;
    const alpha = (emphasized ? 0.22 + edge.weight * 0.18 : 0.05) * alphaMult * lerp(1, 0.9 + depth * 0.2, modePull);
    const width = emphasized
      ? (0.7 + edge.weight * 1.2) * lerp(1, 0.85 + depth * 0.26, modePull)
      : 0.6;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(ctrlX, ctrlY, to.x, to.y);
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    ctx.lineWidth = width;
    ctx.stroke();
  });
}

function drawParticles(ctx, state, dataset, dt, anchorProvider, alphaMult, activeIndex, modeBlend = 0) {
  if (!dataset || !dataset.particles.length || alphaMult <= 0.01) return;

  const now = state.reduced ? 0 : performance.now() * 0.001;
  const modePull = easeInOutSine(modeBlend);

  dataset.particles.forEach(p => {
    const anchor = anchorProvider(p.actorIndex);
    const actor = dataset.actors[p.actorIndex];
    if (!anchor || !actor) return;

    if (!state.reduced) {
      p.theta += p.speed * dt;
      if (p.theta > Math.PI * 2) p.theta -= Math.PI * 2;
    }

    const t = p.theta + now * p.speed * 0.25;
    const wobble = 1 + Math.sin(now * 0.65 + p.warp * 2.4) * 0.08;
    const depth = anchor.depth || 0;

    const lx = anchor.x + Math.cos(t + anchor.drift) * p.orbit * wobble;
    const ly = anchor.y + Math.sin((t * 1.08) + anchor.drift * 0.7) * p.orbit * 0.8 * wobble;

    const x2d = lx + (state.centerX - lx) * p.lane;
    const y2d = ly + (state.centerY - ly) * p.lane + Math.sin(t * 0.9 + p.warp) * (1 - p.lane) * 1.8;

    const coneOrbit = p.orbit * (0.32 + (1 - p.lane) * 0.56) * (0.84 + depth * 0.52);
    const coneX = anchor.x + Math.cos(t * 0.96 + anchor.drift * 0.78) * coneOrbit;
    const coneY = anchor.y
      + Math.sin(t * 0.68 + anchor.drift * 0.62) * coneOrbit * 0.34
      - (1 - p.lane) * (2 + depth * 7.6);

    const x = lerp(x2d, coneX, modePull);
    const y = lerp(y2d, coneY, modePull);

    const alphaBoost = activeIndex == null || activeIndex === p.actorIndex ? 1 : 0.32;
    const alpha = p.alpha * alphaBoost * alphaMult * lerp(1, 0.62 + depth * 0.52, modePull);
    const particleSize = p.size * lerp(1, 0.84 + depth * 0.54, modePull);

    ctx.fillStyle = rgbaFromHex(actor.color, alpha);
    ctx.beginPath();
    ctx.arc(x, y, particleSize, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawAnchors(ctx, state, dataset, anchorProvider, alphaMult, activeIndex, modeBlend = 0) {
  if (!dataset || alphaMult <= 0.01) return;

  const nodeScale = dataset.nodeScale || 1;
  const actorCount = dataset.actors.length;
  const dense = actorCount >= 12;
  const crowded = actorCount >= 15;
  const modePull = easeInOutSine(modeBlend);
  const drawable = dataset.actors
    .map((actor, index) => ({ actor, index, anchor: anchorProvider(index) }))
    .filter(entry => Boolean(entry.anchor));

  if (modeBlend > 0.08) {
    drawable.sort((a, b) => (a.anchor.depth || 0) - (b.anchor.depth || 0));
  }

  drawable.forEach(({ actor, index, anchor }) => {
    const depth = anchor.depth || 0;

    const reachNorm = dataset.normalizeInfluence ? dataset.normalizeInfluence(index) : dataset.normalizeReach(index);
    const isActive = activeIndex === index;
    const dimmed = activeIndex != null && !isActive;

    const haloR = (anchor.nodeRadius + (8 + nodeScale * 2.4) + Math.sin(performance.now() * 0.002 + anchor.drift) * 1.6)
      * lerp(1, 0.92 + depth * 0.2, modePull);
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, haloR, 0, Math.PI * 2);
    ctx.fillStyle = rgbaFromHex(
      actor.color,
      (isActive ? 0.22 : (dimmed ? 0.05 : 0.11)) * alphaMult * lerp(1, 0.74 + depth * 0.32, modePull)
    );
    ctx.fill();

    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, anchor.nodeRadius + 3.4, 0, Math.PI * 2);
    ctx.fillStyle = dimmed ? `rgba(255,255,255,${(0.36 * alphaMult).toFixed(3)})` : `rgba(255,255,255,${(0.86 * alphaMult).toFixed(3)})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, anchor.nodeRadius, 0, Math.PI * 2);
    ctx.fillStyle = dimmed ? `rgba(255,255,255,${(0.2 * alphaMult).toFixed(3)})` : rgbaFromHex(actor.color, alphaMult);
    ctx.fill();

    const labelOffset = 20 + reachNorm * 11 + (1 - nodeScale) * 5;
    let vx = anchor.x - state.centerX;
    let vy = (anchor.y - state.centerY) * lerp(1.08, 0.84 + (1 - depth) * 0.22, modePull);
    const vLen = Math.hypot(vx, vy) || 1;
    vx /= vLen;
    vy /= vLen;
    const tx = anchor.x + vx * labelOffset;
    const ty = anchor.y + vy * labelOffset;
    const showReach = isActive || (!dense && modeBlend < 0.62);
    const showName = isActive || !crowded || (activeIndex != null && !dimmed) || (modeBlend > 0.5 && (anchor.coneLevel || 0) > 0.8);
    const displayName = crowded && !isActive ? compactActorName(actor.name) : actor.name;
    const nameSize = clamp(9 + nodeScale * 2.6, 9, 12);

    if (!showName) return;

    ctx.font = isActive ? `700 ${(nameSize + 1.1).toFixed(1)}px Manrope` : `600 ${nameSize.toFixed(1)}px Manrope`;
    ctx.textAlign = vx < 0 ? 'right' : 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = dimmed
      ? `rgba(169,179,195,${(0.44 * alphaMult).toFixed(3)})`
      : `rgba(244,247,251,${(0.92 * alphaMult).toFixed(3)})`;
    ctx.fillText(displayName, tx, ty - (showReach ? 4 : 0));

    if (showReach) {
      ctx.font = `400 ${clamp(nameSize - 1.2, 8, 10).toFixed(1)}px "IBM Plex Mono"`;
      ctx.fillStyle = dimmed
        ? `rgba(127,138,156,${(0.5 * alphaMult).toFixed(3)})`
        : `rgba(169,179,195,${(0.86 * alphaMult).toFixed(3)})`;
      ctx.fillText(actor.reach, tx, ty + 10);
    }
  });
}

function actorGroup(role) {
  const value = role.toLowerCase();
  if (
    value.includes('regulator')
    || value.includes('protection')
    || value.includes('watchdog')
    || value.includes('institution')
    || value.includes('political')
    || value.includes('utility')
    || value.includes('civil')
    || value.includes('financial')
  ) return 'institution';
  if (value.includes('alt-media')) return 'alt';
  if (value.includes('social')) return 'social';
  if (value.includes('media') || value.includes('broadcast') || value.includes('tech')) return 'media';
  return 'social';
}

function parseReach(label) {
  const clean = String(label).trim().toUpperCase();
  const base = parseFloat(clean.replace(/[MK]/g, ''));
  if (clean.endsWith('M')) return base * 1_000_000;
  if (clean.endsWith('K')) return base * 1_000;
  return Number.isFinite(base) ? base : 0;
}

function computeNodeScale(actorCount) {
  const count = Math.max(1, actorCount);
  return clamp(Math.pow(12 / Math.max(count, 8), 0.42), 0.74, 1.18);
}

function compactActorName(name) {
  const max = 16;
  if (name.length <= max) return name;

  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const initialed = tokens.map((token, idx) => (idx < tokens.length - 1 ? `${token[0]}.` : token)).join(' ');
    if (initialed.length <= max + 2) return initialed;

    const acronym = tokens.map(token => token[0]).join('');
    if (acronym.length >= 2 && acronym.length <= 6) return acronym;
  }

  return `${name.slice(0, max - 1)}...`;
}

function strengthLabel(weight) {
  if (weight >= 0.78) return 'Strong';
  if (weight >= 0.58) return 'Medium';
  return 'Weak';
}

function strengthColor(weight) {
  if (weight >= 0.78) return 'var(--risk-red)';
  if (weight >= 0.58) return 'var(--risk-amber)';
  return 'var(--text-secondary)';
}

function hash01(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function rgbaFromHex(hex, alpha) {
  const value = hex.replace('#', '');
  const full = value.length === 3
    ? value.split('').map(ch => ch + ch).join('')
    : value;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
}

function lerp(a, b, t) {
  return a * (1 - t) + b * t;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function projectConePointFromState(state, point) {
  const extent = Math.max(1, Math.min(state.w, state.h));
  const cameraDistance = extent * 1.74;
  const depthScale = 0.9;
  const depthZ = point.z3 * depthScale;
  const denominator = Math.max(44, cameraDistance - depthZ);
  const perspective = cameraDistance / denominator;

  return {
    x: state.centerX + point.x3 * perspective,
    y: state.centerY + point.y3 * perspective,
    perspective,
    depth: clamp((depthZ / (extent * 0.54) + 1) * 0.5, 0, 1)
  };
}

function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function easeInOutQuint(t) {
  if (t < 0.5) return 16 * t * t * t * t * t;
  return 1 - Math.pow(-2 * t + 2, 5) / 2;
}

function easeInOutCubic(t) {
  if (t < 0.5) return 4 * t * t * t;
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
}
