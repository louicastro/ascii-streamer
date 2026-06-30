// ─── Character Sets ────────────────────────────────────────────────────────

export const CHAR_SETS = {
  standard:  ' .:-=+*#%@',
  extended:  ' .\'`^",:;Il!i><~+_-?][}{1)(|\\tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  block:     ' \u2591\u2592\u2593\u2588',
  minimal:   ' .oO0',
  braille:   ' \u2801\u2802\u2803\u2804\u2808\u280a\u280b\u280c\u2810\u2813\u2814\u2818\u281b\u281c\u2820\u2828\u2830\u2838\u2840\u2848\u2850\u2858\u2860\u2868\u2870\u2880\u2881\u2882\u2884\u2888\u2890\u28a0\u28c0\u28e0\u28f8',
};

// ─── ANSI Colour Tables ─────────────────────────────────────────────────────

const ANSI16 = [
  [0,0,0],[128,0,0],[0,128,0],[128,128,0],
  [0,0,128],[128,0,128],[0,128,128],[192,192,192],
  [128,128,128],[255,0,0],[0,255,0],[255,255,0],
  [0,0,255],[255,0,255],[0,255,255],[255,255,255],
];

// Precompute the full 256-colour palette for fast nearest-colour lookup
const ANSI256 = (() => {
  const t = [];
  // 0-15: standard colours
  for (const c of ANSI16) t.push(c);
  // 16-231: 6x6x6 cube
  const lvl = [0,95,135,175,215,255];
  for (let r = 0; r < 6; r++)
    for (let g = 0; g < 6; g++)
      for (let b = 0; b < 6; b++)
        t.push([lvl[r],lvl[g],lvl[b]]);
  // 232-255: greyscale ramp
  for (let i = 0; i < 24; i++) { const v = 8 + i*10; t.push([v,v,v]); }
  return t;
})();

// ─── Colour Helpers ─────────────────────────────────────────────────────────

function closestRgb(palette, r, g, b) {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const [pr, pg, pb] = palette[i];
    const d = (r-pr)**2 + (g-pg)**2 + (b-pb)**2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return palette[best];
}

// ─── Image Adjustments ──────────────────────────────────────────────────────

function clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

function adjustPixel(r, g, b, brightness, contrast, gamma, saturation) {
  // Brightness  (-100..100 → ±255)
  if (brightness !== 0) {
    const d = brightness * 2.55;
    r += d; g += d; b += d;
  }

  // Contrast  (-100..100)
  if (contrast !== 0) {
    const f = (259 * (contrast + 255)) / (255 * (259 - contrast));
    r = f * (r - 128) + 128;
    g = f * (g - 128) + 128;
    b = f * (b - 128) + 128;
  }

  // Saturation  (-100..100)
  if (saturation !== 0) {
    const gray = 0.299*r + 0.587*g + 0.114*b;
    const s = (saturation + 100) / 100;
    r = gray + s*(r - gray);
    g = gray + s*(g - gray);
    b = gray + s*(b - gray);
  }

  // Gamma  (-100..100)
  if (gamma !== 0) {
    const gv = gamma > 0 ? 1/(1 + gamma/100) : 1 + Math.abs(gamma)/100;
    r = 255 * Math.pow(clamp(r)/255, gv);
    g = 255 * Math.pow(clamp(g)/255, gv);
    b = 255 * Math.pow(clamp(b)/255, gv);
  }

  return [clamp(r), clamp(g), clamp(b)];
}

// ─── HTML Escape (for chars inside innerHTML rows) ─────────────────────────

