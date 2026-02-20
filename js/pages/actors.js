/* ============================================================
   ACTORS & NETWORKS - Smooth, logical and clickable network map
   ============================================================ */

import { ACTORS, CLUSTERS } from '../data.js';
import { animatePageEnter, staggerIn } from '../motion.js';
import { openSideSheet } from '../components/side-sheet.js';

const ACTOR_CONNECTIONS = [
  { a: 'Arbeiterkammer Wien', b: 'Kronen Zeitung', weight: 0.92 },
  { a: 'Arbeiterkammer Wien', b: 'VKI', weight: 0.87 },
  { a: 'Kronen Zeitung', b: 'ORF Wien', weight: 0.72 },
  { a: 'Der Standard', b: 'ORF Wien', weight: 0.78 },
  { a: 'r/Wien Community', b: 'FB Bezirksgruppen', weight: 0.76 },
  { a: 'Telegram Channels', b: 'r/Wien Community', weight: 0.64 },
  { a: 'Telegram Channels', b: 'FB Bezirksgruppen', weight: 0.58 },
  { a: 'Der Standard', b: 'r/Wien Community', weight: 0.46 },
  { a: 'Kronen Zeitung', b: 'FB Bezirksgruppen', weight: 0.66 },
  { a: 'VKI', b: 'Der Standard', weight: 0.62 }
];

export function renderActors(container) {
  container.innerHTML = `
    <div class="actors-grid">
      <div class="panel" data-animate style="padding:0; overflow:hidden; position:relative;">
        <div style="position:absolute; top:var(--sp-16); left:var(--sp-16); z-index:5; display:flex; flex-direction:column; gap:4px;">
          <span class="panel__title">Actor Constellation</span>
          <span id="actor-graph-meta" style="font-size:var(--text-xs); color:var(--text-secondary); font-family:var(--font-mono);">Overview: weighted influence map</span>
        </div>
        <canvas id="actor-canvas" style="width:100%; height:100%; background:radial-gradient(circle at 50% 45%, rgba(255,153,102,0.12) 0%, rgba(255,153,102,0.04) 42%, rgba(255,153,102,0) 76%);"></canvas>
      </div>

      <div style="display:flex; flex-direction:column; gap:var(--sp-16); overflow-y:auto;">
        <div class="panel" data-animate>
          <div class="panel__header">
            <span class="panel__title">Key Actors</span>
            <span class="panel__badge">${ACTORS.length} tracked</span>
          </div>
          <div id="actors-list" style="display:flex; flex-direction:column; gap:var(--sp-8); position:relative; z-index:2;"></div>
        </div>

        <div class="panel" data-animate>
          <div class="panel__header">
            <span class="panel__title">Actor Connections</span>
          </div>
          <div id="actors-connections" style="position:relative; z-index:2; font-size:var(--text-sm); color:var(--text-secondary); line-height:var(--leading-relaxed);"></div>
        </div>
      </div>
    </div>
  `;

  const metaEl = document.getElementById('actor-graph-meta');
  const canvas = document.getElementById('actor-canvas');
  const list = document.getElementById('actors-list');
  const connectionsEl = document.getElementById('actors-connections');

  const actorByName = new Map(ACTORS.map((actor, index) => [actor.name, { actor, index }]));
  const resolvedConnections = ACTOR_CONNECTIONS
    .map(link => {
      const from = actorByName.get(link.a);
      const to = actorByName.get(link.b);
      if (!from || !to) return null;
      return { from: from.index, to: to.index, weight: link.weight };
    })
    .filter(Boolean);

  const openActor = (actor, index) => {
    const linked = resolvedConnections
      .filter(edge => edge.from === index || edge.to === index)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map(edge => {
        const otherIndex = edge.from === index ? edge.to : edge.from;
        return `${ACTORS[otherIndex].name} (${strengthLabel(edge.weight)})`;
      });

    const related = linked.length ? linked.join(', ') : 'No direct connection data';

    openSideSheet({
      title: actor.name,
      text: `${actor.role} mit einer Reichweite von ${actor.reach} Nutzern. Aktiv in den Clustern ${CLUSTERS.map(c => c.label).join(', ')}. Staerkste Verbindungen: ${related}.`,
      type: 'Actor Detail',
      score: -0.2,
      sources: [],
      clusterColor: actor.color
    });
  };

  const graph = initActorConstellation({
    canvas,
    actors: ACTORS,
    connections: resolvedConnections,
    onActorClick: openActor,
    onHover: (index) => {
      if (index == null) {
        metaEl.textContent = 'Overview: weighted influence map';
        return;
      }

      const actor = ACTORS[index];
      const degree = resolvedConnections.filter(edge => edge.from === index || edge.to === index).length;
      metaEl.textContent = `${actor.name} | ${actor.reach} reach | ${degree} linked actors`;
    }
  });

  const cleanupFns = [];

  ACTORS.forEach((actor, index) => {
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
      openActor(actor, index);
    };

    card.addEventListener('mouseenter', onEnter);
    card.addEventListener('mouseleave', onLeave);
    card.addEventListener('click', onClick);

    cleanupFns.push(() => {
      card.removeEventListener('mouseenter', onEnter);
      card.removeEventListener('mouseleave', onLeave);
      card.removeEventListener('click', onClick);
    });

    list.appendChild(card);
  });

  renderConnectionsTable(connectionsEl, resolvedConnections);

  animatePageEnter(container);
  setTimeout(() => staggerIn(list, '.actor-card', 45), 260);

  return () => {
    cleanupFns.forEach(fn => fn());
    graph.destroy();
  };
}

