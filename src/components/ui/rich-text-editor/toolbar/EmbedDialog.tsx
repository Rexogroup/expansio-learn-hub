import { useState } from 'react';
import { Globe, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Editor } from '@tiptap/react';
import { validateEmbedUrl, transformEmbedUrl } from '@/lib/embed-validation';

interface EmbedDialogProps {
  editor: Editor;
}

export const EmbedDialog = ({ editor }: EmbedDialogProps) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [error, setError] = useState('');
  const [embedType, setEmbedType] = useState('generic');

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setError('');
    
    if (value) {
      let urlToValidate = value.trim();
      
      // Check if input is an iframe HTML string
      if (urlToValidate.includes('<iframe')) {
        // Extract src attribute from iframe
        const srcMatch = urlToValidate.match(/src=["']([^"']+)["']/);
        if (srcMatch && srcMatch[1]) {
          urlToValidate = srcMatch[1];
          setUrl(urlToValidate); // Update to just the URL
          
          // Extract title attribute if present
          const titleMatch = value.match(/title=["']([^"']+)["']/);
          if (titleMatch && titleMatch[1] && !title) {
            setTitle(titleMatch[1]);
          }
        } else {
          setError('Could not extract URL from iframe code');
          return;
        }
      }
      
      const validation = validateEmbedUrl(urlToValidate);
      if (!validation.valid) {
        setError(validation.error || 'Invalid URL');
      } else {
        setEmbedType(validation.type);
      }
    }
  };

  const handleInsert = () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    const validation = validateEmbedUrl(url);
    if (!validation.valid) {
      setError(validation.error || 'Invalid URL');
      return;
    }

    const embedUrl = transformEmbedUrl(url, validation.type);
    
    editor.chain().focus().setEmbed({
      url: embedUrl,
      embedType: validation.type,
      aspectRatio,
      title,
      allowFullscreen: true,
    }).run();

    // Reset form
    setUrl('');
    setTitle('');
    setAspectRatio('16:9');
    setError('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:bg-accent rounded-sm">
          <Globe className="w-4 h-4" />
          <span>Embed Content</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Embed External Content</DialogTitle>
          <DialogDescription>
            Paste an embed URL or iframe HTML code from trusted platforms like YouTube, Google Docs, Figma, Gamma, and more.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="embed-url">Content URL or iframe code *</Label>
            <Input
              id="embed-url"
              placeholder="https://gamma.app/embed/... or <iframe src=...>"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
            />
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
            {url && !error && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check className="w-4 h-4" />
                <span>Valid {embedType} URL</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="aspect-ratio">Aspect Ratio</Label>
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger id="aspect-ratio">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                <SelectItem value="4:3">4:3 (Standard)</SelectItem>
                <SelectItem value="1:1">1:1 (Square)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="embed-title">Caption (Optional)</Label>
            <Input
              id="embed-title"
              placeholder="Add a caption for this embed"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {url && !error && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <p className="text-xs text-muted-foreground mb-2">Preview:</p>
              <div className={`w-full bg-background rounded overflow-hidden ${
                aspectRatio === '16:9' ? 'aspect-video' : 
                aspectRatio === '4:3' ? 'aspect-[4/3]' : 
                'aspect-square'
              }`}>
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Globe className="w-12 h-12" />
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p className="font-semibold mb-1">Supported platforms:</p>
            <p>YouTube, Vimeo, Google Docs/Sheets/Slides, Typeform, Loom, Figma, Miro, Airtable, Gamma</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleInsert} disabled={!url || !!error}>
            Insert Embed
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
