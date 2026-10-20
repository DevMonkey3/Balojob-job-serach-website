"use client";

import { useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckIcon, Undo2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { approveAction, rejectAction } from "@/server/admin/reviews-actions";

// [承認] / [差戻し] for one item in a review queue or on a detail page. Each
// button opens a confirmation dialog whose <form> posts the server action
// (same shape as DeleteButton). The 差戻し form keeps browser validation on so
// a reason is always sent.

export type ReviewTarget = "job" | "candidate" | "application";

const REASON_MAX = 500;

type Props = {
  target: ReviewTarget;
  id: string;
  /** Noun in the confirmation: この{targetLabel}を承認します… */
  targetLabel: string;
  /**
   * Console path to show afterwards, without the result flag; `saved=approved`
   * or `saved=rejected` is appended. Omitted: /admin/reviews.
   */
  redirectTo?: string;
  size?: "xs" | "sm" | "default";
};

const withSaved = (base: string, decision: "approved" | "rejected") =>
  `${base}${base.includes("?") ? "&" : "?"}saved=${decision}`;

export function ReviewActions({ target, id, targetLabel, redirectTo, size = "sm" }: Props) {
  return (
    <>
      <ApproveButton target={target} id={id} targetLabel={targetLabel} redirectTo={redirectTo} size={size} />
      <RejectButton target={target} id={id} targetLabel={targetLabel} redirectTo={redirectTo} size={size} />
    </>
  );
}

function HiddenFields({ target, id, redirectTo, decision }: Pick<Props, "target" | "id" | "redirectTo"> & { decision: "approved" | "rejected" }) {
  return (
    <>
      <input type="hidden" name="target" value={target} />
      <input type="hidden" name="id" value={id} />
      {redirectTo && <input type="hidden" name="redirectTo" value={withSaved(redirectTo, decision)} />}
    </>
  );
}

function ApproveButton({ target, id, targetLabel, redirectTo, size }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size={size} />}>
        <CheckIcon />
        承認
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>確認</DialogTitle>
          <DialogDescription>この{targetLabel}を承認します。よろしいですか？</DialogDescription>
        </DialogHeader>
        <form action={approveAction} className="contents">
          <HiddenFields target={target} id={id} redirectTo={redirectTo} decision="approved" />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>キャンセル</DialogClose>
            <SubmitButton idle="承認する" busy="承認中…" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RejectButton({ target, id, targetLabel, redirectTo, size }: Props) {
  const [open, setOpen] = useState(false);
  const reasonId = useId();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size={size} />}>
        <Undo2Icon />
        差戻し
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>差戻し</DialogTitle>
          <DialogDescription>この{targetLabel}を申請者に差し戻します。理由を入力してください。</DialogDescription>
        </DialogHeader>
        <form action={rejectAction} className="contents">
          <HiddenFields target={target} id={id} redirectTo={redirectTo} decision="rejected" />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={reasonId}>
              差戻し理由<span className="text-destructive">*</span>
            </Label>
            <Textarea id={reasonId} name="reason" required maxLength={REASON_MAX} rows={4} autoFocus />
            <p className="text-xs text-muted-foreground">差戻し理由は申請者に表示されます（{REASON_MAX}文字以内）。</p>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>キャンセル</DialogClose>
            <SubmitButton idle="差戻す" busy="差戻し中…" variant="destructive" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton({ idle, busy, variant = "default" }: { idle: string; busy: string; variant?: "default" | "destructive" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? busy : idle}
    </Button>
  );
}
