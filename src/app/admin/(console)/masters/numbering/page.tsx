import { Suspense } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Flash } from "@/components/admin/flash";
import { NumberingForm } from "@/components/admin/masters/numbering-form";
import { PageHeader } from "@/components/admin/page-header";
import { param, type SearchParams } from "@/components/admin/pagination";
import { TableSkeleton } from "@/components/admin/status";
import { fmtNumber } from "@/lib/admin/labels";
import { requireStaff } from "@/server/auth/staff";
import { SEQUENCE_MAX, getSequenceStates, getTableCounts } from "@/server/admin/masters";

// BHALO814 採番マスタメンテ
export default function NumberingPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        screenId="BHALO814"
        title="採番マスタメンテ"
        titleEn="Numbering"
        description="会員番号の採番状況。仕様書の採番マスタはデータベースのシーケンスに置き換えています。"
      />
      <Suspense fallback={<TableSkeleton />}>
        <Numbering searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Numbering({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff("admin");
  const [sp, sequences, counts] = await Promise.all([searchParams, getSequenceStates(), getTableCounts()]);

  return (
    <>
      <Flash saved={param(sp, "saved")} />

      <section className="grid gap-6 lg:grid-cols-2">
        {sequences.map((s) => (
          <div key={s.name} className="flex flex-col gap-4 rounded-xl border bg-background p-5">
            <div>
              <h2 className="font-semibold">{s.label}</h2>
              <p className="font-mono text-xs text-muted-foreground">{s.name}</p>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
              <dt className="text-muted-foreground">現在値（last_value）</dt>
              <dd className="tabular-nums">
                {fmtNumber(s.lastValue)}
                {!s.isCalled && <span className="ml-1 text-xs text-muted-foreground">（未使用）</span>}
              </dd>
              <dt className="text-muted-foreground">次の採番値</dt>
              <dd className="tabular-nums">{fmtNumber(s.next)}</dd>
              <dt className="text-muted-foreground">次の会員番号</dt>
              <dd className="font-mono">{s.nextMemberNo}</dd>
            </dl>
            <NumberingForm sequence={s.name} lastValue={s.lastValue} max={SEQUENCE_MAX} />
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-semibold">その他の連番</h2>
          <p className="text-sm text-muted-foreground">
            以下の項目の連番は各テーブルの ID 列（identity）としてデータベースが自動で採番するため、メンテナンスは不要です。参考として現在の件数を表示します。
          </p>
        </div>
        <div className="rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>項目</TableHead>
                <TableHead>テーブル</TableHead>
                <TableHead className="text-right">件数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {counts.map((c) => (
                <TableRow key={c.table}>
                  <TableCell>{c.label}</TableCell>
                  <TableCell className="font-mono text-xs">{c.table}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtNumber(c.count)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </>
  );
}
