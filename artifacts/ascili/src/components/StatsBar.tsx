import { Activity, Clock, Hash, Palette, Video } from 'lucide-react';

interface StatsBarProps {
  fps: number;
  latency: number;
  charCount: number;
  colorMode: string;
  sourceType: string | null;
}

export function StatsBar({ fps, latency, charCount, colorMode, sourceType }: StatsBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-[#0a0c10] border-t border-border font-mono text-xs sticky bottom-0 z-10 w-full" data-testid="stats-bar">
      <div className="flex gap-6">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-primary" />
          <span className="text-muted-foreground">FPS:</span>
          <span className={`font-bold ${fps < 15 ? 'text-destructive' : 'text-primary'} drop-shadow-[0_0_5px_rgba(20,180,80,0.5)]`} data-testid="stat-fps">
            {fps.toString().padStart(2, '0')}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span className="text-muted-foreground">LATENCY:</span>
          <span className="font-bold text-primary drop-shadow-[0_0_5px_rgba(20,180,80,0.5)]" data-testid="stat-latency">
            {latency.toString().padStart(3, '0')}ms
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Hash className="w-3.5 h-3.5 text-primary" />
          <span className="text-muted-foreground">CHARS:</span>
          <span className="font-bold text-primary drop-shadow-[0_0_5px_rgba(20,180,80,0.5)]" data-testid="stat-chars">
            {charCount.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-primary" />
          <span className="text-muted-foreground">MODE:</span>
          <span className="font-bold text-primary" data-testid="stat-colormode">
            {colorMode.toUpperCase()}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Video className="w-3.5 h-3.5 text-primary" />
          <span className="text-muted-foreground">SOURCE:</span>
          <span className="font-bold text-primary uppercase" data-testid="stat-source">
            {sourceType || 'NONE'}
          </span>
        </div>
      </div>
    </div>
  );
}
