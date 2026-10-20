"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Trash2Icon } from "lucide-react";
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

// [削除] with the MSG0001 confirmation from the specs
// (「この○○情報を削除します。よろしいですか？」, キャンセル / OK).

export function DeleteButton({
  action,
  id,
  message,
  label = "削除",
  size = "sm",
  variant = "ghost",
  redirectTo,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  message: string;
  label?: string;
  size?: "xs" | "sm" | "default";
  variant?: "ghost" | "outline" | "destructive";
  /** On edit pages: the list to show after deleting (the action reads it via redirectTarget). */
  redirectTo?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} size={size} />}>
        <Trash2Icon />
        {label}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>確認</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <form action={action} className="contents">
          <input type="hidden" name="id" value={id} />
          {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>キャンセル</DialogClose>
            <ConfirmButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "削除中…" : "OK"}
    </Button>
  );
}
