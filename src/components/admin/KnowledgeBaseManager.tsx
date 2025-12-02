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
import { Upload, FileText, Trash2, Loader2, Eye, RefreshCw, X, CheckCircle, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

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

interface PendingFile {
  file: File;
  title: string;
  category: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
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
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [defaultCategory, setDefaultCategory] = useState<string>("lead_magnet");
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

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

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];

    const newPendingFiles: PendingFile[] = [];
    let skipped = 0;

    files.forEach((file) => {
      if (!validTypes.includes(file.type) && !file.name.endsWith(".docx")) {
        skipped++;
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        skipped++;
        return;
      }

      newPendingFiles.push({
        file,
        title: file.name.replace(/\.[^/.]+$/, ""),
        category: defaultCategory,
        status: 'pending',
      });
    });

    if (skipped > 0) {
      toast.warning(`${skipped} file(s) skipped (invalid type or >10MB)`);
    }

    if (newPendingFiles.length > 0) {
      setPendingFiles((prev) => [...prev, ...newPendingFiles]);
    }

    // Reset input
    e.target.value = '';
  };

  const updatePendingFile = (index: number, updates: Partial<PendingFile>) => {
    setPendingFiles((prev) =>
      prev.map((pf, i) => (i === index ? { ...pf, ...updates } : pf))
    );
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadSingleDocument = async (pendingFile: PendingFile, index: number): Promise<boolean> => {
    updatePendingFile(index, { status: 'uploading' });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Convert file to base64
      const arrayBuffer = await pendingFile.file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      // Parse document to extract text
      const { data: parseResult, error: parseError } = await supabase.functions.invoke(
        "parse-knowledge-document",
        {
          body: {
            fileBase64: base64,
            fileName: pendingFile.file.name,
            mimeType: pendingFile.file.type,
          },
        }
      );

      if (parseError) throw parseError;
      if (!parseResult?.success) throw new Error(parseResult?.error || "Failed to parse document");

      // Upload file to storage
      const filePath = `admin/${Date.now()}_${pendingFile.file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("knowledge-base")
        .upload(filePath, pendingFile.file);

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
          title: pendingFile.title,
          file_name: pendingFile.file.name,
          file_url: urlData.publicUrl,
          file_size: pendingFile.file.size,
          mime_type: pendingFile.file.type,
          extracted_content: parseResult.extractedContent,
          category: pendingFile.category,
          is_active: true,
        });

      if (insertError) throw insertError;

      updatePendingFile(index, { status: 'success' });
      return true;
    } catch (error: any) {
      console.error("Error uploading document:", error);
      updatePendingFile(index, { status: 'error', error: error.message || "Upload failed" });
      return false;
    }
  };

  const uploadAllDocuments = async () => {
    const filesToUpload = pendingFiles.filter((pf) => pf.status === 'pending' || pf.status === 'error');
    if (filesToUpload.length === 0) {
      toast.error("No files to upload");
      return;
    }

    setUploading(true);
    setUploadProgress({ current: 0, total: filesToUpload.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < pendingFiles.length; i++) {
      const pf = pendingFiles[i];
      if (pf.status !== 'pending' && pf.status !== 'error') continue;

      const success = await uploadSingleDocument(pf, i);
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
      setUploadProgress((prev) => ({ ...prev, current: prev.current + 1 }));
    }

    setUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount} document(s) uploaded successfully`);
      fetchDocuments();
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} document(s) failed to upload`);
    }

    // Remove successful uploads from pending list
    setPendingFiles((prev) => prev.filter((pf) => pf.status !== 'success'));
  };

  const clearAllPending = () => {
    setPendingFiles([]);
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
    return CATEGORIES.find((c) => c.value === value)?.label || value || "Uncategorized";
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
            Bulk Upload Knowledge Documents
          </CardTitle>
          <CardDescription>
            Select multiple PDF or DOCX files to upload at once. You can customize titles and categories for each file before uploading.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="files">Select Documents</Label>
              <Input
                id="files"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFilesSelect}
                disabled={uploading}
                multiple
              />
              <p className="text-xs text-muted-foreground">
                PDF or DOCX files, max 10MB each. You can select multiple files.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-category">Default Category</Label>
              <Select value={defaultCategory} onValueChange={setDefaultCategory} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select default category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Applied to newly added files
              </p>
            </div>
          </div>

          {/* Pending Files List */}
          {pendingFiles.length > 0 && (
            <div className="space-y-3 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">
                  Files to Upload ({pendingFiles.length})
                </h4>
                <Button variant="ghost" size="sm" onClick={clearAllPending} disabled={uploading}>
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {pendingFiles.map((pf, index) => (
                  <div
                    key={`${pf.file.name}-${index}`}
                    className={`flex items-center gap-3 p-3 border rounded-md ${
                      pf.status === 'success'
                        ? 'bg-green-50 dark:bg-green-950/20 border-green-200'
                        : pf.status === 'error'
                        ? 'bg-red-50 dark:bg-red-950/20 border-red-200'
                        : pf.status === 'uploading'
                        ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200'
                        : 'bg-background'
                    }`}
                  >
                    {/* Status Icon */}
                    <div className="shrink-0">
                      {pf.status === 'uploading' && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
                      {pf.status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {pf.status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                      {pf.status === 'pending' && <FileText className="h-5 w-5 text-muted-foreground" />}
                    </div>

                    {/* File Info & Editable Fields */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={pf.title}
                          onChange={(e) => updatePendingFile(index, { title: e.target.value })}
                          placeholder="Document title"
                          disabled={uploading || pf.status === 'success'}
                          className="h-8"
                        />
                        <Select
                          value={pf.category}
                          onValueChange={(val) => updatePendingFile(index, { category: val })}
                          disabled={uploading || pf.status === 'success'}
                        >
                          <SelectTrigger className="w-[180px] h-8">
                            <SelectValue />
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
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{pf.file.name}</span>
                        <span>•</span>
                        <span>{formatFileSize(pf.file.size)}</span>
                        {pf.error && (
                          <>
                            <span>•</span>
                            <span className="text-red-500 truncate">{pf.error}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePendingFile(index)}
                      disabled={uploading || pf.status === 'uploading'}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <Progress value={(uploadProgress.current / uploadProgress.total) * 100} />
                  <p className="text-sm text-center text-muted-foreground">
                    Processing {uploadProgress.current} of {uploadProgress.total} files...
                  </p>
                </div>
              )}

              {/* Upload Button */}
              <Button
                onClick={uploadAllDocuments}
                disabled={uploading || pendingFiles.filter((pf) => pf.status === 'pending' || pf.status === 'error').length === 0}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload All ({pendingFiles.filter((pf) => pf.status === 'pending' || pf.status === 'error').length} files)
                  </>
                )}
              </Button>
            </div>
          )}
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
