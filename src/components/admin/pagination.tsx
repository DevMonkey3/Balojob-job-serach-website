import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SearchParams = Record<string, string | string[] | undefined>;

/** First string value of a search param. */
export const param = (sp: SearchParams, key: string): string => {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v) ?? "";
};

export const pageParam = (sp: SearchParams): number => {
  const n = Number(param(sp, "page"));
  return Number.isInteger(n) && n > 0 ? n : 1;
};

function href(pathname: string, sp: SearchParams, page: number) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const s = Array.isArray(v) ? v[0] : v;
    if (s && k !== "page") q.set(k, s);
  }
  if (page > 1) q.set("page", String(page));
  const qs = q.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function Pagination({
  pathname,
  searchParams,
  page,
  pageCount,
  total,
  pageSize,
}: {
  pathname: string;
  searchParams: SearchParams;
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const link = (p: number, disabled: boolean, children: React.ReactNode, label: string) =>
    disabled ? (
      <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-50")}>
        {children}
      </span>
    ) : (
      <Link href={href(pathname, searchParams, p)} className={buttonVariants({ variant: "outline", size: "sm" })} aria-label={label}>
        {children}
      </Link>
    );

  return (
    <nav aria-label="ページ" className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>
        {total.toLocaleString("ja-JP")}件中 {from}–{to}件
      </span>
      <div className="flex items-center gap-2">
        {link(page - 1, page <= 1, <><ChevronLeftIcon />前へ</>, "前のページ")}
        <span>
          {page} / {pageCount}
        </span>
        {link(page + 1, page >= pageCount, <>次へ<ChevronRightIcon /></>, "次のページ")}
      </div>
    </nav>
  );
}
