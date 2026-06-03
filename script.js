/* ── THEME TOGGLE ──────────────────────────────────────── */
const themeToggle = document.getElementById('themeToggle');
const themeIcon   = document.getElementById('themeIcon');
const root        = document.documentElement;

const saved = localStorage.getItem('ccp-theme') || 'dark';
applyTheme(saved);

themeToggle.addEventListener('click', () => {
  const next = root.dataset.theme === 'light' ? 'dark' : 'light';
  applyTheme(next);
  localStorage.setItem('ccp-theme', next);
});

function applyTheme(theme) {
  root.dataset.theme = theme;
  themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
}

/* ── LINK ORDERING ─────────────────────────────────────────
   Sort .link-card elements by their data-order attribute.
   Cards with no data-order default to 0 (top).
   To reorder: change data-order="N" in index.html.
──────────────────────────────────────────────────────────── */
function sortLinks() {
  const container = document.getElementById('links-container');
  if (!container) return;
  [...container.querySelectorAll('.link-card')]
    .sort((a, b) => (parseInt(a.dataset.order) || 0) - (parseInt(b.dataset.order) || 0))
    .forEach((card) => container.appendChild(card));
}

/* ── LINK ICONS ────────────────────────────────────────────
   Priority:
   1. data-icon="🎮"  → render that emoji
   2. href is a URL   → fetch site favicon via Google's API
   3. fallback        → generic chain-link SVG
──────────────────────────────────────────────────────────── */
function genericLinkSVG() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.innerHTML =
    '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>' +
    '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>';
  return svg;
}

function populateIcons() {
  document.querySelectorAll('.link-card').forEach((card) => {
    const iconEl     = card.querySelector('.link-card__icon');
    const customIcon = card.dataset.icon;
    const href       = card.getAttribute('href');

    if (customIcon) {
      iconEl.textContent = customIcon;
      return;
    }

    let domain = null;
    try {
      const url = new URL(href);
      domain = url.hostname;
    } catch {
      /* href is "#" or relative — skip favicon fetch */
    }

    if (domain) {
      const img = document.createElement('img');
      img.alt    = '';
      img.width  = 24;
      img.height = 24;
      img.onerror = () => { img.replaceWith(genericLinkSVG()); };
      img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      iconEl.appendChild(img);
    } else {
      iconEl.appendChild(genericLinkSVG());
    }
  });
}

sortLinks();
populateIcons();

/* ── SCROLL-TRIGGERED SECTION REVEAL ──────────────────── */
const sections = document.querySelectorAll('.section');

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 80);
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.08 }
);

sections.forEach((s) => observer.observe(s));

/* ── LINK CARD RIPPLE ──────────────────────────────────── */
document.querySelectorAll('.link-card').forEach((card) => {
  card.addEventListener('click', function (e) {
    const rect   = card.getBoundingClientRect();
    const size   = Math.max(rect.width, rect.height);
    const x      = e.clientX - rect.left - size / 2;
    const y      = e.clientY - rect.top  - size / 2;

    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute;
      width:  ${size}px;
      height: ${size}px;
      left:   ${x}px;
      top:    ${y}px;
      background: rgba(209,136,82,.15);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple .5s ease-out forwards;
      pointer-events: none;
    `;

    if (!document.getElementById('ripple-style')) {
      const style = document.createElement('style');
      style.id = 'ripple-style';
      style.textContent = '@keyframes ripple { to { transform: scale(2.5); opacity: 0; } }';
      document.head.appendChild(style);
    }

    card.style.position = 'relative';
    card.style.overflow = 'hidden';
    card.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
});
