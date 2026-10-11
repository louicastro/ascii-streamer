// ─── Canvas Frame Renderer ─────────────────────────────────────────────────
// Renders one video frame as ASCII art directly onto an HTMLCanvasElement.
// Used by AsciliVideoExporter to produce the recording canvas frames.

import { AsciliEngine, CHAR_SETS, ANSI16, ANSI256, ANSI16_LUT, ANSI256_LUT, clamp, closestRgb, adjustPixel } from './engine.js';

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

// CHAR_W_FACTOR: fraction of fontSize that one monospace character occupies horizontally.
// Tuned for Courier New at typical sizes.
export const CHAR_W_FACTOR = 0.601;

// ─── Resolution Presets ─────────────────────────────────────────────────────

export const RESOLUTIONS = {
  auto:  null,          // use whatever cols + fontSize produce
  '720p':  { w: 1280, h: 720  },
  '1080p': { w: 1920, h: 1080 },
  '4k':    { w: 3840, h: 2160 },
};

/**
 * Compute a fontSize that makes the ASCII grid fill a target resolution.
 * Returns { fontSize, canvasW, canvasH }.
 */
export function computeFontForResolution(cols, videoW, videoH, resolution) {
  const res = RESOLUTIONS[resolution];
  if (!res) return null; // 'auto' — caller uses its own fontSize

  const rows = Math.max(1, Math.round(cols * (videoH / videoW) * 0.45));
  // Target: cols * fontSize * CHAR_W_FACTOR ≈ res.w
  const fontFromW = res.w / (cols * CHAR_W_FACTOR);
  // Target: rows * fontSize ≈ res.h
  const fontFromH = res.h / rows;
  // Use the smaller to fit both dimensions
  const fontSize = Math.max(4, Math.floor(Math.min(fontFromW, fontFromH)));

  const canvasW = makeEven(Math.ceil(cols * fontSize * CHAR_W_FACTOR));
  const canvasH = makeEven(rows * fontSize);
  return { fontSize, canvasW, canvasH, rows };
}

/** Force a dimension to an even number (required by H.264 encoders). */
function makeEven(n) { return (n + 1) & ~1; }

/**
 * Render a single video frame as ASCII art onto `outputCanvas`.
 * Returns { rows, cols } (actual dimensions used).
 *
 * @param {HTMLVideoElement|HTMLCanvasElement} videoEl
 * @param {HTMLCanvasElement} outputCanvas
 * @param {object} cfg
 * @param {object} [overrides]  — optional { fontSize } to override cfg.fontSize
 */
