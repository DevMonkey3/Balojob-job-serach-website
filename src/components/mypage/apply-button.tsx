"use client";

import { useActionState } from "react";
import { SendIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { applyAction } from "@/server/member/candidate-actions";
import type { ActionState } from "@/server/admin/form";

const initialState: ActionState = {};

// BHALO200 [応募する]: one application per job. Staff review it before the
// employer hears anything, so the button only confirms that it was sent.
export function ApplyButton({ jobId, applied }: { jobId: string; applied: boolean }) {
  const [state, formAction, pending] = useActionState(applyAction, initialState);
  const done = applied || state.ok === true;

  return (
    <div className="flex flex-col items-end gap-1">
      {done ? (
        <Badge variant="secondary">応募済み</Badge>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="jobId" value={jobId} />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <Spinner /> : <SendIcon />}
            {pending ? "送信中…" : "応募する"}
          </Button>
        </form>
      )}
      {state.message && (
        <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-xs text-muted-foreground" : "text-xs text-destructive"}>
          {state.message}
        </p>
      )}
    </div>
  );
}
