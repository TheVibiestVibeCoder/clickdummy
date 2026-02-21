/* ============================================================
   CONSTELLATION MAP - Luxe orbital narrative graph
   ============================================================ */

import { CLUSTERS, NRI, getClusterAvgScore, getSentimentColor, sparkPoints } from '../data.js';
import { openClusterSheet, openSubSheet, openMicroSheet } from '../components/side-sheet.js';

const VIEW_TOP_OFFSET = 48;
const PARTICLE_COUNT = 2400;
const MACRO_RING_X = 42;
const MACRO_RING_Y = 30;

let scene;
let camera;
let renderer;
let particlesMesh;

let hudCanvas;
let hudCtx;

let width = 0;
let height = 0;

let targetZoom = 1.0;
let currentZoom = 1.0;

let panX = 0;
let panY = 0;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let lastTouchDist = 0;

let mouseTargetX = 0;
let mouseTargetY = 0;
let mouseNormX = 0;
let mouseNormY = 0;

let initTime = 0;
let animFrame = null;

const particleData = [];
const macroAnchors = [];
const hitRegions = [];
const interactionCleanup = [];
const clusterNriMap = buildClusterNriMap();

let container;
let canvasGL;
let canvasHUD;
let interactionLayer;
let zoomSlider;
let zoomValue;
let zoomReadout;
let fullscreenBtn;
let fullscreenVeil;

export function initConstellation(containerEl) {
  container = containerEl;

  targetZoom = 1.0;
  currentZoom = 1.0;
  panX = 0;
  panY = 0;
  mouseTargetX = 0;
  mouseTargetY = 0;
  mouseNormX = 0;
  mouseNormY = 0;
  particleData.length = 0;
  macroAnchors.length = 0;
  hitRegions.length = 0;
  clearInteractionListeners();

  container.innerHTML = `
    <div class="viz-controls">
      <div style="display:flex; align-items:center; gap:var(--sp-12);">
        <span class="panel__title">Konstellationskarte</span>
        <div class="pill-group">
          <button class="pill is-active" id="btn-graph">Grafik</button>
          <button class="pill" id="btn-list">Liste</button>
        </div>
      </div>
      <div class="zoom-strip zoom-strip--constellation">
        <button class="zoom-strip__btn" id="zoom-out" aria-label="Rauszoomen">&minus;</button>
        <div class="zoom-strip__track-wrap">
          <input type="range" id="zoom-slider" min="0.35" max="4.8" step="0.01" value="1.0" />
        </div>
        <button class="zoom-strip__btn" id="zoom-in" aria-label="Reinzoomen">+</button>
      </div>
    </div>

    <div id="graph-layer" class="constellation-graph-layer">
      <canvas id="webgl-canvas" class="constellation-webgl"></canvas>
      <canvas id="hud-canvas" class="constellation-hud"></canvas>
      <div id="interaction-layer" class="constellation-interaction"></div>
      <div id="map-fs-veil" class="constellation-fs-veil" aria-hidden="true"></div>
      <button id="map-fullscreen-btn" class="constellation-fullscreen-btn" aria-label="Vollbild oeffnen" title="Vollbild">&#x26F6;</button>
    </div>

    <div id="list-layer" class="list-layer constellation-list-layer"></div>
  `;

  canvasGL = container.querySelector('#webgl-canvas');
  canvasHUD = container.querySelector('#hud-canvas');
  interactionLayer = container.querySelector('#interaction-layer');
  zoomSlider = container.querySelector('#zoom-slider');
  zoomValue = null;
  zoomReadout = null;
  fullscreenBtn = container.querySelector('#map-fullscreen-btn');
  fullscreenVeil = container.querySelector('#map-fs-veil');

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
    if (zoomReadout) zoomReadout.textContent = '3D-Engine offline';
    return destroyConstellation;
  }

  try {
    width = container.clientWidth;
    height = Math.max(1, container.clientHeight - VIEW_TOP_OFFSET);
    initTime = Date.now() * 0.001;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070a, 0.0048);

    camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 1000);
    camera.position.set(0, 0, 108);

    renderer = new THREE.WebGLRenderer({ canvas: canvasGL, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x05070a, 1);

    hudCanvas = canvasHUD;
    hudCtx = hudCanvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio, 2);
    hudCanvas.width = width * dpr;
    hudCanvas.height = height * dpr;
    hudCanvas.style.width = width + 'px';
    hudCanvas.style.height = height + 'px';
    hudCtx.scale(dpr, dpr);

    buildMacroAnchors();
    generateParticles();
    setupInteraction();

    zoomSlider.addEventListener('input', () => {
      targetZoom = parseFloat(zoomSlider.value);
      updateReadout();
    });
    container.querySelector('#zoom-in').addEventListener('click', () => adjustZoom(0.15));
    container.querySelector('#zoom-out').addEventListener('click', () => adjustZoom(-0.15));

    if (fullscreenBtn && document.fullscreenEnabled) {
      let wasFullscreen = document.fullscreenElement === container;

      const playFullscreenTransition = (isEntering) => {
        graphLayer.classList.remove('is-fs-enter', 'is-fs-exit');
        void graphLayer.offsetWidth;
        graphLayer.classList.add(isEntering ? 'is-fs-enter' : 'is-fs-exit');
        setTimeout(() => {
          graphLayer.classList.remove('is-fs-enter', 'is-fs-exit');
        }, 760);

        if (!fullscreenVeil) return;
        fullscreenVeil.classList.remove('is-enter', 'is-exit');
        void fullscreenVeil.offsetWidth;
        fullscreenVeil.classList.add(isEntering ? 'is-enter' : 'is-exit');
        setTimeout(() => {
          fullscreenVeil.classList.remove('is-enter', 'is-exit');
        }, 780);
      };

      const syncFullscreenState = () => {
        const isFullscreen = document.fullscreenElement === container;
        if (isFullscreen !== wasFullscreen) playFullscreenTransition(isFullscreen);
        wasFullscreen = isFullscreen;

        container.classList.toggle('is-map-fullscreen', isFullscreen);
        fullscreenBtn.setAttribute('aria-label', isFullscreen ? 'Vollbild schliessen' : 'Vollbild oeffnen');
        fullscreenBtn.setAttribute('title', isFullscreen ? 'Vollbild schliessen' : 'Vollbild');
        fullscreenBtn.innerHTML = isFullscreen ? '&#x2715;' : '&#x26F6;';
        onResize();
      };

      bindInteraction(fullscreenBtn, 'click', async () => {
        try {
          if (document.fullscreenElement === container) await document.exitFullscreen();
          else await container.requestFullscreen();
        } catch (err) {
          console.warn('Fullscreen toggle failed:', err);
        }
      });
      bindInteraction(document, 'fullscreenchange', syncFullscreenState);
      syncFullscreenState();
    } else if (fullscreenBtn) {
      fullscreenBtn.style.display = 'none';
    }

    window.addEventListener('resize', onResize);
    updateReadout();
    animate();
  } catch (e) {
    console.error('Constellation init failed:', e);
  }

  return destroyConstellation;
}

