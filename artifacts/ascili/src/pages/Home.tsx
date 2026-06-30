import { useState, useRef, useEffect, useCallback } from 'react';
import { AsciiOutput } from '@/components/AsciiOutput';
import { SourceControls } from '@/components/SourceControls';
import { SettingsPanel } from '@/components/SettingsPanel';
import { StatsBar } from '@/components/StatsBar';
import { PresetBar } from '@/components/PresetBar';
import { ExportControls } from '@/components/ExportControls';
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts';
import { useMediaSource } from '@/hooks/use-media-source';
import { RendererSettings, useAsciiRenderer } from '@/hooks/use-ascii-renderer';
import { PRESETS } from '@/lib/presets';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_SETTINGS = PRESETS[0].settings;

export default function Home() {
  const { toast } = useToast();
  
  // State
  const [settings, setSettings] = useState<RendererSettings>(DEFAULT_SETTINGS);
  const [activePresetId, setActivePresetId] = useState<string>(PRESETS[0].id);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showSettings, setShowSettings] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Refs
  const outputContainerRef = useRef<HTMLDivElement>(null);

  // Custom Hooks
  const { 
    sourceType, 
    error: sourceError, 
    videoRef, 
    startWebcam, 
    startScreen, 
    startFile, 
    stopSource 
  } = useMediaSource();

  const {
    outputHtml,
    actualFps,
    latency,
    charCount
  } = useAsciiRenderer(videoRef, settings, isPlaying && !!sourceType);

  // Error handling
  useEffect(() => {
    if (sourceError) {
      toast({
        title: "Source Error",
        description: sourceError,
        variant: "destructive"
      });
    }
  }, [sourceError, toast]);

  // Handlers
  const handleUpdateSettings = useCallback((updates: Partial<RendererSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    setActivePresetId(''); // Clear preset if manual override
  }, []);

  const handleSelectPreset = useCallback((presetId: string) => {
    const preset = PRESETS.find(p => p.id === presetId);
    if (preset) {
      setSettings(preset.settings);
      setActivePresetId(preset.id);
      
      toast({
        title: "Preset Applied",
        description: `Loaded ${preset.name} preset.`
      });
    }
  }, [toast]);

  const handleResetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setActivePresetId(PRESETS[0].id);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      outputContainerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch(e.key.toLowerCase()) {
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying(prev => !prev);
          break;
        case 's':
          e.preventDefault();
          setShowSettings(prev => !prev);
          break;
        case 'c':
          e.preventDefault();
          // Find export controls copy button and click it
          document.querySelector<HTMLButtonElement>('[data-testid="btn-export-copy"]')?.click();
          break;
        case 'r':
          e.preventDefault();
          handleResetSettings();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
          e.preventDefault();
          const index = parseInt(e.key) - 1;
          if (PRESETS[index]) handleSelectPreset(PRESETS[index].id);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleResetSettings, handleSelectPreset, toggleFullscreen]);

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden" data-testid="page-home">
      {/* Top Navigation / App Bar */}
      <header className="h-14 border-b flex items-center justify-between px-4 bg-card z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="font-mono text-xl font-bold tracking-tighter flex items-center">
            <span className="text-primary mr-1">&gt;</span>
            ASCILI<span className="animate-pulse text-primary">_</span>
          </div>
          <div className="h-6 w-px bg-border mx-2 hidden sm:block" />
          <div className="hidden sm:block">
            <PresetBar 
              onSelectPreset={handleSelectPreset}
              activePresetId={activePresetId}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <SourceControls 
            sourceType={sourceType}
            isPlaying={isPlaying}
            videoRef={videoRef}
            onStartWebcam={startWebcam}
            onStartScreen={startScreen}
            onStartFile={startFile}
            onStop={stopSource}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
          />
          <div className="h-6 w-px bg-border mx-1 hidden sm:block" />
          <div className="hidden sm:block">
            <ExportControls 
              outputHtml={outputHtml}
              onToggleFullscreen={toggleFullscreen}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Output Panel */}
        <main className={`flex-1 relative ${isFullscreen ? 'z-50' : ''}`}>
          <AsciiOutput 
            html={outputHtml} 
            fontSize={settings.fontSize} 
            containerRef={outputContainerRef}
          />
          
          {isFullscreen && (
            <div className="absolute top-4 right-4 opacity-50 hover:opacity-100 transition-opacity">
               <ExportControls 
                  outputHtml={outputHtml}
                  onToggleFullscreen={toggleFullscreen}
               />
            </div>
          )}
        </main>

        {/* Settings Sidebar */}
        {showSettings && !isFullscreen && (
          <aside className="w-80 shrink-0 z-10">
            <SettingsPanel 
              settings={settings}
              onChange={handleUpdateSettings}
              onReset={handleResetSettings}
            />
          </aside>
        )}
      </div>

      {/* Footer Stats */}
      <StatsBar 
        fps={actualFps}
        latency={latency}
        charCount={charCount}
        colorMode={settings.colorMode}
        sourceType={sourceType}
      />

      <KeyboardShortcuts />
    </div>
  );
}
