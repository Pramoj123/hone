"use client";

import { useRef, useState } from "react";
import { Image, Video, Volume2, Upload, X, Loader2 } from "lucide-react";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type MediaType = "image" | "video" | "audio";

interface MediaUploadProps {
  type: MediaType;
  value: string;
  onChange: (url: string) => void;
  className?: string;
}

const TYPE_CONFIG: Record<
  MediaType,
  { accept: string; Icon: React.ElementType; label: string; contentTypes: string[] }
> = {
  image: {
    accept: "image/*",
    Icon: Image,
    label: "Upload image",
    contentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
  video: {
    accept: "video/*",
    Icon: Video,
    label: "Upload video",
    contentTypes: ["video/mp4", "video/webm", "video/quicktime"],
  },
  audio: {
    accept: "audio/*",
    Icon: Volume2,
    label: "Upload audio",
    contentTypes: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg"],
  },
};

export function MediaUploadField({
  type,
  value,
  onChange,
  className,
}: MediaUploadProps): React.JSX.Element {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { accept, Icon, label } = TYPE_CONFIG[type];

  async function handleFile(file: File): Promise<void> {
    setUploading(true);
    setError(null);
    try {
      const res = await authApi.post<{ uploadUrl: string; fileUrl: string }>(
        "/uploads/presign",
        { filename: file.name, contentType: file.type },
      );
      await fetch(res.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      onChange(res.fileUrl);
    } catch (e) {
      setError((e as Error).message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleClear(): void {
    onChange("");
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const hasValue = !!value;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Preview */}
      {type === "image" && hasValue && (
        <div className="relative rounded-lg overflow-hidden border border-border bg-muted h-44">
          <img src={value} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background/80 flex items-center justify-center hover:bg-background"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {type === "video" && hasValue && (
        <div className="rounded-lg border border-border overflow-hidden bg-black">
          <video src={value} controls className="w-full max-h-52" />
          <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
            <p className="text-xs text-muted-foreground truncate">{value.split("/").pop()}</p>
            <button type="button" onClick={handleClear} className="ml-2 shrink-0">
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        </div>
      )}

      {type === "audio" && hasValue && (
        <div className="rounded-lg border border-border p-3 bg-muted/50 flex items-center gap-3">
          <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <audio src={value} controls className="flex-1 h-8" />
          <button type="button" onClick={handleClear}>
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      )}

      {/* Upload + URL row */}
      <div className="flex gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="shrink-0"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5 mr-1.5" />
          )}
          {uploading ? "Uploading…" : label}
        </Button>
        <Input
          placeholder="or paste URL"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setError(null);
          }}
          className="flex-1 text-xs"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