function generateParticles() {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  const sizes = [];
  const phases = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const cIdx = i % CLUSTERS.length;
    const cluster = CLUSTERS[cIdx];
    const sIdx = Math.floor(Math.random() * cluster.subTopics.length);
    const sub = cluster.subTopics[sIdx];
    const mIdx = Math.floor(Math.random() * sub.micro.length);
    const mic = sub.micro[mIdx];

    const l1 = sphericalOffset(24.5);
    const l2 = sphericalOffset(7.4);
    const l3 = sphericalOffset(3.2);

    const orbitSpeed = (0.018 + Math.random() * 0.052) * (Math.random() > 0.5 ? 1 : -1);
    const driftSpeed = 0.12 + Math.random() * 0.2;
    const driftAmp = 0.26 + Math.random() * 0.58;
    const phase = Math.random() * Math.PI * 2;

    particleData.push({
      cIdx,
      sIdx,
      mIdx,
      l1x: l1.x, l1y: l1.y, l1z: l1.z,
      l2x: l2.x, l2y: l2.y, l2z: l2.z,
      l3x: l3.x, l3y: l3.y, l3z: l3.z,
      sub,
      mic,
      orbitSpeed,
      driftSpeed,
      driftAmp,
      phase
    });

    positions.push(cluster.x, cluster.y, 0);

    const col = new THREE.Color(cluster.color);
    const coolBias = 0.48 + Math.random() * 0.38;
    col.lerp(new THREE.Color(0xdce5f1), coolBias);
    colors.push(col.r, col.g, col.b);

    const r = Math.random();
    let size;
    if (r < 0.7) size = 0.24 + Math.random() * 0.32;
    else if (r < 0.93) size = 0.56 + Math.random() * 0.46;
    else size = 1.0 + Math.random() * 1.0;
    sizes.push(size);

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
        float breathe = 0.78 + 0.22 * sin(uTime * 0.58 + phase);
        vAlpha = breathe;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * breathe * (560.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D pointTexture;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec4 tex = texture2D(pointTexture, gl_PointCoord);
        gl_FragColor = vec4(vColor, vAlpha * 0.74) * tex;
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
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const h = size / 2;
  const g = ctx.createRadialGradient(h, h, 0, h, h, h);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.08, 'rgba(255,255,255,0.76)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.33)');
  g.addColorStop(0.42, 'rgba(255,255,255,0.1)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.02)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

function sphericalOffset(scale) {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.pow(Math.random(), 1.48) * scale;
  return {
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.sin(phi) * Math.sin(theta),
    z: r * Math.cos(phi)
  };
}

function clearInteractionListeners() {
  while (interactionCleanup.length) {
    const off = interactionCleanup.pop();
    off();
  }
}

function bindInteraction(target, eventName, handler, options) {
  target.addEventListener(eventName, handler, options);
  interactionCleanup.push(() => target.removeEventListener(eventName, handler, options));
}

function setupInteraction() {
  clearInteractionListeners();

  let startX = 0;
  let startY = 0;
  let touchStartX = 0;
  let touchStartY = 0;

  bindInteraction(interactionLayer, 'mousedown', e => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    interactionLayer.style.cursor = 'grabbing';
  });

  bindInteraction(window, 'mouseup', e => {
    const wasDragging = isDragging;
    isDragging = false;
    interactionLayer.style.cursor = 'grab';
    if (!wasDragging || e.target !== interactionLayer) return;

    const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
    if (dist < 5) {
      const rect = interactionLayer.getBoundingClientRect();
      checkClick(e.clientX - rect.left, e.clientY - rect.top);
    }
  });

  bindInteraction(window, 'mousemove', e => {
    const rect = interactionLayer.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      mouseTargetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseTargetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    }

    if (!isDragging) {
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let hit = false;
      for (const region of hitRegions) {
        if (mx >= region.x && mx <= region.x + region.w && my >= region.y && my <= region.y + region.h) {
          hit = true;
          break;
        }
      }
      interactionLayer.style.cursor = hit ? 'pointer' : 'grab';
      return;
    }

    const panSpeed = 0.1 / Math.max(currentZoom, 0.35);
    panX -= (e.clientX - lastMouseX) * panSpeed;
    panY -= (e.clientY - lastMouseY) * panSpeed;
    panX = clamp(panX, -120, 120);
    panY = clamp(panY, -120, 120);
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });

  const passiveFalse = { passive: false };

  bindInteraction(interactionLayer, 'touchstart', e => {
    if (e.touches.length === 1) {
      isDragging = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      lastMouseX = e.touches[0].clientX;
      lastMouseY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist = Math.sqrt(dx * dx + dy * dy);
    }
  }, passiveFalse);

  bindInteraction(interactionLayer, 'touchmove', e => {
    if (e.target === interactionLayer) e.preventDefault();

    if (e.touches.length === 1 && isDragging) {
      const panSpeed = 0.28 / Math.max(currentZoom, 0.35);
      panX -= (e.touches[0].clientX - lastMouseX) * panSpeed;
      panY -= (e.touches[0].clientY - lastMouseY) * panSpeed;
      panX = clamp(panX, -120, 120);
      panY = clamp(panY, -120, 120);
      lastMouseX = e.touches[0].clientX;
      lastMouseY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastTouchDist > 0) {
        targetZoom += (dist - lastTouchDist) * 0.01;
        targetZoom = clamp(targetZoom, 0.35, 4.8);
        zoomSlider.value = targetZoom;
        updateReadout();
      }
      lastTouchDist = dist;
    }
  }, passiveFalse);

  bindInteraction(interactionLayer, 'touchend', e => {
    if (e.changedTouches.length === 1 && lastTouchDist === 0) {
      const endTouch = e.changedTouches[0];
      const dist = Math.hypot(endTouch.clientX - touchStartX, endTouch.clientY - touchStartY);
      if (dist < 8) {
        const rect = interactionLayer.getBoundingClientRect();
        checkClick(endTouch.clientX - rect.left, endTouch.clientY - rect.top);
      }
    }
    isDragging = false;
    lastTouchDist = 0;
  });

  bindInteraction(interactionLayer, 'wheel', e => {
    e.preventDefault();
    targetZoom += e.deltaY * -0.0008;
    targetZoom = clamp(targetZoom, 0.35, 4.8);
    zoomSlider.value = targetZoom;
    updateReadout();
  }, passiveFalse);
}

