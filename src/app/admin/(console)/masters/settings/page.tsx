import { Suspense } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Flash } from "@/components/admin/flash";
import { SettingsForm } from "@/components/admin/masters/settings-form";
import { PageHeader } from "@/components/admin/page-header";
import { param, type SearchParams } from "@/components/admin/pagination";
import { TableSkeleton } from "@/components/admin/status";
import { fmtDateTime } from "@/lib/admin/labels";
import { requireStaff } from "@/server/auth/staff";
import { getSiteSettings } from "@/server/admin/masters";

// BHALO816 管理マスタメンテ
export default function SettingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader screenId="BHALO816" title="管理マスタメンテ" titleEn="Site settings" />
      <Suspense fallback={<TableSkeleton />}>
        <Settings searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Settings({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff("admin");
  const [sp, { values, others }] = await Promise.all([searchParams, getSiteSettings()]);

  return (
    <>
      <Flash saved={param(sp, "saved")} />
      <SettingsForm values={values} />

      {others.length > 0 && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="font-semibold">その他の設定</h2>
            <p className="text-sm text-muted-foreground">この画面では変更できません（参照のみ）。</p>
          </div>
          <div className="rounded-xl border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>キー</TableHead>
                  <TableHead>値</TableHead>
                  <TableHead>最終更新</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {others.map((s) => (
                  <TableRow key={s.key}>
                    <TableCell className="font-mono text-xs">{s.key}</TableCell>
                    <TableCell className="whitespace-pre-wrap break-all">{s.value}</TableCell>
                    <TableCell className="tabular-nums">{fmtDateTime(s.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </>
  );
}
