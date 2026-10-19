"use client";

import { useState } from "react";
import Link from "next/link";
import { BriefcaseIcon, Building2Icon, FileTextIcon, GraduationCapIcon, InboxIcon, UsersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { DashboardData } from "@/server/dashboard";
import type { PendingCounts } from "@/server/admin/reviews";

// BHALO800 管理画面: 審査待ち, counts per period, active totals, latest registrations.

const periods = [
  ["today", "当日"],
  ["week", "週間"],
  ["month", "今月"],
] as const;

type Period = (typeof periods)[number][0];

// 審査待ち tiles: one per review queue, linking to its tab on /admin/reviews.
const pendingTiles: { key: keyof PendingCounts; label: string; icon: typeof BriefcaseIcon }[] = [
  { key: "jobs", label: "求人", icon: BriefcaseIcon },
  { key: "candidates", label: "候補者プロフィール", icon: FileTextIcon },
  { key: "applications", label: "応募", icon: InboxIcon },
];

export function Dashboard({
  counts: allCounts,
  pending,
  recentMembers,
  recentJobs,
  staffName,
}: DashboardData & { staffName: string }) {
  const [period, setPeriod] = useState<Period>("today");
  const counts = allCounts[period];
  const active = allCounts.active;

  const tiles = [
    { label: "新規個人会員", value: counts.individuals, icon: UsersIcon },
    { label: "新規企業会員", value: counts.companies, icon: Building2Icon },
    { label: "新規学校会員", value: counts.schools, icon: GraduationCapIcon },
    { label: "アクティブユーザ", value: active.individuals, icon: UsersIcon },
    { label: "アクティブ企業", value: active.companies, icon: Building2Icon },
    { label: "アクティブ学校", value: active.schools, icon: GraduationCapIcon },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-muted-foreground">BHALO800</p>
          <h1 className="text-2xl font-bold">こんにちは、{staffName}さん</h1>
        </div>
        <div role="group" aria-label="集計期間" className="inline-flex rounded-lg border bg-background p-1">
          {periods.map(([key, label]) => (
            <button
              key={key}
              aria-pressed={period === key}
              onClick={() => setPeriod(key)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium",
                period === key ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <section aria-labelledby="pending-heading" className="flex flex-col gap-3">
        <h2 id="pending-heading" className="text-sm font-semibold text-muted-foreground">
          審査待ち
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {pendingTiles.map((t) => {
            const n = pending[t.key];
            const hot = n > 0;
            return (
              <Link
                key={t.key}
                href={`/admin/reviews?tab=${t.key}`}
                aria-label={`審査待ちの${t.label} ${n.toLocaleString("ja-JP")}件`}
                className={cn(
                  "flex items-center gap-4 rounded-xl border bg-card p-6 text-card-foreground transition-colors hover:bg-muted/50",
                  hot && "border-primary/40 bg-primary/5 hover:bg-primary/10",
                )}
              >
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-lg",
                    hot ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  <t.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm text-muted-foreground">{t.label}</p>
                  <p className={cn("text-2xl font-bold tabular-nums", !hot && "text-muted-foreground")}>
                    {n.toLocaleString("ja-JP")}
                    <span className="ml-1 text-sm font-normal">件</span>
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="flex items-center gap-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <t.icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">{t.label}</p>
                <p className="text-2xl font-bold tabular-nums">{t.value.toLocaleString("ja-JP")}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最近登録した個人会員</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>会員番号</TableHead>
                  <TableHead>氏名</TableHead>
                  <TableHead>希望種別</TableHead>
                  <TableHead>職種</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMembers.length === 0 && <EmptyRow />}
                {recentMembers.map((m) => (
                  <TableRow key={m.no}>
                    <TableCell className="font-mono text-xs">
                      <Link href={`/admin/members/${m.id}`} className="text-primary hover:underline">
                        {m.no}
                      </Link>
                    </TableCell>
                    <TableCell>{m.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {m.goals.map((g) => (
                          <Badge key={g} variant="secondary">
                            {g}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{m.job}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近登録した求人情報</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>法人会員番号</TableHead>
                  <TableHead>法人名</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead>職種</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentJobs.length === 0 && <EmptyRow />}
                {recentJobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-mono text-xs">
                      <Link href={`/admin/jobs/${j.id}`} className="text-primary hover:underline">
                        {j.corporateNo}
                      </Link>
                    </TableCell>
                    <TableCell>{j.company}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{j.category}</Badge>
                    </TableCell>
                    <TableCell>{j.jobType}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return <div className="h-96 animate-pulse rounded-xl bg-muted" aria-busy="true" />;
}

function EmptyRow() {
  return (
    <TableRow>
      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
        対象データがありません。
      </TableCell>
    </TableRow>
  );
}
