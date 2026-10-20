import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Flash } from "@/components/admin/flash";
import { PageHeader } from "@/components/admin/page-header";
import { param, type SearchParams } from "@/components/admin/pagination";
import { ReviewActions } from "@/components/admin/reviews/review-actions";
import { queueHref } from "@/components/admin/reviews/queue-tabs";
import { TableSkeleton } from "@/components/admin/status";
import { CandidateProfileView } from "@/components/review/candidate-profile-view";
import { ReviewBadge } from "@/components/review/review-badge";
import { fmtDateTime } from "@/lib/admin/labels";
import { requireStaff } from "@/server/auth/staff";
import { db } from "@/server/db";
import { parseId } from "@/server/admin/form";
import { getMember } from "@/server/admin/members";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> };

// 候補者プロフィール審査: the read-only 履歴書 of one candidate with
// [承認] / [差戻し]. Editing stays on BHALO806 (/admin/members/[id]).
export default function CandidateReviewPage({ params, searchParams }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<TableSkeleton />}>
        <CandidateReview params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const fileUrl = (id: string | null) => (id ? `/admin/files/${id}` : null);

async function CandidateReview({ params, searchParams }: Props) {
  await requireStaff("edit");
  const [{ id: rawId }, sp] = await Promise.all([params, searchParams]);
  const id = parseId(rawId);
  if (!id) notFound();

  // getMember has the profile; the review state and the uploaded files are
  // read alongside it (staff open files through /admin/files/<id>).
  const [member, review] = await Promise.all([
    getMember(id),
    db.individual.findUnique({
      where: { id },
      select: {
        reviewStatus: true,
        rejectionReason: true,
        submittedAt: true,
        reviewedAt: true,
        resumeFileId: true,
        photoFileId: true,
        resumeFile: { select: { originalName: true } },
      },
    }),
  ]);
  if (!member || !review) notFound();

  const submitted = review.submittedAt !== null;
  const status = submitted ? review.reviewStatus : "draft";
  const pending = submitted && review.reviewStatus === "pending";
  const timeline = [
    submitted && `申請日時 ${fmtDateTime(review.submittedAt)}`,
    review.reviewedAt && `審査日時 ${fmtDateTime(review.reviewedAt)}`,
  ].filter((s): s is string => typeof s === "string");

  return (
    <>
      <PageHeader
        screenId="MVP"
        title="候補者プロフィール審査"
        titleEn="Candidate review"
        description={[`${member.fullName} / 会員番号 ${member.memberNo}`, ...timeline].join(" ・ ")}
      >
        <ReviewBadge kind="candidate" status={status} reason={review.rejectionReason} />
        <Link href={`/admin/members/${member.id}`} className={buttonVariants({ variant: "outline" })}>
          <PencilIcon />
          編集
        </Link>
      </PageHeader>
      <Flash saved={param(sp, "saved")} />
      <CandidateProfileView
        member={member}
        files={{
          photoUrl: fileUrl(review.photoFileId),
          resumeUrl: fileUrl(review.resumeFileId),
          resumeName: review.resumeFile?.originalName ?? null,
        }}
        showContact
        backHref={queueHref("candidates")}
        backLabel="審査待ち一覧へ"
        actions={
          pending ? (
            <ReviewActions target="candidate" id={member.id} targetLabel="候補者プロフィール" redirectTo={queueHref("candidates")} size="default" />
          ) : undefined
        }
      />
    </>
  );
}
