"use client";

import { HiddenField, TextField } from "@/components/admin/fields";
import { FormShell } from "@/components/admin/form-shell";
import { setSequenceAction } from "@/server/admin/masters-actions";

// BHALO814: moves one member-number sequence forward.
export function NumberingForm({ sequence, lastValue, max }: { sequence: string; lastValue: number; max: number }) {
  return (
    <FormShell action={setSequenceAction} submitLabel="採番値を更新" confirmEmpty={false} className="gap-3">
      <HiddenField name="sequence" value={sequence} />
      <TextField
        name="value"
        label="次の採番値"
        type="number"
        min={lastValue + 1}
        max={max}
        hint={`現在値（${lastValue.toLocaleString("ja-JP")}）より大きい値だけ設定できます。小さくすると会員番号が重複するため、戻すことはできません。`}
      />
    </FormShell>
  );
}
