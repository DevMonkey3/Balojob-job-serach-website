import { PlusIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminLink } from "@/components/admin/admin-path";
import { EmptyRow, InactiveMark } from "@/components/admin/status";
import { jobTrackLabels } from "@/lib/format";
import type { CorporationJobRow, CorporationRecruitmentRow } from "@/server/admin/corporations";

// Shown under the edit form: the company's 求人情報 (BHALO115) or the
// school's 生徒募集情報 (BHALO155), with a shortcut that pre-fills the 法人会員番号.

function RelatedCard({
  title,
  addHref,
  addLabel,
  children,
}: {
  title: string;
  /** Path inside the console. */
  addHref: string;
  addLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardAction>
          <AdminLink href={addHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <PlusIcon />
            {addLabel}
          </AdminLink>
        </CardAction>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function CompanyJobsCard({ memberNo, jobs }: { memberNo: string; jobs: CorporationJobRow[] }) {
  return (
    <RelatedCard title="求人情報" addHref={`/jobs/new?memberNo=${memberNo}`} addLabel="新規求人の追加">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">求人番号</TableHead>
            <TableHead>種別</TableHead>
            <TableHead>業種</TableHead>
            <TableHead>職種</TableHead>
            <TableHead className="text-center">非アクティブ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.length === 0 && <EmptyRow colSpan={5} />}
          {jobs.map((j) => (
            <TableRow key={j.id}>
              <TableCell className="text-right tabular-nums">
                <AdminLink href={`/jobs/${j.id}`} className="text-primary hover:underline">
                  {j.jobNo}
                </AdminLink>
              </TableCell>
              <TableCell>{jobTrackLabels[j.track]}</TableCell>
              <TableCell>{j.industry}</TableCell>
              <TableCell>{j.jobType}</TableCell>
              <TableCell className="text-center">
                <InactiveMark active={j.isActive} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </RelatedCard>
  );
}

export function SchoolRecruitmentsCard({
  memberNo,
  recruitments,
}: {
  memberNo: string;
  recruitments: CorporationRecruitmentRow[];
}) {
  return (
    <RelatedCard
      title="生徒募集情報"
      addHref={`/recruitments/new?memberNo=${memberNo}`}
      addLabel="生徒募集の追加"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">募集番号</TableHead>
            <TableHead>学部</TableHead>
            <TableHead>学科</TableHead>
            <TableHead>学校種類</TableHead>
            <TableHead className="text-center">非アクティブ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recruitments.length === 0 && <EmptyRow colSpan={5} />}
          {recruitments.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-right tabular-nums">
                <AdminLink href={`/recruitments/${r.id}`} className="text-primary hover:underline">
                  {r.recruitmentNo}
                </AdminLink>
              </TableCell>
              <TableCell>{r.faculty}</TableCell>
              <TableCell>{r.department}</TableCell>
              <TableCell>{r.schoolGender}</TableCell>
              <TableCell className="text-center">
                <InactiveMark active={r.isActive} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </RelatedCard>
  );
}
