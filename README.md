# ASCILI — ASCII Video Engine

**[Open the live ASCILI website](https://louicastro.github.io/ascii-streamer/)**

ASCILI turns live or recorded video into animated ASCII art in the browser. Use it with a webcam, screen capture, or a local video file, then export the result as text, an image, a rendered video, or subtitles.

## Features

- Live rendering from webcam, screen sharing, and local video files
- Presets for classic green, Matrix, true color, Braille, block art, and Ultra HD
- Monochrome, grayscale, ANSI 16, ANSI 256, and true color modes
- Adjustable character set, output width, frame rate, brightness, contrast, gamma, saturation, and edge detection
- Plain text, styled HTML, PNG screenshot, rendered video, and SRT subtitle exports
- WebGL rendering when available, with a Canvas 2D fallback

SRT export uses 26 FPS and adapts its column count to keep the estimated file size below 950 MiB. The exporter enforces a hard 1 GB output limit. This compact output has less character detail than the live preview. Subtitle color support depends on the player.

## Requirements

- Node.js 24
- pnpm
- A modern browser; allow camera and screen permissions when prompted

The app runs in the browser and does not need an API key.

## Run the ASCILI app

From the repository root:

```sh
pnpm install
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/ascili dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

The Vite configuration requires both `PORT` and `BASE_PATH`. To run on another port, change `PORT` and keep `BASE_PATH=/` for a root-path deployment.

## Build and preview

Build the browser app:

```sh
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/ascili build
```

The output is written to `artifacts/ascili/dist/public/`.

Preview the production build:

```sh
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/ascili serve
```

To typecheck and build all workspace packages:

```sh
PORT=5173 BASE_PATH=/ pnpm run build
```

## Use the app

1. Start the development server and open ASCILI in a browser.
2. Choose **Webcam**, **Screen**, or **File** as the video source.
3. Select a preset or adjust the render settings.
4. Use the download menu to save text, HTML, a PNG, or a rendered video. Use **Convert Full Video File** for a complete video or SRT export.

Long conversions need direct-to-file browser support to avoid buffering the full result in memory. Use Chrome or Edge for those exports and choose a destination when prompted.

## Repository layout

| Path | Purpose |
| --- | --- |
| `artifacts/ascili/` | Main browser application and Vite build |
| `artifacts/ascili/src/engine.js` | ASCII rendering engine and WebGL/Canvas renderers |
| `artifacts/ascili/src/exporter.js` | Image, video, recording, and SRT export code |
| `artifacts/mockup-sandbox/` | Separate React mockup application |
| `artifacts/api-server/` | Workspace API server package |
| `ai_video_engine/` | Separate Python video engine, CLI, and HTTP/SSE server |
| `scripts/` | Workspace scripts |
| `lib/` | Shared workspace libraries |

For Python engine setup and usage, see [`ai_video_engine/README.md`](ai_video_engine/README.md).
# Ascii-Streamer-2.0
