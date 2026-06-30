import { AsciliEngine, CHAR_SETS } from './engine.js';

// ─── Presets ────────────────────────────────────────────────────────────────

const PRESETS = {
  classic:    { colorMode:'monochrome', charSet:'standard', invertChars:true,  cols:80,  fontSize:10, fps:30, brightness:0,  contrast:10,  gamma:0,  saturation:0   },
  matrix:     { colorMode:'monochrome', charSet:'extended', invertChars:false, cols:100, fontSize:8,  fps:30, brightness:5,  contrast:20,  gamma:0,  saturation:0   },
  truecolor:  { colorMode:'truecolor',  charSet:'standard', invertChars:false, cols:80,  fontSize:10, fps:24, brightness:0,  contrast:0,   gamma:0,  saturation:20  },
  braille:    { colorMode:'grayscale',  charSet:'braille',  invertChars:false, cols:120, fontSize:10, fps:24, brightness:5,  contrast:15,  gamma:0,  saturation:0   },
  blocks:     { colorMode:'ansi256',    charSet:'block',    invertChars:false, cols:80,  fontSize:12, fps:24, brightness:0,  contrast:5,   gamma:0,  saturation:10  },
};

// ─── DOM Refs ────────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

const asciiOutput   = $('asciiOutput');
const asciiContainer = $('asciiContainer');
const waitingOverlay = $('waitingOverlay');
const sourceVideo   = $('sourceVideo');
const sourcePreview = $('sourcePreview');
const sourceLabel   = $('sourceLabel');
const settingsPanel = $('settingsPanel');
const toast         = $('toast');

// Controls
const btnWebcam     = $('btnWebcam');
const btnScreen     = $('btnScreen');
const btnFile       = $('btnFile');
const fileInput     = $('fileInput');
const btnPause      = $('btnPause');
const iconPause     = $('iconPause');
const iconPlay      = $('iconPlay');
const btnFullscreen = $('btnFullscreen');
const btnSettings   = $('btnSettings');
const btnResetSettings = $('btnResetSettings');
const btnCopy       = $('btnCopy');
const btnDownloadTxt  = $('btnDownloadTxt');
const btnDownloadHtml = $('btnDownloadHtml');
const btnScreenshot = $('btnScreenshot');

// Settings inputs
const selectColorMode   = $('selectColorMode');
const selectCharSet     = $('selectCharSet');
const customCharRow     = $('customCharRow');
const inputCustomChars  = $('inputCustomChars');
const checkInvert       = $('checkInvert');
const rangeCols         = $('rangeCols');
const valCols           = $('valCols');
const rangeFontSize     = $('rangeFontSize');
const valFontSize       = $('valFontSize');
const selectFps         = $('selectFps');
const rangeBrightness   = $('rangeBrightness');
const valBrightness     = $('valBrightness');
const rangeContrast     = $('rangeContrast');
const valContrast       = $('valContrast');
const rangeGamma        = $('rangeGamma');
const valGamma          = $('valGamma');
const rangeSaturation   = $('rangeSaturation');
const valSaturation     = $('valSaturation');

// Stats
const statFps       = $('statFps');
const statLatency   = $('statLatency');
const statChars     = $('statChars');
const statDims      = $('statDims');
const statMode      = $('statMode');
const statSource    = $('statSource');

// Preset buttons
const presetBtns = document.querySelectorAll('.preset-btn');

// ─── State ───────────────────────────────────────────────────────────────────

const state = {
  sourceType:   'none',   // 'webcam' | 'screen' | 'file' | 'none'
  running:      false,
  paused:       false,
  stream:       null,     // MediaStream (webcam / screen)
  rafId:        null,
  lastFrameTs:  0,
  frameCount:   0,
  fpsAccum:     0,
  lastFpsTs:    0,
  actualFps:    0,
};

// Config (mirrors UI controls)
const cfg = {
  colorMode:   'monochrome',
  charSet:     CHAR_SETS.standard,
  invertChars: false,
  cols:        80,
  fontSize:    10,
  fps:         30,
  brightness:  0,
  contrast:    0,
  gamma:       0,
  saturation:  0,
};

const engine = new AsciliEngine();

// ─── Toast ───────────────────────────────────────────────────────────────────

let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
}

// ─── Read Config From UI ─────────────────────────────────────────────────────

