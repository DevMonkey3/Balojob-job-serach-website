"use client";

import { useActionState } from "react";
import { CheckCircle2Icon, SendIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { applyAction } from "@/server/member/candidate-actions";
import type { ActionState } from "@/server/admin/form";

const initialState: ActionState = {};

// [応募する]: one application per job. Staff review it before the employer
// hears anything, so the button only confirms that it was sent.
// `size="lg"` is the wide button on a job's own page.
export function ApplyButton({ jobId, applied, size = "sm" }: { jobId: string; applied: boolean; size?: "sm" | "lg" }) {
  const [state, formAction, pending] = useActionState(applyAction, initialState);
  const done = applied || state.ok === true;
  const large = size === "lg";

  return (
    <div className={cn("flex flex-col gap-1.5", large ? "items-stretch" : "items-end")}>
      {done ? (
        <p
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 font-semibold text-emerald-800",
            large ? "h-12 text-base" : "h-7 px-2.5 text-xs",
          )}
        >
          <CheckCircle2Icon className={large ? "size-5" : "size-3.5"} aria-hidden />
          応募済み
        </p>
      ) : (
        <form action={formAction} className={large ? "flex" : undefined}>
          <input type="hidden" name="jobId" value={jobId} />
          {large ? (
            <button
              type="submit"
              disabled={pending}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-orange to-brand-red text-base font-bold text-white shadow-sm transition-[filter,transform] hover:brightness-110 active:translate-y-px disabled:opacity-60"
            >
              {pending ? <Spinner /> : <SendIcon className="size-5" aria-hidden />}
              {pending ? "送信中…" : "この求人に応募する"}
            </button>
          ) : (
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? <Spinner /> : <SendIcon />}
              {pending ? "送信中…" : "応募する"}
            </Button>
          )}
        </form>
      )}
      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={cn("text-xs", state.ok ? "text-muted-foreground" : "text-destructive", large && "text-center")}
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
