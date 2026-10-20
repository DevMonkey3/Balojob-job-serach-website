import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flash } from "@/components/admin/flash";
import { OptionsEditor } from "@/components/admin/masters/options-editor";
import { PageHeader } from "@/components/admin/page-header";
import { param, type SearchParams } from "@/components/admin/pagination";
import { TableSkeleton } from "@/components/admin/status";
import { cn } from "@/lib/utils";
import { requireStaff } from "@/server/auth/staff";
import { parseId } from "@/server/admin/form";
import { CATEGORY_PATTERN, CATEGORY_RE, getOptionParent, getOptionRows } from "@/server/admin/masters";
import { getOptionCategories } from "@/server/admin/options";

// BHALO812 選択項目マスタメンテ
export default function OptionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        screenId="BHALO812"
        title="選択項目マスタメンテ"
        titleEn="Selection options"
        description="各画面のプルダウンに表示する項目。カテゴリごとにレベル1（親）とレベル2（子項目）の2階層です。"
      />
      <Suspense fallback={<TableSkeleton />}>
        <OptionsMaster searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function OptionsMaster({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff("admin");
  const sp = await searchParams;
  const category = param(sp, "category");
  const categoryOk = CATEGORY_RE.test(category);
  const categories = await getOptionCategories();

  return (
    <>
      <Flash saved={param(sp, "saved")} />

      <section className="flex flex-col gap-4 rounded-xl border bg-background p-4">
        <div>
          <p className="mb-2 text-sm font-medium">カテゴリ</p>
          <div className="flex flex-wrap gap-2">
            {categories.length === 0 && <span className="text-sm text-muted-foreground">カテゴリがありません。</span>}
            {categories.map((c) => (
              <Link
                key={c.category}
                href={`/admin/masters/options?category=${c.category}`}
                aria-current={c.category === category ? "page" : undefined}
                className={cn(buttonVariants({ variant: c.category === category ? "default" : "outline", size: "sm" }), "font-mono")}
              >
                {c.category}
                <span className="opacity-70">({c.count})</span>
              </Link>
            ))}
          </div>
        </div>
        {/* A GET form: the category only exists once a row is saved under it. */}
        <form method="get" className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-category">新しいカテゴリ</Label>
            <Input
              id="new-category"
              name="category"
              pattern={CATEGORY_PATTERN}
              required
              maxLength={40}
              placeholder="例: industry"
              className="w-56 font-mono"
            />
          </div>
          <Button type="submit" variant="outline">
            <PlusIcon />
            作成
          </Button>
          <p className="text-xs text-muted-foreground">
            半角英小文字で始まる英数字と _（2〜40文字）。行を保存したときにカテゴリが作られます。
          </p>
        </form>
      </section>

      {category && !categoryOk && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          カテゴリ名が不正です。半角英小文字で始まる英数字と _ で入力してください。
        </p>
      )}
      {categoryOk && <OptionsLevel category={category} sp={sp} />}
    </>
  );
}

async function OptionsLevel({ category, sp }: { category: string; sp: SearchParams }) {
  const rawParent = param(sp, "parent");
  const parentId = rawParent ? parseId(rawParent) : null;
  if (rawParent && !parentId) notFound();
  const parent = parentId ? await getOptionParent(category, parentId) : null;
  if (parentId && !parent) notFound();
  const rows = await getOptionRows(category, parentId);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-mono font-semibold">{category}</span>
        {parent ? (
          <>
            <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
            <span className="font-semibold">{parent.labelJa}</span>
            <Badge variant="secondary">レベル2（子項目）</Badge>
            <Link href={`/admin/masters/options?category=${category}`} className="ml-auto text-primary hover:underline">
              レベル1へ戻る
            </Link>
          </>
        ) : (
          <Badge variant="secondary">レベル1</Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        行の削除は[更新]を押したときに反映されます。
        {!parent && "レベル1の行を削除すると、その子項目（レベル2）もすべて削除されます。"}
        プルダウンには「有効」の行だけが表示されます。
      </p>
      {/* Keyed so switching category or parent, or saving, never shows another level's unsaved rows. */}
      <OptionsEditor
        key={`${category}:${parent?.id ?? ""}:${rows.map((r) => r.id).join(",")}`}
        category={category}
        parentId={parent?.id ?? null}
        rows={rows}
      />
    </section>
  );
}
