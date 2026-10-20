import { CheckCircle2Icon, ShieldAlertIcon } from "lucide-react";

const errorMessages: Record<string, string> = {
  edit: "更新権限がないため、この処理は実行できません。",
  delete: "削除権限がないため、この処理は実行できません。",
  admin: "Administrator権限がないため、この処理は実行できません。",
  view: "参照権限がありません。",
};

const savedMessages: Record<string, string> = {
  "1": "更新しました。",
  created: "登録しました。",
  deleted: "削除しました。",
  // Member side
  submitted: "登録しました。スタッフの審査後に公開・紹介されます。",
  resubmitted: "更新しました。内容はスタッフの再審査後に公開されます。",
  applied: "応募しました。",
  uploaded: "アップロードしました。",
  // Review queues
  approved: "承認しました。",
  rejected: "差戻しました。",
};

/** One-line result message driven by ?saved= or ?error= in the URL. */
export function Flash({ saved, error }: { saved?: string; error?: string }) {
  if (error && errorMessages[error]) {
    return (
      <p role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        <ShieldAlertIcon className="size-4" aria-hidden />
        {errorMessages[error]}
      </p>
    );
  }
  if (saved && savedMessages[saved]) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        <CheckCircle2Icon className="size-4" aria-hidden />
        {savedMessages[saved]}
      </p>
    );
  }
  return null;
}