function readConfig() {
  cfg.colorMode   = selectColorMode.value;
  cfg.invertChars = checkInvert.checked;
  cfg.cols        = parseInt(rangeCols.value, 10);
  cfg.fontSize    = parseInt(rangeFontSize.value, 10);
  cfg.fps         = parseInt(selectFps.value, 10);
  cfg.brightness  = parseInt(rangeBrightness.value, 10);
  cfg.contrast    = parseInt(rangeContrast.value, 10);
  cfg.gamma       = parseInt(rangeGamma.value, 10);
  cfg.saturation  = parseInt(rangeSaturation.value, 10);

  const cs = selectCharSet.value;
  if (cs === 'custom') {
    cfg.charSet = inputCustomChars.value || CHAR_SETS.standard;
  } else {
    cfg.charSet = CHAR_SETS[cs] || CHAR_SETS.standard;
  }

  customCharRow.style.display = cs === 'custom' ? 'block' : 'none';

  // Apply font size to output
  asciiOutput.style.fontSize    = cfg.fontSize + 'px';
  asciiOutput.style.lineHeight  = '1.0';
  asciiOutput.style.letterSpacing = '0';

  // Apply monochrome green glow
  if (cfg.colorMode === 'monochrome') {
    asciiOutput.style.color      = 'var(--green)';
    asciiOutput.style.textShadow = '0 0 6px rgba(57,255,82,0.3)';
  } else {
    asciiOutput.style.color      = '#fff';
    asciiOutput.style.textShadow = 'none';
  }

  engine.reset();
}

// ─── Apply Preset ────────────────────────────────────────────────────────────

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;

  selectColorMode.value    = p.colorMode;
  selectCharSet.value      = p.charSet in CHAR_SETS ? p.charSet : 'standard';
  // find charSet key
  const csKey = Object.entries(CHAR_SETS).find(([,v]) => v === p.charSet)?.[0] || 'standard';
  selectCharSet.value      = csKey;
  checkInvert.checked      = p.invertChars;
  rangeCols.value          = p.cols;   valCols.textContent = p.cols;
  rangeFontSize.value      = p.fontSize; valFontSize.textContent = p.fontSize;
  selectFps.value          = p.fps;
  rangeBrightness.value    = p.brightness; valBrightness.textContent = p.brightness;
  rangeContrast.value      = p.contrast;   valContrast.textContent   = p.contrast;
  rangeGamma.value         = p.gamma;      valGamma.textContent      = p.gamma;
  rangeSaturation.value    = p.saturation; valSaturation.textContent = p.saturation;

  presetBtns.forEach(b => b.classList.toggle('active', b.dataset.preset === name));
  readConfig();
  showToast('Preset: ' + name.toUpperCase());
}

// ─── Stats Update ────────────────────────────────────────────────────────────

function updateStats(dims, latency) {
  statLatency.textContent = String(Math.round(latency)).padStart(3, '0');
  statChars.textContent   = dims.chars.toLocaleString();
  statDims.textContent    = `${dims.cols}x${dims.rows}`;
  statMode.textContent    = cfg.colorMode.toUpperCase();
  statSource.textContent  = state.sourceType.toUpperCase();
  statSource.classList.toggle('active', state.sourceType !== 'none');
  statMode.classList.toggle('active', state.running);
}

// ─── Render Loop ─────────────────────────────────────────────────────────────

function renderLoop(ts) {
  state.rafId = requestAnimationFrame(renderLoop);

  if (state.paused) return;

  const interval = 1000 / cfg.fps;
  if (ts - state.lastFrameTs < interval) return;

  if (!sourceVideo.videoWidth) return;

  const t0 = performance.now();
  readConfig();
  const dims = engine.renderFrame(sourceVideo, asciiOutput, cfg);
  const latency = performance.now() - t0;

  state.lastFrameTs = ts;
  state.frameCount++;

  // FPS counter (update every second)
  if (ts - state.lastFpsTs >= 1000) {
    state.actualFps  = Math.round(state.frameCount * 1000 / (ts - state.lastFpsTs));
    state.frameCount = 0;
    state.lastFpsTs  = ts;
    statFps.textContent = String(state.actualFps).padStart(2, '0');
  }

  updateStats(dims, latency);
}

function startRenderLoop() {
  if (state.rafId) cancelAnimationFrame(state.rafId);
  state.lastFpsTs  = performance.now();
  state.frameCount = 0;
  state.rafId      = requestAnimationFrame(renderLoop);
  state.running    = true;
}