const ESC = { '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":"&#39;" };
function esc(ch) { return ESC[ch] || ch; }

// ─── AsciliEngine ───────────────────────────────────────────────────────────

export class AsciliEngine {
  constructor() {
    this._canvas  = document.createElement('canvas');
    this._ctx     = this._canvas.getContext('2d', { willReadFrequently: true });
    this._prevRows = null;
  }

  /**
   * Render one frame from a live HTMLVideoElement into an output container.
   *
   * @param {HTMLVideoElement} videoEl
   * @param {HTMLElement}      outputEl  – container whose children are .ascii-line divs
   * @param {object}           config
   * @returns {{ rows:number, cols:number, chars:number }}
   */
  renderFrame(videoEl, outputEl, config) {
    const {
      cols = 80,
      colorMode = 'monochrome',
      charSet = CHAR_SETS.standard,
      invertChars = false,
      brightness = 0, contrast = 0, gamma = 0, saturation = 0,
    } = config;

    const vw = videoEl.videoWidth  || 640;
    const vh = videoEl.videoHeight || 480;

    // Rows: preserve aspect ratio; chars are ~2× taller than wide
    const rows = Math.max(1, Math.round(cols * (vh / vw) * 0.45));

    // Resize offscreen canvas to output resolution
    if (this._canvas.width !== cols || this._canvas.height !== rows) {
      this._canvas.width  = cols;
      this._canvas.height = rows;
    }

    this._ctx.drawImage(videoEl, 0, 0, cols, rows);

    let data;
    try {
      data = this._ctx.getImageData(0, 0, cols, rows).data;
    } catch {
      return { rows, cols, chars: 0 };
    }

    const chars   = charSet.split('');
    const nChars  = chars.length;
    const doAdj   = brightness || contrast || gamma || saturation;
    const isMono  = colorMode === 'monochrome';
    const newRows = [];

    for (let row = 0; row < rows; row++) {
      let line = '';
      for (let col = 0; col < cols; col++) {
        const i = (row * cols + col) * 4;
        let r = data[i], g = data[i+1], b = data[i+2];

        if (doAdj) [r, g, b] = adjustPixel(r, g, b, brightness, contrast, gamma, saturation);

        const lum     = (0.299*r + 0.587*g + 0.114*b) / 255;
        let   charIdx = Math.round(lum * (nChars - 1));
        if (invertChars) charIdx = nChars - 1 - charIdx;
        const ch = esc(chars[charIdx] ?? ' ');

        if (isMono) {
          line += ch;
        } else if (colorMode === 'grayscale') {
          const v = Math.round(lum * 255);
          line += `<span style="color:rgb(${v},${v},${v})">${ch}</span>`;
        } else if (colorMode === 'truecolor') {
          line += `<span style="color:rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})">${ch}</span>`;
        } else if (colorMode === 'ansi16') {
          const [cr,cg,cb] = closestRgb(ANSI16, r, g, b);
          line += `<span style="color:rgb(${cr},${cg},${cb})">${ch}</span>`;
        } else if (colorMode === 'ansi256') {
          const [cr,cg,cb] = closestRgb(ANSI256, r, g, b);
          line += `<span style="color:rgb(${cr},${cg},${cb})">${ch}</span>`;
        }
      }
      newRows.push(line);
    }

    this._applyDelta(outputEl, newRows, isMono);
    this._prevRows = newRows;

    return { rows, cols, chars: rows * cols };
  }

  /** Delta-update: only touch DOM lines that changed */
  _applyDelta(outputEl, newRows, isMono) {
    const children = outputEl.children;
    // Add missing line divs
    while (children.length < newRows.length) {
      const div = document.createElement('div');
      div.className = 'ascii-line';
      outputEl.appendChild(div);
    }
    // Remove extra line divs
    while (children.length > newRows.length) {
      outputEl.removeChild(outputEl.lastChild);
    }
    // Update only changed lines
    for (let i = 0; i < newRows.length; i++) {
      if (!this._prevRows || this._prevRows[i] !== newRows[i]) {
        if (isMono) {
          children[i].textContent = newRows[i];
        } else {
          children[i].innerHTML = newRows[i];
        }
      }
    }
  }

  /** Call when switching sources to prevent stale delta comparisons */
  reset() { this._prevRows = null; }
}
