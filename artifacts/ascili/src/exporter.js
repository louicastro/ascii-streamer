// ─── Canvas Frame Renderer ─────────────────────────────────────────────────
// Renders one video frame as ASCII art directly onto an HTMLCanvasElement.
// Used by AsciliVideoExporter to produce the recording canvas frames.

import { CHAR_SETS } from './engine.js';

// Reuse a single offscreen canvas across calls to avoid GC pressure
let _offscreen = null;
let _offCtx    = null;

function getOffscreen(w, h) {
  if (!_offscreen) {
    _offscreen = document.createElement('canvas');
    _offCtx    = _offscreen.getContext('2d', { willReadFrequently: true });
  }
  if (_offscreen.width !== w || _offscreen.height !== h) {
    _offscreen.width  = w;
    _offscreen.height = h;
  }
  return { canvas: _offscreen, ctx: _offCtx };
}

const ANSI16 = [
  [0,0,0],[128,0,0],[0,128,0],[128,128,0],
  [0,0,128],[128,0,128],[0,128,128],[192,192,192],
  [128,128,128],[255,0,0],[0,255,0],[255,255,0],
  [0,0,255],[255,0,255],[0,255,255],[255,255,255],
];

const ANSI256 = (() => {
  const t = [];
  for (const c of ANSI16) t.push(c);
  const lvl = [0,95,135,175,215,255];
  for (let r = 0; r < 6; r++)
    for (let g = 0; g < 6; g++)
      for (let b = 0; b < 6; b++)
        t.push([lvl[r],lvl[g],lvl[b]]);
  for (let i = 0; i < 24; i++) { const v = 8+i*10; t.push([v,v,v]); }
  return t;
})();

function clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

function adjustPixel(r, g, b, brightness, contrast, gamma, saturation) {
  if (brightness) { const d = brightness*2.55; r+=d; g+=d; b+=d; }
  if (contrast) {
    const f = (259*(contrast+255))/(255*(259-contrast));
    r = f*(r-128)+128; g = f*(g-128)+128; b = f*(b-128)+128;
  }
  if (saturation) {
    const gray = 0.299*r+0.587*g+0.114*b, s=(saturation+100)/100;
    r = gray+s*(r-gray); g = gray+s*(g-gray); b = gray+s*(b-gray);
  }
  if (gamma) {
    const gv = gamma>0 ? 1/(1+gamma/100) : 1+Math.abs(gamma)/100;
    r = 255*Math.pow(clamp(r)/255,gv);
    g = 255*Math.pow(clamp(g)/255,gv);
    b = 255*Math.pow(clamp(b)/255,gv);
  }
  return [clamp(r),clamp(g),clamp(b)];
}

function closestRgb(palette, r, g, b) {
  let best=0, bestD=Infinity;
  for (let i=0;i<palette.length;i++) {
    const [pr,pg,pb]=palette[i], d=(r-pr)**2+(g-pg)**2+(b-pb)**2;
    if (d<bestD){bestD=d;best=i;}
  }
  return palette[best];
}

// CHAR_W_FACTOR: fraction of fontSize that one monospace character occupies horizontally.
// Tuned for Courier New at typical sizes.
export const CHAR_W_FACTOR = 0.601;

/**
 * Render a single video frame as ASCII art onto `outputCanvas`.
 * Returns { rows, cols } (actual dimensions used).
 */
export function renderFrameToCanvas(videoEl, outputCanvas, cfg) {
  const { cols=80, fontSize=10, colorMode='monochrome',
          charSet=CHAR_SETS.standard, invertChars=false,
          brightness=0, contrast=0, gamma=0, saturation=0 } = cfg;

  const vw  = videoEl.videoWidth  || 640;
  const vh  = videoEl.videoHeight || 480;
  const rows = Math.max(1, Math.round(cols * (vh/vw) * 0.45));

  const charW  = fontSize * CHAR_W_FACTOR;
  const charH  = fontSize;
  const canvasW = Math.ceil(cols * charW);
  const canvasH = rows * charH;

  if (outputCanvas.width !== canvasW || outputCanvas.height !== canvasH) {
    outputCanvas.width  = canvasW;
    outputCanvas.height = canvasH;
  }

  // Sample video into offscreen pixel grid
  const { canvas: off, ctx: octx } = getOffscreen(cols, rows);
  octx.drawImage(videoEl, 0, 0, cols, rows);
  let data;
  try { data = octx.getImageData(0, 0, cols, rows).data; }
  catch { return { rows, cols }; }

  const ctx    = outputCanvas.getContext('2d');
  const chars  = charSet.split('');
  const nChars = chars.length;
  const doAdj  = brightness || contrast || gamma || saturation;
  const isMono = colorMode === 'monochrome';

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.font         = `${fontSize}px 'Courier New',monospace`;
  ctx.textBaseline = 'top';

  if (isMono) {
    // Fastest path: build each row as a string, draw in one fillText call
    ctx.fillStyle = '#39ff52';
    for (let row = 0; row < rows; row++) {
      let line = '';
      for (let col = 0; col < cols; col++) {
        const i = (row*cols+col)*4;
        const lum = (0.299*data[i]+0.587*data[i+1]+0.114*data[i+2])/255;
        let ci = Math.round(lum*(nChars-1));
        if (invertChars) ci = nChars-1-ci;
        line += chars[ci] ?? ' ';
      }
      ctx.fillText(line, 0, row*charH);
    }
  } else {
    // Color path: per-character fillStyle + fillText
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i  = (row*cols+col)*4;
        let r=data[i], g=data[i+1], b=data[i+2];
        if (doAdj) [r,g,b] = adjustPixel(r,g,b,brightness,contrast,gamma,saturation);

        const lum = (0.299*r+0.587*g+0.114*b)/255;
        let ci = Math.round(lum*(nChars-1));
        if (invertChars) ci = nChars-1-ci;
        const ch = chars[ci] ?? ' ';

        if (colorMode === 'grayscale') {
          const v = Math.round(lum*255);
          ctx.fillStyle = `rgb(${v},${v},${v})`;
        } else if (colorMode === 'truecolor') {
          ctx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
        } else if (colorMode === 'ansi16') {
          const [cr,cg,cb] = closestRgb(ANSI16,r,g,b);
          ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
        } else if (colorMode === 'ansi256') {
          const [cr,cg,cb] = closestRgb(ANSI256,r,g,b);
          ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
        } else {
          ctx.fillStyle = '#39ff52';
        }
        ctx.fillText(ch, col*charW, row*charH);
      }
    }
  }

  return { rows, cols };
}

