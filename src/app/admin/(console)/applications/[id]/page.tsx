import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApplicationStatusBadge } from "@/components/admin/applications/status-badge";
import { ApplicationStatusForm } from "@/components/admin/applications/status-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { Flash } from "@/components/admin/flash";
import { PageHeader } from "@/components/admin/page-header";
import { param, type SearchParams } from "@/components/admin/pagination";
import { ReviewActions } from "@/components/admin/reviews/review-actions";
import { TableSkeleton } from "@/components/admin/status";
import { ReviewBadge } from "@/components/review/review-badge";
import { fmtDateTime } from "@/lib/admin/labels";
import { hasPermission, requireStaff } from "@/server/auth/staff";
import { getApplication } from "@/server/admin/applications";
import { deleteApplicationAction } from "@/server/admin/applications-actions";
import { parseId } from "@/server/admin/form";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> };

export default function ApplicationPage({ params, searchParams }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<TableSkeleton />}>
        <ApplicationDetail params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ApplicationDetail({ params, searchParams }: Props) {
  const staff = await requireStaff("view");
  const [{ id: rawId }, sp] = await Promise.all([params, searchParams]);
  const id = parseId(rawId);
  if (!id) notFound();
  const a = await getApplication(id);
  if (!a) notFound();
  const canReview = a.reviewStatus === "pending" && hasPermission(staff, "edit");

  return (
    <>
      <PageHeader
        screenId="BHALO200"
        title={`コンタクト申込 #${a.id}`}
        description={`申込日時 ${fmtDateTime(a.createdAt)} ・ 最終更新 ${fmtDateTime(a.updatedAt)}`}
      >
        <ApplicationStatusBadge status={a.status} />
        {hasPermission(staff, "delete") && (
          <DeleteButton
            action={deleteApplicationAction}
            id={a.id}
            redirectTo="/admin/applications"
            message="このコンタクト申込を削除します。よろしいですか？"
            variant="outline"
            size="default"
          />
        )}
      </PageHeader>
      <Flash saved={param(sp, "saved")} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>申込者</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">会員番号</dt>
              <dd className="font-mono">
                <Link href={`/admin/members/${a.individual.id}`} className="text-primary hover:underline">
                  {a.individual.memberNo}
                </Link>
              </dd>
              <dt className="text-muted-foreground">氏名</dt>
              <dd>{a.individual.fullName}</dd>
              <dt className="text-muted-foreground">国籍</dt>
              <dd>{a.individual.nationality || "—"}</dd>
              <dt className="text-muted-foreground">ログインID</dt>
              <dd>{a.individual.loginEmail}</dd>
              <dt className="text-muted-foreground">連絡先メール</dt>
              <dd>{a.individual.contactEmail || "—"}</dd>
              <dt className="text-muted-foreground">携帯番号</dt>
              <dd>{a.individual.mobile || "—"}</dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>申込先（{a.items.length}件）</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>申込時の表示</TableHead>
                  <TableHead>現在の情報</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {a.items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="whitespace-normal">{i.targetLabel}</TableCell>
                    <TableCell className="whitespace-normal">
                      {i.job && (
                        <Link href={`/admin/jobs/${i.job.id}`} className="text-primary hover:underline">
                          求人 {i.job.companyName} / {i.job.jobType} (#{i.job.jobNo})
                        </Link>
                      )}
                      {i.recruitment && (
                        <Link href={`/admin/recruitments/${i.recruitment.id}`} className="text-primary hover:underline">
                          募集 {i.recruitment.schoolName} / {i.recruitment.faculty} {i.recruitment.department} (#
                          {i.recruitment.recruitmentNo})
                        </Link>
                      )}
                      {!i.job && !i.recruitment && <span className="text-muted-foreground">削除済み</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>審査</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">審査状況</dt>
            <dd>
              <ReviewBadge status={a.reviewStatus} reason={a.rejectionReason} />
            </dd>
            <dt className="text-muted-foreground">申請日時</dt>
            <dd>{fmtDateTime(a.submittedAt) || "—"}</dd>
            <dt className="text-muted-foreground">審査日時</dt>
            <dd>{fmtDateTime(a.reviewedAt) || "—"}</dd>
          </dl>
          {canReview ? (
            <div className="flex flex-wrap items-center gap-2">
              <ReviewActions target="application" id={a.id} targetLabel="応募" redirectTo={`/admin/applications/${a.id}`} size="default" />
              <span className="text-xs text-muted-foreground">承認すると企業に紹介されます。差戻し理由は応募者に表示されます。</span>
            </div>
          ) : (
            a.reviewStatus === "pending" && <p className="text-xs text-muted-foreground">審査には更新権限が必要です。</p>
          )}
        </CardContent>
      </Card>

      <ApplicationStatusForm id={a.id} status={a.status} staffNote={a.staffNote} />
    </>
  );
}
