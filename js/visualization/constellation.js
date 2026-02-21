/* ============================================================
   CONSTELLATION MAP — "Nebula Intelligence" Premium Redesign

   Luminous core nodes, orbital particle clouds, flowing bezier
   connections with traveling light pulses, cinematic zoom,
   mouse parallax, entrance animation.
   ============================================================ */

import { CLUSTERS, getClusterAvgScore, getSentimentColor, sparkPoints } from '../data.js';
import { openClusterSheet, openSubSheet, openMicroSheet } from '../components/side-sheet.js';

/* ─── State ──────────────────────────────────────────────── */

let scene, camera, renderer, particlesMesh;
let hudCanvas, hudCtx;
let width, height;
let targetZoom = 1.0, currentZoom = 1.0;
let panX = 0, panY = 0, isDragging = false, lastMouseX = 0, lastMouseY = 0;
let lastTouchDist = 0;
let hitRegions = [];
let animFrame = null;

// Parallax
let mouseTargetX = 0, mouseTargetY = 0;
let mouseNormX = 0, mouseNormY = 0;

// Entrance
let initTime = 0;

const PARTICLE_COUNT = 2000;
const particleData = [];

let container, canvasGL, canvasHUD, interactionLayer;
let zoomSlider, zoomValue, zoomReadout;

/* ─── Initialization ─────────────────────────────────────── */

export function initConstellation(containerEl) {
  container = containerEl;

  container.innerHTML = `
    <div class="viz-controls">
      <div style="display:flex; align-items:center; gap:var(--sp-12);">
        <span class="panel__title">Constellation Map</span>
        <div class="pill-group">
          <button class="pill is-active" id="btn-graph">Graph</button>
          <button class="pill" id="btn-list">Liste</button>
        </div>
      </div>
      <div class="zoom-strip">
        <span class="zoom-strip__label" id="zoom-readout">Macro</span>
        <button class="zoom-strip__btn" id="zoom-out">&minus;</button>
        <input type="range" id="zoom-slider" min="0.5" max="3.5" step="0.01" value="1.0" />
        <button class="zoom-strip__btn" id="zoom-in">+</button>
        <span class="zoom-strip__value" id="zoom-value">1.0x</span>
      </div>
    </div>

    <div id="graph-layer" style="position:absolute; inset:0; top:48px;">
      <canvas id="webgl-canvas" style="position:absolute;inset:0;width:100%;height:100%;z-index:1;"></canvas>
      <canvas id="hud-canvas" style="position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none;"></canvas>
      <div id="interaction-layer" style="position:absolute;inset:0;z-index:3;cursor:grab;"></div>
    </div>

    <div id="list-layer" class="list-layer" style="position:absolute; inset:0; top:48px; opacity:0; pointer-events:none; z-index:0; overflow-y:auto; padding:var(--sp-16); background:rgba(8,10,13,0.9);"></div>
  `;

  canvasGL = container.querySelector('#webgl-canvas');
  canvasHUD = container.querySelector('#hud-canvas');
  interactionLayer = container.querySelector('#interaction-layer');
  zoomSlider = container.querySelector('#zoom-slider');
  zoomValue = container.querySelector('#zoom-value');
  zoomReadout = container.querySelector('#zoom-readout');

  const btnGraph = container.querySelector('#btn-graph');
  const btnList = container.querySelector('#btn-list');
  const graphLayer = container.querySelector('#graph-layer');
  const listLayer = container.querySelector('#list-layer');
  const zoomStripEl = container.querySelector('.zoom-strip');

  btnGraph.addEventListener('click', () => {
    btnGraph.classList.add('is-active');
    btnList.classList.remove('is-active');
    graphLayer.style.opacity = '1';
    graphLayer.style.pointerEvents = 'auto';
    listLayer.style.opacity = '0';
    listLayer.style.pointerEvents = 'none';
    if (zoomStripEl) zoomStripEl.style.display = '';
    onResize();
  });

  btnList.addEventListener('click', () => {
    btnList.classList.add('is-active');
    btnGraph.classList.remove('is-active');
    graphLayer.style.opacity = '0';
    graphLayer.style.pointerEvents = 'none';
    listLayer.style.opacity = '1';
    listLayer.style.pointerEvents = 'auto';
    if (zoomStripEl) zoomStripEl.style.display = 'none';
    renderListView(listLayer);
  });

  if (typeof THREE === 'undefined') {
    zoomReadout.textContent = '3D Engine Offline';
    return destroyConstellation;
  }

  try {
    width = container.clientWidth;
    height = container.clientHeight - 48;
    initTime = Date.now() * 0.001;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050607, 0.005);

    camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.z = 90;

    renderer = new THREE.WebGLRenderer({ canvas: canvasGL, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x050607, 1);

    hudCanvas = canvasHUD;
    hudCtx = hudCanvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio, 2);
    hudCanvas.width = width * dpr;
    hudCanvas.height = height * dpr;
    hudCanvas.style.width = width + 'px';
    hudCanvas.style.height = height + 'px';
    hudCtx.scale(dpr, dpr);

    generateParticles();
    setupInteraction();

    zoomSlider.addEventListener('input', () => {
      targetZoom = parseFloat(zoomSlider.value);
      updateReadout();
    });
    container.querySelector('#zoom-in').addEventListener('click', () => adjustZoom(0.15));
    container.querySelector('#zoom-out').addEventListener('click', () => adjustZoom(-0.15));

    window.addEventListener('resize', onResize);
    animate();
  } catch (e) {
    console.error('Constellation init failed:', e);
  }

  return destroyConstellation;
}

