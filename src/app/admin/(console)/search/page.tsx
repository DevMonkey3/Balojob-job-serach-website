import { Suspense } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { param, type SearchParams } from "@/components/admin/pagination";
import { ActiveBadge, EmptyRow, TableSkeleton } from "@/components/admin/status";
import { jobTrackLabels } from "@/lib/format";
import { requireStaff } from "@/server/auth/staff";
import { quickSearch } from "@/server/admin/search";

// クイック検索 results (header search box, BHALO800).
export default function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<TableSkeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SearchResults({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff("view");
  const q = param(await searchParams, "q");
  const { members, corporations, jobs } = await quickSearch(q);
  const total = members.length + corporations.length + jobs.length;

  return (
    <>
      <PageHeader
        screenId="BHALO800"
        title="クイック検索"
        description={q ? `「${q}」の検索結果：${total}件（各20件まで。会員番号・氏名・法人名・メールアドレス・職種の部分一致）` : "ヘッダーの検索欄に入力してください。"}
      />

      <Card>
        <CardHeader>
          <CardTitle>個人会員（{members.length}件）</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>会員番号</TableHead>
                <TableHead>氏名</TableHead>
                <TableHead>国籍</TableHead>
                <TableHead>ログインID</TableHead>
                <TableHead>状態</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 && <EmptyRow colSpan={5} />}
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">
                    <Link href={`/admin/members/${m.id}`} className="text-primary hover:underline">
                      {m.memberNo}
                    </Link>
                  </TableCell>
                  <TableCell>{m.fullName}</TableCell>
                  <TableCell>{m.nationality}</TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>
                    <ActiveBadge active={m.isActive} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>企業・学校（{corporations.length}件）</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>法人会員番号</TableHead>
                <TableHead>法人名</TableHead>
                <TableHead>区分</TableHead>
                <TableHead>所在地</TableHead>
                <TableHead>状態</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {corporations.length === 0 && <EmptyRow colSpan={5} />}
              {corporations.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      href={`/admin/${c.kind === "school" ? "schools" : "companies"}/${c.id}`}
                      className="text-primary hover:underline"
                    >
                      {c.memberNo}
                    </Link>
                  </TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{c.kind === "school" ? "学校" : "企業"}</Badge>
                  </TableCell>
                  <TableCell>{c.prefecture}</TableCell>
                  <TableCell>
                    <ActiveBadge active={c.isActive} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>求人情報（{jobs.length}件）</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>法人会員番号</TableHead>
                <TableHead>会社名</TableHead>
                <TableHead className="text-right">求人番号</TableHead>
                <TableHead>種別</TableHead>
                <TableHead>業種</TableHead>
                <TableHead>職種</TableHead>
                <TableHead>状態</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.length === 0 && <EmptyRow colSpan={7} />}
              {jobs.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="font-mono text-xs">{j.corporation.memberNo}</TableCell>
                  <TableCell>
                    <Link href={`/admin/jobs/${j.id}`} className="text-primary hover:underline">
                      {j.corporation.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{j.jobNo}</TableCell>
                  <TableCell>{jobTrackLabels[j.track]}</TableCell>
                  <TableCell>{j.industry}</TableCell>
                  <TableCell>{j.jobType}</TableCell>
                  <TableCell>
                    <ActiveBadge active={j.isActive} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
