"use client";

import { useRef, useState } from "react";
import { Upload, X, Loader2, Plus } from "lucide-react";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MultiImageUploadProps {
  values: string[];
  onChange: (urls: string[]) => void;
}

export function MultiImageUpload({ values, onChange }: MultiImageUploadProps): React.JSX.Element {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteUrl, setPasteUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList): Promise<void> {
    setUploading(true);
    setError(null);
    const newUrls: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const res = await authApi.post<{ uploadUrl: string; fileUrl: string }>(
          "/uploads/presign",
          { filename: file.name, contentType: file.type },
        );
        await fetch(res.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        newUrls.push(res.fileUrl);
      }
      onChange([...values, ...newUrls]);
    } catch (error) {
      setError((error as Error).message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function addPastedUrl(): void {
    const url = pasteUrl.trim();
    if (!url || values.includes(url)) return;
    onChange([...values, url]);
    setPasteUrl("");
  }

  function remove(url: string): void {
    onChange(values.filter((imageUrl) => imageUrl !== url));
  }

  function move(from: number, to: number): void {
    const arr = [...values];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    onChange(arr);
  }

  return (
    <div className="space-y-3">
      {/* Image grid */}
      {values.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {values.map((url, i) => (
            <div key={url} className="relative group rounded-lg overflow-hidden border border-border bg-muted aspect-video">
              <img src={url} alt={`Step ${i + 1}`} className="h-full w-full object-cover" />
              {/* Overlay: index + controls */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-between p-1.5">
                <span className="text-xs font-bold text-white bg-black/50 rounded px-1.5 py-0.5">
                  {i + 1}
                </span>
                <div className="flex gap-1">
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => move(i, i - 1)}
                      className="h-5 w-5 rounded bg-white/20 hover:bg-white/40 text-white text-xs flex items-center justify-center"
                      title="Move left"
                    >
                      ←
                    </button>
                  )}
                  {i < values.length - 1 && (
                    <button
                      type="button"
                      onClick={() => move(i, i + 1)}
                      className="h-5 w-5 rounded bg-white/20 hover:bg-white/40 text-white text-xs flex items-center justify-center"
                      title="Move right"
                    >
                      →
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(url)}
                    className="h-5 w-5 rounded bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add more slot */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="aspect-video rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
            <span className="text-xs">{uploading ? "Uploading…" : "Add"}</span>
          </button>
        </div>
      )}

      {/* Upload + paste row (shown when empty, or always as add row) */}
      {values.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-border p-6 flex flex-col items-center gap-3 text-muted-foreground">
          <Upload className="h-8 w-8" />
          <p className="text-sm">Upload demonstration images</p>
          <p className="text-xs text-center">
            Each image shows a step or angle of the exercise — ordered left to right
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5 mr-1.5" />
            )}
            {uploading ? "Uploading…" : "Choose images"}
          </Button>
        </div>
      )}

      {/* URL paste */}
      <div className="flex gap-2">
        <Input
          placeholder="Or paste image URL and press Add"
          value={pasteUrl}
          onChange={(event) => setPasteUrl(event.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPastedUrl(); } }}
          className="text-xs"
        />
        <Button type="button" variant="outline" size="sm" onClick={addPastedUrl} className="shrink-0">
          Add
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => { if (event.target.files?.length) handleFiles(event.target.files); }}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