function renderConnectionsTable(container, connections) {
  const sorted = [...connections].sort((a, b) => b.weight - a.weight).slice(0, 8);

  sorted.forEach(edge => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:var(--sp-8) 0; border-bottom:1px solid var(--border-subtle);';
    row.innerHTML = `
      <span>${ACTORS[edge.from].name} &harr; ${ACTORS[edge.to].name}</span>
      <span class="text-mono" style="font-size:var(--text-xs); color:${strengthColor(edge.weight)};">${strengthLabel(edge.weight)}</span>
    `;
    container.appendChild(row);
  });
}

function initActorConstellation({ canvas, actors, connections, onActorClick, onHover }) {
  const ctx = canvas.getContext('2d');
  const state = {
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    w: 0,
    h: 0,
    centerX: 0,
    centerY: 0,
    anchors: [],
    particles: [],
    hoverIndex: null,
    focusIndex: null,
    lockedIndex: null,
    rafId: 0,
    lastTs: performance.now(),
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  };

  const reachValues = actors.map(actor => parseReach(actor.reach));
  const minReach = Math.min(...reachValues);
  const maxReach = Math.max(...reachValues);

  const normalizeReach = (index) => {
    if (maxReach === minReach) return 0.5;
    return (reachValues[index] - minReach) / (maxReach - minReach);
  };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    state.w = rect.width;
    state.h = rect.height;
    state.centerX = state.w * 0.5;
    state.centerY = state.h * 0.54;

    canvas.width = Math.max(1, Math.floor(rect.width * state.dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * state.dpr));
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    state.anchors = buildAnchors(actors, state.w, state.h, normalizeReach);
    state.particles = buildParticles(state.anchors, normalizeReach);
  }

  function frame(ts) {
    const dt = Math.min(0.04, (ts - state.lastTs) / 1000);
    state.lastTs = ts;

    drawBackground(ctx, state);
    drawConnectionCurves(ctx, state, connections);
    drawParticles(ctx, state, dt);
    drawAnchors(ctx, state, actors, normalizeReach);

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
    let closest = null;
    let bestDistSq = Infinity;

    state.anchors.forEach((anchor, index) => {
      const dx = pos.x - anchor.x;
      const dy = pos.y - anchor.y;
      const radius = anchor.nodeRadius + 10;
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
    const hit = hitTest(pos);
    setHover(hit);
  }

  function onPointerLeave() {
    setHover(null);
  }

  function onPointerClick(event) {
    const pos = pointerPos(event);
    const hit = hitTest(pos);
    if (hit == null) {
      state.lockedIndex = null;
      state.focusIndex = null;
      return;
    }

    state.lockedIndex = hit;
    onActorClick(actors[hit], hit);
  }

  canvas.addEventListener('mousemove', onPointerMove);
  canvas.addEventListener('mouseleave', onPointerLeave);
  canvas.addEventListener('click', onPointerClick);
  window.addEventListener('resize', resize);

  resize();
  state.rafId = requestAnimationFrame(frame);

  return {
    focus(index) {
      if (state.lockedIndex != null && state.lockedIndex !== index) return;
      state.focusIndex = index;
    },
    unfocus(index) {
      if (state.lockedIndex != null) return;
      if (state.focusIndex === index) state.focusIndex = null;
    },
    lock(index) {
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

function buildAnchors(actors, w, h, normalizeReach) {
  const cx = w * 0.5;
  const cy = h * 0.54;
  const baseRadius = Math.min(w, h) * 0.34;

  const groups = {
    institution: { angle: -2.18, spread: 0.36, actors: [] },
    media: { angle: -0.34, spread: 0.34, actors: [] },
    social: { angle: 1.05, spread: 0.42, actors: [] },
    alt: { angle: 2.24, spread: 0.24, actors: [] }
  };

  actors.forEach((actor, index) => {
    const key = actorGroup(actor.role);
    groups[key].actors.push({ actor, index });
  });

  const anchors = new Array(actors.length);

  Object.values(groups).forEach(group => {
    group.actors
      .sort((a, b) => parseReach(b.actor.reach) - parseReach(a.actor.reach))
      .forEach((entry, localIdx, arr) => {
        const t = arr.length === 1 ? 0 : (localIdx / (arr.length - 1)) - 0.5;
        const angle = group.angle + t * group.spread;
        const reachNorm = normalizeReach(entry.index);
        const radius = baseRadius * (0.84 + reachNorm * 0.24);

        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius * 0.86;

        anchors[entry.index] = {
          x,
          y,
          angle,
          ringRadius: 30 + reachNorm * 34,
          nodeRadius: 5 + reachNorm * 6,
          drift: (entry.index + 1) * 0.6
        };
      });
  });

  return anchors;
}

function buildParticles(anchors, normalizeReach) {
  const particles = [];

  anchors.forEach((anchor, actorIndex) => {
    const reachNorm = normalizeReach(actorIndex);
    const count = 260 + Math.round(reachNorm * 220);

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

function drawBackground(ctx, state) {
  const { w, h, centerX, centerY } = state;
  ctx.clearRect(0, 0, w, h);

  const g = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, Math.min(w, h) * 0.62);
  g.addColorStop(0, 'rgba(255,153,102,0.13)');
  g.addColorStop(0.45, 'rgba(255,153,102,0.05)');
  g.addColorStop(1, 'rgba(255,153,102,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    const radius = (Math.min(w, h) * 0.14) + i * (Math.min(w, h) * 0.075);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawConnectionCurves(ctx, state, connections) {
  const activeIndex = state.lockedIndex ?? state.focusIndex ?? state.hoverIndex;

  connections.forEach(edge => {
    const from = state.anchors[edge.from];
    const to = state.anchors[edge.to];

    const midX = (from.x + to.x) * 0.5;
    const midY = (from.y + to.y) * 0.5;
    const toCenterX = state.centerX - midX;
    const toCenterY = state.centerY - midY;

    const ctrlX = midX + toCenterX * 0.24;
    const ctrlY = midY + toCenterY * 0.24;

    const emphasized = activeIndex == null || edge.from === activeIndex || edge.to === activeIndex;
    const alpha = emphasized ? 0.22 + edge.weight * 0.18 : 0.05;
    const width = emphasized ? 0.7 + edge.weight * 1.2 : 0.6;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(ctrlX, ctrlY, to.x, to.y);
    ctx.strokeStyle = `rgba(255,255,255,${(alpha * 0.75).toFixed(3)})`;
    ctx.lineWidth = width;
    ctx.stroke();
  });
}

function drawParticles(ctx, state, dt) {
  const activeIndex = state.lockedIndex ?? state.focusIndex ?? state.hoverIndex;
  const now = state.reduced ? 0 : performance.now() * 0.001;

  state.particles.forEach(p => {
    const anchor = state.anchors[p.actorIndex];
    const actor = ACTORS[p.actorIndex];

    if (!state.reduced) {
      p.theta += p.speed * dt;
      if (p.theta > Math.PI * 2) p.theta -= Math.PI * 2;
    }

    const t = p.theta + now * p.speed * 0.25;
    const wobble = 1 + Math.sin(now * 0.65 + p.warp * 2.4) * 0.08;

    const lx = anchor.x + Math.cos(t + anchor.drift) * p.orbit * wobble;
    const ly = anchor.y + Math.sin((t * 1.08) + anchor.drift * 0.7) * p.orbit * 0.8 * wobble;

    const x = lx + (state.centerX - lx) * p.lane;
    const y = ly + (state.centerY - ly) * p.lane + Math.sin(t * 0.9 + p.warp) * (1 - p.lane) * 1.8;

    const alphaBoost = activeIndex == null || activeIndex === p.actorIndex ? 1 : 0.32;
    const alpha = p.alpha * alphaBoost;

    ctx.fillStyle = rgbaFromHex(actor.color, alpha);
    ctx.beginPath();
    ctx.arc(x, y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawAnchors(ctx, state, actors, normalizeReach) {
  const activeIndex = state.lockedIndex ?? state.focusIndex ?? state.hoverIndex;

  state.anchors.forEach((anchor, index) => {
    const actor = actors[index];
    const reachNorm = normalizeReach(index);
    const isActive = activeIndex === index;
    const dimmed = activeIndex != null && !isActive;

    const haloR = anchor.nodeRadius + 10 + Math.sin(performance.now() * 0.002 + anchor.drift) * 1.6;
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, haloR, 0, Math.PI * 2);
    ctx.fillStyle = rgbaFromHex(actor.color, isActive ? 0.22 : (dimmed ? 0.05 : 0.11));
    ctx.fill();

    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, anchor.nodeRadius + 3.4, 0, Math.PI * 2);
    ctx.fillStyle = dimmed ? 'rgba(255,255,255,0.36)' : 'rgba(255,255,255,0.86)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, anchor.nodeRadius, 0, Math.PI * 2);
    ctx.fillStyle = dimmed ? 'rgba(255,255,255,0.2)' : actor.color;
    ctx.fill();

    const tx = anchor.x + Math.cos(anchor.angle) * (24 + reachNorm * 12);
    const ty = anchor.y + Math.sin(anchor.angle) * (24 + reachNorm * 12);

    ctx.font = isActive ? '700 12px Manrope' : '600 11px Manrope';
    ctx.textAlign = tx < anchor.x ? 'right' : 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = dimmed ? 'rgba(169,179,195,0.44)' : 'rgba(244,247,251,0.92)';
    ctx.fillText(actor.name, tx, ty - 4);

    ctx.font = '400 10px "IBM Plex Mono"';
    ctx.fillStyle = dimmed ? 'rgba(127,138,156,0.5)' : 'rgba(169,179,195,0.86)';
    ctx.fillText(actor.reach, tx, ty + 10);
  });
}

function actorGroup(role) {
  const value = role.toLowerCase();
  if (value.includes('regulator') || value.includes('protection') || value.includes('watchdog')) return 'institution';
  if (value.includes('alt-media')) return 'alt';
  if (value.includes('social')) return 'social';
  if (value.includes('media') || value.includes('broadcast')) return 'media';
  return 'social';
}

function parseReach(label) {
  const clean = String(label).trim().toUpperCase();
  const base = parseFloat(clean.replace(/[MK]/g, ''));
  if (clean.endsWith('M')) return base * 1_000_000;
  if (clean.endsWith('K')) return base * 1_000;
  return Number.isFinite(base) ? base : 0;
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
