/* ============================================================
   EXPORT BUTTON — Generate Board Report (fake flow)
   ============================================================ */

import { showToast } from '../motion.js';

export function createExportButton(container) {
  const btn = document.createElement('button');
  btn.className = 'btn btn--primary';
  btn.innerHTML = '<span>Generate Board Report</span>';

  btn.addEventListener('click', () => {
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> <span>Generating...</span>';
    btn.style.opacity = '0.8';

    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = '<span>Generate Board Report</span>';
      btn.style.opacity = '1';
      showToast('&#10003; &nbsp; Board Report (PDF) ready for download');
    }, 2400);
  });

  container.appendChild(btn);
  return btn;
}
