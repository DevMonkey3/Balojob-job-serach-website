"use client";

import { useId } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { FileTextIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadField } from "@/components/upload/upload-field";
import { deleteResumeAction } from "@/server/member/files-actions";

// BHALO200: the candidate's résumé file (履歴書). One file at a time; a new
// upload replaces the old one. Staff see it in the review queue.

export type ResumeFile = {
  id: string;
  name: string;
  url: string;
  /** Formatted on the server (YYYY/MM/DD). */
  uploadedAt: string;
};

export function ResumeUploadCard({ file }: { file: ResumeFile | null }) {
  const router = useRouter();
  const inputId = useId();

  async function remove() {
    await deleteResumeAction();
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileTextIcon className="size-4 text-primary" aria-hidden />
          履歴書ファイル
          <span className="text-sm font-normal text-muted-foreground">Résumé file</span>
        </CardTitle>
        <CardDescription>
          PDF・JPG・PNG、10MBまで。スタッフの確認後、承認された応募先の企業にのみ共有されます。
          <span className="block">PDF, JPG or PNG up to 10MB. Shared only with companies after staff approval.</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {file ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
            <div className="flex min-w-0 flex-col">
              <a
                href={file.url}
                target="_blank"
                rel="noopener"
                className="truncate font-medium text-primary underline-offset-4 hover:underline"
              >
                {file.name}
              </a>
              <span className="text-xs text-muted-foreground">アップロード日：{file.uploadedAt}</span>
            </div>
            <form
              action={remove}
              onSubmit={(e) => {
                if (!window.confirm("履歴書ファイルを削除しますか？ (Delete this file?)")) e.preventDefault();
              }}
            >
              <DeleteButton />
            </form>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">まだアップロードされていません。(No file uploaded yet.)</p>
        )}
        <UploadField
          id={inputId}
          kind="resume"
          accept=".pdf,image/jpeg,image/png"
          onUploaded={() => router.refresh()}
        />
      </CardContent>
    </Card>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" size="sm" disabled={pending}>
      <Trash2Icon />
      {pending ? "削除中…" : "削除"}
    </Button>
  );
}
