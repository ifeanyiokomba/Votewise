"use client";

import * as React from "react";
import { Upload, Loader2, ImageIcon } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

export function CandidatePhotoUploader({
  electionId,
  candidateId,
  currentPhoto,
  name,
  onPhotoChange,
}: {
  electionId: string;
  candidateId?: string;
  currentPhoto: string;
  name: string;
  onPhotoChange: (url: string) => void;
}) {
  const [uploading, setUploading] = React.useState(false);
  const [preview, setPreview] = React.useState(currentPhoto);
  const [dragOver, setDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => setPreview(currentPhoto), [currentPhoto]);

  async function handleFile(file: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", { description: "Maximum 5MB." });
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Unsupported format", { description: "Use JPG, PNG, WebP, or GIF." });
      return;
    }

    // Local preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      if (candidateId) formData.append("candidateId", candidateId);

      const res = await fetch(`/api/elections/${electionId}/candidates/upload-photo`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();

      if (data.success) {
        onPhotoChange(data.data.photoUrl);
        toast.success("Photo uploaded", { description: "Candidate headshot saved." });
      } else {
        toast.error("Upload failed", { description: data.error?.message });
        setPreview(currentPhoto);
      }
    } catch {
      toast.error("Upload failed", { description: "Network error." });
      setPreview(currentPhoto);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-xl border-2 border-border bg-muted/30">
          {preview ? (
            <img src={preview} alt="Candidate" className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <ImageIcon className="h-5 w-5" />
              <span className="text-[9px]">No photo</span>
            </div>
          )}
        </div>
        {uploading && (
          <div className="absolute inset-0 grid place-items-center rounded-xl bg-background/80 backdrop-blur">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-3 transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent/20"
        )}
      >
        <Upload className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-medium">{dragOver ? "Drop photo here" : "Click to upload or drag & drop"}</p>
        <p className="text-[10px] text-muted-foreground">JPG, PNG, WebP · Max 5MB</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
        className="hidden"
      />
    </div>
  );
}
