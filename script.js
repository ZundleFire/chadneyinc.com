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

/* ── WATER WORLD (WebGL) ───────────────────────────────────── */
(function waterRipples() {

  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:0;';
  document.body.appendChild(cv);

  const gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: false });
  if (!gl) return;

  let W, H;
  function resize() {
    W = cv.width  = window.innerWidth;
    H = cv.height = window.innerHeight;
    gl.viewport(0, 0, W, H);
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Shaders ───────────────────────────────────────────────
  const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FRAG = `#version 300 es
precision mediump float;
uniform float uTime;
uniform vec2  uRes;
uniform float uDark;
uniform int   uN;
uniform vec2  uPos[10];
uniform float uAge[10];
uniform float uAmp[10];
out vec4 fragColor;

float caustic(vec2 p, float t) {
  p.x += sin(p.y * 2.1 + t * 0.43) * 0.30;
  p.y += sin(p.x * 1.9 - t * 0.34) * 0.30;
  float a = sin(p.x * 2.8 + sin(p.y * 2.1 + t * 0.38) * 1.7);
  float b = sin(p.y * 3.2 + sin(p.x * 2.5 - t * 0.30) * 1.5);
  return pow(clamp((a * b + 1.0) * 0.5, 0.0, 1.0), 5.5);
}

void main() {
  vec2  uv  = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2  uvA = vec2(uv.x * asp, uv.y);

  float caus = caustic(uvA * 5.5,         uTime)               * 0.58
             + caustic(uvA * 8.5 + 0.35,  uTime * 0.72)        * 0.36
             + caustic(uvA * 3.5 - 0.55,  uTime * 0.51 + 1.15) * 0.24;
  caus = clamp(caus, 0.0, 1.0);

  // Horizontal wave shimmer lines
  float wl = 0.0;
  for (int i = 0; i < 10; i++) {
    float fi = float(i);
    float by = (fi + 0.5) / 10.0;
    float t  = uTime * 0.30;
    float w  = by
      + sin(uv.x * asp * 6.2  + fi * 0.88 + t)        * 0.014
      + sin(uv.x * asp * 3.5  - fi * 0.63 - t * 0.60) * 0.009
      + sin(uv.x * asp * 10.8 + fi * 1.22 + t * 1.15) * 0.005;
    wl += 0.0058 / (abs(uv.y - w) * 90.0 + 1.0);
  }

  // Ripple rings — wide soft light pulses that displace and brighten caustic
  float ringLight = 0.0;
  float spd = 0.24;
  float gap = 0.028;
  for (int i = 0; i < uN; i++) {
    float age  = uAge[i];
    float amp  = uAmp[i];
    float rad  = age * spd;
    float fade = exp(-age * 0.85) * amp;
    vec2  d      = (uv - uPos[i]) * vec2(asp, 1.0);
    float angle  = atan(d.y, d.x);
    float wobble = sin(angle * 3.0 + age * 1.6) * 0.022
                 + sin(angle * 5.5 - age * 2.1) * 0.013;
    float dist   = length(d) * (1.0 + wobble);
    for (int k = 0; k < 3; k++) {
      float rk = rad - float(k) * gap;
      float dd = dist - rk;
      // Wider Gaussian (80 vs 210) = softer, more natural light pulse
      ringLight += exp(-80.0 * dd * dd) * step(0.001, rk) * fade * exp(-float(k) * 0.55);
    }
  }

  vec3  base    = mix(vec3(0.88, 0.93, 0.90), vec3(0.05, 0.12, 0.26), uDark);
  vec3  causCol = mix(vec3(0.05, 0.28, 0.62), vec3(0.30, 0.80, 1.00), uDark);
  vec3  col     = mix(base, causCol, pow(caus, 0.62) * 0.95);

  col = mix(col, vec3(0.88, 0.93, 0.95), clamp(ringLight * 0.55, 0.0, 0.42));

  float alpha   = caus  * mix(0.72, 1.30, uDark)
                + wl    * mix(0.48, 0.90, uDark)
                + clamp(ringLight * 0.72, 0.0, 0.84) * mix(0.45, 1.0, uDark);

  fragColor = vec4(col, clamp(alpha, 0.0, 0.94));
}`;

  function mkShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      console.error('GLSL:', gl.getShaderInfoLog(s));
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, mkShader(gl.VERTEX_SHADER,   VERT));
  gl.attachShader(prog, mkShader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  // Fullscreen quad
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const aLoc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aLoc);
  gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uRes  = gl.getUniformLocation(prog, 'uRes');
  const uDark = gl.getUniformLocation(prog, 'uDark');
  const uN    = gl.getUniformLocation(prog, 'uN');
  const uPos  = gl.getUniformLocation(prog, 'uPos');
  const uAge  = gl.getUniformLocation(prog, 'uAge');
  const uAmp  = gl.getUniformLocation(prog, 'uAmp');

  const MAX    = 10;
  const posArr = new Float32Array(MAX * 2);
  const ageArr = new Float32Array(MAX);
  const ampArr = new Float32Array(MAX);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // SVG displacement filter — makes CSS rings slightly wobbly (non-perfect circles)
  const warpSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  warpSvg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden;');
  warpSvg.innerHTML = `<defs><filter id="rw" x="-25%" y="-25%" width="150%" height="150%">
    <feTurbulence type="turbulence" baseFrequency="0.025 0.015" numOctaves="3" seed="8" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="14" xChannelSelector="R" yChannelSelector="G"/>
  </filter></defs>`;
  document.body.appendChild(warpSvg);

  const ripples  = [];
  const nowSec   = () => performance.now() / 1000;
  const isLight  = () => document.documentElement.dataset.theme === 'light';
  const easeOut2 = t  => 1 - (1 - Math.min(t, 1)) ** 2;

  function edgeDist(cx, cy, rect) {
    const nx = Math.max(rect.left, Math.min(cx, rect.right));
    const ny = Math.max(rect.top,  Math.min(cy, rect.bottom));
    return Math.hypot(nx - cx, ny - cy);
  }

  const reactors = [
    ...document.querySelectorAll('.link-card'),
    ...document.querySelectorAll('.social-btn'),
    document.querySelector('.avatar-wrap'),
  ].filter(Boolean);

  let activeBlurDivs = 0;

  function spawnBlurDiv(cx, cy) {
    if (activeBlurDivs >= 3) return;
    activeBlurDivs++;
    const el   = document.createElement('div');
    const rw   = 36;
    const maxS = Math.hypot(W, H) * 2.6;
    el.style.cssText = [
      'position:fixed', 'pointer-events:none', 'z-index:0', 'border-radius:50%',
      'background:rgba(255,255,255,0.07)', 'backdrop-filter:blur(10px)', '-webkit-backdrop-filter:blur(10px)',
      'filter:url(#rw)',
      `mask-image:radial-gradient(circle,transparent calc(50% - ${rw+14}px),rgba(0,0,0,.95) calc(50% - ${rw}px),rgba(0,0,0,.95) calc(50% + ${rw}px),transparent calc(50% + ${rw+14}px))`,
      `-webkit-mask-image:radial-gradient(circle,transparent calc(50% - ${rw+14}px),rgba(0,0,0,.95) calc(50% - ${rw}px),rgba(0,0,0,.95) calc(50% + ${rw}px),transparent calc(50% + ${rw+14}px))`,
    ].join(';');
    document.body.appendChild(el);
    gsap.fromTo(el,
      { width: 10, height: 10, left: cx - 5, top: cy - 5, opacity: 0.95 },
      { width: maxS, height: maxS, left: cx - maxS / 2, top: cy - maxS / 2,
        opacity: 0, duration: 2.8, ease: 'power2.out', onComplete: () => { activeBlurDivs--; el.remove(); } }
    );
  }

  function addRipple(cx, cy) {
    if (ripples.length >= MAX) ripples.shift();
    ripples.push({ cx, cy, uvx: cx / W, uvy: 1 - cy / H,
                   t0: nowSec(), dur: 2.8, maxR: Math.hypot(W, H) * 1.30,
                   amp: 1.0, react: true, hit: new Set() });
    spawnBlurDiv(cx, cy);
  }

  const startT = nowSec();
  gsap.ticker.add(() => {
    const now = nowSec();
    const t   = now - startT;
    let n = 0;

    for (let i = ripples.length - 1; i >= 0; i--) {
      const r   = ripples[i];
      const age = now - r.t0;
      if (age > r.dur + 0.1) { ripples.splice(i, 1); continue; }
      const radiusPx = r.maxR * easeOut2(age / r.dur);

      if (r.react) {
        reactors.forEach((el, j) => {
          if (r.hit.has(j)) return;
          const rect = el.getBoundingClientRect();
          if (radiusPx < edgeDist(r.cx, r.cy, rect)) return;
          r.hit.add(j);

          const cx2  = rect.left + rect.width / 2;
          const tilt = r.cx < cx2 ? 2.0 : -2.0;

          gsap.timeline({ overwrite: 'auto' })
            .to(el, { y: -8, rotation: tilt, scale: 1.02, duration: .25, ease: 'sine.out' })
            .to(el, { y: 0, rotation: 0, scale: 1, duration: .65, ease: 'elastic.out(1, 0.55)' })
            .set(el, { clearProps: 'transform' });

          gsap.fromTo(el,
            { filter: 'brightness(1)' },
            { filter: 'brightness(1.15) drop-shadow(0 4px 14px rgba(80,185,230,.40))',
              duration: .28, yoyo: true, repeat: 1, ease: 'sine.inOut', overwrite: 'auto',
              onComplete: () => gsap.set(el, { clearProps: 'filter' }) });
        });
      }

      if (n < MAX) {
        posArr[n * 2]     = r.uvx;
        posArr[n * 2 + 1] = r.uvy;
        ageArr[n]         = age;
        ampArr[n]         = r.amp;
        n++;
      }
    }

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uTime, t);
    gl.uniform2f(uRes,  W, H);
    gl.uniform1f(uDark, isLight() ? 0.0 : 1.0);
    gl.uniform1i(uN,    n);
    gl.uniform2fv(uPos, posArr);
    gl.uniform1fv(uAge, ageArr);
    gl.uniform1fv(uAmp, ampArr);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  });

  document.addEventListener('click', (e) => addRipple(e.clientX, e.clientY));
})();

