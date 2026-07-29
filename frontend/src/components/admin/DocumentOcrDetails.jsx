import { FileSearch, ScanText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatFileSize, formatLabel } from "@/lib/formatters";

function DetailItem({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm text-slate-200">
        {value ?? "—"}
      </dd>
    </div>
  );
}

export default function DocumentOcrDetails({ document }) {
  if (!document) {
    return (
      <Card className="border-dashed border-slate-700 bg-slate-900 text-slate-100">
        <CardContent className="flex flex-col items-center px-6 py-12 text-center">
          <FileSearch className="size-10 text-slate-500" />
          <h3 className="mt-4 font-semibold">No document information available</h3>
          <p className="mt-2 text-sm text-slate-400">
            This application does not currently have processed document metadata.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader>
        <div className="flex items-center gap-3">
          <ScanText className="size-5 text-emerald-400" />
          <CardTitle>Identity document and OCR result</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="Document type" value={formatLabel(document.documentType)} />
          <DetailItem label="Original filename" value={document.originalName} />
          <DetailItem label="File type" value={document.mimeType} />
          <DetailItem label="File size" value={formatFileSize(document.fileSize)} />
          <DetailItem label="OCR status" value={formatLabel(document.ocrStatus)} />
          <DetailItem label="OCR confidence" value={typeof document.ocrConfidence === "number" ? `${document.ocrConfidence}%` : "—"} />
          <DetailItem label="Name verification" value={formatLabel(document.verificationStatus)} />
          <DetailItem label="Name match score" value={typeof document.nameMatchScore === "number" ? `${document.nameMatchScore}%` : "—"} />
          <DetailItem label="Processed" value={formatDate(document.updatedAt)} />
        </dl>

        <div>
          <h3 className="text-sm font-medium text-slate-200">
            Extracted document text
          </h3>

          <pre className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-300">
            {document.extractedText || "No OCR text was extracted."}
          </pre>
        </div>

        {document.processingError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {document.processingError}
          </div>
        )}
      </CardContent>
    </Card>
  );
}