export function renderFrameToCanvas(videoEl, outputCanvas, cfg, overrides) {
  const { cols=80, colorMode='monochrome',
          charSet=CHAR_SETS.standard, invertChars=false,
          brightness=0, contrast=0, gamma=0, saturation=0 } = cfg;

  const fontSize = overrides?.fontSize ?? cfg.fontSize ?? 10;

  const vw  = videoEl.videoWidth  || videoEl.width || 640;
  const vh  = videoEl.videoHeight || videoEl.height || 480;
  const rows = Math.max(1, Math.round(cols * (vh/vw) * 0.45));

  const charW  = fontSize * CHAR_W_FACTOR;
  const charH  = fontSize;
  // Ensure even dimensions for H.264 compatibility
  const canvasW = makeEven(Math.ceil(cols * charW));
  const canvasH = makeEven(rows * charH);

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
  if (!ctx) return { rows, cols };
  const chars  = charSet.split('');
  const nChars = chars.length;
  const doAdj  = brightness || contrast || gamma || saturation;
  const isMono = colorMode === 'monochrome';
  const enableEdgeDetection = cfg.enableEdgeDetection ?? true;
  const edgeThreshold = cfg.edgeThreshold ?? 0.16;
  const adaptiveContrast = cfg.adaptiveContrast ?? true;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.font         = `${fontSize}px 'Courier New',monospace`;
  ctx.textBaseline = 'top';

  // 1. Calculate luminance grid & adjust colors
  const lumGrid = new Float32Array(rows * cols);
  const rgbAdj  = new Uint8Array(rows * cols * 3);
  let minLum = 1.0, maxLum = 0.0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const p4  = idx * 4;
      let red   = data[p4];
      let green = data[p4 + 1];
      let blue  = data[p4 + 2];

      if (doAdj) [red, green, blue] = adjustPixel(red, green, blue, brightness, contrast, gamma, saturation);

      const p3 = idx * 3;
      rgbAdj[p3]     = red;
      rgbAdj[p3 + 1] = green;
      rgbAdj[p3 + 2] = blue;

      let lum = (0.299 * red + 0.587 * green + 0.114 * blue) / 255.0;
      lumGrid[idx] = lum;
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
    }
  }

  // Adaptive dynamic range
  if (adaptiveContrast && maxLum - minLum > 0.08) {
    const range = maxLum - minLum;
    for (let i = 0; i < lumGrid.length; i++) {
      lumGrid[i] = Math.min(1.0, Math.max(0.0, (lumGrid[i] - minLum) / range));
    }
  }

  const edgeThresholdSq = edgeThreshold * edgeThreshold;
  const allowEdgeGlyphs = enableEdgeDetection && nChars >= 5 && rows > 2 && cols > 2;

  if (isMono) {
    // Fastest path: build line string per row
    ctx.fillStyle = cfg.monoColor || '#39ff52';
    for (let r = 0; r < rows; r++) {
      let line = '';
      const rOffset = r * cols;
      for (let c = 0; c < cols; c++) {
        const idx = rOffset + c;
        let charToUse = null;

        if (allowEdgeGlyphs && r > 0 && r < rows - 1 && c > 0 && c < cols - 1) {
          const gx = (lumGrid[rOffset + (c + 1)] - lumGrid[rOffset + (c - 1)]) * 0.5;
          const gy = (lumGrid[(r + 1) * cols + c] - lumGrid[(r - 1) * cols + c]) * 0.5;
          const magSq = gx * gx + gy * gy;

          if (magSq >= edgeThresholdSq) {
            const absGx = Math.abs(gx);
            const absGy = Math.abs(gy);
            if (absGy > 1.8 * absGx) charToUse = '-';
            else if (absGx > 1.8 * absGy) charToUse = '|';
            else charToUse = (gx * gy > 0) ? '\\' : '/';
          }
        }

        if (!charToUse) {
          const lum = lumGrid[idx];
          let ci = 0;
          if (nChars > 1) {
            ci = Math.round(lum * (nChars - 1));
            if (ci >= nChars) ci = nChars - 1;
            if (ci < 0) ci = 0;
            if (invertChars) ci = (nChars - 1) - ci;
          }
          charToUse = chars[ci] ?? ' ';
        }

        line += charToUse;
      }
      ctx.fillText(line, 0, r * charH);
    }
  } else {
    // Color path
    for (let r = 0; r < rows; r++) {
      const rOffset = r * cols;
      for (let c = 0; c < cols; c++) {
        const idx = rOffset + c;
        let charToUse = null;

        if (allowEdgeGlyphs && r > 0 && r < rows - 1 && c > 0 && c < cols - 1) {
          const gx = (lumGrid[rOffset + (c + 1)] - lumGrid[rOffset + (c - 1)]) * 0.5;
          const gy = (lumGrid[(r + 1) * cols + c] - lumGrid[(r - 1) * cols + c]) * 0.5;
          const magSq = gx * gx + gy * gy;

          if (magSq >= edgeThresholdSq) {
            const absGx = Math.abs(gx);
            const absGy = Math.abs(gy);
            if (absGy > 1.8 * absGx) charToUse = '-';
            else if (absGx > 1.8 * absGy) charToUse = '|';
            else charToUse = (gx * gy > 0) ? '\\' : '/';
          }
        }

        if (!charToUse) {
          const lum = lumGrid[idx];
          let ci = 0;
          if (nChars > 1) {
            ci = Math.round(lum * (nChars - 1));
            if (ci >= nChars) ci = nChars - 1;
            if (ci < 0) ci = 0;
            if (invertChars) ci = (nChars - 1) - ci;
          }
          charToUse = chars[ci] ?? ' ';
        }

        const p3 = idx * 3;
        const red = rgbAdj[p3], green = rgbAdj[p3 + 1], blue = rgbAdj[p3 + 2];

        if (colorMode === 'grayscale') {
          const v = Math.round(lumGrid[idx] * 255);
          ctx.fillStyle = `rgb(${v},${v},${v})`;
        } else if (colorMode === 'truecolor') {
          ctx.fillStyle = `rgb(${red},${green},${blue})`;
        } else if (colorMode === 'ansi16') {
          const lIdx = (((red >> 3) << 10) | ((green >> 3) << 5) | (blue >> 3)) * 3;
          ctx.fillStyle = `rgb(${ANSI16_LUT[lIdx]},${ANSI16_LUT[lIdx+1]},${ANSI16_LUT[lIdx+2]})`;
        } else if (colorMode === 'ansi256') {
          const lIdx = (((red >> 3) << 10) | ((green >> 3) << 5) | (blue >> 3)) * 3;
          ctx.fillStyle = `rgb(${ANSI256_LUT[lIdx]},${ANSI256_LUT[lIdx+1]},${ANSI256_LUT[lIdx+2]})`;
        } else {
          ctx.fillStyle = '#39ff52';
        }
        ctx.fillText(charToUse, c * charW, r * charH);
      }
    }
  }

  return { rows, cols };
}