// ─── AsciliVideoExporter ────────────────────────────────────────────────────
// Records an ASCII-rendered video using MediaRecorder + canvas.captureStream.
// Supports real-time recording (plays video at 1× speed).
//
// Usage:
//   const exp = new AsciliVideoExporter();
//   exp.start(videoEl, cfg, { onProgress, onComplete, onError });
//   exp.stop();  // cancel

export class AsciliVideoExporter {
  constructor() {
    this._canvas   = document.createElement('canvas');
    this._recorder = null;
    this._chunks   = [];
    this._running  = false;
    this._rafId    = null;
    this._startWall = 0;
    this._mimeType  = '';
  }

  get canvas() { return this._canvas; }

  /**
   * Begin recording.
   *
   * @param {HTMLVideoElement} videoEl  – source video (must be seekable)
   * @param {object}           cfg      – ASCILI render config
   * @param {object}           opts
   *   opts.onProgress(pct, elapsed, eta)  – called each rendered frame
   *   opts.onComplete(blob, mimeType)     – called when recording finishes
   *   opts.onError(msg)                   – called on failure
   *   opts.targetFps                      – recording FPS (default 30)
   */
  start(videoEl, cfg, opts = {}) {
    const { onProgress, onComplete, onError, targetFps = 30 } = opts;

    if (this._running) return;

    // Pick best supported MIME type
    const candidates = [
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    this._mimeType = candidates.find(t => {
      try { return MediaRecorder.isTypeSupported(t); } catch { return false; }
    }) || 'video/webm';

    // Pre-size the recording canvas
    renderFrameToCanvas(videoEl, this._canvas, cfg);

    let stream;
    try {
      stream = this._canvas.captureStream(targetFps);
    } catch (e) {
      onError?.('captureStream not supported: ' + e.message); return;
    }

    this._chunks  = [];
    this._running = true;
    this._startWall = performance.now();

    try {
      this._recorder = new MediaRecorder(stream, {
        mimeType:    this._mimeType,
        videoBitsPerSecond: 4_000_000,
      });
    } catch (e) {
      onError?.('MediaRecorder error: ' + e.message); return;
    }

    this._recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) this._chunks.push(e.data);
    };

    this._recorder.onstop = () => {
      const blob = new Blob(this._chunks, { type: this._mimeType });
      this._running = false;
      this._chunks  = [];
      onComplete?.(blob, this._mimeType);
    };

    this._recorder.onerror = e => {
      this._running = false;
      onError?.('Recorder error: ' + e.error?.message);
    };

    this._recorder.start(500); // flush chunks every 500 ms

    const duration = videoEl.duration;
    const interval = 1000 / targetFps;
    let lastRender = 0;

    const tick = (ts) => {
      if (!this._running) return;

      if (ts - lastRender >= interval) {
        renderFrameToCanvas(videoEl, this._canvas, cfg);
        lastRender = ts;

        const pct     = duration ? videoEl.currentTime / duration : 0;
        const elapsed = (performance.now() - this._startWall) / 1000;
        const eta     = pct > 0.002 ? (elapsed / pct) * (1 - pct) : null;
        onProgress?.(pct, elapsed, eta);
      }

      if (videoEl.ended || videoEl.currentTime >= duration - 0.05) {
        // Render final frame then stop
        renderFrameToCanvas(videoEl, this._canvas, cfg);
        setTimeout(() => this.stop(), 300);
        return;
      }

      this._rafId = requestAnimationFrame(tick);
    };

    // Reset and play
    videoEl.currentTime = 0;
    videoEl.playbackRate = 1.0;
    videoEl.play().then(() => {
      this._rafId = requestAnimationFrame(tick);
    }).catch(e => {
      onError?.('Cannot play video: ' + e.message);
      this._running = false;
    });
  }

  /** Stop recording (also called automatically at video end). */
  stop() {
    this._running = false;
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    if (this._recorder && this._recorder.state !== 'inactive') {
      this._recorder.stop();
    }
  }

  get mimeType() { return this._mimeType; }
}
