import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Loader2, Sparkles } from "lucide-react";

interface TranscriptUploaderProps {
  onAnalyze: (transcript: string, title: string) => Promise<void>;
  isAnalyzing: boolean;
}

export const TranscriptUploader = ({ onAnalyze, isAnalyzing }: TranscriptUploaderProps) => {
  const [transcript, setTranscript] = useState("");
  const [title, setTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    const validTypes = ['text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.docx')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a .txt or .docx file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    try {
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const text = await file.text();
        setTranscript(text);
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ""));
        }
      } else {
        // For DOCX files, we'll extract text on the client side using a simple approach
        toast({
          title: "Processing file...",
          description: "Extracting text from document",
        });
        
        // Read as array buffer and try to extract text
        const arrayBuffer = await file.arrayBuffer();
        const text = await extractTextFromDocx(arrayBuffer);
        setTranscript(text);
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ""));
        }
      }

      toast({
        title: "File loaded",
        description: "Transcript ready for analysis",
      });
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: "Error processing file",
        description: "Could not read the file. Please try pasting the text instead.",
        variant: "destructive",
      });
    }
  };

  const extractTextFromDocx = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    // Simple DOCX text extraction - looks for the document.xml content
    const uint8Array = new Uint8Array(arrayBuffer);
    const text = new TextDecoder().decode(uint8Array);
    
    // Try to find and extract text between XML tags
    const matches = text.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    if (matches) {
      return matches
        .map(m => m.replace(/<[^>]+>/g, ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // Fallback: try to get any readable text
    const readable = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (readable.length > 100) {
      return readable;
    }
    
    throw new Error('Could not extract text from document');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleSubmit = async () => {
    if (!transcript.trim()) {
      toast({
        title: "No transcript",
        description: "Please upload a file or paste your transcript",
        variant: "destructive",
      });
      return;
    }

    if (transcript.trim().length < 200) {
      toast({
        title: "Transcript too short",
        description: "Please provide a longer transcript for meaningful analysis",
        variant: "destructive",
      });
      return;
    }

    try {
      await onAnalyze(transcript, title || `Call Analysis - ${new Date().toLocaleDateString()}`);
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Could not analyze transcript",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Upload Call Transcript
        </CardTitle>
        <CardDescription>
          Upload a transcript file or paste the text directly for AI analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Call Title (optional)</Label>
          <Input
            id="title"
            placeholder="e.g., Discovery call with Acme Corp"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop your transcript file here, or
          </p>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
          >
            Choose File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.docx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Supports .txt and .docx files up to 5MB
          </p>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or paste transcript</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="transcript">Transcript Text</Label>
          <Textarea
            id="transcript"
            placeholder="Paste your call transcript here...&#10;&#10;Rep: Hi, thanks for taking my call today...&#10;Prospect: Sure, what is this about?&#10;..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {transcript.length} characters • Minimum 200 characters required
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isAnalyzing || transcript.length < 200}
          className="w-full"
          size="lg"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing Call...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Analyze Call
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
