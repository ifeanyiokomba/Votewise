"use client";

import * as React from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LogoUploaderProps {
  currentLogo: string | null;
  orgName: string;
  onUploaded: (logoUrl: string) => void;
}

export function LogoUploader({ currentLogo, orgName, onUploaded }: LogoUploaderProps) {
  const [uploading, setUploading] = React.useState(false);
  const [preview, setPreview] = React.useState<string | null>(currentLogo);
  const [dragOver, setDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setPreview(currentLogo);
  }, [currentLogo]);

  async function handleFile(file: File) {
    if (!file) return;

    // Client-side validation
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", { description: "Maximum size is 5MB." });
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast.error("Unsupported format", {
        description: "Use JPG, PNG, WebP, SVG, or GIF.",
      });
      return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);

      const res = await fetch("/api/admin/organization/upload-logo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error("Upload failed", {
          description: data.error?.message ?? "Could not upload logo.",
        });
        setPreview(currentLogo); // Revert preview
        return;
      }

      toast.success("Logo uploaded", {
        description: "Your organization logo has been updated.",
      });
      onUploaded(data.data.logoUrl);
    } catch {
      toast.error("Upload failed", {
        description: "Network error. Please try again.",
      });
      setPreview(currentLogo);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Logo preview */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-xl border-2 border-border bg-muted/30">
            {preview ? (
              <img
                src={preview}
                alt={`${orgName} logo`}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <ImageIcon className="h-6 w-6" />
                <span className="text-[9px]">No logo</span>
              </div>
            )}
          </div>
          {uploading && (
            <div className="absolute inset-0 grid place-items-center rounded-xl bg-background/80 backdrop-blur">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <p className="text-sm font-medium">Organization logo</p>
          <p className="text-xs text-muted-foreground">
            Upload a logo from your device. PNG, JPG, WebP, SVG, or GIF. Max 5MB.
          </p>
        </div>
      </div>

      {/* Upload area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40 hover:bg-accent/20"
        )}
      >
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
          <Upload className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium">
          {dragOver ? "Drop logo here" : "Click to upload or drag & drop"}
        </p>
        <p className="text-[11px] text-muted-foreground">
          Square images work best (e.g. 256×256)
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* URL option (fallback) */}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Or paste a logo URL instead
        </summary>
        <div className="mt-2 flex gap-2">
          <input
            type="url"
            placeholder="https://example.com/logo.png"
            defaultValue={currentLogo ?? ""}
            onChange={(e) => {
              setPreview(e.target.value || null);
              onUploaded(e.target.value || "");
            }}
            className="flex-1 rounded-md border border-input bg-transparent px-3 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </details>
    </div>
  );
}