function checkClick(mx, my) {
  for (let i = hitRegions.length - 1; i >= 0; i--) {
    const region = hitRegions[i];
    if (mx >= region.x && mx <= region.x + region.w && my >= region.y && my <= region.y + region.h) {
      region.action();
      return;
    }
  }
}

function adjustZoom(delta) {
  targetZoom = clamp(targetZoom + delta, 0.35, 4.8);
  zoomSlider.value = targetZoom;
  updateReadout();
}

function updateReadout() {
  if (zoomValue) zoomValue.textContent = targetZoom.toFixed(1) + 'x';

  let stageKey = 'macro';
  if (targetZoom >= 2.75) {
    stageKey = 'micro';
  } else if (targetZoom >= 1.35) {
    stageKey = 'sub';
  }
  if (zoomReadout) {
    zoomReadout.textContent = stageKey === 'micro' ? 'Mikro' : (stageKey === 'sub' ? 'Sub-Cluster' : 'Makro');
  }
  container.setAttribute('data-zoom-stage', stageKey);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a * (1 - t) + b * t;
}

function smoothStep(start, end, x) {
  if (start === end) return x >= end ? 1 : 0;
  const t = clamp((x - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
}

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function hexToRGBA(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
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

function getRiskColor(level) {
  if (level === 'red') return '#ef4444';
  if (level === 'amber') return '#f59e0b';
  return '#94a3b8';
}

function buildClusterNriMap() {
  const map = new Map();
  if (!CLUSTERS.length) return map;

  const overallNri = typeof NRI?.score === 'number' ? NRI.score : 67;
  const entries = CLUSTERS.map(cluster => {
    const weight = Math.max(1, cluster.subTopics.length);
    const avg = getClusterAvgScore(cluster);
    const riskAdj = cluster.riskLevel === 'red' ? 5.8 : (cluster.riskLevel === 'amber' ? 2.2 : -2.8);
    return { cluster, avg, weight, riskAdj };
  });
  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0) || 1;
  const weightedMean = entries.reduce((sum, e) => sum + e.avg * e.weight, 0) / totalWeight;
  const sensitivity = 30;
  const rawScores = entries.map(entry => {
    const sentimentRisk = overallNri - (entry.avg - weightedMean) * sensitivity;
    return {
      id: entry.cluster.id,
      weight: entry.weight,
      raw: sentimentRisk + entry.riskAdj
    };
  });
  const rawWeightedMean = rawScores.reduce((sum, r) => sum + r.raw * r.weight, 0) / totalWeight;
  const normalizeShift = overallNri - rawWeightedMean;

  rawScores.forEach(({ id, raw }) => {
    map.set(id, raw + normalizeShift);
  });

  return map;
}

function buildMacroAnchors() {
  macroAnchors.length = 0;
  const count = CLUSTERS.length;
  const ringLift = count <= 3 ? 1.1 : 1;

  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / count;
    macroAnchors.push({
      angle,
      x: Math.cos(angle) * MACRO_RING_X * ringLift,
      y: Math.sin(angle) * MACRO_RING_Y * ringLift,
      swayAmp: 1.1 + Math.random() * 1.1,
      swaySpeed: 0.13 + Math.random() * 0.11
    });
  }
}

function computeClusterWorldPositions(time, s1) {
  const swirl = Math.sin(time * 0.12) * 0.22;
  const blend = Math.pow(s1, 0.84);

  return CLUSTERS.map((cluster, ci) => {
    const anchor = macroAnchors[ci];
    const rotA = anchor.angle + swirl;
    const ringX = anchor.x * Math.cos(swirl) - anchor.y * Math.sin(swirl);
    const ringY = anchor.x * Math.sin(swirl) + anchor.y * Math.cos(swirl);
    const driftX = Math.cos(time * anchor.swaySpeed + ci * 1.37) * anchor.swayAmp;
    const driftY = Math.sin(time * anchor.swaySpeed * 0.82 + ci * 1.71) * anchor.swayAmp * 0.76;

    const macroX = ringX + driftX + Math.cos(rotA * 2.0 + time * 0.08) * 0.7;
    const macroY = ringY + driftY + Math.sin(rotA * 1.6 + time * 0.07) * 0.5;

    return {
      x: lerp(macroX, cluster.x, blend),
      y: lerp(macroY, cluster.y, blend),
      macroX,
      macroY
    };
  });
}

function animate() {
  animFrame = requestAnimationFrame(animate);

  const time = Date.now() * 0.001;
  const elapsed = time - initTime;

  const entrance = clamp(elapsed / 2.8, 0, 1);
  const ent = easeOutQuart(entrance);

  currentZoom += (targetZoom - currentZoom) * 0.12;

  mouseNormX += (mouseTargetX - mouseNormX) * 0.032;
  mouseNormY += (mouseTargetY - mouseNormY) * 0.032;

  const s1 = smoothStep(1.0, 2.1, currentZoom);
  const s2 = smoothStep(2.2, 4.2, currentZoom);
  const layback = smoothStep(1.4, 4.0, currentZoom);

  const parallax = lerp(0.42, 0.22, smoothStep(1.2, 3.1, currentZoom));
  const pointerFollow = isDragging ? 0 : 1;
  const targetCamX = panX + mouseNormX * parallax * pointerFollow;
  const targetCamY = -panY - mouseNormY * parallax * pointerFollow + s2 * 1.4 - layback * 14;
  const targetCamZ = (132 / currentZoom) - s2 * 12;

  camera.position.x += (targetCamX - camera.position.x) * 0.085;
  camera.position.y += (targetCamY - camera.position.y) * 0.085;
  camera.position.z += (targetCamZ - camera.position.z) * 0.1;
  const lookX = camera.position.x + layback * 6;
  const lookY = camera.position.y + layback * 36;
  camera.lookAt(lookX, lookY, 0);

  if (particlesMesh) {
    particlesMesh.rotation.y = Math.sin(time * 0.05) * 0.05;
    particlesMesh.rotation.x = Math.cos(time * 0.04) * 0.02;
    particlesMesh.material.uniforms.uTime.value = time;
  }

  const clusterWorld = computeClusterWorldPositions(time, s1);
  const subSpread = lerp(0.48, 2.25, s1);
  const microSpread = lerp(0.4, 3.55, s2);
  const macroCloudSpread = 0.42 + ent * 0.58;

  const pos = particlesMesh.geometry.attributes.position.array;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = particleData[i];
    const base = clusterWorld[p.cIdx];

    const orbA = time * p.orbitSpeed;
    const cosA = Math.cos(orbA);
    const sinA = Math.sin(orbA);

    const dt = time * p.driftSpeed;
    const dX = Math.sin(dt + p.phase) * p.driftAmp;
    const dY = Math.cos(dt * 0.72 + p.phase * 1.3) * p.driftAmp;
    const dZ = Math.sin(dt * 0.5 + p.phase * 2.0) * p.driftAmp * 0.3;

    const r1x = p.l1x * cosA - p.l1z * sinA;
    const r1z = p.l1x * sinA + p.l1z * cosA;
    const l1X = base.x + (r1x + dX) * macroCloudSpread;
    const l1Y = base.y + (p.l1y + dY) * macroCloudSpread;
    const l1Z = (r1z + dZ) * macroCloudSpread;

    const r2x = p.l2x * cosA - p.l2z * sinA;
    const r2z = p.l2x * sinA + p.l2z * cosA;
    const l2X = base.x + p.sub.offX * subSpread + r2x + dX * 0.45;
    const l2Y = base.y + p.sub.offY * subSpread + p.l2y + dY * 0.45;
    const l2Z = r2z + dZ * 0.45;

    const l3X = base.x + p.sub.offX * subSpread + p.mic.offX * microSpread + p.l3x + dX * 0.3;
    const l3Y = base.y + p.sub.offY * subSpread + p.mic.offY * microSpread + p.l3y + dY * 0.3;
    const l3Z = p.l3z + dZ * 0.3;

    const arc1 = Math.sin(s1 * Math.PI) * 2.8;
    const arc2 = Math.sin(s2 * Math.PI) * 1.6;

    let x = lerp(l1X, l2X, s1);
    let y = lerp(l1Y, l2Y, s1);
    let z = lerp(l1Z, l2Z, s1) + arc1;

    if (s2 > 0) {
      x = lerp(x, l3X, s2);
      y = lerp(y, l3Y, s2);
      z = lerp(z, l3Z, s2) + arc2;
    }

    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;
  }
  particlesMesh.geometry.attributes.position.needsUpdate = true;

  renderer.render(scene, camera);
  drawHUD(s1, s2, time, ent, clusterWorld);
}

