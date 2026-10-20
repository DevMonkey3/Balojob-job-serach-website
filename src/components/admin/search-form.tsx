import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Filter bar for list screens. A GET form, so the filters live in the URL and
 * the page can be bookmarked or shared. Empty filters mean "all".
 */
export function SearchForm({ clearHref, children }: { clearHref: string; children: React.ReactNode }) {
  return (
    <form method="get" className="grid gap-3 rounded-xl border bg-background p-4 sm:grid-cols-2 lg:grid-cols-4">
      {children}
      <div className="flex items-end gap-2">
        <Button type="submit">
          <SearchIcon />
          検索
        </Button>
        <Link href={clearHref} className={buttonVariants({ variant: "ghost" })}>
          クリア
        </Link>
      </div>
    </form>
  );
}
