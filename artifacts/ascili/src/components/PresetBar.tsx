import { Button } from '@/components/ui/button';
import { PRESETS } from '@/lib/presets';
import { Terminal } from 'lucide-react';

interface PresetBarProps {
  onSelectPreset: (presetId: string) => void;
  activePresetId?: string;
}

export function PresetBar({ onSelectPreset, activePresetId }: PresetBarProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-card/50 border rounded-md overflow-x-auto" data-testid="preset-bar">
      <div className="flex items-center gap-2 text-muted-foreground mr-2 font-mono text-xs pl-2">
        <Terminal className="w-3.5 h-3.5" />
        PRESETS
      </div>
      
      {PRESETS.map((preset, index) => (
        <Button
          key={preset.id}
          variant={activePresetId === preset.id ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs font-mono whitespace-nowrap"
          onClick={() => onSelectPreset(preset.id)}
          data-testid={`btn-preset-${preset.id}`}
        >
          <span className="text-muted-foreground mr-1">[{index + 1}]</span>
          {preset.name}
        </Button>
      ))}
    </div>
  );
}