function stopRenderLoop() {
  if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }
  state.running = false;
}

// ─── Source Management ───────────────────────────────────────────────────────

function stopCurrentSource() {
  if (state.stream) {
    state.stream.getTracks().forEach(t => t.stop());
    state.stream = null;
  }
  sourceVideo.srcObject = null;
  sourceVideo.src       = '';
  stopRenderLoop();
  state.sourceType = 'none';
  waitingOverlay.classList.remove('hidden');
  sourcePreview.classList.remove('visible');
  engine.reset();

  document.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
  statFps.textContent = '00';
  statLatency.textContent = '000';
  statChars.textContent = '0';
  statDims.textContent = '0x0';
}

function attachStream(stream, type) {
  stopCurrentSource();
  state.stream     = stream;
  state.sourceType = type;
  sourceVideo.srcObject = stream;
  sourceVideo.play().then(() => {
    waitingOverlay.classList.add('hidden');
    sourcePreview.classList.add('visible');
    sourceLabel.textContent = type.toUpperCase();
    startRenderLoop();
  }).catch(err => {
    showToast('ERROR: ' + err.message);
  });
}

function attachFile(file) {
  stopCurrentSource();
  state.sourceType = 'file';
  const url = URL.createObjectURL(file);
  sourceVideo.src   = url;
  sourceVideo.loop  = true;
  sourceVideo.play().then(() => {
    waitingOverlay.classList.add('hidden');
    sourcePreview.classList.add('visible');
    sourceLabel.textContent = 'FILE';
    startRenderLoop();
  }).catch(err => {
    showToast('ERROR: ' + err.message);
  });
}

// ─── Source Buttons ───────────────────────────────────────────────────────────

btnWebcam.addEventListener('click', async () => {
  if (state.sourceType === 'webcam') { stopCurrentSource(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    attachStream(stream, 'webcam');
    btnWebcam.classList.add('active');
  } catch (err) {
    showToast('Webcam denied: ' + err.message);
  }
});

btnScreen.addEventListener('click', async () => {
  if (state.sourceType === 'screen') { stopCurrentSource(); return; }
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    attachStream(stream, 'screen');
    btnScreen.classList.add('active');
    stream.getVideoTracks()[0].addEventListener('ended', stopCurrentSource);
  } catch (err) {
    if (err.name !== 'NotAllowedError') showToast('Screen capture error: ' + err.message);
  }
});

btnFile.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (file) {
    attachFile(file);
    btnFile.classList.add('active');
  }
  fileInput.value = '';
});

// ─── Playback Controls ───────────────────────────────────────────────────────

btnPause.addEventListener('click', togglePause);

function togglePause() {
  if (!state.running && !state.paused) return;
  state.paused = !state.paused;
  iconPause.style.display = state.paused ? 'none'  : '';
  iconPlay.style.display  = state.paused ? ''      : 'none';

  // Show/hide paused badge
  let badge = document.querySelector('.paused-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'paused-badge';
    badge.textContent = 'PAUSED';
    asciiContainer.appendChild(badge);
  }
  badge.classList.toggle('visible', state.paused);

  if (state.paused) sourceVideo.pause();
  else sourceVideo.play().catch(() => {});
}

// ─── Fullscreen ───────────────────────────────────────────────────────────────

btnFullscreen.addEventListener('click', toggleFullscreen);

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    asciiContainer.requestFullscreen().catch(() => {
      document.documentElement.requestFullscreen();
    });
  } else {
    document.exitFullscreen();
  }
}

// ─── Settings Panel ───────────────────────────────────────────────────────────

btnSettings.addEventListener('click', toggleSettings);

function toggleSettings() {
  settingsPanel.classList.toggle('collapsed');
}

// ─── Reset Settings ───────────────────────────────────────────────────────────

btnResetSettings.addEventListener('click', () => {
  applyPreset('classic');
  showToast('Settings reset');
});

// ─── Live slider label updates ────────────────────────────────────────────────

function bindRange(rangeEl, labelEl) {
  rangeEl.addEventListener('input', () => {
    labelEl.textContent = rangeEl.value;
    engine.reset();
  });
}
bindRange(rangeCols,       valCols);
bindRange(rangeFontSize,   valFontSize);
bindRange(rangeBrightness, valBrightness);
bindRange(rangeContrast,   valContrast);
bindRange(rangeGamma,      valGamma);
bindRange(rangeSaturation, valSaturation);