// ─── AsciliVideoExporter ────────────────────────────────────────────────────
// Records an ASCII-rendered video using MediaRecorder + canvas.captureStream.
//
// **Frame-seeking mode** (default): seeks the source video frame-by-frame,
// rendering each frame as fast as the browser can decode. This is much faster
// than real-time for long videos (e.g. a 1hr video may finish in 10-20 min).
//
// Usage:
//   const exp = new AsciliVideoExporter();
//   exp.start(videoEl, cfg, { onProgress, onComplete, onError });
//   exp.stop();  // cancel

export class AsciliVideoExporter {
  constructor() {
    this._canvas   = document.createElement('canvas');
    this._engine   = new AsciliEngine();
    this._recorder = null;
    this._chunks   = [];
    this._running  = false;
    this._startWall = 0;
    this._mimeType  = '';
    this._aborted   = false;
  }

  get canvas() { return this._canvas; }

  /**
   * Begin recording using frame-by-frame seeking (faster than real-time).
   *
   * @param {HTMLVideoElement} videoEl  – source video (must be seekable)
   * @param {object}           cfg      – ASCILI render config
   * @param {object}           opts
   *   opts.onProgress(pct, elapsed, eta)  – called each rendered frame
   *   opts.onComplete(blob, mimeType)     – called when recording finishes
   *   opts.onError(msg)                   – called on failure
   *   opts.targetFps                      – recording FPS (default 30)
   *   opts.resolution                     – 'auto', '720p', '1080p', '4k'
   */
  start(videoEl, cfg, opts = {}) {
    const { onProgress, onComplete, onError, targetFps = 30, resolution = 'auto' } = opts;

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

    // Compute fontSize override for target resolution
    const vw = videoEl.videoWidth || 640;
    const vh = videoEl.videoHeight || 480;
    const resInfo = computeFontForResolution(cfg.cols || 80, vw, vh, resolution);
    const overrides = resInfo ? { fontSize: resInfo.fontSize } : undefined;
    const fontSize = overrides?.fontSize ?? cfg.fontSize ?? 10;
    const cols = cfg.cols || 80;
    const rows = Math.max(1, Math.round(cols * (vh / vw) * 0.45));
    const charW = fontSize * CHAR_W_FACTOR;
    const canvasW = makeEven(Math.ceil(cols * charW));
    const canvasH = makeEven(rows * fontSize);

    if (this._canvas.width !== canvasW || this._canvas.height !== canvasH) {
      this._canvas.width  = canvasW;
      this._canvas.height = canvasH;
    }

    const renderCfg = { ...cfg, ...(overrides || {}) };
    let useGpuEngine = true;

    const drawFrame = () => {
      if (useGpuEngine) {
        try {
          const res = this._engine.renderFrame(videoEl, this._canvas, renderCfg);
          if (res && this._engine._webgl && this._engine._webgl.supported) return;
        } catch {
          useGpuEngine = false;
        }
      }
      renderFrameToCanvas(videoEl, this._canvas, cfg, overrides);
    };

    // Pre-render the first frame to initialize the canvas
    drawFrame();

    // Detect if requestFrame is available (Chromium) — fallback for Firefox/Safari
    let stream;
    try {
      stream = this._canvas.captureStream(0);
    } catch (e) {
      onError?.('captureStream not supported: ' + e.message); return;
    }

    const videoTrack = stream.getVideoTracks()[0];
    const hasRequestFrame = typeof videoTrack?.requestFrame === 'function';

    // If requestFrame is not available, use fps-based captureStream instead
    if (!hasRequestFrame) {
      try {
        stream = this._canvas.captureStream(targetFps);
      } catch (e) {
        onError?.('captureStream not supported: ' + e.message); return;
      }
    }

    this._chunks  = [];
    this._running = true;
    this._aborted = false;
    this._startWall = performance.now();

    // Use higher bitrate for higher resolutions
    const effectiveW = this._canvas.width;
    const bitsPerSecond = effectiveW >= 3000 ? 16_000_000
                        : effectiveW >= 1500 ? 8_000_000
                        : 4_000_000;

    try {
      this._recorder = new MediaRecorder(stream, {
        mimeType:    this._mimeType,
        videoBitsPerSecond: bitsPerSecond,
      });
    } catch (e) {
      onError?.('MediaRecorder error: ' + e.message); return;
    }

    this._recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) this._chunks.push(e.data);
    };

    this._recorder.onstop = () => {
      if (this._aborted) {
        this._running = false;
        this._chunks  = [];
        return;
      }
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

    const rawDuration = videoEl.duration;
    const duration = (isFinite(rawDuration) && rawDuration > 0) ? rawDuration : 10;
    const totalFrames = Math.max(1, Math.ceil(duration * targetFps));
    const frameInterval = 1 / targetFps;
    let frameNum = 0;
    let seekTimer = null;

    // Pause the video — we will seek frame by frame
    videoEl.pause();

    const clearTimer = () => {
      if (seekTimer) {
        clearTimeout(seekTimer);
        seekTimer = null;
      }
    };

    // Advances and renders one frame
    const advanceFrame = () => {
      if (!this._running) return;
      clearTimer();

      // Render the current video position to canvas
      drawFrame();
      if (hasRequestFrame) {
        videoTrack.requestFrame();
      }

      frameNum++;

      const pct     = Math.min(1, frameNum / totalFrames);
      const elapsed = (performance.now() - this._startWall) / 1000;
      const eta     = pct > 0.002 ? (elapsed / pct) * (1 - pct) : null;
      onProgress?.(pct, elapsed, eta);

      if (frameNum >= totalFrames) {
        // Complete!
        setTimeout(() => this._finishRecording(), 250);
        return;
      }

      // Target timestamp for next frame
      const nextTime = Math.min(duration, frameNum * frameInterval);

      // Safety timeout: in case seeked event is delayed or dropped by browser decoder
      seekTimer = setTimeout(() => {
        if (!this._running) return;
        advanceFrame();
      }, 80);

      videoEl.currentTime = nextTime;
    };

    const onSeeked = () => {
      if (!this._running) return;
      advanceFrame();
    };

    videoEl.addEventListener('seeked', onSeeked);

    this._cleanup = () => {
      clearTimer();
      videoEl.removeEventListener('seeked', onSeeked);
    };

    // Start conversion
    if (Math.abs(videoEl.currentTime) < 0.001) {
      // Already at frame 0 — render frame 0 immediately and advance
      advanceFrame();
    } else {
      // Seek to 0 to trigger the loop
      seekTimer = setTimeout(() => {
        if (!this._running) return;
        advanceFrame();
      }, 80);
      videoEl.currentTime = 0;
    }
  }

  /** Internal: finalize the recording gracefully. */
  _finishRecording() {
    this._running = false;
    if (this._cleanup) { this._cleanup(); this._cleanup = null; }
    if (this._recorder && this._recorder.state !== 'inactive') {
      this._recorder.stop();
    }
  }

  /** Stop recording (also called automatically at video end). */
  stop() {
    this._aborted = true;
    this._running = false;
    if (this._cleanup) { this._cleanup(); this._cleanup = null; }
    if (this._recorder && this._recorder.state !== 'inactive') {
      this._recorder.stop();
    }
  }

  get mimeType() { return this._mimeType; }
}

