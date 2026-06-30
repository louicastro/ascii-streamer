import { Button } from '@/components/ui/button';
import { Camera, MonitorUp, FileVideo, StopCircle, Play } from 'lucide-react';
import { useRef } from 'react';

interface SourceControlsProps {
  sourceType: string | null;
  isPlaying: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onStartWebcam: () => void;
  onStartScreen: () => void;
  onStartFile: (file: File) => void;
  onStop: () => void;
  onTogglePlay: () => void;
}

export function SourceControls({
  sourceType,
  isPlaying,
  videoRef,
  onStartWebcam,
  onStartScreen,
  onStartFile,
  onStop,
  onTogglePlay
}: SourceControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onStartFile(file);
    }
  };

  return (
    <div className="flex items-center gap-4 bg-card p-3 rounded-md border" data-testid="source-controls">
      <div className="flex items-center gap-2">
        <Button 
          variant={sourceType === 'webcam' ? 'default' : 'secondary'} 
          size="sm"
          onClick={onStartWebcam}
          data-testid="btn-source-webcam"
        >
          <Camera className="w-4 h-4 mr-2" />
          Webcam
        </Button>
        <Button 
          variant={sourceType === 'screen' ? 'default' : 'secondary'} 
          size="sm"
          onClick={onStartScreen}
          data-testid="btn-source-screen"
        >
          <MonitorUp className="w-4 h-4 mr-2" />
          Screen
        </Button>
        
        <input 
          type="file" 
          accept="video/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange}
          data-testid="input-source-file"
        />
        <Button 
          variant={sourceType === 'file' ? 'default' : 'secondary'} 
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          data-testid="btn-source-file"
        >
          <FileVideo className="w-4 h-4 mr-2" />
          File
        </Button>
      </div>

      <div className="w-px h-6 bg-border mx-2" />

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onTogglePlay}
          disabled={!sourceType}
          data-testid="btn-toggle-play"
        >
          {isPlaying ? <StopCircle className="w-4 h-4 mr-2 text-primary" /> : <Play className="w-4 h-4 mr-2" />}
          {isPlaying ? 'Pause' : 'Resume'}
        </Button>
        
        <Button
          variant="destructive"
          size="sm"
          onClick={onStop}
          disabled={!sourceType}
          data-testid="btn-stop-source"
        >
          Stop Signal
        </Button>
      </div>

      <div className="ml-auto flex items-center">
        {/* Thumbnail Preview */}
        <div className="relative w-24 h-16 bg-black rounded overflow-hidden border border-border flex items-center justify-center">
          <video 
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          {!sourceType && (
            <span className="text-[10px] text-muted-foreground font-mono">NO SIGNAL</span>
          )}
        </div>
      </div>
    </div>
  );
}
