import { useRef, useEffect } from 'react';

interface AsciiOutputProps {
  html: string;
  fontSize: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function AsciiOutput({ html, fontSize, containerRef }: AsciiOutputProps) {
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (preRef.current) {
      preRef.current.innerHTML = html;
    }
  }, [html]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-black overflow-hidden flex items-center justify-center relative group"
      data-testid="ascii-output-container"
    >
      <pre 
        ref={preRef}
        style={{ fontSize: `${fontSize}px`, lineHeight: 1 }}
        className="font-mono text-center whitespace-pre overflow-hidden"
        data-testid="ascii-output-pre"
      />
      
      {!html && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground flex-col gap-4">
          <div className="animate-pulse flex gap-2">
            <div className="w-3 h-3 rounded-full bg-primary/50" />
            <div className="w-3 h-3 rounded-full bg-primary/50" style={{ animationDelay: '0.2s' }} />
            <div className="w-3 h-3 rounded-full bg-primary/50" style={{ animationDelay: '0.4s' }} />
          </div>
          <p className="font-mono text-sm">WAITING FOR VIDEO SIGNAL...</p>
        </div>
      )}
    </div>
  );
}
