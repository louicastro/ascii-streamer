import { useState, useEffect, useRef, useCallback } from 'react';
import { AsciliEngine } from '@/lib/ascili-engine';
import { ColorMode, CHARACTER_SETS } from '@/lib/presets';

export interface RendererSettings {
  characterSet: string;
  customCharSet: string;
  colorMode: ColorMode;
  cols: number;
  fps: number;
  brightness: number;
  contrast: number;
  gamma: number;
  saturation: number;
  invertChars: boolean;
  fontSize: number;
}

export function useAsciiRenderer(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  settings: RendererSettings,
  isPlaying: boolean
) {
  const engineRef = useRef(new AsciliEngine());
  const [outputHtml, setOutputHtml] = useState<string>("");
  const [actualFps, setActualFps] = useState<number>(0);
  const [latency, setLatency] = useState<number>(0);
  const [charCount, setCharCount] = useState<number>(0);
  
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());
  const animationFrameRef = useRef<number>(0);
  const lastFrameTimeRef = useRef(0);

  const renderFrame = useCallback((timestamp: number) => {
    if (!isPlaying) {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    const frameInterval = 1000 / settings.fps;
    const elapsed = timestamp - lastFrameTimeRef.current;

    if (elapsed > frameInterval) {
      lastFrameTimeRef.current = timestamp - (elapsed % frameInterval);

      if (videoRef.current && videoRef.current.readyState >= 2) {
        const start = performance.now();
        
        const capture = engineRef.current.captureFrame(videoRef.current, settings.cols);
        
        if (capture) {
          const charSetToUse = settings.characterSet === "Custom" 
            ? (settings.customCharSet || " ")
            : CHARACTER_SETS[settings.characterSet];

          const html = engineRef.current.renderToAscii(
            capture.imageData,
            settings.cols,
            capture.rows,
            settings.colorMode,
            charSetToUse,
            settings.invertChars,
            settings.brightness,
            settings.contrast,
            settings.gamma,
            settings.saturation
          );
          
          setOutputHtml(html);
          setCharCount(settings.cols * capture.rows);
          setLatency(Math.round(performance.now() - start));
          frameCountRef.current++;
        }
      }

      // Calculate actual FPS every second
      const now = performance.now();
      if (now - lastFpsTimeRef.current >= 1000) {
        setActualFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
      }
    }

    animationFrameRef.current = requestAnimationFrame(renderFrame);
  }, [isPlaying, settings, videoRef]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [renderFrame]);

  return {
    outputHtml,
    actualFps,
    latency,
    charCount
  };
}
