/* ============================================================
   SETTINGS — Data sources, EU hosting, compliance status
   ============================================================ */

import { DATA_SOURCES } from '../data.js';
import { animatePageEnter, staggerIn, showToast } from '../motion.js';

export function renderSettings(container) {
  container.innerHTML = `
    <div style="max-width:900px;">
      <div style="margin-bottom:var(--sp-32);">
        <h2 style="font-size:var(--text-xl);">Settings & Data Sources</h2>
        <p style="font-size:var(--text-sm); color:var(--text-secondary); margin-top:var(--sp-4);">EU-sovereign hosting, source configuration, and compliance settings</p>
      </div>

      <!-- Compliance Panel -->
      <div class="panel" data-animate style="margin-bottom:var(--sp-24);">
        <div class="panel__header">
          <span class="panel__title">Compliance & Sovereignty</span>
          <span class="risk-badge risk-badge--neutral" style="background:var(--sentiment-pos-dim); color:var(--sentiment-pos);">EU COMPLIANT</span>
        </div>
        <div class="settings-grid" style="position:relative; z-index:2;">
          <div class="settings-row">
            <div>
              <div class="settings-row__label">Data Residency</div>
              <div class="settings-row__desc">All data stored within EU jurisdiction</div>
            </div>
            <div class="settings-status">
              <span class="settings-status__dot settings-status__dot--ok"></span>
              <span style="color:var(--sentiment-pos);">EU-West / EU-Central</span>
            </div>
          </div>
          <div class="settings-row">
            <div>
              <div class="settings-row__label">GDPR Compliance</div>
              <div class="settings-row__desc">Data processing compliant with GDPR Art. 6(1)(f)</div>
            </div>
            <div class="settings-status">
              <span class="settings-status__dot settings-status__dot--ok"></span>
              <span style="color:var(--sentiment-pos);">Verified</span>
            </div>
          </div>
          <div class="settings-row">
            <div>
              <div class="settings-row__label">Encryption</div>
              <div class="settings-row__desc">AES-256 at rest, TLS 1.3 in transit</div>
            </div>
            <div class="settings-status">
              <span class="settings-status__dot settings-status__dot--ok"></span>
              <span style="color:var(--sentiment-pos);">Active</span>
            </div>
          </div>
          <div class="settings-row">
            <div>
              <div class="settings-row__label">Audit Logging</div>
              <div class="settings-row__desc">All access and actions are logged with timestamps</div>
            </div>
            <div class="settings-status">
              <span class="settings-status__dot settings-status__dot--ok"></span>
              <span style="color:var(--sentiment-pos);">Enabled</span>
            </div>
          </div>
          <div class="settings-row" style="border:none;">
            <div>
              <div class="settings-row__label">Data Retention</div>
              <div class="settings-row__desc">Automatic purge after 90 days (configurable)</div>
            </div>
            <div class="settings-status">
              <span class="settings-status__dot settings-status__dot--ok"></span>
              <span>90 days</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Sources -->
      <div class="panel" data-animate style="margin-bottom:var(--sp-24);">
        <div class="panel__header">
          <span class="panel__title">Data Sources</span>
          <span class="panel__badge">${DATA_SOURCES.length} connected</span>
        </div>
        <div id="sources-list" style="position:relative; z-index:2;"></div>
      </div>

      <!-- NLP & Processing -->
      <div class="panel" data-animate style="margin-bottom:var(--sp-24);">
        <div class="panel__header">
          <span class="panel__title">NLP & Processing Pipeline</span>
        </div>
        <div class="settings-grid" style="position:relative; z-index:2;">
          <div class="settings-row">
            <div>
              <div class="settings-row__label">Language Models</div>
              <div class="settings-row__desc">Multilingual NLP (DE, EN) on EU infrastructure</div>
            </div>
            <div class="settings-status">
              <span class="settings-status__dot settings-status__dot--ok"></span>
              <span>v3.2 Active</span>
            </div>
          </div>
          <div class="settings-row">
            <div>
              <div class="settings-row__label">Sentiment Engine</div>
              <div class="settings-row__desc">Domain-adapted energy sector model</div>
            </div>
            <div class="settings-status">
              <span class="settings-status__dot settings-status__dot--ok"></span>
              <span style="color:var(--sentiment-pos);">98.2% accuracy</span>
            </div>
          </div>
          <div class="settings-row">
            <div>
              <div class="settings-row__label">Cluster Detection</div>
              <div class="settings-row__desc">Dynamic narrative clustering with topic drift detection</div>
            </div>
            <div class="settings-status">
              <span class="settings-status__dot settings-status__dot--ok"></span>
              <span>Real-time</span>
            </div>
          </div>
          <div class="settings-row" style="border:none;">
            <div>
              <div class="settings-row__label">Risk Scoring</div>
              <div class="settings-row__desc">Composite NRI based on Velocity, Proximity, Sentiment Accel.</div>
            </div>
            <div class="settings-status">
              <span class="settings-status__dot settings-status__dot--ok"></span>
              <span>Calibrated</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Access & Team -->
      <div class="panel" data-animate>
        <div class="panel__header">
          <span class="panel__title">Access & Team</span>
        </div>
        <div class="settings-grid" style="position:relative; z-index:2;">
          <div class="settings-row">
            <div>
              <div class="settings-row__label">SSO / SAML Integration</div>
              <div class="settings-row__desc">Enterprise SSO with role-based access control</div>
            </div>
            <button class="btn btn--ghost btn--sm" onclick="return false;">Configure</button>
          </div>
          <div class="settings-row">
            <div>
              <div class="settings-row__label">API Access</div>
              <div class="settings-row__desc">REST API for integration with existing BI tools</div>
            </div>
            <button class="btn btn--ghost btn--sm" onclick="return false;">Manage Keys</button>
          </div>
          <div class="settings-row" style="border:none;">
            <div>
              <div class="settings-row__label">Webhook Notifications</div>
              <div class="settings-row__desc">Real-time alerts to Slack, Teams, or custom endpoint</div>
            </div>
            <div class="settings-status">
              <span class="settings-status__dot settings-status__dot--warn"></span>
              <span style="color:var(--risk-amber);">Not configured</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Data sources list
  const list = document.getElementById('sources-list');
  DATA_SOURCES.forEach(src => {
    const row = document.createElement('div');
    row.className = 'settings-row';
    row.innerHTML = `
      <div style="flex:1;">
        <div class="settings-row__label">${src.name}</div>
        <div class="settings-row__desc">${src.region} &middot; Latency: ${src.latency}</div>
      </div>
      <div style="display:flex; align-items:center; gap:var(--sp-16);">
        <span style="font-size:var(--text-xs); color:var(--text-secondary);">Sync: ${src.lastSync}</span>
        <div class="settings-status">
          <span class="settings-status__dot settings-status__dot--${src.status}"></span>
          <span style="color:${src.status === 'ok' ? 'var(--sentiment-pos)' : 'var(--risk-amber)'};">${src.status === 'ok' ? 'Connected' : 'Degraded'}</span>
        </div>
      </div>
    `;
    list.appendChild(row);
  });

  animatePageEnter(container);
}