// ─── AsciliLiveRecorder ─────────────────────────────────────────────────────
// Records the live ASCII output from any source (webcam, screen, file).
// Paints each rendered frame onto a recording canvas and uses MediaRecorder.

export class AsciliLiveRecorder {
  constructor() {
    this._canvas   = document.createElement('canvas');
    this._recorder = null;
    this._chunks   = [];
    this._running  = false;
    this._startWall = 0;
    this._mimeType  = '';
    this._elapsed   = 0;
  }

  get canvas() { return this._canvas; }
  get running() { return this._running; }
  get elapsed() {
    if (!this._running) return this._elapsed;
    return (performance.now() - this._startWall) / 1000;
  }

  /**
   * Start recording the live ASCII stream.
   *
   * @param {object} cfg   – current ASCILI config (cols, fontSize, etc.)
   * @param {object} opts
   *   opts.targetFps        – recording FPS (default 30)
   *   opts.resolution       – 'auto', '720p', '1080p', '4k'
   *   opts.videoWidth       – source video width (for aspect ratio)
   *   opts.videoHeight      – source video height (for aspect ratio)
   *   opts.onComplete(blob, mimeType)
   *   opts.onError(msg)
   */
  startRecording(cfg, opts = {}) {
    const { targetFps = 30, resolution = 'auto',
            videoWidth = 640, videoHeight = 480,
            onComplete, onError } = opts;

    if (this._running) return;

    // Pick MIME
    const candidates = [
      'video/mp4;codecs=avc1', 'video/mp4',
      'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm',
    ];
    this._mimeType = candidates.find(t => {
      try { return MediaRecorder.isTypeSupported(t); } catch { return false; }
    }) || 'video/webm';

    // Directly capture the hardware WebGL canvas when possible for 120 FPS zero-lag streaming
    const asciiCanvas = document.getElementById('asciiCanvas');
    let stream = null;
    this._directStream = false;

    if (asciiCanvas && asciiCanvas.width > 0 && asciiCanvas.height > 0) {
      try {
        stream = asciiCanvas.captureStream(targetFps);
        this._directStream = true;
      } catch (e) {
        stream = null;
      }
    }

    if (!stream) {
      // Fallback: internal 2D canvas
      this._directStream = false;
      const resInfo = computeFontForResolution(cfg.cols || 80, videoWidth, videoHeight, resolution);
      this._overrides = resInfo ? { fontSize: resInfo.fontSize } : undefined;

      const cols = cfg.cols || 80;
      const rows = Math.max(1, Math.round(cols * (videoHeight / videoWidth) * 0.45));
      const fontSize = this._overrides?.fontSize ?? cfg.fontSize ?? 10;
      const charW = fontSize * CHAR_W_FACTOR;
      this._canvas.width  = makeEven(Math.ceil(cols * charW));
      this._canvas.height = makeEven(rows * fontSize);

      try {
        stream = this._canvas.captureStream(targetFps);
      } catch (e) {
        onError?.('captureStream not supported: ' + e.message); return;
      }
    }

    // Try to mix in the original audio track from the current source video if possible
    try {
      const sourceVideo = document.getElementById('sourceVideo');
      if (sourceVideo) {
        if (sourceVideo.captureStream) {
          const audioTracks = sourceVideo.captureStream().getAudioTracks();
          if (audioTracks.length > 0) stream.addTrack(audioTracks[0]);
        } else if (sourceVideo.mozCaptureStream) {
          const audioTracks = sourceVideo.mozCaptureStream().getAudioTracks();
          if (audioTracks.length > 0) stream.addTrack(audioTracks[0]);
        }
      }
    } catch (e) {}

    const effectiveW = asciiCanvas?.width || this._canvas.width || 1280;
    const bitsPerSecond = effectiveW >= 3000 ? 16_000_000
                        : effectiveW >= 1500 ? 8_000_000
                        : 4_000_000;

    this._chunks = [];
    this._running = true;
    this._startWall = performance.now();

    try {
      this._recorder = new MediaRecorder(stream, {
        mimeType: this._mimeType,
        videoBitsPerSecond: bitsPerSecond,
      });
    } catch (e) {
      this._running = false;
      onError?.('MediaRecorder error: ' + e.message); return;
    }

    this._recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) this._chunks.push(e.data);
    };

    this._recorder.onstop = () => {
      this._elapsed = (performance.now() - this._startWall) / 1000;
      const blob = new Blob(this._chunks, { type: this._mimeType });
      this._running = false;
      this._chunks  = [];
      onComplete?.(blob, this._mimeType);
    };

    this._recorder.onerror = e => {
      this._running = false;
      onError?.('Recorder error: ' + e.error?.message);
    };

    this._recorder.start(500);
  }

  /**
   * Call this each frame to paint the current video frame as ASCII
   * onto the recording canvas.
   */
  captureFrame(videoEl, cfg) {
    if (!this._running) return;
    if (this._directStream) return; // GPU WebGL canvas is already painted directly
    renderFrameToCanvas(videoEl, this._canvas, cfg, this._overrides);
  }

  /** Stop recording and trigger onComplete. */
  stopRecording() {
    this._running = false;
    if (this._recorder && this._recorder.state !== 'inactive') {
      this._recorder.stop();
    }
  }
}
