import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { TableSkeleton } from "@/components/admin/status";
import { CandidateProfileView } from "@/components/review/candidate-profile-view";
import { fmtDate } from "@/lib/admin/labels";
import { requireEmployer } from "@/server/auth/member";
import { parseId } from "@/server/admin/form";
import { getApprovedApplicant } from "@/server/member/employer";

export const metadata: Metadata = { title: "応募者の履歴書", robots: { index: false } };

type Props = { params: Promise<{ applicationId: string }> };

// BHALO201 履歴書 of one staff-approved applicant, with contact details (the hand-over).
export default function EmployerApplicantPage({ params }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<TableSkeleton />}>
        <Applicant params={params} />
      </Suspense>
    </div>
  );
}

async function Applicant({ params }: Props) {
  const { applicationId: raw } = await params;
  const m = await requireEmployer(`/employer/applicants/${raw}`);
  const id = parseId(raw);
  if (!id) notFound();

  const a = await getApprovedApplicant(BigInt(m.corporationId), id);
  if (!a) notFound();

  const meta = [`求人番号 ${a.job.jobNo}`, a.job.jobType, `応募日 ${fmtDate(a.application.appliedAt)}`].filter(Boolean);

  return (
    <>
      <PageHeader screenId="BHALO201" title="応募者の履歴書" titleEn="Applicant résumé" description={meta.join(" ・ ")} />
      <CandidateProfileView
        member={a.member}
        files={a.files}
        showContact
        backHref={`/employer/jobs/${a.job.id}#applicants`}
        backLabel="求人に戻る"
      />
    </>
  );
}
