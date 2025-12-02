import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileText, Trash2, Loader2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface KnowledgeDocument {
  id: string;
  title: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  extracted_content: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: "lead_magnet", label: "Lead Magnet Examples" },
  { value: "icp", label: "ICP Templates" },
  { value: "services", label: "Service Offerings" },
  { value: "pain_points", label: "Pain Points" },
  { value: "examples", label: "Success Examples" },
  { value: "other", label: "Other" },
];

export default function KnowledgeBaseManager() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("lead_magnet");
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("knowledge_base_documents")
        .select("*")
        .eq("document_type", "admin")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
      ];
      
      if (!validTypes.includes(file.type) && !file.name.endsWith(".docx")) {
        toast.error("Please select a PDF or DOCX file");
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const uploadDocument = async () => {
    if (!selectedFile || !title) {
      toast.error("Please select a file and enter a title");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Convert file to base64
      const arrayBuffer = await selectedFile.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      // Parse document to extract text
      toast.info("Extracting text from document...");
      const { data: parseResult, error: parseError } = await supabase.functions.invoke(
        "parse-knowledge-document",
        {
          body: {
            fileBase64: base64,
            fileName: selectedFile.name,
            mimeType: selectedFile.type,
          },
        }
      );

      if (parseError) throw parseError;
      if (!parseResult?.success) throw new Error(parseResult?.error || "Failed to parse document");

      // Upload file to storage
      const filePath = `admin/${Date.now()}_${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("knowledge-base")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("knowledge-base")
        .getPublicUrl(filePath);

      // Save document record
      const { error: insertError } = await supabase
        .from("knowledge_base_documents")
        .insert({
          uploaded_by: user.id,
          document_type: "admin",
          title,
          file_name: selectedFile.name,
          file_url: urlData.publicUrl,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          extracted_content: parseResult.extractedContent,
          category,
          is_active: true,
        });

      if (insertError) throw insertError;

      toast.success(`Document uploaded! Extracted ${parseResult.characterCount} characters.`);
      setSelectedFile(null);
      setTitle("");
      setCategory("lead_magnet");
      fetchDocuments();
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast.error(error.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const toggleDocumentActive = async (doc: KnowledgeDocument) => {
    try {
      const { error } = await supabase
        .from("knowledge_base_documents")
        .update({ is_active: !doc.is_active })
        .eq("id", doc.id);

      if (error) throw error;
      
      toast.success(doc.is_active ? "Document deactivated" : "Document activated");
      fetchDocuments();
    } catch (error: any) {
      console.error("Error toggling document:", error);
      toast.error("Failed to update document");
    }
  };

  const deleteDocument = async (doc: KnowledgeDocument) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      // Extract file path from URL
      const urlParts = doc.file_url.split("/");
      const filePath = urlParts.slice(-2).join("/");

      // Delete from storage
      await supabase.storage.from("knowledge-base").remove([filePath]);

      // Delete record
      const { error } = await supabase
        .from("knowledge_base_documents")
        .delete()
        .eq("id", doc.id);

      if (error) throw error;

      toast.success("Document deleted");
      fetchDocuments();
    } catch (error: any) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCategoryLabel = (value: string | null) => {
    return CATEGORIES.find(c => c.value === value)?.label || value || "Uncategorized";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Knowledge Document
          </CardTitle>
          <CardDescription>
            Upload PDF or DOCX files containing lead magnet examples, ICP templates, or other knowledge to enhance the AI's responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="file">Document File</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Document Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter document title"
                disabled={uploading}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={uploadDocument}
                disabled={!selectedFile || !title || uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload & Extract
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Knowledge Base Documents
              </CardTitle>
              <CardDescription>
                {documents.length} document{documents.length !== 1 ? "s" : ""} in the knowledge base
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDocuments}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents uploaded yet.</p>
              <p className="text-sm">Upload your first document to enhance the AI's knowledge.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    doc.is_active ? "bg-background" : "bg-muted/50 opacity-60"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{doc.title}</h4>
                      <Badge variant={doc.is_active ? "default" : "secondary"}>
                        {doc.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline">{getCategoryLabel(doc.category)}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{doc.file_name}</span>
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>
                        {doc.extracted_content
                          ? `${doc.extracted_content.length.toLocaleString()} chars extracted`
                          : "No content extracted"}
                      </span>
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPreviewContent(doc.extracted_content);
                        setPreviewTitle(doc.title);
                      }}
                      disabled={!doc.extracted_content}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={doc.is_active}
                        onCheckedChange={() => toggleDocumentActive(doc)}
                      />
                      <span className="text-sm text-muted-foreground w-16">
                        {doc.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteDocument(doc)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Preview Dialog */}
      <Dialog open={!!previewContent} onOpenChange={() => setPreviewContent(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Extracted Content: {previewTitle}</DialogTitle>
            <DialogDescription>
              This is the text content that will be used to enhance AI responses.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
            <pre className="whitespace-pre-wrap text-sm">{previewContent}</pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
