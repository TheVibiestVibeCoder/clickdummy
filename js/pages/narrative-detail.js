/* ============================================================
   NARRATIVE DETAIL — Trajectory, evidence, actors, "what changed"
   ============================================================ */

import { CLUSTERS, EVIDENCE_EVENTS, ACTORS, getSentimentColor, getSentimentLabel, sparkPoints } from '../data.js';
import { animatePageEnter, staggerIn, animateCountUp } from '../motion.js';
import { openSubSheet } from '../components/side-sheet.js';

export function renderNarrativeDetail(container, params) {
  const cluster = CLUSTERS.find(c => c.id === parseInt(params.id));
  if (!cluster) {
    container.innerHTML = '<div class="panel"><h2>Cluster not found</h2></div>';
    return;
  }

  const avgScore = cluster.subTopics.reduce((s, t) => s + t.score, 0) / cluster.subTopics.length;
  const color = getSentimentColor(avgScore);
  const relevantActors = ACTORS.slice(0, 4);

  container.innerHTML = `
    <div class="detail-grid">
      <!-- Main Content -->
      <div class="detail-main">
        <!-- Header -->
        <div class="panel" data-animate>
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <div style="display:flex; align-items:center; gap:var(--sp-12); margin-bottom:var(--sp-8);">
                <span data-href="/narratives" style="cursor:pointer; color:var(--text-secondary); font-size:var(--text-sm);">&larr; Narratives</span>
                <span style="color:var(--text-tertiary);">/</span>
              </div>
              <h2 style="color:${cluster.color}; font-size:var(--text-xl);">${cluster.label}</h2>
              <div style="font-size:var(--text-sm); color:var(--text-secondary); margin-top:var(--sp-8); line-height:var(--leading-relaxed);">
                ${cluster.reportText}
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:var(--text-xs); color:var(--text-secondary); margin-bottom:var(--sp-4);">Cluster Score</div>
              <div style="font-size:var(--text-2xl); font-weight:700; color:${color};" id="detail-score">0</div>
            </div>
          </div>
        </div>

        <!-- Trajectory / Sub-topics -->
        <div class="panel" data-animate>
          <div class="panel__header">
            <span class="panel__title">Sub-Narratives Trajectory</span>
            <span class="panel__badge">${cluster.subTopics.length} active</span>
          </div>
          <div style="position:relative; z-index:2;">
            ${cluster.subTopics.map(sub => {
              const sColor = getSentimentColor(sub.score);
              const volBadge = sub.vol === 'high' ? 'risk-badge--red' : sub.vol === 'med' ? 'risk-badge--amber' : 'risk-badge--neutral';
              return `
              <div class="narrative-card" data-sub-id="${sub.id}">
                <div class="narrative-card__header">
                  <div style="flex:1;">
                    <div style="display:flex; align-items:center; gap:var(--sp-12);">
                      <div class="narrative-card__title">${sub.label}</div>
                      <span class="risk-badge ${volBadge}">${sub.vol.toUpperCase()}</span>
                    </div>
                    <div class="narrative-card__meta">
                      <span style="color:${sColor}; font-weight:500;">${getSentimentLabel(sub.score)} (${sub.score})</span>
                      <svg class="sparkline" viewBox="0 0 48 20"><polyline points="${sparkPoints(sub.trend)}" stroke="${sColor}" fill="none" stroke-width="1.5"/></svg>
                      <span style="font-size:var(--text-xs); color:var(--text-secondary);">${sub.sources.length} sources</span>
                    </div>
                  </div>
                  <div class="chevron-icon"></div>
                </div>
                <div class="narrative-card__details">
                  <div class="narrative-card__details-inner">
                    <div style="font-size:var(--text-sm); color:var(--text-muted); line-height:var(--leading-relaxed); margin-bottom:var(--sp-12);">
                      ${sub.explanation}
                    </div>
                    <div class="text-label" style="margin-bottom:var(--sp-8);">Micro-Narratives</div>
                    ${sub.micro.map(m => `
                      <div style="padding:var(--sp-8); background:var(--surface-muted); border:1px solid var(--border-subtle); border-radius:var(--radius-sm); margin-bottom:var(--sp-8); font-size:var(--text-sm);">
                        <div style="font-weight:500; color:var(--text-primary); margin-bottom:var(--sp-4);">${m.label}</div>
                        <div style="color:var(--text-secondary); line-height:var(--leading-relaxed);">${m.desc}</div>
                      </div>
                    `).join('')}
                    <div class="text-label" style="margin-top:var(--sp-16); margin-bottom:var(--sp-8);">Media Mix</div>
                    ${sub.sources.map(src => `
                      <div class="media-row">
                        <div class="media-logo ${src.cls}">${src.label}</div>
                        <div class="media-name">${src.name}</div>
                        <div class="media-bar-track">
                          <div class="media-bar-fill" style="background:${cluster.color}; --bar-w:${src.share}%"></div>
                        </div>
                        <div class="media-pct">${src.share}%</div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Risk Assessment -->
        <div class="panel" data-animate>
          <div class="panel__header">
            <span class="panel__title">Risk Assessment</span>
            <span class="risk-badge risk-badge--${cluster.riskLevel}">${cluster.riskLevel.toUpperCase()}</span>
          </div>
          <div style="font-size:var(--text-base); color:var(--text-muted); line-height:var(--leading-relaxed); position:relative; z-index:2;">
            ${cluster.riskText}
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="detail-sidebar">
        <!-- What Changed -->
        <div class="panel" data-animate>
          <div class="panel__header">
            <span class="panel__title">What Changed</span>
            <span class="panel__badge">24h</span>
          </div>
          <div style="position:relative; z-index:2;">
            <div style="display:flex; align-items:center; gap:var(--sp-8); padding:var(--sp-8) 0; font-size:var(--text-sm); color:var(--risk-red);">
              <span style="font-size:var(--text-lg);">&#8599;</span>
              Velocity +12% (AK Pressekonferenz)
            </div>
            <div style="display:flex; align-items:center; gap:var(--sp-8); padding:var(--sp-8) 0; font-size:var(--text-sm); color:var(--risk-amber);">
              <span style="font-size:var(--text-lg);">&#9888;</span>
              Neue Quelle: Bezirkszeitung aktiv
            </div>
            <div style="display:flex; align-items:center; gap:var(--sp-8); padding:var(--sp-8) 0; font-size:var(--text-sm); color:var(--text-secondary);">
              <span style="font-size:var(--text-lg);">&#8594;</span>
              Sentiment stabil (&#177;0.02)
            </div>
          </div>
        </div>

        <!-- Evidence Trail -->
        <div class="panel" data-animate style="flex:1;">
          <div class="panel__header">
            <span class="panel__title">Evidence Trail</span>
          </div>
          <div class="evidence-trail" style="position:relative; z-index:2;" id="evidence-trail"></div>
        </div>

        <!-- Key Actors -->
        <div class="panel" data-animate>
          <div class="panel__header">
            <span class="panel__title">Key Actors</span>
            <span class="panel__badge" style="cursor:pointer; color:var(--accent);" data-href="/actors">All &rarr;</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:var(--sp-8); position:relative; z-index:2;" id="actor-list"></div>
        </div>
      </div>
    </div>
  `;

  // Score count-up
  animateCountUp(document.getElementById('detail-score'), Math.round(avgScore * 100) / 100, 1000, avgScore > 0 ? '+' : '', '');
  setTimeout(() => {
    document.getElementById('detail-score').textContent = (avgScore > 0 ? '+' : '') + avgScore.toFixed(2);
  }, 1200);

  // Sub-topic expand
  container.querySelectorAll('.narrative-card').forEach(card => {
    card.querySelector('.chevron-icon')?.addEventListener('click', (e) => {
      e.stopPropagation();
      card.classList.toggle('is-expanded');
    });
    card.querySelector('.narrative-card__title')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const subId = card.dataset.subId;
      const sub = cluster.subTopics.find(s => s.id === subId);
      if (sub) openSubSheet(sub, cluster);
    });
  });

  // Evidence trail
  const trail = document.getElementById('evidence-trail');
  EVIDENCE_EVENTS.slice(0, 6).forEach(ev => {
    const item = document.createElement('div');
    item.className = `evidence-item ${ev.risk ? 'evidence-item--risk' : ev.amber ? 'evidence-item--amber' : ''}`;
    item.innerHTML = `
      <div class="evidence-item__time">${ev.time} &middot; ${ev.date}</div>
      <div class="evidence-item__text">${ev.text}</div>
    `;
    trail.appendChild(item);
  });

  // Actor cards
  const actorList = document.getElementById('actor-list');
  relevantActors.forEach(a => {
    const card = document.createElement('div');
    card.className = 'actor-card';
    card.innerHTML = `
      <div class="actor-card__avatar" style="background:${a.color}22; color:${a.color};">${a.initial}</div>
      <div class="actor-card__info">
        <div class="actor-card__name">${a.name}</div>
        <div class="actor-card__role">${a.role}</div>
      </div>
      <div class="actor-card__reach">${a.reach}</div>
    `;
    actorList.appendChild(card);
  });

  animatePageEnter(container);
  setTimeout(() => {
    staggerIn(trail, '.evidence-item', 60);
    staggerIn(actorList, '.actor-card', 50);
  }, 300);
}
