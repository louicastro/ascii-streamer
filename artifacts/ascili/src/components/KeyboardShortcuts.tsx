import { X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function KeyboardShortcuts() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="fixed bottom-12 right-4 bg-card/90 backdrop-blur-sm border border-primary/30 p-4 rounded-md shadow-lg font-mono text-xs z-50 w-64" data-testid="keyboard-shortcuts">
      <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
        <h4 className="text-primary font-bold">KEYBOARD SHORTCUTS</h4>
        <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setVisible(false)} data-testid="btn-close-shortcuts">
          <X className="w-3 h-3" />
        </Button>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Toggle Fullscreen</span>
          <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border">F</kbd>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Pause/Resume</span>
          <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border">Space</kbd>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Toggle Settings</span>
          <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border">S</kbd>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Copy ASCII</span>
          <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border">C</kbd>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Reset Settings</span>
          <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border">R</kbd>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Quick Presets</span>
          <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border">1-5</kbd>
        </div>
      </div>
    </div>
  );
}