function drawHUD(s1, s2, time, ent, clusterWorld) {
  hudCtx.clearRect(0, 0, width, height);
  hitRegions.length = 0;

  drawBackdrop(time, s1, s2, ent);

  const clusterScreens = CLUSTERS.map((cluster, ci) => {
    const world = clusterWorld[ci];
    const projected = project(world.x, world.y, 0);
    return {
      cluster,
      ci,
      world,
      sx: projected.x,
      sy: projected.y,
      z: projected.z,
      visible: projected.z >= -1 && projected.z <= 1
    };
  });

  drawClusterBridges(clusterScreens, time, s1, ent);

  const subSpread = lerp(0.48, 2.25, s1);
  const microSpread = lerp(0.4, 3.55, s2);

  clusterScreens.forEach(state => {
    if (!state.visible) return;

    const c = state.cluster;
    const ci = state.ci;
    const sx = state.sx;
    const sy = state.sy;

    const pulse = 1 + Math.sin(time * 0.72 + ci * 1.85) * 0.1;
    const clusterVis = ent * (1 - s1 * 0.16);

    const outerR = 94 * pulse * (1 - s1 * 0.24);
    hudCtx.globalAlpha = clusterVis * 0.18;
    const outer = hudCtx.createRadialGradient(sx, sy, 0, sx, sy, outerR);
    outer.addColorStop(0, hexToRGBA(c.color, 0.35));
    outer.addColorStop(0.42, hexToRGBA(c.color, 0.11));
    outer.addColorStop(1, 'transparent');
    hudCtx.fillStyle = outer;
    hudCtx.beginPath();
    hudCtx.arc(sx, sy, outerR, 0, Math.PI * 2);
    hudCtx.fill();

    hudCtx.globalAlpha = clusterVis * 0.3;
    hudCtx.strokeStyle = hexToRGBA(c.color, 0.7);
    hudCtx.lineWidth = 1.1;
    hudCtx.beginPath();
    hudCtx.arc(sx, sy, 16 + Math.sin(time * 0.55 + ci) * 1.8, 0, Math.PI * 2);
    hudCtx.stroke();

    const innerR = 12.5 * pulse;
    hudCtx.globalAlpha = clusterVis * 0.62;
    const inner = hudCtx.createRadialGradient(sx, sy, 0, sx, sy, innerR);
    inner.addColorStop(0, 'rgba(255,255,255,0.92)');
    inner.addColorStop(0.25, hexToRGBA(c.color, 0.62));
    inner.addColorStop(1, 'transparent');
    hudCtx.fillStyle = inner;
    hudCtx.beginPath();
    hudCtx.arc(sx, sy, innerR, 0, Math.PI * 2);
    hudCtx.fill();

    hudCtx.globalAlpha = clusterVis * 0.92;
    hudCtx.fillStyle = '#ffffff';
    hudCtx.beginPath();
    hudCtx.arc(sx, sy, 2.35 * pulse, 0, Math.PI * 2);
    hudCtx.fill();

    if (s1 < 0.98) {
      const labelAlpha = (1 - smoothStep(0.0, 0.95, s1)) * ent;
      const clusterNri = clusterNriMap.get(c.id) ?? NRI.score ?? 67;
      const score = clusterNri.toFixed(1);
      const box = drawClusterPill({
        x: sx,
        y: sy - 60,
        title: c.label,
        score,
        subCount: c.subTopics.length,
        accent: c.color,
        riskLevel: c.riskLevel,
        alpha: labelAlpha
      });
      hitRegions.push({
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        action: () => openClusterSheet(c)
      });
    }

    if (s1 < 0.06) return;

    c.subTopics.forEach((sub, si) => {
      const subWobble = (1 - s1 * 0.5) * 0.5;
      const subWorldX = state.world.x + sub.offX * subSpread + Math.sin(time * 0.58 + si * 1.9) * subWobble;
      const subWorldY = state.world.y + sub.offY * subSpread + Math.cos(time * 0.53 + si * 1.4) * subWobble;
      const sp = project(subWorldX, subWorldY, 0);
      if (sp.z > 1 || sp.z < -1) return;

      const ssx = sp.x;
      const ssy = sp.y;

      let subAlpha = s1 * ent;
      subAlpha *= 1 - s2 * 0.42;
      if (subAlpha <= 0.01) return;

      const dx = ssx - sx;
      const dy = ssy - sy;
      const dist = Math.hypot(dx, dy) || 1;
      const perpX = -dy / dist;
      const perpY = dx / dist;
      const curv = dist * 0.16 * (si % 2 === 0 ? 1 : -1);
      const cpx = (sx + ssx) * 0.5 + perpX * curv;
      const cpy = (sy + ssy) * 0.5 + perpY * curv;

      hudCtx.globalAlpha = subAlpha * 0.15;
      hudCtx.strokeStyle = hexToRGBA(c.color, 0.92);
      hudCtx.lineWidth = 1.05;
      hudCtx.setLineDash([2, 7]);
      hudCtx.lineDashOffset = -time * 14 - si * 4;
      hudCtx.beginPath();
      hudCtx.moveTo(sx, sy);
      hudCtx.quadraticCurveTo(cpx, cpy, ssx, ssy);
      hudCtx.stroke();
      hudCtx.setLineDash([]);

      const tVal = (time * (0.11 + si * 0.024) + si * 0.27) % 1;
      const pulsePt = quadBezierPt(tVal, sx, sy, cpx, cpy, ssx, ssy);
      hudCtx.globalAlpha = subAlpha * 0.48;
      const pulseGlow = hudCtx.createRadialGradient(pulsePt.x, pulsePt.y, 0, pulsePt.x, pulsePt.y, 5.2);
      pulseGlow.addColorStop(0, hexToRGBA(c.color, 0.86));
      pulseGlow.addColorStop(0.38, hexToRGBA(c.color, 0.2));
      pulseGlow.addColorStop(1, 'transparent');
      hudCtx.fillStyle = pulseGlow;
      hudCtx.beginPath();
      hudCtx.arc(pulsePt.x, pulsePt.y, 5.2, 0, Math.PI * 2);
      hudCtx.fill();

      const subPulse = 1 + Math.sin(time * 0.92 + si * 1.8) * 0.09;
      const subR = 21 * subPulse;
      hudCtx.globalAlpha = subAlpha * 0.22;
      const subGlow = hudCtx.createRadialGradient(ssx, ssy, 0, ssx, ssy, subR);
      subGlow.addColorStop(0, hexToRGBA(c.color, 0.35));
      subGlow.addColorStop(0.5, hexToRGBA(c.color, 0.06));
      subGlow.addColorStop(1, 'transparent');
      hudCtx.fillStyle = subGlow;
      hudCtx.beginPath();
      hudCtx.arc(ssx, ssy, subR, 0, Math.PI * 2);
      hudCtx.fill();

      hudCtx.globalAlpha = subAlpha * 0.84;
      hudCtx.fillStyle = '#f8fbff';
      hudCtx.beginPath();
      hudCtx.arc(ssx, ssy, 1.9, 0, Math.PI * 2);
      hudCtx.fill();

      const subLabelAlpha = subAlpha * (1 - smoothStep(0.72, 0.94, s2));
      if (subLabelAlpha > 0.03) {
        const box = drawSubPill({
          x: ssx,
          y: ssy + 14,
          text: sub.label,
          accent: c.color,
          alpha: subLabelAlpha
        });
        hitRegions.push({
          x: box.x,
          y: box.y,
          w: box.w,
          h: box.h,
          action: () => openSubSheet(sub, c)
        });
      }

      if (s2 < 0.04) return;

      sub.micro.forEach((mic, mi) => {
        const microWobble = (1 - s2 * 0.6) * 0.28;
        const microX =
          state.world.x +
          sub.offX * subSpread +
          mic.offX * microSpread +
          Math.sin(time * 0.82 + mi * 1.2) * microWobble;
        const microY =
          state.world.y +
          sub.offY * subSpread +
          mic.offY * microSpread +
          Math.cos(time * 0.78 + mi * 1.6) * microWobble;
        const mp = project(microX, microY, 0);
        if (mp.z > 1 || mp.z < -1) return;

        const msx = mp.x;
        const msy = mp.y;
        const mAlpha = s2 * ent;
        if (mAlpha <= 0.01) return;

        const mdx = msx - ssx;
        const mdy = msy - ssy;
        const mDist = Math.hypot(mdx, mdy) || 1;
        const mPerpX = -mdy / mDist;
        const mPerpY = mdx / mDist;
        const mCurve = mDist * 0.12 * (mi % 2 === 0 ? 1 : -1);
        const mCpx = (ssx + msx) * 0.5 + mPerpX * mCurve;
        const mCpy = (ssy + msy) * 0.5 + mPerpY * mCurve;

        hudCtx.globalAlpha = mAlpha * 0.1;
        hudCtx.strokeStyle = hexToRGBA(c.color, 0.85);
        hudCtx.lineWidth = 0.65;
        hudCtx.beginPath();
        hudCtx.moveTo(ssx, ssy);
        hudCtx.quadraticCurveTo(mCpx, mCpy, msx, msy);
        hudCtx.stroke();

        const mT = (time * 0.085 + mi * 0.33) % 1;
        const mPt = quadBezierPt(mT, ssx, ssy, mCpx, mCpy, msx, msy);
        hudCtx.globalAlpha = mAlpha * 0.36;
        const mGlow = hudCtx.createRadialGradient(mPt.x, mPt.y, 0, mPt.x, mPt.y, 3.2);
        mGlow.addColorStop(0, hexToRGBA(c.color, 0.7));
        mGlow.addColorStop(1, 'transparent');
        hudCtx.fillStyle = mGlow;
        hudCtx.beginPath();
        hudCtx.arc(mPt.x, mPt.y, 3.2, 0, Math.PI * 2);
        hudCtx.fill();

        hudCtx.globalAlpha = mAlpha * 0.58;
        hudCtx.fillStyle = hexToRGBA(c.color, 0.58);
        hudCtx.beginPath();
        hudCtx.arc(msx, msy, 1.35, 0, Math.PI * 2);
        hudCtx.fill();

        hitRegions.push({
          x: msx - 8,
          y: msy - 8,
          w: 16,
          h: 16,
          action: () => openMicroSheet(mic, sub, c)
        });

        const microLabelAlpha = mAlpha * smoothStep(0.24, 0.62, s2);
        if (microLabelAlpha > 0.03) {
          const chip = drawMicroTag({
            x: msx,
            y: msy,
            text: mic.label,
            accent: c.color,
            alpha: microLabelAlpha
          });
          hitRegions.push({
            x: chip.x,
            y: chip.y,
            w: chip.w,
            h: chip.h,
            action: () => openMicroSheet(mic, sub, c)
          });
        }
      });
    });
  });

  hudCtx.globalAlpha = 1;
  hudCtx.setLineDash([]);
}

