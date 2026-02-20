/* ============================================================
   MOTION — Web Animations API utilities
   ============================================================ */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function getDuration(ms) {
  return prefersReducedMotion.matches ? 0 : ms;
}

// Standard easing curves
const EASE = {
  standard: 'cubic-bezier(0.16, 1, 0.3, 1)',
  subtle: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)'
};

/* ── Page Enter: panels from bottom + opacity + blur ── */
export function animatePageEnter(container) {
  const panels = container.querySelectorAll('.panel, .nri-hero, [data-animate]');
  panels.forEach((panel, i) => {
    panel.animate([
      { opacity: 0, transform: 'translateY(16px)', filter: 'blur(8px)' },
      { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' }
    ], {
      duration: getDuration(520),
      delay: getDuration(i * 60),
      easing: EASE.standard,
      fill: 'both'
    });
  });
}

/* ── Count-up animation for metric numbers ── */
export function animateCountUp(element, target, duration = 1200, prefix = '', suffix = '') {
  if (prefersReducedMotion.matches) {
    element.textContent = prefix + target + suffix;
    return;
  }

  const start = performance.now();
  const startVal = 0;
  const dur = getDuration(duration);

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / dur, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(startVal + (target - startVal) * eased);
    element.textContent = prefix + current + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ── Subscore bar fill animation ── */
export function animateBarFill(element, targetWidth, delay = 0) {
  element.animate([
    { width: '0%' },
    { width: targetWidth + '%' }
  ], {
    duration: getDuration(1400),
    delay: getDuration(delay),
    easing: EASE.standard,
    fill: 'forwards'
  });
}

/* ── Shared element transition (morph from source rect) ── */
export function morphTransition(sourceEl, targetEl) {
  if (prefersReducedMotion.matches || !sourceEl) return;

  const sourceRect = sourceEl.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();

  const scaleX = sourceRect.width / targetRect.width;
  const scaleY = sourceRect.height / targetRect.height;
  const translateX = sourceRect.left - targetRect.left;
  const translateY = sourceRect.top - targetRect.top;

  targetEl.animate([
    {
      transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`,
      opacity: 0.5,
      borderRadius: '8px'
    },
    {
      transform: 'translate(0, 0) scale(1, 1)',
      opacity: 1,
      borderRadius: '0'
    }
  ], {
    duration: getDuration(420),
    easing: EASE.standard,
    fill: 'both'
  });
}

/* ── Side sheet slide in ── */
export function slideInSheet(sheetEl) {
  sheetEl.animate([
    { transform: 'translateX(100%)' },
    { transform: 'translateX(0)' }
  ], {
    duration: getDuration(380),
    easing: EASE.standard,
    fill: 'forwards'
  });
}

/* ── Stagger children animation ── */
export function staggerIn(container, selector, delay = 40) {
  const items = container.querySelectorAll(selector);
  items.forEach((item, i) => {
    item.animate([
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], {
      duration: getDuration(320),
      delay: getDuration(i * delay),
      easing: EASE.standard,
      fill: 'both'
    });
  });
}

/* ── Toast notification ── */
export function showToast(message, duration = 3000) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.innerHTML = message;
  toast.classList.add('is-visible');

  setTimeout(() => {
    toast.classList.remove('is-visible');
  }, duration);
}

/* ── Pulse glow on element ── */
export function pulseGlow(element) {
  element.animate([
    { boxShadow: '0 0 0 0 rgba(255, 140, 90, 0.4)' },
    { boxShadow: '0 0 0 12px rgba(255, 140, 90, 0)' }
  ], {
    duration: getDuration(800),
    easing: EASE.out
  });
}