selectColorMode.addEventListener('change', () => engine.reset());
selectCharSet.addEventListener('change', () => {
  customCharRow.style.display = selectCharSet.value === 'custom' ? 'block' : 'none';
  engine.reset();
});
inputCustomChars.addEventListener('input', () => engine.reset());
checkInvert.addEventListener('change', () => engine.reset());

// ─── Preset buttons ───────────────────────────────────────────────────────────

presetBtns.forEach(btn => {
  btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
});

// ─── Export ───────────────────────────────────────────────────────────────────

function getPlainText() {
  return Array.from(asciiOutput.children)
    .map(div => div.textContent)
    .join('\n');
}

function getStyledHtml() {
  const colorVars = {
    monochrome: '#39ff52',
    grayscale:  '',
    truecolor:  '',
    ansi16:     '',
    ansi256:    '',
  };
  const bg    = '#000';
  const color = cfg.colorMode === 'monochrome' ? '#39ff52' : '#fff';
  const rows  = Array.from(asciiOutput.children).map(d => d.innerHTML || d.textContent).join('\n');
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>ASCILI Export</title>
<style>
body{margin:0;background:${bg};padding:8px}
pre{font-family:'Courier New',monospace;font-size:${cfg.fontSize}px;line-height:1;color:${color};white-space:pre;overflow:auto}
</style>
</head>
<body><pre>${rows}</pre></body>
</html>`;
}

btnCopy.addEventListener('click', async () => {
  const text = getPlainText();
  if (!text.trim()) { showToast('Nothing to copy'); return; }
  try {
    await navigator.clipboard.writeText(text);
    showToast('ASCII copied to clipboard');
  } catch {
    showToast('Copy failed');
  }
});

btnDownloadTxt.addEventListener('click', () => {
  const text = getPlainText();
  if (!text.trim()) { showToast('Nothing to export'); return; }
  download('ascili-export.txt', text, 'text/plain');
  showToast('Saved ascili-export.txt');
});

btnDownloadHtml.addEventListener('click', () => {
  const html = getStyledHtml();
  download('ascili-export.html', html, 'text/html');
  showToast('Saved ascili-export.html');
});

btnScreenshot.addEventListener('click', () => {
  const canvas = document.createElement('canvas');
  const rect   = asciiContainer.getBoundingClientRect();
  canvas.width  = rect.width  * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  const ctx = canvas.getContext('2d');
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, rect.width, rect.height);
  ctx.font         = `${cfg.fontSize}px 'Courier New',monospace`;
  ctx.textBaseline = 'top';

  const lines = Array.from(asciiOutput.children);
  const charW  = cfg.fontSize * 0.6;
  const charH  = cfg.fontSize;

  lines.forEach((div, rowIdx) => {
    const y = rowIdx * charH;
    if (cfg.colorMode === 'monochrome') {
      ctx.fillStyle = '#39ff52';
      ctx.fillText(div.textContent, 4, y + 4);
    } else {
      // Draw span by span
      const spans = div.querySelectorAll('span');
      if (spans.length === 0) {
        ctx.fillStyle = '#fff';
        ctx.fillText(div.textContent, 4, y + 4);
      } else {
        let x = 4;
        spans.forEach(span => {
          ctx.fillStyle = span.style.color || '#fff';
          ctx.fillText(span.textContent, x, y + 4);
          x += span.textContent.length * charW;
        });
      }
    }
  });

  canvas.toBlob(blob => {
    download('ascili-screenshot.png', blob, 'image/png');
    showToast('Screenshot saved');
  });
});

function download(filename, content, type) {
  const a    = document.createElement('a');
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// ─── Keyboard Shortcuts ───────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  // Ignore when focus is inside a text input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  switch (e.key) {
    case 'f': case 'F':
      e.preventDefault(); toggleFullscreen(); break;
    case ' ':
      e.preventDefault(); togglePause(); break;
    case 's': case 'S':
      e.preventDefault(); toggleSettings(); break;
    case 'c': case 'C':
      e.preventDefault(); btnCopy.click(); break;
    case 'r': case 'R':
      e.preventDefault(); applyPreset('classic'); showToast('Settings reset'); break;
    case '1': applyPreset('classic');   break;
    case '2': applyPreset('matrix');    break;
    case '3': applyPreset('truecolor'); break;
    case '4': applyPreset('braille');   break;
    case '5': applyPreset('blocks');    break;
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────

applyPreset('classic');
readConfig();