function drawBackdrop(time, s1, s2, ent) {
  const cx = width * 0.5;
  const cy = height * 0.52;

  const wash = hudCtx.createLinearGradient(0, 0, 0, height);
  wash.addColorStop(0, 'rgba(10,14,20,0.56)');
  wash.addColorStop(1, 'rgba(4,7,11,0.3)');
  hudCtx.fillStyle = wash;
  hudCtx.fillRect(0, 0, width, height);

  const shimmerX = cx + Math.sin(time * 0.18) * width * 0.12;
  const shimmerY = cy + Math.cos(time * 0.15) * height * 0.1;
  const shimmer = hudCtx.createRadialGradient(
    shimmerX,
    shimmerY,
    0,
    shimmerX,
    shimmerY,
    Math.max(width, height) * 0.58
  );
  shimmer.addColorStop(0, 'rgba(255,175,130,0.07)');
  shimmer.addColorStop(0.45, 'rgba(148,163,184,0.03)');
  shimmer.addColorStop(1, 'transparent');
  hudCtx.globalAlpha = 0.82 * ent;
  hudCtx.fillStyle = shimmer;
  hudCtx.fillRect(0, 0, width, height);

  const centerAura = hudCtx.createRadialGradient(
    cx,
    cy,
    Math.min(width, height) * 0.02,
    cx,
    cy,
    Math.min(width, height) * (0.28 + (1 - s1) * 0.06)
  );
  centerAura.addColorStop(0, 'rgba(255, 182, 138, 0.08)');
  centerAura.addColorStop(0.45, 'rgba(160, 178, 201, 0.035)');
  centerAura.addColorStop(1, 'transparent');
  hudCtx.globalAlpha = 0.78 * (1 - s2 * 0.35);
  hudCtx.fillStyle = centerAura;
  hudCtx.fillRect(0, 0, width, height);

  const vignette = hudCtx.createRadialGradient(cx, cy, width * 0.16, cx, cy, width * 0.78);
  vignette.addColorStop(0, 'transparent');
  vignette.addColorStop(1, 'rgba(3,5,8,0.72)');
  hudCtx.globalAlpha = 0.9;
  hudCtx.fillStyle = vignette;
  hudCtx.fillRect(0, 0, width, height);
  hudCtx.globalAlpha = 1;
}

