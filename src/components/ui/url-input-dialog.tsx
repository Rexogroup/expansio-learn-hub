import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog";
import { Input } from "./input";
import { Label } from "./label";
import { Button } from "./button";
import { urlSchema } from "@/lib/validation";

interface UrlInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (url: string) => void;
  title: string;
  description: string;
  placeholder?: string;
}

export function UrlInputDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  description,
  placeholder = "https://example.com"
}: UrlInputDialogProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate URL
    const validation = urlSchema.safeParse(url);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    onSubmit(validation.data);
    setUrl("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setUrl("");
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                placeholder={placeholder}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError("");
                }}
                autoFocus
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">Insert</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