/* ── KNOXVILLE LOCAL OFFER MODAL ───────────────────────── */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwKA1123sFDa1Pu1Md_B3N2nGe2p8gzhNkg0P_QZ7qOktKVsCiY-ykKOJAonYfFqK4/exec';

const localModal   = document.getElementById('localModal');
const openLocalBtn = document.getElementById('openLocalOffer');
const closeModalBtn = document.getElementById('closeModal');
const localForm    = document.getElementById('localForm');
const modalSuccess = document.getElementById('modalSuccess');

function openLocalModal() {
  localModal.classList.add('is-open');
  localModal.removeAttribute('aria-hidden');
  document.body.style.overflow = 'hidden';
  closeModalBtn.focus();
}

function closeLocalModal() {
  localModal.classList.remove('is-open');
  localModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  openLocalBtn.focus();
}

openLocalBtn.addEventListener('click', openLocalModal);
closeModalBtn.addEventListener('click', closeLocalModal);

localModal.addEventListener('click', (e) => {
  if (e.target === localModal) closeLocalModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && localModal.classList.contains('is-open')) closeLocalModal();
});

const phoneInput = document.getElementById('fieldPhone');

phoneInput.addEventListener('blur', () => {
  if (phoneInput.value && !phoneInput.validity.valid) {
    phoneInput.classList.add('show-error');
  } else {
    phoneInput.classList.remove('show-error');
  }
});

phoneInput.addEventListener('input', () => {
  if (phoneInput.validity.valid) phoneInput.classList.remove('show-error');
});

localForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!phoneInput.validity.valid) {
    phoneInput.classList.add('show-error');
    phoneInput.focus();
    return;
  }

  const submitBtn = localForm.querySelector('.modal__submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';

  try {
    await fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: new FormData(localForm) });
  } catch (_) { /* no-cors fetch is opaque — errors are network failures only */ }

  localForm.hidden = true;
  modalSuccess.removeAttribute('hidden');
});