function drawClusterBridges(clusterScreens, time, s1, ent) {
  const macroAlpha = ent * (1 - s1 * 0.72);
  if (macroAlpha <= 0.02) return;

  let pairIndex = 0;
  for (let i = 0; i < clusterScreens.length; i++) {
    const a = clusterScreens[i];
    if (!a.visible) continue;
    for (let j = i + 1; j < clusterScreens.length; j++) {
      const b = clusterScreens[j];
      if (!b.visible) continue;

      const dx = b.sx - a.sx;
      const dy = b.sy - a.sy;
      const dist = Math.hypot(dx, dy) || 1;
      const perpX = -dy / dist;
      const perpY = dx / dist;
      const mx = (a.sx + b.sx) * 0.5;
      const my = (a.sy + b.sy) * 0.5;

      const inwardX = (width * 0.5 - mx) * 0.4;
      const inwardY = (height * 0.52 - my) * 0.4;
      const bend = Math.min(110, dist * 0.35) * (pairIndex % 2 === 0 ? 1 : -1);
      const cpx = mx + inwardX + perpX * bend;
      const cpy = my + inwardY + perpY * bend;

      const grad = hudCtx.createLinearGradient(a.sx, a.sy, b.sx, b.sy);
      grad.addColorStop(0, hexToRGBA(a.cluster.color, 0.9));
      grad.addColorStop(0.5, 'rgba(203,213,225,0.46)');
      grad.addColorStop(1, hexToRGBA(b.cluster.color, 0.9));

      hudCtx.globalAlpha = macroAlpha * 0.15;
      hudCtx.strokeStyle = grad;
      hudCtx.lineWidth = 1.15;
      hudCtx.setLineDash([2, 8]);
      hudCtx.lineDashOffset = -time * 16 - pairIndex * 5;
      hudCtx.beginPath();
      hudCtx.moveTo(a.sx, a.sy);
      hudCtx.quadraticCurveTo(cpx, cpy, b.sx, b.sy);
      hudCtx.stroke();
      hudCtx.setLineDash([]);

      hudCtx.globalAlpha = macroAlpha * 0.06;
      hudCtx.strokeStyle = 'rgba(203,213,225,0.34)';
      hudCtx.lineWidth = 0.7;
      hudCtx.beginPath();
      hudCtx.moveTo(a.sx, a.sy);
      hudCtx.quadraticCurveTo(cpx, cpy, b.sx, b.sy);
      hudCtx.stroke();

      const t = (time * (0.06 + pairIndex * 0.007) + pairIndex * 0.23) % 1;
      const pulse = quadBezierPt(t, a.sx, a.sy, cpx, cpy, b.sx, b.sy);
      hudCtx.globalAlpha = macroAlpha * 0.5;
      const pulseGlow = hudCtx.createRadialGradient(pulse.x, pulse.y, 0, pulse.x, pulse.y, 6.2);
      pulseGlow.addColorStop(0, 'rgba(255,255,255,0.82)');
      pulseGlow.addColorStop(0.28, hexToRGBA(a.cluster.color, 0.35));
      pulseGlow.addColorStop(1, 'transparent');
      hudCtx.fillStyle = pulseGlow;
      hudCtx.beginPath();
      hudCtx.arc(pulse.x, pulse.y, 6.2, 0, Math.PI * 2);
      hudCtx.fill();

      pairIndex++;
    }
  }

  hudCtx.globalAlpha = 1;
  hudCtx.setLineDash([]);
}

