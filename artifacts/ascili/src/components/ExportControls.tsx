import { Button } from '@/components/ui/button';
import { Copy, Download, Code, Maximize } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExportControlsProps {
  outputHtml: string;
  onToggleFullscreen: () => void;
}

export function ExportControls({ outputHtml, onToggleFullscreen }: ExportControlsProps) {
  const { toast } = useToast();

  const handleCopyText = () => {
    // Strip HTML tags for plain text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = outputHtml.replace(/<br\s*[\/]?>/gi, '\n');
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    navigator.clipboard.writeText(plainText).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "ASCII text copied successfully.",
      });
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      toast({
        title: "Copy failed",
        description: "Could not copy text to clipboard.",
        variant: "destructive"
      });
    });
  };

  const handleDownloadTxt = () => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = outputHtml.replace(/<br\s*[\/]?>/gi, '\n');
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    const blob = new Blob([plainText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ascili-export-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "File downloaded",
      description: "Saved as plain text.",
    });
  };

  const handleDownloadHtml = () => {
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ASCILI Export</title>
  <style>
    body { background: #000; color: #fff; margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    pre { font-family: monospace; font-size: 10px; line-height: 1; text-align: center; }
  </style>
</head>
<body>
  <pre>${outputHtml}</pre>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ascili-export-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "File downloaded",
      description: "Saved as HTML with colors.",
    });
  };

  return (
    <div className="flex items-center gap-2 bg-card p-2 rounded-md border" data-testid="export-controls">
      <Button variant="ghost" size="sm" onClick={handleCopyText} title="Copy Text" data-testid="btn-export-copy">
        <Copy className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={handleDownloadTxt} title="Download .txt" data-testid="btn-export-txt">
        <Download className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={handleDownloadHtml} title="Download .html" data-testid="btn-export-html">
        <Code className="w-4 h-4" />
      </Button>
      <div className="w-px h-4 bg-border mx-1" />
      <Button variant="ghost" size="sm" onClick={onToggleFullscreen} title="Fullscreen (F)" data-testid="btn-toggle-fullscreen">
        <Maximize className="w-4 h-4 text-primary" />
      </Button>
    </div>
  );
}
