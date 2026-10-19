"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { FileCheck2Icon, ImageUpIcon, LoaderCircleIcon } from "lucide-react";
import { uploadPhotoAction, uploadResumeAction, type UploadState } from "@/server/member/files-actions";
import { cn } from "@/lib/utils";

// One file input that uploads as soon as a file is chosen (or dropped). The
// server action stores the file and links it to the candidate; the parent gets
// the stored file back through onUploaded.

export type UploadedFile = { id: string; name: string; url: string };

type Props = {
  id: string;
  accept: string;
  kind: "photo" | "resume";
  /** Id of the file already stored, so the preview shows on a reload. */
  value?: string;
  onUploaded: (file: UploadedFile) => void;
  className?: string;
};

export function UploadField({ id, accept, kind, value, onUploaded, className }: Props) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<UploadState>({});
  const [current, setCurrent] = useState<{ name: string; url: string } | null>(
    value ? { name: "", url: `/api/files/${value}` } : null,
  );
  const [dragging, setDragging] = useState(false);

  function upload(file: File | undefined) {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const action = kind === "photo" ? uploadPhotoAction : uploadResumeAction;
    startTransition(async () => {
      const result = await action({}, formData);
      setState(result);
      if (result.ok && result.file) {
        setCurrent({ name: result.file.name, url: result.file.url });
        onUploaded(result.file);
      }
    });
  }

  const error = state.errors?.file;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          upload(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/50",
          dragging && "border-primary bg-primary/5",
          pending && "pointer-events-none opacity-70",
          error && "border-destructive",
        )}
        aria-busy={pending}
      >
        {pending ? (
          <>
            <LoaderCircleIcon className="size-8 animate-spin" aria-hidden />
            <span>アップロード中… (Uploading)</span>
          </>
        ) : (
          <>
            {current && kind === "photo" ? (
              <Image
                src={current.url}
                alt="アップロードした写真"
                width={120}
                height={160}
                unoptimized
                className="h-40 w-auto rounded-md object-cover ring-1 ring-foreground/10"
              />
            ) : current ? (
              <FileCheck2Icon className="size-8 text-primary" aria-hidden />
            ) : (
              <ImageUpIcon className="size-8" aria-hidden />
            )}
            {current?.name && <span className="font-medium text-foreground">{current.name}</span>}
            <span>
              {current
                ? "別のファイルを選ぶとこちらが置き換わります"
                : "ここにファイルをドロップするか、クリックして選択してください"}
            </span>
            <span className="text-xs">
              {current ? "Choose another file to replace it" : "Drop a file here or click to browse"}
            </span>
          </>
        )}
        <input
          id={id}
          type="file"
          accept={accept}
          className="sr-only"
          disabled={pending}
          onChange={(e) => {
            upload(e.target.files?.[0]);
            // Allow choosing the same file again after an error.
            e.target.value = "";
          }}
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        state.ok &&
        state.message && (
          <p role="status" className="text-sm text-green-800">
            {state.message}
          </p>
        )
      )}
    </div>
  );
}