function drawClusterPill({ x, y, title, score, subCount, accent, riskLevel, alpha }) {
  if (alpha <= 0.01) return { x: x - 1, y, w: 2, h: 2 };

  hudCtx.globalAlpha = alpha;
  hudCtx.font = '650 11px "Sora", sans-serif';
  const titleWidth = hudCtx.measureText(title).width;
  hudCtx.font = '500 10px "IBM Plex Mono", monospace';
  const metaText = `NRI ${score} | ${subCount} narratives`;
  const metaWidth = hudCtx.measureText(metaText).width;

  const w = Math.max(titleWidth, metaWidth + 12) + 24;
  const h = 40;
  const boxX = x - w / 2;
  const boxY = y;

  hudCtx.fillStyle = 'rgba(8,11,16,0.86)';
  roundRect(hudCtx, boxX, boxY, w, h, 10);
  hudCtx.fill();

  hudCtx.globalAlpha = alpha * 0.5;
  hudCtx.strokeStyle = hexToRGBA(accent, 0.72);
  hudCtx.lineWidth = 0.85;
  roundRect(hudCtx, boxX, boxY, w, h, 10);
  hudCtx.stroke();

  hudCtx.globalAlpha = alpha * 0.22;
  hudCtx.fillStyle = hexToRGBA(accent, 0.9);
  roundRect(hudCtx, boxX + 5, boxY + h - 2, w - 10, 1.2, 1);
  hudCtx.fill();

  hudCtx.globalAlpha = alpha * 0.98;
  hudCtx.font = '650 11px "Sora", sans-serif';
  hudCtx.fillStyle = '#eaf0f9';
  hudCtx.textAlign = 'center';
  hudCtx.fillText(title, x, boxY + 14);

  hudCtx.font = '500 10px "IBM Plex Mono", monospace';
  hudCtx.fillStyle = 'rgba(194,201,214,0.88)';
  hudCtx.fillText(metaText, x + 5, boxY + 29);

  hudCtx.fillStyle = getRiskColor(riskLevel);
  hudCtx.beginPath();
  hudCtx.arc(x - metaWidth / 2 - 9, boxY + 25.5, 2.4, 0, Math.PI * 2);
  hudCtx.fill();

  hudCtx.globalAlpha = 1;
  return { x: boxX, y: boxY, w, h };
}