/* ─── Particle System ────────────────────────────────────── */

function generateParticles() {
  const geometry = new THREE.BufferGeometry();
  const positions = [], colors = [], sizes = [], phases = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const cIdx = i % CLUSTERS.length;
    const c = CLUSTERS[cIdx];
    const sIdx = Math.floor(Math.random() * c.subTopics.length);
    const s = c.subTopics[sIdx];
    const mIdx = Math.floor(Math.random() * s.micro.length);
    const m = s.micro[mIdx];

    const l1 = sphericalOffset(20);
    const l2 = sphericalOffset(8);
    const l3 = sphericalOffset(3.5);

    // Per-particle motion parameters
    const orbitSpeed = (0.02 + Math.random() * 0.06) * (Math.random() > 0.5 ? 1 : -1);
    const driftSpeed = 0.12 + Math.random() * 0.18;
    const driftAmp = 0.3 + Math.random() * 0.5;
    const phase = Math.random() * Math.PI * 2;

    particleData.push({
      cIdx, sIdx, mIdx,
      l1x: l1.x, l1y: l1.y, l1z: l1.z,
      l2x: l2.x, l2y: l2.y, l2z: l2.z,
      l3x: l3.x, l3y: l3.y, l3z: l3.z,
      c, s, m,
      orbitSpeed, driftSpeed, driftAmp, phase
    });

    // Start at cluster center for entrance animation
    positions.push(c.x, c.y, 0);

    // Color: cluster tint blended toward cool off-white
    const col = new THREE.Color(c.color);
    const neutrality = 0.5 + Math.random() * 0.35;
    col.lerp(new THREE.Color(0xe0e6ef), neutrality);
    colors.push(col.r, col.g, col.b);

    // Weighted size distribution: 65% small, 27% medium, 8% large
    const r = Math.random();
    let sz;
    if (r < 0.65) sz = 0.25 + Math.random() * 0.35;
    else if (r < 0.92) sz = 0.6 + Math.random() * 0.5;
    else sz = 1.1 + Math.random() * 0.9;
    sizes.push(sz);

    phases.push(phase);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      pointTexture: { value: createGlowTexture() },
      uTime: { value: 0 }
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      attribute float phase;
      uniform float uTime;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vColor = color;
        float breathe = 0.80 + 0.20 * sin(uTime * 0.55 + phase);
        vAlpha = breathe;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * breathe * (520.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D pointTexture;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec4 tex = texture2D(pointTexture, gl_PointCoord);
        gl_FragColor = vec4(vColor, vAlpha * 0.72) * tex;
      }
    `,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    transparent: true
  });

  particlesMesh = new THREE.Points(geometry, material);
  scene.add(particlesMesh);
}

function createGlowTexture() {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  const h = size / 2;
  const g = ctx.createRadialGradient(h, h, 0, h, h, h);
  g.addColorStop(0, 'rgba(255,255,255,1.0)');
  g.addColorStop(0.06, 'rgba(255,255,255,0.72)');
  g.addColorStop(0.15, 'rgba(255,255,255,0.32)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.09)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.02)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

function sphericalOffset(scale) {
  const u = Math.random(), v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.pow(Math.random(), 1.5) * scale;
  return {
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.sin(phi) * Math.sin(theta),
    z: r * Math.cos(phi)
  };
}

/* ─── Interaction ────────────────────────────────────────── */

function setupInteraction() {
  let startX, startY;

  interactionLayer.addEventListener('mousedown', e => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    startX = e.clientX;
    startY = e.clientY;
    interactionLayer.style.cursor = 'grabbing';
  });

  window.addEventListener('mouseup', e => {
    const wasDragging = isDragging;
    isDragging = false;
    interactionLayer.style.cursor = 'grab';
    if (wasDragging && e.target === interactionLayer) {
      const dist = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));
      if (dist < 5) {
        const rect = interactionLayer.getBoundingClientRect();
        checkClick(e.clientX - rect.left, e.clientY - rect.top);
      }
    }
  });

  window.addEventListener('mousemove', e => {
    // Track mouse for parallax
    const rect = interactionLayer.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      mouseTargetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseTargetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    }

    if (!isDragging) {
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      let hit = false;
      for (const r of hitRegions) {
        if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) { hit = true; break; }
      }
      interactionLayer.style.cursor = hit ? 'pointer' : 'grab';
      return;
    }
    panX -= (e.clientX - lastMouseX) * 0.06;
    panY -= (e.clientY - lastMouseY) * 0.06;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });

  // Touch
  interactionLayer.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      isDragging = true;
      lastMouseX = e.touches[0].clientX;
      lastMouseY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist = Math.sqrt(dx * dx + dy * dy);
    }
  }, { passive: false });

  interactionLayer.addEventListener('touchmove', e => {
    if (e.target === interactionLayer) e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      panX -= (e.touches[0].clientX - lastMouseX) * 0.2;
      panY -= (e.touches[0].clientY - lastMouseY) * 0.2;
      lastMouseX = e.touches[0].clientX;
      lastMouseY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastTouchDist > 0) {
        targetZoom += (dist - lastTouchDist) * 0.01;
        targetZoom = Math.max(0.5, Math.min(3.5, targetZoom));
        zoomSlider.value = targetZoom;
        updateReadout();
      }
      lastTouchDist = dist;
    }
  }, { passive: false });

  interactionLayer.addEventListener('touchend', () => { isDragging = false; lastTouchDist = 0; });

  interactionLayer.addEventListener('wheel', e => {
    e.preventDefault();
    targetZoom += (e.deltaY * -0.0008);
    targetZoom = Math.max(0.5, Math.min(3.5, targetZoom));
    zoomSlider.value = targetZoom;
    updateReadout();
  }, { passive: false });
}

function checkClick(mx, my) {
  for (let i = hitRegions.length - 1; i >= 0; i--) {
    const r = hitRegions[i];
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
      r.action();
      return;
    }
  }
}

function adjustZoom(d) {
  targetZoom = Math.max(0.5, Math.min(3.5, targetZoom + d));
  zoomSlider.value = targetZoom;
  updateReadout();
}

function updateReadout() {
  zoomValue.textContent = targetZoom.toFixed(1) + 'x';
  zoomReadout.textContent = targetZoom < 1.3 ? 'Macro' : (targetZoom < 2.3 ? 'Sub-Cluster' : 'Micro');
}

/* ─── Helpers ────────────────────────────────────────────── */

function lerp(a, b, t) { return a * (1 - t) + b * t; }

function hexToRGBA(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function quadBezierPt(t, x0, y0, cx, cy, x1, y1) {
  const mt = 1 - t;
  return {
    x: mt * mt * x0 + 2 * mt * t * cx + t * t * x1,
    y: mt * mt * y0 + 2 * mt * t * cy + t * t * y1
  };
}

function project(x, y, z) {
  const v = new THREE.Vector3(x, y, z);
  v.project(camera);
  return {
    x: (v.x * 0.5 + 0.5) * width,
    y: (-(v.y * 0.5) + 0.5) * height,
    z: v.z
  };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ─── Animation Loop ─────────────────────────────────────── */

function animate() {
  animFrame = requestAnimationFrame(animate);

  const time = Date.now() * 0.001;
  const elapsed = time - initTime;

  // Entrance: quartic ease-out over 2.5s
  const entrance = Math.min(1, elapsed / 2.5);
  const ent = 1 - Math.pow(1 - entrance, 4);

  // Smooth zoom (cinematic)
  currentZoom += (targetZoom - currentZoom) * 0.10;

  // Mouse parallax (gentle follow)
  mouseNormX += (mouseTargetX - mouseNormX) * 0.03;
  mouseNormY += (mouseTargetY - mouseNormY) * 0.03;
  const parallax = 1.5;

  // Camera with parallax
  camera.position.x += (panX + mouseNormX * parallax - camera.position.x) * 0.08;
  camera.position.y += (-panY - mouseNormY * parallax - camera.position.y) * 0.08;
  camera.position.z += ((110 / currentZoom) - camera.position.z) * 0.10;

  if (particlesMesh) {
    particlesMesh.rotation.y = Math.sin(time * 0.08) * 0.04;
    particlesMesh.material.uniforms.uTime.value = time;
  }

  // Zoom interpolation factors
  let s1 = (currentZoom - 1.2) / 0.6;
  s1 = Math.max(0, Math.min(1, s1));
  s1 = s1 < 0.5 ? 2 * s1 * s1 : 1 - Math.pow(-2 * s1 + 2, 2) / 2;

  let s2 = (currentZoom - 2.2) / 0.6;
  s2 = Math.max(0, Math.min(1, s2));
  s2 = s2 < 0.5 ? 2 * s2 * s2 : 1 - Math.pow(-2 * s2 + 2, 2) / 2;

  // Update particle positions with orbital motion + drift
  const pos = particlesMesh.geometry.attributes.position.array;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = particleData[i];

    // Orbital rotation (XZ plane)
    const orbA = time * p.orbitSpeed;
    const cosA = Math.cos(orbA);
    const sinA = Math.sin(orbA);

    // Organic drift
    const dt = time * p.driftSpeed;
    const dX = Math.sin(dt + p.phase) * p.driftAmp;
    const dY = Math.cos(dt * 0.7 + p.phase * 1.3) * p.driftAmp;
    const dZ = Math.sin(dt * 0.5 + p.phase * 2.1) * p.driftAmp * 0.3;

    // Level 1: cluster cloud (with orbital rotation + drift, scaled by entrance)
    const r1x = p.l1x * cosA - p.l1z * sinA;
    const r1z = p.l1x * sinA + p.l1z * cosA;
    const l1X = p.c.x + (r1x + dX) * ent;
    const l1Y = p.c.y + (p.l1y + dY) * ent;
    const l1Z = (r1z + dZ) * ent;

    // Level 2: sub-topic cloud
    const r2x = p.l2x * cosA - p.l2z * sinA;
    const r2z = p.l2x * sinA + p.l2z * cosA;
    const l2X = p.c.x + p.s.offX + r2x + dX * 0.5;
    const l2Y = p.c.y + p.s.offY + p.l2y + dY * 0.5;
    const l2Z = r2z + dZ * 0.5;

    // Level 3: micro cloud
    const l3X = p.c.x + p.s.offX + p.m.offX + p.l3x + dX * 0.3;
    const l3Y = p.c.y + p.s.offY + p.m.offY + p.l3y + dY * 0.3;
    const l3Z = p.l3z + dZ * 0.3;

    // Arc motion during transitions
    const arc1 = Math.sin(s1 * Math.PI) * 3;
    const arc2 = Math.sin(s2 * Math.PI) * 1.5;

    let cx = lerp(l1X, l2X, s1);
    let cy = lerp(l1Y, l2Y, s1);
    let cz = lerp(l1Z, l2Z, s1) + arc1;

    if (s2 > 0) {
      cx = lerp(cx, l3X, s2);
      cy = lerp(cy, l3Y, s2);
      cz = lerp(cz, l3Z, s2) + arc2;
    }

    pos[i * 3] = cx;
    pos[i * 3 + 1] = cy;
    pos[i * 3 + 2] = cz;
  }
  particlesMesh.geometry.attributes.position.needsUpdate = true;

  renderer.render(scene, camera);
  drawHUD(s1, s2, time, ent);
}

/* ─── HUD Rendering ──────────────────────────────────────── */

function drawHUD(s1, s2, time, ent) {
  hudCtx.clearRect(0, 0, width, height);
  hitRegions = [];

  // ── Deep vignette ──
  const vg = hudCtx.createRadialGradient(
    width / 2, height / 2, width * 0.12,
    width / 2, height / 2, width * 0.72
  );
  vg.addColorStop(0, 'transparent');
  vg.addColorStop(1, 'rgba(5, 6, 7, 0.6)');
  hudCtx.fillStyle = vg;
  hudCtx.fillRect(0, 0, width, height);

  // ── Subtle center warmth ──
  const hazeR = Math.max(width, height) * 0.35;
  const haze = hudCtx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, hazeR);
  haze.addColorStop(0, 'rgba(255, 153, 102, 0.012)');
  haze.addColorStop(0.5, 'rgba(255, 153, 102, 0.004)');
  haze.addColorStop(1, 'transparent');
  hudCtx.fillStyle = haze;
  hudCtx.fillRect(0, 0, width, height);

  // ── Clusters ──
  CLUSTERS.forEach((c, ci) => {
    const cp = project(c.x, c.y, 0);
    if (cp.z > 1 || cp.z < -1) return;
    const sx = cp.x, sy = cp.y;

    const breathe = 1.0 + Math.sin(time * 0.7 + ci * 2.1) * 0.1;
    const nodeVis = ent * (s1 < 1 ? (1 - s1 * 0.25) : 0.75);

    // ── Core Node: outer nebula glow ──
    const outerR = 60 * breathe;
    hudCtx.globalAlpha = nodeVis * 0.14;
    const outerGlow = hudCtx.createRadialGradient(sx, sy, 0, sx, sy, outerR);
    outerGlow.addColorStop(0, hexToRGBA(c.color, 0.35));
    outerGlow.addColorStop(0.35, hexToRGBA(c.color, 0.08));
    outerGlow.addColorStop(1, 'transparent');
    hudCtx.fillStyle = outerGlow;
    hudCtx.beginPath();
    hudCtx.arc(sx, sy, outerR, 0, Math.PI * 2);
    hudCtx.fill();

    // ── Core Node: inner star ──
    const innerR = 14 * breathe;
    hudCtx.globalAlpha = nodeVis * 0.55;
    const innerGlow = hudCtx.createRadialGradient(sx, sy, 0, sx, sy, innerR);
    innerGlow.addColorStop(0, 'rgba(255,255,255,0.92)');
    innerGlow.addColorStop(0.2, hexToRGBA(c.color, 0.5));
    innerGlow.addColorStop(1, 'transparent');
    hudCtx.fillStyle = innerGlow;
    hudCtx.beginPath();
    hudCtx.arc(sx, sy, innerR, 0, Math.PI * 2);
    hudCtx.fill();

    // ── Core Node: crisp center dot ──
    hudCtx.globalAlpha = nodeVis * 0.92;
    hudCtx.fillStyle = '#ffffff';
    hudCtx.beginPath();
    hudCtx.arc(sx, sy, 2.5 * breathe, 0, Math.PI * 2);
    hudCtx.fill();

    // ── Orbit ring (visible during zoom into sub-topics) ──
    if (s1 > 0.05) {
      const avgDist = c.subTopics.reduce((sum, sub) => {
        const sp = project(c.x + sub.offX, c.y + sub.offY, 0);
        return sum + Math.sqrt((sp.x - sx) ** 2 + (sp.y - sy) ** 2);
      }, 0) / c.subTopics.length;

      hudCtx.globalAlpha = s1 * 0.05 * ent;
      hudCtx.strokeStyle = hexToRGBA(c.color, 0.5);
      hudCtx.lineWidth = 0.5;
      hudCtx.beginPath();
      hudCtx.arc(sx, sy, avgDist, 0, Math.PI * 2);
      hudCtx.stroke();
    }

    // ── Cluster labels (Macro level) ──
    if (s1 < 1.0) {
      const la = (1 - s1) * ent;
      hudCtx.globalAlpha = la;

      hudCtx.font = '650 14px "Sora", sans-serif';
      hudCtx.textAlign = 'center';
      hudCtx.fillStyle = c.color;
      hudCtx.fillText(c.label, sx, sy - 32);

      // Score + risk dot
      const avgScore = getClusterAvgScore(c);
      const scoreStr = `${avgScore > 0 ? '+' : ''}${avgScore}`;
      hudCtx.font = '400 10px "IBM Plex Mono", monospace';
      const scoreW = hudCtx.measureText(scoreStr).width;

      // Risk dot
      const riskColor = c.riskLevel === 'red' ? '#ef4444' : c.riskLevel === 'amber' ? '#f59e0b' : '#94a3b8';
      hudCtx.fillStyle = riskColor;
      hudCtx.beginPath();
      hudCtx.arc(sx - scoreW / 2 - 8, sy - 20, 2.5, 0, Math.PI * 2);
      hudCtx.fill();

      // Score text
      hudCtx.fillStyle = 'rgba(148, 163, 184, 0.65)';
      hudCtx.fillText(scoreStr, sx, sy - 17);

      // Hit region
      hudCtx.font = '650 14px "Sora", sans-serif';
      const nameW = hudCtx.measureText(c.label).width;
      hitRegions.push({
        x: sx - nameW / 2 - 12, y: sy - 46, w: nameW + 24, h: 42,
        action: () => openClusterSheet(c)
      });
    }

    // ── Sub-topic layer ──
    if (s1 > 0.01) {
      c.subTopics.forEach((sub, si) => {
        const sp = project(c.x + sub.offX, c.y + sub.offY, 0);
        const ssx = sp.x, ssy = sp.y;

        let a = s1 * ent;
        if (s2 > 0) a = s1 * (1 - s2 * 0.5) * ent;

        // ── Bezier connection ──
        const dx = ssx - sx, dy = ssy - sy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const curvature = dist * 0.14 * (si % 2 === 0 ? 1 : -1);
        const cpx = (sx + ssx) / 2 + perpX * curvature;
        const cpy = (sy + ssy) / 2 + perpY * curvature;

        // Curve path
        hudCtx.globalAlpha = a * 0.10;
        hudCtx.strokeStyle = hexToRGBA(c.color, 1);
        hudCtx.lineWidth = 1;
        hudCtx.setLineDash([1.5, 5]);
        hudCtx.lineDashOffset = -time * 14;
        hudCtx.beginPath();
        hudCtx.moveTo(sx, sy);
        hudCtx.quadraticCurveTo(cpx, cpy, ssx, ssy);
        hudCtx.stroke();
        hudCtx.setLineDash([]);

        // ── Traveling light pulse ──
        const tSpeed = 0.10 + si * 0.025;
        const tVal = ((time * tSpeed + si * 0.35) % 1.0);
        const dot = quadBezierPt(tVal, sx, sy, cpx, cpy, ssx, ssy);

        hudCtx.globalAlpha = a * 0.55;
        const dotR = 5;
        const dotGlow = hudCtx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, dotR);
        dotGlow.addColorStop(0, hexToRGBA(c.color, 0.85));
        dotGlow.addColorStop(0.35, hexToRGBA(c.color, 0.2));
        dotGlow.addColorStop(1, 'transparent');
        hudCtx.fillStyle = dotGlow;
        hudCtx.beginPath();
        hudCtx.arc(dot.x, dot.y, dotR, 0, Math.PI * 2);
        hudCtx.fill();

        // ── Sub-topic node glow ──
        const subB = 1.0 + Math.sin(time * 0.9 + si * 1.7) * 0.08;
        const subR = 22 * subB;
        hudCtx.globalAlpha = a * 0.2;
        const subGlow = hudCtx.createRadialGradient(ssx, ssy, 0, ssx, ssy, subR);
        subGlow.addColorStop(0, hexToRGBA(c.color, 0.35));
        subGlow.addColorStop(0.45, hexToRGBA(c.color, 0.06));
        subGlow.addColorStop(1, 'transparent');
        hudCtx.fillStyle = subGlow;
        hudCtx.beginPath();
        hudCtx.arc(ssx, ssy, subR, 0, Math.PI * 2);
        hudCtx.fill();

        // Sub-topic core dot
        hudCtx.globalAlpha = a * 0.85;
        hudCtx.fillStyle = '#ffffff';
        hudCtx.beginPath();
        hudCtx.arc(ssx, ssy, 1.8, 0, Math.PI * 2);
        hudCtx.fill();

        // ── Sub-topic label card ──
        if (s2 < 0.8) {
          hudCtx.globalAlpha = a;
          hudCtx.font = '600 11px "Manrope", sans-serif';
          const tw = hudCtx.measureText(sub.label).width;
          const pad = 12;
          const boxX = ssx - tw / 2 - pad;
          const boxY = ssy + 14;
          const boxW = tw + pad * 2;
          const boxH = 28;

          // Card background
          hudCtx.fillStyle = 'rgba(13, 16, 20, 0.82)';
          roundRect(hudCtx, boxX, boxY, boxW, boxH, 8);
          hudCtx.fill();

          // Subtle border
          hudCtx.globalAlpha = a * 0.10;
          hudCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          hudCtx.lineWidth = 0.5;
          roundRect(hudCtx, boxX, boxY, boxW, boxH, 8);
          hudCtx.stroke();

          // Bottom accent line
          hudCtx.globalAlpha = a * 0.45;
          hudCtx.fillStyle = c.color;
          roundRect(hudCtx, boxX + 3, boxY + boxH - 2, boxW - 6, 1.5, 0.75);
          hudCtx.fill();

          // Label text
          hudCtx.globalAlpha = a * 0.95;
          hudCtx.fillStyle = '#f4f7fb';
          hudCtx.textAlign = 'center';
          hudCtx.fillText(sub.label, ssx, boxY + 18);

          hitRegions.push({
            x: boxX, y: boxY, w: boxW, h: boxH,
            action: () => openSubSheet(sub, c)
          });
        }

        // ── Micro-narratives ──
        if (s2 > 0.01) {
          sub.micro.forEach((mic, mi) => {
            const mp = project(c.x + sub.offX + mic.offX, c.y + sub.offY + mic.offY, 0);
            const msx = mp.x, msy = mp.y;

            // Connection to parent sub-topic
            const mdx = msx - ssx, mdy = msy - ssy;
            const mDist = Math.sqrt(mdx * mdx + mdy * mdy) || 1;
            const mPerpX = -mdy / mDist;
            const mPerpY = mdx / mDist;
            const mCurve = mDist * 0.1 * (mi % 2 === 0 ? 1 : -1);
            const mCpx = (ssx + msx) / 2 + mPerpX * mCurve;
            const mCpy = (ssy + msy) / 2 + mPerpY * mCurve;

            hudCtx.globalAlpha = s2 * ent * 0.07;
            hudCtx.strokeStyle = hexToRGBA(c.color, 0.8);
            hudCtx.lineWidth = 0.5;
            hudCtx.beginPath();
            hudCtx.moveTo(ssx, ssy);
            hudCtx.quadraticCurveTo(mCpx, mCpy, msx, msy);
            hudCtx.stroke();

            // Micro traveling dot
            const mT = ((time * 0.08 + mi * 0.5) % 1.0);
            const mDot = quadBezierPt(mT, ssx, ssy, mCpx, mCpy, msx, msy);
            hudCtx.globalAlpha = s2 * ent * 0.35;
            const mDotR = 3;
            const mDotGlow = hudCtx.createRadialGradient(mDot.x, mDot.y, 0, mDot.x, mDot.y, mDotR);
            mDotGlow.addColorStop(0, hexToRGBA(c.color, 0.7));
            mDotGlow.addColorStop(1, 'transparent');
            hudCtx.fillStyle = mDotGlow;
            hudCtx.beginPath();
            hudCtx.arc(mDot.x, mDot.y, mDotR, 0, Math.PI * 2);
            hudCtx.fill();

            // Micro node dot
            hudCtx.globalAlpha = s2 * ent * 0.6;
            hudCtx.fillStyle = hexToRGBA(c.color, 0.55);
            hudCtx.beginPath();
            hudCtx.arc(msx, msy, 1.3, 0, Math.PI * 2);
            hudCtx.fill();

            // Micro label chip
            hudCtx.globalAlpha = s2 * ent;
            hudCtx.font = '450 10px "IBM Plex Mono", monospace';
            const mtw = hudCtx.measureText(mic.label).width;
            const mx = msx + 7, my = msy - 8, mw = mtw + 14, mh = 19;

            hudCtx.fillStyle = 'rgba(8, 10, 14, 0.82)';
            roundRect(hudCtx, mx, my, mw, mh, 5);
            hudCtx.fill();

            hudCtx.globalAlpha = s2 * ent * 0.07;
            hudCtx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            hudCtx.lineWidth = 0.5;
            roundRect(hudCtx, mx, my, mw, mh, 5);
            hudCtx.stroke();

            hudCtx.globalAlpha = s2 * ent * 0.88;
            hudCtx.fillStyle = 'rgba(203, 213, 225, 0.92)';
            hudCtx.textAlign = 'left';
            hudCtx.fillText(mic.label, msx + 14, msy + 3);

            hitRegions.push({
              x: mx, y: my, w: mw, h: mh,
              action: () => openMicroSheet(mic, sub, c)
            });
          });
        }
      });
    }

    hudCtx.globalAlpha = 1.0;
  });
}

/* ─── Resize ─────────────────────────────────────────────── */

function onResize() {
  if (!container || !renderer) return;
  width = container.clientWidth;
  height = container.clientHeight - 48;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  const dpr = Math.min(window.devicePixelRatio, 2);
  hudCanvas.width = width * dpr;
  hudCanvas.height = height * dpr;
  hudCanvas.style.width = width + 'px';
  hudCanvas.style.height = height + 'px';
  hudCtx.setTransform(1, 0, 0, 1, 0, 0);
  hudCtx.scale(dpr, dpr);
}

/* ─── List View ──────────────────────────────────────────── */

function renderListView(listLayer) {
  listLayer.innerHTML = '';

  const totalNarratives = CLUSTERS.reduce((n, c) => n + c.subTopics.length, 0);
  const heading = document.createElement('div');
  heading.style.cssText = 'padding:var(--sp-4) 0 var(--sp-16); margin-bottom:var(--sp-4); border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; justify-content:space-between;';
  heading.innerHTML = `
    <span style="font-family:var(--font-display); font-size:var(--text-md); font-weight:650; color:var(--text-primary);">Top Narratives</span>
    <span style="font-size:var(--text-xs); color:var(--text-secondary);">${totalNarratives} Narrative · 3 Cluster</span>
  `;
  listLayer.appendChild(heading);

  CLUSTERS.forEach(cluster => {
    const clusterLabel = document.createElement('div');
    clusterLabel.style.cssText = `font-size:var(--text-xs); font-weight:700; color:${cluster.color}; text-transform:uppercase; letter-spacing:var(--tracking-wide); padding:var(--sp-12) 0 var(--sp-4); cursor:pointer;`;
    clusterLabel.textContent = cluster.label;
    clusterLabel.addEventListener('click', () => openClusterSheet(cluster));
    listLayer.appendChild(clusterLabel);

    cluster.subTopics.forEach(sub => {
      const isPos = sub.sentiment === 'pos';
      const isNeg = sub.sentiment === 'neg';
      const color = getSentimentColor(sub.score);
      const arrow = isPos ? '&#8599;' : isNeg ? '&#8600;' : '&#8594;';
      const sentLabel = isPos ? 'Positiv' : isNeg ? 'Negativ' : 'Gemischt';
      const trendKey = isPos ? 'up' : isNeg ? 'down' : 'flat';
      const pts = sparkPoints(trendKey);

      const card = document.createElement('div');
      card.className = 'narrative-card';
      card.innerHTML = `
        <div class="narrative-card__header">
          <div>
            <div class="narrative-card__title">${sub.label} <span style="color:${color}; margin-left:var(--sp-8);">${arrow}</span></div>
            <div class="narrative-card__meta">
              <span style="color:${color}; font-weight:500;">${sentLabel}</span>
              <svg class="sparkline" viewBox="0 0 48 20"><polyline points="${pts}" stroke="${color}" fill="none" stroke-width="1.5"/></svg>
            </div>
          </div>
          <div class="cluster-tag" style="color:${cluster.color}; border-color:${cluster.color}44; background:${cluster.color}0d;">${cluster.label}</div>
        </div>
      `;
      card.addEventListener('click', () => openSubSheet(sub, cluster));
      listLayer.appendChild(card);
    });
  });
}

/* ─── Cleanup ────────────────────────────────────────────── */

export function destroyConstellation() {
  if (animFrame) cancelAnimationFrame(animFrame);
  animFrame = null;
  window.removeEventListener('resize', onResize);
  if (renderer) renderer.dispose();
  scene = null;
  camera = null;
  renderer = null;
  particlesMesh = null;
  particleData.length = 0;
}
