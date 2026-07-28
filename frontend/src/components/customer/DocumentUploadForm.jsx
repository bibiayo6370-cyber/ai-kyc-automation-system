import { useRef, useState } from "react";
import { FileImage, LoaderCircle, UploadCloud, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DOCUMENT_ACCEPTED_TYPES, DOCUMENT_TYPE_OPTIONS, MAX_DOCUMENT_SIZE_BYTES } from "@/config/documentOptions";
import { uploadCustomerKycDocument } from "@/services/customerKycService";

function formatFileSize(bytes) {
  if (typeof bytes !== "number") return "—";
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentUploadForm({ applicationId, onUploaded }) {
  const fileInputRef = useRef(null);
  const [documentType, setDocumentType] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationError, setValidationError] = useState("");
  const [serverError, setServerError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  function validateFile(file) {
    if (!file) return "Select a JPEG or PNG identity document.";
    if (!DOCUMENT_ACCEPTED_TYPES.includes(file.type)) return "Only JPEG and PNG documents are allowed.";
    if (file.size === 0) return "The selected document is empty.";
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) return "The uploaded document cannot exceed 5 MB.";
    return "";
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] ?? null;
    const errorMessage = validateFile(file);

    setValidationError(errorMessage);
    setServerError("");
    setSelectedFile(errorMessage ? null : file);
  }

  function removeSelectedFile() {
    setSelectedFile(null);
    setValidationError("");
    setServerError("");
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload() {
    setValidationError("");
    setServerError("");

    if (!documentType) {
      setValidationError("Select the identity-document type.");
      return;
    }

    const fileError = validateFile(selectedFile);

    if (fileError) {
      setValidationError(fileError);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadCustomerKycDocument({
        applicationId,
        documentType,
        file: selectedFile,
        onUploadProgress: (event) => {
          if (!event.total) return;
          setUploadProgress(Math.round((event.loaded * 100) / event.total));
        }
      });

      onUploaded(result);
    } catch (error) {
      setServerError(error.response?.data?.message ?? "The identity document could not be uploaded and processed.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-300">
            <UploadCloud className="size-6" />
          </div>

          <div>
            <CardTitle>Upload identity document</CardTitle>
            <CardDescription className="mt-1 text-slate-400">
              Select one document type and upload one clear JPEG or PNG image.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {validationError && <Alert variant="destructive"><AlertDescription>{validationError}</AlertDescription></Alert>}
        {serverError && <Alert variant="destructive"><AlertDescription>{serverError}</AlertDescription></Alert>}

        <div className="space-y-2">
          <Label htmlFor="document-type">Identity-document type</Label>

          <Select value={documentType} disabled={isUploading} onValueChange={setDocumentType}>
            <SelectTrigger id="document-type" className="w-full border-slate-700 bg-slate-950 text-slate-100">
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>

            <SelectContent>
              {DOCUMENT_TYPE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="identity-document">Identity-document image</Label>

          <input ref={fileInputRef} id="identity-document" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" disabled={isUploading} className="block w-full cursor-pointer rounded-md border border-slate-700 bg-slate-950 text-sm text-slate-300 file:mr-4 file:border-0 file:bg-slate-800 file:px-4 file:py-3 file:text-sm file:font-medium file:text-slate-100 hover:file:bg-slate-700" onChange={handleFileChange} />

          <p className="text-xs text-slate-500">JPEG or PNG only. Maximum file size: 5 MB. Only one document can be submitted.</p>
        </div>

        {selectedFile && (
          <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-300">
                <FileImage className="size-5" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-100">{selectedFile.name}</p>
                <p className="mt-1 text-xs text-slate-500">{formatFileSize(selectedFile.size)} · {selectedFile.type}</p>
              </div>
            </div>

            <Button type="button" variant="outline" size="sm" disabled={isUploading} className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white" onClick={removeSelectedFile}>
              <X className="size-4" />
              Remove
            </Button>
          </div>
        )}

        {isUploading && (
          <div className="space-y-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4" aria-live="polite">
            <div className="flex items-center gap-3">
              <LoaderCircle className="size-5 animate-spin text-sky-300" />
              <div>
                <p className="text-sm font-medium text-slate-100">Uploading and processing document</p>
                <p className="text-xs text-slate-400">OCR, identity verification and risk assessment may take a few moments.</p>
              </div>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-sky-400 transition-[width]" style={{ width: `${uploadProgress}%` }} />
            </div>

            <p className="text-right text-xs text-slate-500">{uploadProgress}% uploaded</p>
          </div>
        )}

        <Button type="button" className="w-full" disabled={isUploading || !selectedFile || !documentType} onClick={handleUpload}>
          {isUploading ? <><LoaderCircle className="size-4 animate-spin" />Processing document...</> : <><UploadCloud className="size-4" />Upload and submit for review</>}
        </Button>
      </CardContent>
    </Card>
  );
}