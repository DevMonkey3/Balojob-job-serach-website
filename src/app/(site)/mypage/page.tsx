import { Suspense } from "react";
import type { Metadata } from "next";
import { MyPage, MyPageSkeleton } from "@/components/mypage/my-page";
import { requireCandidate } from "@/server/auth/member";
import { getListings, getPopularIndustries } from "@/server/listings";
import { appliedJobIds, listMyApplications } from "@/server/member/candidate";
import { getCandidateStatus } from "@/server/member/profile";

export const metadata: Metadata = { title: "マイページ", robots: { index: false } };

export default function MyPageRoute({ searchParams }: PageProps<"/mypage">) {
  return (
    <Suspense fallback={<MyPageSkeleton />}>
      <MyPageWithData searchParams={searchParams} />
    </Suspense>
  );
}

// Dates are formatted here so the client component only receives strings.
const dateFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const formatDate = (d: Date) => dateFormat.format(d);

async function MyPageWithData({ searchParams }: { searchParams: PageProps<"/mypage">["searchParams"] }) {
  const m = await requireCandidate("/mypage");
  const id = BigInt(m.individualId);

  const [status, { jobs }, applications, applied, popularIndustries, { saved }] = await Promise.all([
    getCandidateStatus(id),
    getListings(),
    listMyApplications(id),
    appliedJobIds(id),
    getPopularIndustries(),
    searchParams,
  ]);

  return (
    <MyPage
      name={m.name}
      saved={typeof saved === "string" ? saved : undefined}
      status={{
        status: status.status,
        reason: status.reason,
        submittedAt: status.submittedAt ? formatDate(status.submittedAt) : null,
      }}
      resume={
        status.resumeFile
          ? {
              id: status.resumeFile.id,
              name: status.resumeFile.name,
              url: status.resumeFile.url,
              uploadedAt: formatDate(status.resumeFile.uploadedAt),
            }
          : null
      }
      applications={applications.map((a) => ({
        id: a.id,
        appliedAt: formatDate(a.appliedAt),
        company: a.company,
        jobType: a.jobType,
        category: a.category,
        location: a.location,
        targetLabel: a.targetLabel,
        reviewStatus: a.reviewStatus,
        rejectionReason: a.rejectionReason,
      }))}
      appliedJobIds={applied}
      jobs={jobs}
      popularIndustries={popularIndustries}
    />
  );
}
