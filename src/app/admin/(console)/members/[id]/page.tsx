import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileTextIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/delete-button";
import { Flash } from "@/components/admin/flash";
import { MemberForm } from "@/components/admin/members/member-form";
import { SectionEditor } from "@/components/admin/members/section-editor";
import { PageHeader } from "@/components/admin/page-header";
import { param, type SearchParams } from "@/components/admin/pagination";
import { ReviewActions } from "@/components/admin/reviews/review-actions";
import { TableSkeleton } from "@/components/admin/status";
import { ReviewBadge } from "@/components/review/review-badge";
import { fmtDateTime } from "@/lib/admin/labels";
import { memberSections, type SectionOptionLists } from "@/lib/admin/member-sections";
import { hasPermission, requireStaff } from "@/server/auth/staff";
import { encryptionConfigured } from "@/server/crypto";
import { db } from "@/server/db";
import { parseId } from "@/server/admin/form";
import { getMember } from "@/server/admin/members";
import { deleteMemberAction } from "@/server/admin/members-actions";
import { getChildOptionLabels, getOptionLabels } from "@/server/admin/options";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> };

// BHALO806 個人会員編集 + the child tables of BHALO014–026 / 202
export default function EditMemberPage({ params, searchParams }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<TableSkeleton />}>
        <EditMember params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function EditMember({ params, searchParams }: Props) {
  const staff = await requireStaff("edit");
  const [{ id: rawId }, sp] = await Promise.all([params, searchParams]);
  const id = parseId(rawId);
  if (!id) notFound();

  const [member, review, genders, countries, languages, jlptLevels, languageLevels, visas, dominantHands] = await Promise.all([
    getMember(id),
    // 審査 state is not part of MemberDetail (the form never edits it).
    db.individual.findUnique({
      where: { id },
      select: { reviewStatus: true, rejectionReason: true, submittedAt: true, reviewedAt: true },
    }),
    getOptionLabels("gender"),
    getOptionLabels("country"),
    getOptionLabels("language"),
    getChildOptionLabels("language"),
    getOptionLabels("language_level"),
    getOptionLabels("visa"),
    getOptionLabels("dominant_hand"),
  ]);
  if (!member || !review) notFound();
  const submitted = review.submittedAt !== null;
  const canReview = submitted && review.reviewStatus === "pending" && hasPermission(staff, "edit");
  const [degrees, industries, jobTypes, salaries, faculties, departments, familyRelations] = await Promise.all([
    getOptionLabels("degree"),
    getOptionLabels("industry"),
    getChildOptionLabels("industry"),
    getOptionLabels("salary"),
    getOptionLabels("faculty"),
    getChildOptionLabels("faculty"),
    getOptionLabels("family_relation"),
  ]);

  const sectionOptions: SectionOptionLists = {
    language: languages,
    languageLevel: [...languageLevels, ...jlptLevels],
    degree: degrees,
    industry: [...industries, ...jobTypes],
    country: countries,
    salary: salaries,
    faculty: faculties,
    department: departments,
    familyRelation: familyRelations,
  };

  return (
    <>
      <PageHeader
        screenId="BHALO806"
        title="個人会員の編集"
        titleEn="Edit individual member"
        description={[
          `${member.fullName} / 会員番号 ${member.memberNo} ・ 最終更新 ${fmtDateTime(member.updatedAt)}`,
          submitted && `申請日時 ${fmtDateTime(review.submittedAt)}`,
          review.reviewedAt && `審査日時 ${fmtDateTime(review.reviewedAt)}`,
        ]
          .filter(Boolean)
          .join(" ・ ")}
      >
        <ReviewBadge kind="candidate" status={submitted ? review.reviewStatus : "draft"} reason={review.rejectionReason} />
        <Link href={`/admin/reviews/candidates/${member.id}`} className={buttonVariants({ variant: "outline" })}>
          <FileTextIcon />
          審査画面で履歴書を見る
        </Link>
        {canReview && (
          <ReviewActions target="candidate" id={member.id} targetLabel="候補者プロフィール" redirectTo={`/admin/members/${member.id}`} size="default" />
        )}
        {hasPermission(staff, "delete") && (
          <DeleteButton
            action={deleteMemberAction}
            id={member.id}
            redirectTo="/admin/members"
            message="この個人会員情報を削除します。よろしいですか？"
            variant="outline"
            size="default"
          />
        )}
      </PageHeader>
      <Flash saved={param(sp, "saved")} />
      <MemberForm
        member={member}
        options={{ genders, countries, languages, visas, dominantHands }}
        encryptionReady={encryptionConfigured()}
      />
      {memberSections.map((section) => (
        <SectionEditor
          key={section.key}
          individualId={member.id}
          section={section}
          rows={member.sections[section.key]}
          options={sectionOptions}
        />
      ))}
    </>
  );
}
