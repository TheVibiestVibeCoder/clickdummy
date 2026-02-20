/* ============================================================
   CONSTELLATION MAP — Premium "Intel Map" WebGL Visualization

   Clean nodes, pulsing connections, volumetric fog, vignette.
   Level-of-detail zoom: Macro → Sub → Micro
   ============================================================ */

import { CLUSTERS, getClusterAvgScore } from '../data.js';
import { openClusterSheet, openSubSheet, openMicroSheet } from '../components/side-sheet.js';

let scene, camera, renderer, particlesMesh;
let hudCanvas, hudCtx;
let width, height;
let targetZoom = 1.0, currentZoom = 1.0;
let panX = 0, panY = 0, isDragging = false, lastMouseX = 0, lastMouseY = 0;
let lastTouchDist = 0;
let hitRegions = [];
let animFrame = null;
let connectionLines = [];

const PARTICLE_COUNT = 1800;
const particleData = [];

let container, canvasGL, canvasHUD, interactionLayer;
let zoomSlider, zoomValue, zoomReadout;

export function initConstellation(containerEl) {
  container = containerEl;

  // Create DOM elements
  container.innerHTML = `
    <div class="viz-controls">
      <div style="display:flex; align-items:center; gap:var(--sp-12);">
        <span class="panel__title" style="text-shadow: 0 2px 8px rgba(0,0,0,0.5);">Constellation Map</span>
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

    <div id="list-layer" class="list-layer" style="position:absolute; inset:0; top:48px; opacity:0; pointer-events:none; z-index:0; overflow-y:auto; padding:var(--sp-16); background:rgba(15,23,42,0.5);"></div>
  `;

  // Set up refs
  canvasGL = container.querySelector('#webgl-canvas');
  canvasHUD = container.querySelector('#hud-canvas');
  interactionLayer = container.querySelector('#interaction-layer');
  zoomSlider = container.querySelector('#zoom-slider');
  zoomValue = container.querySelector('#zoom-value');
  zoomReadout = container.querySelector('#zoom-readout');

  // View toggle
  const btnGraph = container.querySelector('#btn-graph');
  const btnList = container.querySelector('#btn-list');
  const graphLayer = container.querySelector('#graph-layer');
  const listLayer = container.querySelector('#list-layer');

  btnGraph.addEventListener('click', () => {
    btnGraph.classList.add('is-active');
    btnList.classList.remove('is-active');
    graphLayer.style.opacity = '1';
    graphLayer.style.pointerEvents = 'auto';
    listLayer.style.opacity = '0';
    listLayer.style.pointerEvents = 'none';
    onResize();
  });

  btnList.addEventListener('click', () => {
    btnList.classList.add('is-active');
    btnGraph.classList.remove('is-active');
    graphLayer.style.opacity = '0';
    graphLayer.style.pointerEvents = 'none';
    listLayer.style.opacity = '1';
    listLayer.style.pointerEvents = 'auto';
    renderListView(listLayer);
  });

  // Init Three.js
  if (typeof THREE === 'undefined') {
    zoomReadout.textContent = '3D Engine Offline';
    return destroyConstellation;
  }

  try {
    width = container.clientWidth;
    height = container.clientHeight - 48;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0f172a, 0.008);

    camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.z = 90;

    renderer = new THREE.WebGLRenderer({ canvas: canvasGL, alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    hudCanvas = canvasHUD;
    hudCtx = hudCanvas.getContext('2d');
    hudCanvas.width = width * Math.min(window.devicePixelRatio, 1.5);
    hudCanvas.height = height * Math.min(window.devicePixelRatio, 1.5);
    hudCanvas.style.width = width + 'px';
    hudCanvas.style.height = height + 'px';
    hudCtx.scale(Math.min(window.devicePixelRatio, 1.5), Math.min(window.devicePixelRatio, 1.5));

    generateParticles();
    generateConnections();
    setupInteraction();

    // Zoom controls
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

function generateParticles() {
  const geometry = new THREE.BufferGeometry();
  const positions = [], colors = [], sizes = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const cIdx = i % CLUSTERS.length;
    const c = CLUSTERS[cIdx];
    const sIdx = Math.floor(Math.random() * c.subTopics.length);
    const s = c.subTopics[sIdx];
    const mIdx = Math.floor(Math.random() * s.micro.length);
    const m = s.micro[mIdx];

    const l1 = sphericalOffset(18);
    const l2 = sphericalOffset(7);
    const l3 = sphericalOffset(3);

    particleData.push({
      cIdx, sIdx, mIdx,
      l1x: l1.x, l1y: l1.y, l1z: l1.z,
      l2x: l2.x, l2y: l2.y, l2z: l2.z,
      l3x: l3.x, l3y: l3.y, l3z: l3.z,
      c, s, m
    });

    positions.push(0, 0, 0);

    // Nodes neutral (white/grey), cluster color only as subtle tint
    const col = new THREE.Color(c.color);
    col.lerp(new THREE.Color(0xcccccc), 0.65); // Mostly neutral
    colors.push(col.r, col.g, col.b);
    sizes.push(Math.random() * 0.4 + 0.3);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      pointTexture: { value: createCircleTexture() },
      uTime: { value: 0 }
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (500.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D pointTexture;
      varying vec3 vColor;
      void main() {
        vec4 tex = texture2D(pointTexture, gl_PointCoord);
        gl_FragColor = vec4(vColor, 0.7) * tex;
      }
    `,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    transparent: true
  });

  particlesMesh = new THREE.Points(geometry, material);
  scene.add(particlesMesh);
}

function generateConnections() {
  // Create thin lines between cluster centers and sub-topics
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.04,
    blending: THREE.AdditiveBlending
  });

  CLUSTERS.forEach(c => {
    c.subTopics.forEach(s => {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(c.x, c.y, 0),
        new THREE.Vector3(c.x + s.offX, c.y + s.offY, 0)
      ]);
      const line = new THREE.Line(geometry, lineMaterial.clone());
      connectionLines.push(line);
      scene.add(line);
    });
  });
}

function createCircleTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,0.6)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.3)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.08)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
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

function setupInteraction() {
  let startX, startY;

  interactionLayer.addEventListener('mousedown', e => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    startX = e.clientX;
    startY = e.clientY;
  });

  window.addEventListener('mouseup', e => {
    const wasDragging = isDragging;
    isDragging = false;
    if (wasDragging && e.target === interactionLayer) {
      const dist = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));
      if (dist < 5) {
        const rect = interactionLayer.getBoundingClientRect();
        checkClick(e.clientX - rect.left, e.clientY - rect.top);
      }
    }
  });

  window.addEventListener('mousemove', e => {
    if (!isDragging) {
      // Hover cursor
      const rect = interactionLayer.getBoundingClientRect();
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

  // Touch events
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

function lerp(a, b, t) { return a * (1 - t) + b * t; }

function animate() {
  animFrame = requestAnimationFrame(animate);

  const time = Date.now() * 0.001;
  currentZoom += (targetZoom - currentZoom) * 0.15;
  camera.position.x += (panX - camera.position.x) * 0.15;
  camera.position.y += (-panY - camera.position.y) * 0.15;
  camera.position.z += ((110 / currentZoom) - camera.position.z) * 0.15;

  if (particlesMesh) {
    particlesMesh.rotation.y = Math.sin(time * 0.1) * 0.06;
    particlesMesh.material.uniforms.uTime.value = time;
  }

  // Interpolation factors
  let s1 = (currentZoom - 1.2) / 0.6;
  s1 = Math.max(0, Math.min(1, s1));
  s1 = s1 < 0.5 ? 2 * s1 * s1 : 1 - Math.pow(-2 * s1 + 2, 2) / 2;

  let s2 = (currentZoom - 2.2) / 0.6;
  s2 = Math.max(0, Math.min(1, s2));
  s2 = s2 < 0.5 ? 2 * s2 * s2 : 1 - Math.pow(-2 * s2 + 2, 2) / 2;

  // Update particles
  const pos = particlesMesh.geometry.attributes.position.array;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = particleData[i];
    const l1X = p.c.x + p.l1x, l1Y = p.c.y + p.l1y, l1Z = p.l1z;
    const l2X = p.c.x + p.s.offX + p.l2x, l2Y = p.c.y + p.s.offY + p.l2y, l2Z = p.l2z;
    const l3X = p.c.x + p.s.offX + p.m.offX + p.l3x, l3Y = p.c.y + p.s.offY + p.m.offY + p.l3y, l3Z = p.l3z;

    const arc1 = Math.sin(s1 * Math.PI) * 4;
    const arc2 = Math.sin(s2 * Math.PI) * 2;

    let cx = lerp(l1X, l2X, s1), cy = lerp(l1Y, l2Y, s1), cz = lerp(l1Z, l2Z, s1) + arc1;
    if (s2 > 0) {
      cx = lerp(cx, l3X, s2);
      cy = lerp(cy, l3Y, s2);
      cz = lerp(cz, l3Z, s2) + arc2;
    }
    pos[i * 3] = cx; pos[i * 3 + 1] = cy; pos[i * 3 + 2] = cz;
  }
  particlesMesh.geometry.attributes.position.needsUpdate = true;

  // Pulse connection lines
  connectionLines.forEach((line, i) => {
    const pulse = 0.03 + Math.sin(time * 0.8 + i) * 0.02;
    line.material.opacity = pulse * (1 + s1 * 0.5);
  });

  renderer.render(scene, camera);
  drawHUD(s1, s2, time);
}

function drawHUD(s1, s2, time) {
  hudCtx.clearRect(0, 0, width, height);
  hitRegions = [];

  // Vignette
  const vg = hudCtx.createRadialGradient(width / 2, height / 2, width * 0.25, width / 2, height / 2, width * 0.65);
  vg.addColorStop(0, 'transparent');
  vg.addColorStop(1, 'rgba(15, 23, 42, 0.5)');
  hudCtx.fillStyle = vg;
  hudCtx.fillRect(0, 0, width, height);

  // Subtle grid
  hudCtx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
  hudCtx.lineWidth = 1;
  const gs = 80 * currentZoom;
  const ox = (panX * 15) % gs, oy = (-panY * 15) % gs;
  hudCtx.beginPath();
  for (let x = ox; x < width; x += gs) { hudCtx.moveTo(x, 0); hudCtx.lineTo(x, height); }
  for (let y = oy; y < height; y += gs) { hudCtx.moveTo(0, y); hudCtx.lineTo(width, y); }
  hudCtx.stroke();

  CLUSTERS.forEach(c => {
    const v = new THREE.Vector3(c.x, c.y, 0);
    v.project(camera);
    const sx = (v.x * 0.5 + 0.5) * width;
    const sy = (-(v.y * 0.5) + 0.5) * height;
    if (v.z > 1 || v.z < -1) return;

    // Cluster labels (macro level)
    if (s1 < 1.0) {
      hudCtx.globalAlpha = 1 - s1;

      // Node halo
      hudCtx.fillStyle = c.color;
      hudCtx.globalAlpha = (1 - s1) * (0.08 + Math.sin(time + c.id) * 0.03);
      hudCtx.beginPath();
      hudCtx.arc(sx, sy, 30 + Math.sin(time * 0.5 + c.id) * 5, 0, Math.PI * 2);
      hudCtx.fill();

      hudCtx.globalAlpha = 1 - s1;
      hudCtx.font = '600 13px Inter';
      hudCtx.textAlign = 'center';
      hudCtx.fillStyle = c.color;
      hudCtx.fillText(c.label, sx, sy - 26);

      // NRI summary label
      const avgScore = getClusterAvgScore(c);
      hudCtx.font = '400 10px "JetBrains Mono"';
      hudCtx.fillStyle = 'rgba(148,163,184,0.8)';
      hudCtx.fillText(`Score: ${avgScore > 0 ? '+' : ''}${avgScore}`, sx, sy - 12);

      const m = hudCtx.measureText(c.label);
      hitRegions.push({
        x: sx - m.width / 2 - 10, y: sy - 40, w: m.width + 20, h: 36,
        action: () => openClusterSheet(c)
      });
    }

    // Sub-topic labels
    if (s1 > 0.01) {
      c.subTopics.forEach((sub, si) => {
        const vs = new THREE.Vector3(c.x + sub.offX, c.y + sub.offY, 0);
        vs.project(camera);
        const ssx = (vs.x * 0.5 + 0.5) * width;
        const ssy = (-(vs.y * 0.5) + 0.5) * height;

        let a = s1;
        if (s2 > 0) a = s1 * (1 - s2 * 0.6);

        // Connection line (HUD)
        hudCtx.globalAlpha = a * 0.15;
        hudCtx.strokeStyle = c.color;
        hudCtx.lineWidth = 1;
        // Pulse effect
        const pulse = 0.5 + Math.sin(time * 1.5 + si) * 0.5;
        hudCtx.setLineDash([4, 4]);
        hudCtx.lineDashOffset = -time * 20;
        hudCtx.beginPath();
        hudCtx.moveTo(sx, sy);
        hudCtx.lineTo(ssx, ssy);
        hudCtx.stroke();
        hudCtx.setLineDash([]);

        if (s2 < 0.8) {
          hudCtx.globalAlpha = a;
          hudCtx.font = '500 11px Inter';
          const tw = hudCtx.measureText(sub.label).width;
          const pad = 10;
          const boxX = ssx - tw / 2 - pad;
          const boxY = ssy + 8;
          const boxH = 26;

          // Glass card background
          hudCtx.fillStyle = 'rgba(30, 41, 59, 0.85)';
          roundRect(hudCtx, boxX, boxY, tw + pad * 2, boxH, 6);
          hudCtx.fill();

          // Bottom accent line
          hudCtx.fillStyle = c.color;
          hudCtx.globalAlpha = a * 0.6;
          hudCtx.fillRect(boxX + 1, boxY + boxH - 2, tw + pad * 2 - 2, 2);

          // Inner highlight
          hudCtx.globalAlpha = a * 0.1;
          hudCtx.strokeStyle = 'rgba(255,255,255,0.2)';
          hudCtx.lineWidth = 0.5;
          roundRect(hudCtx, boxX, boxY, tw + pad * 2, boxH, 6);
          hudCtx.stroke();

          hudCtx.globalAlpha = a;
          hudCtx.fillStyle = '#fff';
          hudCtx.textAlign = 'center';
          hudCtx.fillText(sub.label, ssx, boxY + 16);

          hitRegions.push({
            x: boxX, y: boxY, w: tw + pad * 2, h: boxH,
            action: () => openSubSheet(sub, c)
          });
        }

        // Micro-narratives
        if (s2 > 0.01) {
          sub.micro.forEach(mic => {
            const vm = new THREE.Vector3(c.x + sub.offX + mic.offX, c.y + sub.offY + mic.offY, 0);
            vm.project(camera);
            const msx = (vm.x * 0.5 + 0.5) * width;
            const msy = (-(vm.y * 0.5) + 0.5) * height;

            // Connection
            hudCtx.globalAlpha = s2 * 0.1;
            hudCtx.strokeStyle = c.color;
            hudCtx.lineWidth = 0.5;
            hudCtx.beginPath();
            hudCtx.moveTo(ssx, ssy);
            hudCtx.lineTo(msx, msy);
            hudCtx.stroke();

            // Micro label chip
            hudCtx.globalAlpha = s2;
            hudCtx.font = '400 9px "JetBrains Mono"';
            const mtw = hudCtx.measureText(mic.label).width;
            const mx = msx + 4, my = msy - 6, mw = mtw + 10, mh = 16;

            hudCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            roundRect(hudCtx, mx, my, mw, mh, 4);
            hudCtx.fill();

            hudCtx.fillStyle = 'rgba(203,213,225,0.9)';
            hudCtx.textAlign = 'left';
            hudCtx.fillText(mic.label, msx + 9, msy + 5);

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

function onResize() {
  if (!container || !renderer) return;
  width = container.clientWidth;
  height = container.clientHeight - 48;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  const dpr = Math.min(window.devicePixelRatio, 1.5);
  hudCanvas.width = width * dpr;
  hudCanvas.height = height * dpr;
  hudCanvas.style.width = width + 'px';
  hudCanvas.style.height = height + 'px';
  hudCtx.setTransform(1, 0, 0, 1, 0, 0);
  hudCtx.scale(dpr, dpr);
}

function renderListView(listLayer) {
  listLayer.innerHTML = '';
  CLUSTERS.forEach(c => {
    const group = document.createElement('div');
    group.style.marginBottom = 'var(--sp-24)';

    const header = document.createElement('div');
    header.style.cssText = `font-weight:600; font-size:var(--text-base); color:${c.color}; padding-bottom:var(--sp-8); border-bottom:1px solid var(--border-subtle); margin-bottom:var(--sp-12); cursor:pointer;`;
    header.textContent = c.label;
    header.addEventListener('click', () => openClusterSheet(c));
    group.appendChild(header);

    c.subTopics.forEach(sub => {
      const item = document.createElement('div');
      item.className = 'narrative-card';
      item.innerHTML = `
        <div class="narrative-card__title">${sub.label}</div>
        <div style="font-size:var(--text-sm); color:var(--text-secondary); margin-top:var(--sp-4);">${sub.explanation}</div>
      `;
      item.addEventListener('click', () => openSubSheet(sub, c));
      group.appendChild(item);
    });

    listLayer.appendChild(group);
  });
}

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
  connectionLines = [];
}
