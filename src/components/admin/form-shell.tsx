"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormErrorsContext } from "@/components/admin/form-context";
import type { ActionState } from "@/server/admin/form";
import { cn } from "@/lib/utils";

// Wraps an admin add/edit form around a server action: shows the action's
// message and field errors, and implements MSG0001 from the specs
// (「未入力項目があります。更新してよろしいですか？」) before submitting.

const initialState: ActionState = {};

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel?: string;
  cancelHref?: string;
  /** Ask before saving when some inputs are empty. */
  confirmEmpty?: boolean;
  className?: string;
};

function isTextLike(el: Element): el is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  if (el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) return true;
  return (
    el instanceof HTMLInputElement &&
    !["hidden", "checkbox", "radio", "submit", "button", "file", "password"].includes(el.type)
  );
}

export function FormShell({
  action,
  children,
  submitLabel = "更新",
  cancelHref,
  confirmEmpty = true,
  className,
}: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const skipConfirm = useRef(false);
  const [emptyCount, setEmptyCount] = useState<number | null>(null);

  // Submitting by hand (instead of letting the form's `action` run) keeps the
  // typed values on screen when the action comes back with validation errors;
  // React 19 resets a form after a native action submit.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (confirmEmpty && !skipConfirm.current) {
      const empties = Array.from(form.elements).filter(
        (el) => isTextLike(el) && !el.disabled && el.value.trim() === "",
      );
      if (empties.length > 0) {
        setEmptyCount(empties.length);
        return;
      }
    }
    skipConfirm.current = false;
    const formData = new FormData(form);
    startTransition(() => formAction(formData));
  }

  function confirmAndSubmit() {
    skipConfirm.current = true;
    setEmptyCount(null);
    formRef.current?.requestSubmit();
  }

  return (
    <FormErrorsContext value={state.errors ?? {}}>
      <form
        ref={formRef}
        action={formAction}
        onSubmit={onSubmit}
        noValidate
        className={cn("flex flex-col gap-6", className)}
      >
        {state.message && (
          <p
            role="alert"
            className={cn(
              "rounded-lg border px-4 py-3 text-sm",
              state.ok ? "border-green-200 bg-green-50 text-green-800" : "border-destructive/30 bg-destructive/5 text-destructive",
            )}
          >
            {state.message}
          </p>
        )}

        {children}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? (
              <>
                <Spinner />
                保存中…
              </>
            ) : (
              submitLabel
            )}
          </Button>
          {cancelHref && (
            <Link href={cancelHref} className={buttonVariants({ variant: "outline", size: "lg" })}>
              もどる
            </Link>
          )}
        </div>
      </form>

      <Dialog open={emptyCount !== null} onOpenChange={(open) => !open && setEmptyCount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認</DialogTitle>
            <DialogDescription>
              未入力項目があります（{emptyCount}件）。更新してよろしいですか？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>キャンセル</DialogClose>
            <Button onClick={confirmAndSubmit}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormErrorsContext>
  );
}
