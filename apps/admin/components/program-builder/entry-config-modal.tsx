"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EntryDraft } from "./types";

interface EntryConfigModalProps {
  entry: EntryDraft | null;
  onSave: (updated: EntryDraft) => void;
  onClose: () => void;
}

export function EntryConfigModal({ entry, onSave, onClose }: EntryConfigModalProps): React.JSX.Element {
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (entry) {
      setSets(entry.targetSets != null ? String(entry.targetSets) : "");
      setReps(entry.targetReps != null ? String(entry.targetReps) : "");
      setWeight(entry.targetWeightKg != null ? String(entry.targetWeightKg) : "");
      setNotes(entry.notes ?? "");
    }
  }, [entry]);

  function handleSave(): void {
    if (!entry) return;
    onSave({
      ...entry,
      targetSets: sets ? Number(sets) : undefined,
      targetReps: reps ? Number(reps) : undefined,
      targetWeightKg: weight ? Number(weight) : undefined,
      notes: notes || undefined,
    });
  }

  return (
    <Dialog open={!!entry} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="truncate">{entry?.workout.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Target sets</label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 3"
                value={sets}
                onChange={(event) => setSets(event.target.value)}
                className="text-base"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Target reps</label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 10"
                value={reps}
                onChange={(event) => setReps(event.target.value)}
                className="text-base"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Target weight (kg)</label>
            <Input
              type="number"
              min={0}
              step={0.5}
              placeholder="e.g. 80"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              className="text-base"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Trainer note</label>
            <textarea
              rows={2}
              placeholder="Optional note for this session…"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
