import Link from "next/link";
import { FileTextIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDate } from "@/lib/admin/labels";
import type { ApplicantRow } from "@/server/member/employer";

// The hand-over (BHALO200) as the employer sees it under one of their jobs:
// only applications staff approved, each linking to the candidate's 履歴書.

export function ApplicantsCard({ applicants }: { applicants: ApplicantRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          応募者（スタッフ承認済み）
          <span className="font-mono text-xs font-normal text-muted-foreground">BHALO200</span>
        </CardTitle>
        <CardDescription>スタッフが承認した応募のみ表示されます。</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>氏名（フリガナ）</TableHead>
              <TableHead>国籍</TableHead>
              <TableHead>居住国</TableHead>
              <TableHead>日本語</TableHead>
              <TableHead>希望職種</TableHead>
              <TableHead>応募日</TableHead>
              <TableHead className="text-right">履歴書</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applicants.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  承認済みの応募者はまだいません。
                </TableCell>
              </TableRow>
            )}
            {applicants.map((a) => (
              <TableRow key={a.applicationId}>
                <TableCell>
                  <Link href={`/employer/applicants/${a.applicationId}`} className="text-primary hover:underline">
                    {a.fullName}
                  </Link>
                  {a.nameKana && <span className="ml-1 text-xs text-muted-foreground">（{a.nameKana}）</span>}
                </TableCell>
                <TableCell>{a.nationality}</TableCell>
                <TableCell>{a.residenceCountry}</TableCell>
                <TableCell>{a.japaneseLevel}</TableCell>
                <TableCell>{a.desiredJob}</TableCell>
                <TableCell>{fmtDate(a.appliedAt)}</TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/employer/applicants/${a.applicationId}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    <FileTextIcon />
                    履歴書を見る
                  </Link>
                  {a.hasResumeFile && <span className="ml-2 text-xs text-muted-foreground">ファイル有</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
