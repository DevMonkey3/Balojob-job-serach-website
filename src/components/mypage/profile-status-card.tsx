import Link from "next/link";
import { ClipboardCheckIcon, UserPenIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewBadge } from "@/components/review/review-badge";
import type { CandidateStatus } from "@/lib/review";

// BHALO200: where the candidate's profile is in the staff review.

export type ProfileStatus = {
  status: CandidateStatus;
  reason: string;
  /** Formatted on the server (YYYY/MM/DD), null until first submitted. */
  submittedAt: string | null;
};

const copy: Record<CandidateStatus, { ja: string; en: string }> = {
  draft: {
    ja: "プロフィールはまだ提出されていません。プロフィール作成（全17ステップ）を入力し、最後の「登録してマイページへ」を押すとスタッフの審査が始まります。",
    en: "Fill in your profile and press the final button to submit it for review.",
  },
  pending: {
    ja: "スタッフがプロフィールを確認しています。承認されると、希望に合う企業にご紹介できるようになります。",
    en: "Our staff are checking your profile. Once approved, we can introduce you to companies.",
  },
  approved: {
    ja: "プロフィールは承認されました。希望に合う企業にご紹介できる状態です。",
    en: "Your profile is approved and can be introduced to companies.",
  },
  rejected: {
    ja: "内容を修正して、もう一度「登録してマイページへ」を押してください。",
    en: "Please fix the points below and submit your profile again.",
  },
};

export function ProfileStatusCard({ status }: { status: ProfileStatus }) {
  const text = copy[status.status];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheckIcon className="size-4 text-primary" aria-hidden />
          プロフィール審査状況
          <span className="text-sm font-normal text-muted-foreground">Profile review</span>
        </CardTitle>
        <CardDescription>
          <ReviewBadge kind="candidate" status={status.status} reason={status.reason} />
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p>{text.ja}</p>
        <p className="text-xs text-muted-foreground">{text.en}</p>
        {status.submittedAt && status.status !== "draft" && (
          <p className="text-xs text-muted-foreground">提出日：{status.submittedAt}</p>
        )}
        {status.status === "draft" && (
          <Link href="/profile/basic" className={buttonVariants({ className: "self-start" })}>
            <UserPenIcon />
            プロフィールを入力する
          </Link>
        )}
        {status.status === "rejected" && (
          <Link href="/profile/basic" className={buttonVariants({ className: "self-start" })}>
            <UserPenIcon />
            修正して再申請
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