function drawSubPill({ x, y, text, accent, alpha }) {
  hudCtx.globalAlpha = alpha;
  hudCtx.font = '600 11px "Manrope", sans-serif';
  const tw = hudCtx.measureText(text).width;
  const w = tw + 24;
  const h = 27;
  const boxX = x - w / 2;
  const boxY = y;

  hudCtx.fillStyle = 'rgba(10,13,19,0.84)';
  roundRect(hudCtx, boxX, boxY, w, h, 8);
  hudCtx.fill();

  hudCtx.globalAlpha = alpha * 0.45;
  hudCtx.strokeStyle = hexToRGBA(accent, 0.82);
  hudCtx.lineWidth = 0.72;
  roundRect(hudCtx, boxX, boxY, w, h, 8);
  hudCtx.stroke();

  hudCtx.globalAlpha = alpha * 0.18;
  hudCtx.fillStyle = hexToRGBA(accent, 0.96);
  roundRect(hudCtx, boxX + 4, boxY + h - 2, w - 8, 1.2, 1);
  hudCtx.fill();

  hudCtx.globalAlpha = alpha * 0.98;
  hudCtx.fillStyle = '#f3f7ff';
  hudCtx.textAlign = 'center';
  hudCtx.fillText(text, x, boxY + 17);

  hudCtx.globalAlpha = 1;
  return { x: boxX, y: boxY, w, h };
}

function drawMicroTag({ x, y, text, accent, alpha }) {
  hudCtx.globalAlpha = alpha;
  hudCtx.font = '500 10px "IBM Plex Mono", monospace';
  const tw = hudCtx.measureText(text).width;
  const w = tw + 14;
  const h = 19;
  const boxX = x + 7;
  const boxY = y - 9;

  hudCtx.fillStyle = 'rgba(7,10,15,0.84)';
  roundRect(hudCtx, boxX, boxY, w, h, 5);
  hudCtx.fill();

  hudCtx.globalAlpha = alpha * 0.2;
  hudCtx.strokeStyle = hexToRGBA(accent, 0.92);
  hudCtx.lineWidth = 0.62;
  roundRect(hudCtx, boxX, boxY, w, h, 5);
  hudCtx.stroke();

  hudCtx.globalAlpha = alpha * 0.9;
  hudCtx.fillStyle = 'rgba(218,227,238,0.95)';
  hudCtx.textAlign = 'left';
  hudCtx.fillText(text, boxX + 7, boxY + 13);

  hudCtx.globalAlpha = 1;
  return { x: boxX, y: boxY, w, h };
}

function onResize() {
  if (!container || !renderer || !hudCanvas || !hudCtx) return;

  width = container.clientWidth;
  height = Math.max(1, container.clientHeight - VIEW_TOP_OFFSET);

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

function renderListView(listLayer) {
  listLayer.innerHTML = '';

  const totalNarratives = CLUSTERS.reduce((n, c) => n + c.subTopics.length, 0);
  const heading = document.createElement('div');
  heading.style.cssText =
    'padding:var(--sp-4) 0 var(--sp-16); margin-bottom:var(--sp-4); border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; justify-content:space-between;';
  heading.innerHTML = `
    <span style="font-family:var(--font-display); font-size:var(--text-md); font-weight:650; color:var(--text-primary);">Top-Narrative</span>
    <span style="font-size:var(--text-xs); color:var(--text-secondary);">${totalNarratives} Narrative | 3 Cluster</span>
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

export function destroyConstellation() {
  if (animFrame) cancelAnimationFrame(animFrame);
  animFrame = null;

  window.removeEventListener('resize', onResize);
  clearInteractionListeners();

  if (particlesMesh) {
    if (particlesMesh.geometry) particlesMesh.geometry.dispose();
    if (particlesMesh.material) {
      const texture = particlesMesh.material.uniforms?.pointTexture?.value;
      if (texture) texture.dispose();
      particlesMesh.material.dispose();
    }
  }

  if (renderer) renderer.dispose();

  scene = null;
  camera = null;
  renderer = null;
  particlesMesh = null;
  hudCanvas = null;
  hudCtx = null;

  particleData.length = 0;
  macroAnchors.length = 0;
  hitRegions.length = 0;
}
