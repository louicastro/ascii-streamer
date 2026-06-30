import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Settings2, RotateCcw } from 'lucide-react';
import { RendererSettings } from '@/hooks/use-ascii-renderer';
import { CHARACTER_SETS, ColorMode } from '@/lib/presets';

interface SettingsPanelProps {
  settings: RendererSettings;
  onChange: (settings: Partial<RendererSettings>) => void;
  onReset: () => void;
}

export function SettingsPanel({ settings, onChange, onReset }: SettingsPanelProps) {
  return (
    <div className="w-80 bg-card border-l flex flex-col h-full overflow-hidden" data-testid="settings-panel">
      <div className="p-4 border-b flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-2 font-mono text-primary font-bold">
          <Settings2 className="w-4 h-4" />
          SYSTEM.CFG
        </div>
        <Button variant="ghost" size="icon" onClick={onReset} className="h-8 w-8 text-muted-foreground hover:text-primary" title="Reset to Defaults" data-testid="btn-reset-settings">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-4">
          <h3 className="font-mono text-xs text-muted-foreground font-bold tracking-wider">RENDER MODE</h3>
          
          <div className="space-y-2">
            <Label className="text-xs font-mono">Color Mode</Label>
            <Select 
              value={settings.colorMode} 
              onValueChange={(v) => onChange({ colorMode: v as ColorMode })}
            >
              <SelectTrigger className="h-8 font-mono text-xs" data-testid="select-color-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Monochrome">Monochrome</SelectItem>
                <SelectItem value="Grayscale">Grayscale</SelectItem>
                <SelectItem value="ANSI 16">ANSI 16</SelectItem>
                <SelectItem value="ANSI 256">ANSI 256</SelectItem>
                <SelectItem value="True Color">True Color</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-mono">Character Set</Label>
            <Select 
              value={settings.characterSet} 
              onValueChange={(v) => onChange({ characterSet: v })}
            >
              <SelectTrigger className="h-8 font-mono text-xs" data-testid="select-character-set">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(CHARACTER_SETS).map(set => (
                  <SelectItem key={set} value={set}>{set}</SelectItem>
                ))}
                <SelectItem value="Custom">Custom...</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {settings.characterSet === "Custom" && (
            <div className="space-y-2">
              <Label className="text-xs font-mono">Custom Characters (Dark to Light)</Label>
              <Input 
                value={settings.customCharSet}
                onChange={(e) => onChange({ customCharSet: e.target.value })}
                className="h-8 font-mono text-xs"
                placeholder=" .:-=+#@"
                data-testid="input-custom-charset"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label className="text-xs font-mono">Invert Characters</Label>
            <Switch 
              checked={settings.invertChars}
              onCheckedChange={(v) => onChange({ invertChars: v })}
              data-testid="switch-invert-chars"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-mono text-xs text-muted-foreground font-bold tracking-wider">RESOLUTION & TIMING</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label className="text-xs font-mono">Columns (Width)</Label>
              <span className="text-xs font-mono text-primary">{settings.cols}</span>
            </div>
            <Slider 
              value={[settings.cols]} 
              min={20} max={300} step={2}
              onValueChange={([v]) => onChange({ cols: v })}
              data-testid="slider-cols"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label className="text-xs font-mono">Font Size</Label>
              <span className="text-xs font-mono text-primary">{settings.fontSize}px</span>
            </div>
            <Slider 
              value={[settings.fontSize]} 
              min={4} max={24} step={1}
              onValueChange={([v]) => onChange({ fontSize: v })}
              data-testid="slider-font-size"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-mono">Target FPS</Label>
            <Select 
              value={settings.fps.toString()} 
              onValueChange={(v) => onChange({ fps: parseInt(v, 10) })}
            >
              <SelectTrigger className="h-8 font-mono text-xs" data-testid="select-fps">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 FPS (Cinematic)</SelectItem>
                <SelectItem value="15">15 FPS (Retro)</SelectItem>
                <SelectItem value="24">24 FPS (Film)</SelectItem>
                <SelectItem value="30">30 FPS (Standard)</SelectItem>
                <SelectItem value="60">60 FPS (Smooth)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-mono text-xs text-muted-foreground font-bold tracking-wider">IMAGE SIGNAL</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label className="text-xs font-mono">Brightness</Label>
              <span className="text-xs font-mono text-primary">{settings.brightness > 0 ? `+${settings.brightness}` : settings.brightness}</span>
            </div>
            <Slider 
              value={[settings.brightness]} 
              min={-100} max={100} step={1}
              onValueChange={([v]) => onChange({ brightness: v })}
              data-testid="slider-brightness"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label className="text-xs font-mono">Contrast</Label>
              <span className="text-xs font-mono text-primary">{settings.contrast > 0 ? `+${settings.contrast}` : settings.contrast}</span>
            </div>
            <Slider 
              value={[settings.contrast]} 
              min={-100} max={100} step={1}
              onValueChange={([v]) => onChange({ contrast: v })}
              data-testid="slider-contrast"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label className="text-xs font-mono">Gamma</Label>
              <span className="text-xs font-mono text-primary">{settings.gamma > 0 ? `+${settings.gamma}` : settings.gamma}</span>
            </div>
            <Slider 
              value={[settings.gamma]} 
              min={-100} max={100} step={1}
              onValueChange={([v]) => onChange({ gamma: v })}
              data-testid="slider-gamma"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label className="text-xs font-mono">Saturation</Label>
              <span className="text-xs font-mono text-primary">{settings.saturation > 0 ? `+${settings.saturation}` : settings.saturation}</span>
            </div>
            <Slider 
              value={[settings.saturation]} 
              min={-100} max={100} step={1}
              onValueChange={([v]) => onChange({ saturation: v })}
              data-testid="slider-saturation"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
