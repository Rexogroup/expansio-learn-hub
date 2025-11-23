import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileUp, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PdfImporterProps {
  onContentImported: (html: string) => void;
}

export const PdfImporter = ({ onContentImported }: PdfImporterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'converting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "PDF must be under 20MB",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setStatus('parsing');
    setErrorMessage('');

    try {
      // Convert PDF to base64 for server-side processing
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );
      
      setStatus('converting');

      // Call edge function with raw PDF data for proper parsing
      const { data, error } = await supabase.functions.invoke('convert-pdf-to-lesson', {
        body: {
          pdfFile: base64,
          fileName: file.name,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Conversion failed');
      }

      setStatus('success');
      
      // Import the converted HTML
      onContentImported(data.html);
      
      toast({
        title: "PDF imported successfully",
        description: "Content has been converted to lesson format",
      });

      setTimeout(() => {
        setIsOpen(false);
        setStatus('idle');
        setIsProcessing(false);
      }, 1500);

    } catch (error) {
      console.error('PDF import error:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to import PDF');
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : 'Failed to import PDF',
        variant: "destructive",
      });
      setIsProcessing(false);
    }

    // Reset file input
    event.target.value = '';
  };


  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <FileUp className="h-4 w-4" />
        Import from PDF
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import PDF to Lesson</DialogTitle>
            <DialogDescription>
              Upload a PDF (from Gamma.app or other source) to automatically convert it to lesson format
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {status === 'idle' && (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  Select a PDF file to import (max 20MB, 50 pages)
                </p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="pdf-upload"
                  disabled={isProcessing}
                />
                <label htmlFor="pdf-upload">
                  <Button type="button" variant="secondary" asChild>
                    <span>Choose PDF File</span>
                  </Button>
                </label>
              </div>
            )}

            {status === 'parsing' && (
              <div className="text-center py-8">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-sm font-medium">Parsing PDF...</p>
                <p className="text-xs text-muted-foreground mt-1">Extracting content and structure</p>
              </div>
            )}

            {status === 'converting' && (
              <div className="text-center py-8">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-sm font-medium">Converting to lesson format...</p>
                <p className="text-xs text-muted-foreground mt-1">AI is transforming content to custom blocks</p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-sm font-medium">Import successful!</p>
                <p className="text-xs text-muted-foreground mt-1">Content has been added to the editor</p>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <p className="text-sm font-medium">Import failed</p>
                <p className="text-xs text-muted-foreground mt-1">{errorMessage}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStatus('idle')}
                  className="mt-4"
                >
                  Try Again
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
