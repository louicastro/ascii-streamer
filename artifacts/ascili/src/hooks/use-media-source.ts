import { useState, useCallback, useRef } from 'react';

type SourceType = 'webcam' | 'screen' | 'file' | null;

export function useMediaSource() {
  const [sourceType, setSourceType] = useState<SourceType>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileUrlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (fileUrlRef.current) {
      URL.revokeObjectURL(fileUrlRef.current);
      fileUrlRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = '';
    }
    setSourceType(null);
    setError(null);
  }, [stream]);

  const startWebcam = useCallback(async () => {
    cleanup();
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        await videoRef.current.play();
      }
      setStream(newStream);
      setSourceType('webcam');
    } catch (err) {
      setError('Could not access webcam. Please check permissions.');
      console.error(err);
    }
  }, [cleanup]);

  const startScreen = useCallback(async () => {
    cleanup();
    try {
      const newStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        await videoRef.current.play();
      }
      setStream(newStream);
      setSourceType('screen');
      
      // Handle stop from browser UI
      newStream.getVideoTracks()[0].onended = () => {
        cleanup();
      };
    } catch (err) {
      setError('Could not access screen capture.');
      console.error(err);
    }
  }, [cleanup]);

  const startFile = useCallback(async (file: File) => {
    cleanup();
    try {
      const url = URL.createObjectURL(file);
      fileUrlRef.current = url;
      if (videoRef.current) {
        videoRef.current.src = url;
        videoRef.current.loop = true;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }
      setSourceType('file');
    } catch (err) {
      setError('Could not play video file.');
      console.error(err);
    }
  }, [cleanup]);

  const stopSource = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return {
    sourceType,
    error,
    videoRef,
    startWebcam,
    startScreen,
    startFile,
    stopSource
  };
}
