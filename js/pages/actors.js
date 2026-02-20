/* ============================================================
   ACTORS & NETWORKS — Graph + actor detail
   ============================================================ */

import { ACTORS, CLUSTERS } from '../data.js';
import { animatePageEnter, staggerIn } from '../motion.js';
import { openSideSheet } from '../components/side-sheet.js';

export function renderActors(container) {
  container.innerHTML = `
    <div class="actors-grid">
      <!-- Network Graph (Canvas) -->
      <div class="panel" data-animate style="padding:0; overflow:hidden; position:relative;">
        <div style="position:absolute; top:var(--sp-16); left:var(--sp-16); z-index:5;">
          <span class="panel__title" style="text-shadow: 0 2px 8px rgba(0,0,0,0.5);">Network Graph</span>
        </div>
        <canvas id="actor-canvas" style="width:100%; height:100%;"></canvas>
      </div>

      <!-- Actor List -->
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
          <div style="position:relative; z-index:2;">
            <div style="font-size:var(--text-sm); color:var(--text-secondary); line-height:var(--leading-relaxed);">
              <div style="display:flex; justify-content:space-between; padding:var(--sp-8) 0; border-bottom:1px solid var(--border-subtle);">
                <span>AK Wien &harr; Kronen Zeitung</span>
                <span class="text-mono" style="font-size:var(--text-xs); color:var(--risk-red);">Strong</span>
              </div>
              <div style="display:flex; justify-content:space-between; padding:var(--sp-8) 0; border-bottom:1px solid var(--border-subtle);">
                <span>ORF Wien &harr; Der Standard</span>
                <span class="text-mono" style="font-size:var(--text-xs); color:var(--risk-amber);">Medium</span>
              </div>
              <div style="display:flex; justify-content:space-between; padding:var(--sp-8) 0; border-bottom:1px solid var(--border-subtle);">
                <span>r/Wien &harr; FB Bezirksgruppen</span>
                <span class="text-mono" style="font-size:var(--text-xs); color:var(--risk-amber);">Medium</span>
              </div>
              <div style="display:flex; justify-content:space-between; padding:var(--sp-8) 0; border-bottom:1px solid var(--border-subtle);">
                <span>Telegram &harr; Reddit</span>
                <span class="text-mono" style="font-size:var(--text-xs); color:var(--text-secondary);">Weak</span>
              </div>
              <div style="display:flex; justify-content:space-between; padding:var(--sp-8) 0;">
                <span>VKI &harr; AK Wien</span>
                <span class="text-mono" style="font-size:var(--text-xs); color:var(--risk-red);">Strong</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Render actor cards
  const list = document.getElementById('actors-list');
  ACTORS.forEach(actor => {
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
    card.addEventListener('click', () => {
      openSideSheet({
        title: actor.name,
        text: `${actor.role} mit einer Reichweite von ${actor.reach} Nutzern. Aktiv in den Clustern ${CLUSTERS.map(c => c.label).join(', ')}. Sentiment-Einfluss wird als signifikant eingestuft.`,
        type: 'Actor Detail',
        score: -0.3,
        sources: [],
        clusterColor: actor.color
      });
    });
    list.appendChild(card);
  });

  // Draw network graph canvas
  drawNetworkGraph();

  animatePageEnter(container);
  setTimeout(() => staggerIn(list, '.actor-card', 50), 300);
}

function drawNetworkGraph() {
  const canvas = document.getElementById('actor-canvas');
  if (!canvas) return;

  const dpr = Math.min(window.devicePixelRatio, 2);
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const cx = w / 2;
  const cy = h / 2;

  // Node positions (arranged in a circle)
  const nodes = ACTORS.map((actor, i) => {
    const angle = (i / ACTORS.length) * Math.PI * 2 - Math.PI / 2;
    const radius = Math.min(w, h) * 0.32;
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      actor
    };
  });

  // Connections
  const connections = [
    [0, 1], [0, 6], [1, 2], [2, 3], [4, 5], [4, 7], [5, 7], [3, 4], [1, 5], [6, 0]
  ];

  // Animated draw
  let progress = 0;
  function draw() {
    ctx.clearRect(0, 0, w, h);

    // Background gradient
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.5);
    bg.addColorStop(0, 'rgba(30, 41, 59, 0.3)');
    bg.addColorStop(1, 'transparent');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Draw connections
    connections.forEach(([a, b]) => {
      const from = nodes[a];
      const to = nodes[b];
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Pulse dot traveling along line
      const t = (Date.now() * 0.0004 + a * 0.3) % 1;
      const px = from.x + (to.x - from.x) * t;
      const py = from.y + (to.y - from.y) * t;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 140, 90, 0.4)';
      ctx.fill();
    });

    // Draw nodes
    nodes.forEach(node => {
      // Halo
      const time = Date.now() * 0.001;
      const pulseR = 20 + Math.sin(time + nodes.indexOf(node)) * 3;
      ctx.beginPath();
      ctx.arc(node.x, node.y, pulseR, 0, Math.PI * 2);
      ctx.fillStyle = node.actor.color + '0a';
      ctx.fill();

      // Node
      ctx.beginPath();
      ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = node.actor.color + '33';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = node.actor.color;
      ctx.fill();

      // Label
      ctx.font = '500 11px Inter';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.textAlign = 'center';
      ctx.fillText(node.actor.name, node.x, node.y + 22);

      ctx.font = '400 9px "JetBrains Mono"';
      ctx.fillStyle = 'rgba(148,163,184,0.6)';
      ctx.fillText(node.actor.reach, node.x, node.y + 34);
    });

    requestAnimationFrame(draw);
  }
  draw();
}
